import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { buildDemo001, seedCases } from "../data/cases";
import {
  applyCosmeticRescan,
  applyEscalation,
  applyManualLetter,
  applyRaceToken,
  applyVigilanceHold,
  decideRelease,
} from "../engine/actions";
import { evaluateCase } from "../engine/evaluateCase";
import { can } from "../engine/permissions";
import { registerCsv } from "../engine/register";
import { appendAudit, sealAudit } from "../lib/audit";
import { evaluateCaseWithFallback, type EngineSource } from "../lib/api";
import { downloadText } from "../lib/download";
import { formatCaseRef } from "../lib/labels";
import { clearLocationChrome } from "../lib/url";
import { identityScopeHash, lienScopeHash, makeVersion } from "../engine/material";
import type { BankEvidence, CaseSnapshot, Evaluation, InstrumentFields, InstrumentVersion, Notice, RoleId, ScreenId, Step, WorkspaceTab } from "../types";

export type FlowPhase = 1 | 2 | 3 | 4;

export interface CaseUiState {
  step: Step;
  officerNote: string;
  directorNote: string;
}

export interface AppState {
  screen: ScreenId;
  tab: WorkspaceTab;
  step: Step;
  phase: FlowPhase;
  caseId: string;
  role: RoleId;
  cases: Record<string, CaseSnapshot>;
  caseUi: Record<string, CaseUiState>;
  gatewayOutage: boolean;
  frozenHash: string | null;
  notice: Notice | null;
  liveIntake: boolean;
  authenticated: boolean;
}

type AppAction =
  | { type: "set-role"; role: RoleId }
  | { type: "navigate"; screen?: ScreenId; tab?: WorkspaceTab; caseId?: string }
  | { type: "set-step"; step: Step }
  | { type: "set-phase"; phase: FlowPhase }
  | { type: "confirm-v1"; note: string; asRole?: RoleId }
  | { type: "reset" }
  | { type: "cosmetic" }
  | { type: "release"; remark: string; asRole?: RoleId }
  | { type: "forward" }
  | { type: "intake"; institutionName: string; aisheCode: string; bankName: string; serial: string; declared: number; scanned: number }
  | { type: "gateway" }
  | { type: "manual-letter" }
  | { type: "escalate" }
  | { type: "stale-hash" }
  | { type: "upload-v2"; serial: string; amount: number; token: string; note: string; ocrMatched: boolean; asRole?: RoleId }
  | { type: "vigilance"; caseId: string; asRole?: RoleId }
  | { type: "dismiss-notice" }
  | { type: "notify"; notice: Notice }
  | { type: "sign-in"; role: RoleId; screen?: ScreenId }
  | { type: "sign-out" }
  | { type: "set-case-note"; field: "officerNote" | "directorNote"; value: string };

const STORAGE_KEY = "fdr-setu-v1";

function loadStored(): { cases?: Record<string, CaseSnapshot>; gatewayOutage?: boolean } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cases?: Record<string, CaseSnapshot>; gatewayOutage?: boolean };
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function emptyCaseUi(step: Step = 1): CaseUiState {
  return { step, officerNote: "", directorNote: "" };
}

export function deriveStep(snapshot: CaseSnapshot): Step {
  if (snapshot.release.authorised) return 5;
  const evaluation = evaluateCase(snapshot);
  if (evaluation.releaseReady) return 5;
  const hasV2 = snapshot.currentVersionId === "V2" || snapshot.versions.some((item) => item.versionId === "V2");
  if (hasV2) return 4;
  const current = snapshot.versions.find((item) => item.versionId === snapshot.currentVersionId) ?? snapshot.versions[0];
  const shortfall = current ? current.fields.declaredAmountInr - current.fields.observedAmountInr : 0;
  if (shortfall > 0 || snapshot.audit.some((event) => event.action === "OFFICER_OBSERVATION")) return 2;
  return 1;
}

function ensureCaseUi(state: AppState, caseId: string): CaseUiState {
  if (state.caseUi[caseId]) return state.caseUi[caseId];
  const snapshot = state.cases[caseId];
  return emptyCaseUi(snapshot ? deriveStep(snapshot) : 1);
}

function writeCaseUi(state: AppState, caseId: string, patch: Partial<CaseUiState>): AppState {
  const current = ensureCaseUi(state, caseId);
  const next = { ...current, ...patch };
  return {
    ...state,
    caseUi: { ...state.caseUi, [caseId]: next },
    step: patch.step ?? (caseId === state.caseId ? next.step : state.step),
  };
}

function fresh(step: Step = 1): AppState {
  return {
    screen: "workspace",
    tab: "recheck",
    step,
    phase: 1,
    caseId: "DEMO-001",
    role: "RO-104",
    cases: { ...seedCases(), "DEMO-001": buildDemo001(step) },
    caseUi: { "DEMO-001": emptyCaseUi(step) },
    gatewayOutage: false,
    frozenHash: null,
    notice: null,
    liveIntake: false,
    authenticated: false,
  };
}

function createInitial(): AppState {
  const stored = loadStored();
  const cases = seedCases();
  for (const [id, snapshot] of Object.entries(stored?.cases ?? {})) {
    if (id === "DEMO-001" || !snapshot?.versions?.length || snapshot.caseId !== id) continue;
    cases[id] = snapshot;
  }
  cases["DEMO-001"] = buildDemo001(1);
  const caseUi: Record<string, CaseUiState> = {};
  for (const id of Object.keys(cases)) caseUi[id] = emptyCaseUi(deriveStep(cases[id]));
  caseUi["DEMO-001"] = emptyCaseUi(1);
  return {
    screen: "workspace",
    tab: "recheck",
    step: 1,
    phase: 1,
    caseId: "DEMO-001",
    role: "RO-104",
    cases,
    caseUi,
    gatewayOutage: stored?.gatewayOutage ?? false,
    frozenHash: null,
    notice: null,
    liveIntake: false,
    authenticated: false,
  };
}

function clockStamp(): string {
  const ist = new Date(Date.now() + 330 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
}

function keepTypedNotes(previous: CaseSnapshot, next: CaseSnapshot): CaseSnapshot {
  const kept = new Set(["OFFICER_OBSERVATION", "INSTITUTION_RESUBMISSION", "DIRECTOR_REMARK"]);
  return previous.audit.filter((event) => kept.has(event.action)).reduce(
    (snapshot, event) => appendAudit(snapshot, { at: event.at, actor: event.actor, action: event.action, detail: event.detail }),
    next,
  );
}

function withCanonicalStep(state: AppState, step: Step, patch: Partial<AppState>): AppState {
  const previous = state.cases["DEMO-001"];
  const built = buildDemo001(step);
  const snapshot = previous ? keepTypedNotes(previous, built) : built;
  return {
    ...state,
    ...patch,
    step,
    caseId: "DEMO-001",
    cases: { ...state.cases, "DEMO-001": snapshot },
    frozenHash: null,
    notice: null,
  };
}

function writeNote(snapshot: CaseSnapshot, event: { actor: string; action: string; detail: string }): CaseSnapshot {
  const detail = event.detail.trim();
  if (!detail) return snapshot;
  return appendAudit(snapshot, { ...event, detail, at: clockStamp() });
}

function coverEvidence(version: InstrumentVersion, id: string, token: string): BankEvidence {
  return {
    id,
    coversVersionId: version.versionId,
    coversSubstantiveHash: version.substantiveHash,
    tier: "T1_BANK_API",
    source: "BANK_GATEWAY",
    gatewayStatus: "CONFIRMED",
    amountInr: version.fields.observedAmountInr,
    referenceNumber: version.fields.referenceNumber,
    recordedAt: clockStamp(),
    recordedBy: "RO-104",
    reference: token || "PNB-GW-LIVE",
    statement: `Bank gateway confirmation of ${version.fields.referenceNumber}. Coverage is limited to ${version.versionId}.`,
  };
}

function liveFiling(input: { institutionName: string; aisheCode: string; bankName: string; serial: string; declared: number; scanned: number }): CaseSnapshot {
  const fields: InstrumentFields = {
    referenceNumber: input.serial.trim() || "FDR/PNB/LIVE/00001",
    bankName: input.bankName.trim() || "Punjab National Bank",
    branchCode: "0142",
    declaredAmountInr: input.declared,
    observedAmountInr: input.scanned,
    issueDate: "2024-04-12",
    maturityOrValueDate: "2027-04-12",
    beneficiaryOrDdo: "All India Council for Technical Education",
    institutionName: input.institutionName.trim() || "National Institute of Technical Studies",
    aisheCode: input.aisheCode.trim() || "C-42817",
    pan: "AAACN1234F",
    instrumentKind: "FDR",
    utr: "",
  };
  const version = makeVersion({
    versionId: "V1",
    label: "Original scan",
    uploadedAt: clockStamp(),
    uploadedBy: "INST-01",
    fileName: "FDR-V1.pdf",
    fileSeed: `FDR-SETU-FILE|LIVE|V1|${fields.referenceNumber}|${fields.observedAmountInr}`,
    fields,
  });
  return {
    caseId: "DEMO-001",
    institutionId: "INST-NITS",
    institutionName: fields.institutionName,
    route: "NOC_FDR",
    openedOn: "2026-10-12",
    assignee: "RO-104",
    currentVersionId: "V1",
    versions: [version],
    reconciliations: [],
    bankEvidence: [],
    identityConfirmed: true,
    identityScopeHash: identityScopeHash(fields),
    lienConfirmed: true,
    lienScopeHash: lienScopeHash(fields),
    vigilanceHold: false,
    vigilanceNote: "",
    escalation: null,
    release: { authorised: false, by: null, at: null, evaluationHash: null },
    audit: sealAudit([
      {
        at: clockStamp(),
        actor: "INST-01",
        action: "CASE_OPENED",
        detail: `${fields.institutionName} filed ${fields.referenceNumber} for verification.`,
      },
    ]),
    raceToken: "",
  };
}

function liveReplacement(snapshot: CaseSnapshot, input: { serial: string; amount: number; token: string; ocrMatched: boolean }): CaseSnapshot {
  const v1 = snapshot.versions.find((item) => item.versionId === "V1") ?? snapshot.versions[0];
  const fields: InstrumentFields = {
    ...v1.fields,
    referenceNumber: input.serial.trim() || v1.fields.referenceNumber,
    observedAmountInr: input.amount,
    declaredAmountInr: v1.fields.declaredAmountInr,
    issueDate: "2025-11-02",
    maturityOrValueDate: "2028-11-02",
  };
  const v2 = makeVersion({
    versionId: "V2",
    label: "Replacement instrument",
    uploadedAt: clockStamp(),
    uploadedBy: "INST-01",
    fileName: "FDR-V2.pdf",
    fileSeed: `FDR-SETU-FILE|LIVE|V2|${fields.referenceNumber}|${fields.observedAmountInr}`,
    fields,
  });
  const matched = input.ocrMatched && input.amount === v1.fields.declaredAmountInr;
  const bankEvidence = matched ? [...snapshot.bankEvidence, coverEvidence(v2, "EV-BNK-202", input.token)] : snapshot.bankEvidence;
  return {
    ...snapshot,
    currentVersionId: "V2",
    versions: [v1, v2],
    bankEvidence,
  };
}

function putCase(state: AppState, snapshot: CaseSnapshot, notice: Notice): AppState {
  return {
    ...state,
    cases: { ...state.cases, [snapshot.caseId]: snapshot },
    notice,
  };
}

function refuse(state: AppState, title: string, body: string): AppState {
  return { ...state, notice: { tone: "deny", http: 403, title, body } };
}

function reduce(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-role":
      return { ...state, role: action.role };
    case "navigate": {
      const nextCaseId = action.caseId && state.cases[action.caseId] ? action.caseId : state.caseId;
      const caseChanged = nextCaseId !== state.caseId;
      if (!caseChanged) {
        return {
          ...state,
          screen: action.screen ?? state.screen,
          tab: action.tab ?? state.tab,
        };
      }
      const ui = ensureCaseUi(state, nextCaseId);
      return {
        ...state,
        screen: action.screen ?? state.screen,
        tab: action.tab ?? state.tab,
        caseId: nextCaseId,
        step: ui.step,
        caseUi: { ...state.caseUi, [nextCaseId]: ui },
      };
    }
    case "set-step": {
      const uiState = writeCaseUi(state, state.caseId, { step: action.step });
      if (state.liveIntake || state.caseId !== "DEMO-001") {
        return { ...uiState, step: action.step, screen: "workspace", notice: null };
      }
      const next = withCanonicalStep(uiState, action.step, { screen: "workspace" });
      return writeCaseUi(next, "DEMO-001", { step: action.step });
    }
    case "set-phase":
      if (action.phase === 1) return withCanonicalStep(state, 1, { screen: "workspace", phase: 1, role: "RO-104" });
      return { ...state, screen: "workspace", phase: action.phase, notice: null };
    case "set-case-note":
      return writeCaseUi(state, state.caseId, { [action.field]: action.value });
    case "confirm-v1": {
      const role = action.asRole ?? state.role;
      if (state.liveIntake) {
        const current = state.cases["DEMO-001"];
        const observed = current.versions[0]?.fields.observedAmountInr ?? 0;
        const noted = writeNote(
          {
            ...current,
            reconciliations: current.reconciliations.some((item) => item.versionId === "V1")
              ? current.reconciliations
              : [
                  ...current.reconciliations,
                  {
                    id: "RCN-LIVE",
                    versionId: "V1",
                    acceptedAmountInr: observed,
                    at: clockStamp(),
                    by: "RO-104",
                    note: action.note.trim() || "Officer accepted the scanned principal on V1.",
                  },
                ],
          },
          { actor: "RO-104", action: "OFFICER_OBSERVATION", detail: action.note },
        );
        return writeCaseUi(
          {
            ...state,
            screen: "workspace",
            phase: 2,
            step: 2,
            role: "RO-104",
            notice: action.asRole && action.asRole !== state.role
              ? { tone: "ok", title: `Active role switched to ${action.asRole}`, body: "Discrepancy flagged and returned to institution." }
              : null,
            cases: { ...state.cases, "DEMO-001": noted },
          },
          "DEMO-001",
          { step: 2, officerNote: action.note },
        );
      }
      const stepped = withCanonicalStep(state, 2, { screen: "workspace", phase: 2, role: "RO-104" });
      const noted = writeNote(stepped.cases["DEMO-001"], { actor: "RO-104", action: "OFFICER_OBSERVATION", detail: action.note });
      return writeCaseUi(
        {
          ...stepped,
          role,
          cases: { ...stepped.cases, "DEMO-001": noted },
          notice: action.asRole && action.asRole !== state.role
            ? { tone: "ok", title: `Active role switched to ${action.asRole}`, body: "Discrepancy flagged and returned to institution." }
            : null,
        },
        "DEMO-001",
        { step: 2, officerNote: action.note },
      );
    }
    case "forward":
      return writeCaseUi(
        { ...state, step: 5, screen: "workspace", tab: "recheck", phase: 4, notice: null },
        state.caseId,
        { step: 5 },
      );
    case "intake": {
      const shortfall = action.declared > action.scanned;
      const step: Step = shortfall ? 1 : 5;
      return writeCaseUi(
        {
          ...state,
          liveIntake: true,
          screen: "workspace",
          tab: "recheck",
          step,
          phase: shortfall ? 1 : 4,
          caseId: "DEMO-001",
          role: "RO-104",
          notice: null,
          frozenHash: null,
          cases: { ...state.cases, "DEMO-001": liveFiling(action) },
        },
        "DEMO-001",
        { step, officerNote: "", directorNote: "" },
      );
    }
    case "reset":
      return {
        ...fresh(1),
        authenticated: state.authenticated,
        role: state.role,
        screen: state.authenticated ? "queue" : "workspace",
        notice: {
          tone: "ok",
          title: "Workspace reset to initial state",
          body: "All five default cases restored. Custom filings and per-case notes cleared.",
        },
      };
    case "dismiss-notice":
      return { ...state, notice: null };
    case "sign-in":
      return { ...state, authenticated: true, role: action.role, screen: action.screen ?? "queue", notice: null };
    case "sign-out":
      return { ...state, authenticated: false, notice: null };
    case "notify":
      return { ...state, notice: action.notice };
    case "cosmetic": {
      if (!can(state.role, "rescan")) {
        return refuse(state, "Rescan refused", `${state.role} cannot replace the officer file. HTTP 403.`);
      }
      const current = state.cases[state.caseId];
      const serial = current.audit.filter((event) => event.action === "COSMETIC_RESCAN").length + 1;
      const next = applyCosmeticRescan(current, serial, state.role);
      const before = evaluateCase(current);
      const after = evaluateCase(next);
      return putCase(state, next, {
        tone: "ok",
        title: "Cosmetic rescan — zero checks invalidated",
        body: `File sha256 changed from ${before.fileSha256} to ${after.fileSha256}. Substantive hash unchanged (${after.substantiveHash}). evaluationHash unchanged (${after.evaluationHash}). Invalidated checks: none.`,
      });
    }
    case "release": {
      const actor = action.asRole ?? state.role;
      const current = state.cases[state.caseId];
      const presented = evaluateCase(current).evaluationHash;
      const decision = decideRelease(current, actor, presented);
      if (!decision.ok) {
        return putCase({ ...state, role: action.asRole ?? state.role }, decision.snapshot, {
          tone: decision.http === 403 ? "deny" : "warn",
          title: decision.http === 403 ? "Director approval required" : decision.http === 409 ? "Case is not ready" : decision.title,
          body: decision.http === 403 ? "Only DIR-01 can authorise release." : decision.body,
          http: decision.http,
        });
      }
      const noted = writeNote(decision.snapshot, { actor: "DIR-01", action: "DIRECTOR_REMARK", detail: action.remark });
      const switched = Boolean(action.asRole && action.asRole !== state.role);
      return writeCaseUi(
        {
          ...state,
          role: actor,
          screen: "workspace",
          tab: "result",
          notice: switched
            ? { tone: "ok", title: `Active role switched to ${actor} · Record Authorised`, body: "Verification record authorised." }
            : null,
          cases: { ...state.cases, [noted.caseId]: noted },
        },
        noted.caseId,
        { step: 5, directorNote: action.remark },
      );
    }
    case "gateway":
      return {
        ...state,
        gatewayOutage: !state.gatewayOutage,
        notice: {
          tone: "warn",
          title: state.gatewayOutage ? "Bank gateway restored" : "Bank gateway outage",
          body: state.gatewayOutage
            ? "The bank gateway is online. New confirmations can be T1 again."
            : "The bank gateway is down. A manual letter may be recorded. It will stay T4 and will not be labelled as an API confirmation.",
        },
      };
    case "manual-letter": {
      if (!can(state.role, "manual-letter")) {
        return refuse(state, "Manual letter refused", `${state.role} cannot record bank evidence. HTTP 403.`);
      }
      if (!state.gatewayOutage) {
        return {
          ...state,
          notice: {
            tone: "warn",
            title: "Gateway is online",
            body: "Mark the bank gateway as outage before recording a manual letter. An online gateway is not an excuse to invent a T1 confirmation.",
          },
        };
      }
      const result = applyManualLetter(state.cases[state.caseId], state.role);
      return putCase(state, result.snapshot, {
        tone: result.created ? "ok" : "info",
        title: result.created ? "Manual letter recorded" : "Manual letter not added",
        body: result.reason,
      });
    }
    case "escalate": {
      if (!can(state.role, "escalate")) {
        return refuse(state, "Escalation refused", `${state.role} cannot escalate. HTTP 403.`);
      }
      const result = applyEscalation(state.cases["DEMO-005"], state.role);
      return putCase(state, result.snapshot, {
        tone: result.created ? "ok" : "info",
        title: result.created ? "Escalation opened" : "Idempotent escalation",
        body: result.created
          ? `${result.id} opened on DEMO-005. Audit events: ${result.auditLength}.`
          : `IDEMPOTENT — existing ${result.id} returned. No second escalation was written. Audit length unchanged at ${result.auditLength}.`,
      });
    }
    case "stale-hash": {
      const current = state.cases[state.caseId];
      const frozen = evaluateCase(current).evaluationHash;
      const raced = applyRaceToken(
        current,
        "Concurrent edit: INST-01 attached a revised covering letter after the officer froze the hash.",
        "INST-01",
      );
      const decision = decideRelease(raced, "DIR-01", frozen);
      return {
        ...putCase(state, decision.snapshot, {
          tone: "deny",
          http: decision.http,
          title: decision.title,
          body: decision.body,
        }),
        frozenHash: frozen,
      };
    }
    case "upload-v2": {
      const actor = action.asRole ?? state.role;
      if (!can(actor, "upload-v2")) {
        return refuse(
          state,
          "Submission refused",
          "Switch the acting role to INST-01 to submit the corrected instrument.",
        );
      }
      const step: Step = action.ocrMatched ? 4 : 3;
      const canonical = !state.liveIntake && action.serial === "FDR/PNB/2025/91007" && action.amount === 3_500_000;
      const base = canonical
        ? withCanonicalStep(state, 4, { screen: "workspace", tab: "recheck", phase: 3, role: "INST-01" })
        : {
            ...state,
            liveIntake: true,
            screen: "workspace" as const,
            tab: "recheck" as const,
            phase: 3 as const,
            step,
            role: "INST-01" as const,
            notice: null,
            cases: { ...state.cases, "DEMO-001": liveReplacement(state.cases["DEMO-001"], action) },
          };
      const noted = writeNote(base.cases["DEMO-001"], {
        actor: "INST-01",
        action: "INSTITUTION_RESUBMISSION",
        detail: action.note || `Replacement ${action.serial} submitted for ${action.amount}. Gateway token ${action.token}.`,
      });
      const switched = Boolean(action.asRole && action.asRole !== state.role);
      return writeCaseUi(
        {
          ...base,
          role: "INST-01",
          cases: { ...base.cases, "DEMO-001": noted },
          notice: switched
            ? { tone: "ok", title: "Active role switched to INST-01 · V2 Submitted", body: "Corrected instrument accepted for selective recheck." }
            : null,
        },
        "DEMO-001",
        { step },
      );
    }
    case "vigilance": {
      const actor = action.asRole ?? state.role;
      if (!can(actor, "vigilance-hold")) {
        return refuse(state, "Hold refused", `${state.role} cannot place or lift a vigilance hold. HTTP 403. Required role: VIG-22.`);
      }
      const current = state.cases[action.caseId];
      if (!current) return state;
      const next = applyVigilanceHold(current, actor, !current.vigilanceHold);
      const switched = Boolean(action.asRole && action.asRole !== state.role);
      return putCase(
        { ...state, role: actor },
        next,
        {
          tone: "ok",
          title: switched
            ? `Active role switched to ${actor} · ${next.vigilanceHold ? "Hold Placed" : "Hold Lifted"}`
            : next.vigilanceHold
              ? "Vigilance hold placed"
              : "Vigilance hold lifted",
          body: next.vigilanceHold
            ? `${formatCaseRef(action.caseId)} cannot be released while the hold stands. Instrument checks are unchanged.`
            : `${formatCaseRef(action.caseId)} hold lifted. Release still requires DIR-01 and a current evaluation hash.`,
        },
      );
    }
    default:
      return state;
  }
}

interface AppApi {
  state: AppState;
  evaluation: Evaluation;
  engineSource: EngineSource;
  setRole: (role: RoleId) => void;
  navigate: (partial: { screen?: ScreenId; tab?: WorkspaceTab; caseId?: string }) => void;
  setStep: (step: Step) => void;
  setPhase: (phase: FlowPhase) => void;
  setOfficerNote: (value: string) => void;
  setDirectorNote: (value: string) => void;
  confirmV1: (note?: string, asRole?: RoleId) => void;
  submitV2: () => void;
  forwardReview: () => void;
  intakeLive: (input: { institutionName: string; aisheCode: string; bankName: string; serial: string; declared: number; scanned: number }) => void;
  reset: () => void;
  dismissNotice: () => void;
  cosmeticRescan: () => void;
  attemptRelease: (remark?: string, asRole?: RoleId) => void;
  toggleGateway: () => void;
  recordManualLetter: () => void;
  escalateCase: () => void;
  runStaleHashBlock: () => void;
  uploadV2: (input?: { serial: string; amount: number; token: string; note: string; ocrMatched: boolean; asRole?: RoleId }) => void;
  toggleVigilance: (caseId: string, asRole?: RoleId) => void;
  exportJson: () => void;
  exportCsv: () => void;
  signIn: (role: RoleId, screen?: ScreenId) => void;
  signOut: () => void;
}

const AppContext = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, createInitial);
  const [engineSource, setEngineSource] = useState<EngineSource>("local");

  useEffect(() => {
    clearLocationChrome();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cases: state.cases, gatewayOutage: state.gatewayOutage }),
    );
  }, [state]);

  useEffect(() => {
    const snapshot = state.cases[state.caseId] ?? state.cases["DEMO-001"];
    let cancelled = false;
    void evaluateCaseWithFallback(snapshot).then((result) => {
      if (!cancelled) setEngineSource(result.source);
    });
    return () => {
      cancelled = true;
    };
  }, [state.caseId, state.cases]);

  const api = useMemo<AppApi>(() => {
    const send = (action: AppAction) => {
      dispatch(action);
    };
    return {
      state,
      evaluation: evaluateCase(state.cases[state.caseId] ?? state.cases["DEMO-001"]),
      engineSource,
      setRole: (role) => send({ type: "set-role", role }),
      navigate: (partial) => send({ type: "navigate", ...partial }),
      setStep: (step) => send({ type: "set-step", step }),
      setPhase: (phase) => send({ type: "set-phase", phase }),
      setOfficerNote: (value) => send({ type: "set-case-note", field: "officerNote", value }),
      setDirectorNote: (value) => send({ type: "set-case-note", field: "directorNote", value }),
      confirmV1: (note = "", asRole) => send({ type: "confirm-v1", note, asRole }),
      submitV2: () => send({ type: "upload-v2", serial: "FDR/PNB/2025/91007", amount: 3_500_000, token: "PNB-GW-2026-44802", note: "", ocrMatched: true }),
      forwardReview: () => send({ type: "forward" }),
      intakeLive: (input) => send({ type: "intake", ...input }),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        send({ type: "reset" });
      },
      dismissNotice: () => send({ type: "dismiss-notice" }),
      cosmeticRescan: () => send({ type: "cosmetic" }),
      attemptRelease: (remark = "", asRole) => send({ type: "release", remark, asRole }),
      toggleGateway: () => send({ type: "gateway" }),
      recordManualLetter: () => send({ type: "manual-letter" }),
      escalateCase: () => send({ type: "escalate" }),
      runStaleHashBlock: () => send({ type: "stale-hash" }),
      uploadV2: (input) =>
        send({
          type: "upload-v2",
          serial: input?.serial ?? "FDR/PNB/2025/91007",
          amount: input?.amount ?? 3_500_000,
          token: input?.token ?? "PNB-GW-2026-44802",
          note: input?.note ?? "",
          ocrMatched: input?.ocrMatched ?? true,
          asRole: input?.asRole,
        }),
      toggleVigilance: (caseId, asRole) => send({ type: "vigilance", caseId, asRole }),
      signIn: (role, screen) => send({ type: "sign-in", role, screen }),
      signOut: () => send({ type: "sign-out" }),
      exportJson: () => {
        const snapshot = state.cases[state.caseId];
        const ref = formatCaseRef(snapshot.caseId);
        void evaluateCaseWithFallback(snapshot).then(({ evaluation }) => {
          downloadText(
            `${ref}-evaluate-case.json`,
            `${JSON.stringify(evaluation, null, 2)}\n`,
            "application/json",
          );
          dispatch({
            type: "notify",
            notice: {
              tone: "ok",
              title: "JSON exported",
              body: `${ref} verification file downloaded.`,
            },
          });
        });
      },
      exportCsv: () => {
        downloadText("AICTE-FDR-register-2026.csv", registerCsv(Object.values(state.cases)), "text/csv");
        dispatch({
          type: "notify",
          notice: {
            tone: "ok",
            title: "CSV exported",
            body: "The officer register was downloaded.",
          },
        });
      },
    };
  }, [engineSource, state]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw new Error("useApp must be used inside AppProvider");
  return api;
}
