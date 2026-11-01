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
import { evaluateCaseWithFallback, type EngineSource } from "../lib/api";
import { downloadText } from "../lib/download";
import { clearLocationChrome } from "../lib/url";
import type { CaseSnapshot, Evaluation, Notice, RoleId, ScreenId, Step, WorkspaceTab } from "../types";

export type FlowPhase = 1 | 2 | 3 | 4;

export interface DemoState {
  screen: ScreenId;
  tab: WorkspaceTab;
  step: Step;
  phase: FlowPhase;
  caseId: string;
  role: RoleId;
  cases: Record<string, CaseSnapshot>;
  gatewayOutage: boolean;
  frozenHash: string | null;
  notice: Notice | null;
}

type DemoAction =
  | { type: "set-role"; role: RoleId }
  | { type: "navigate"; screen?: ScreenId; tab?: WorkspaceTab; caseId?: string }
  | { type: "set-step"; step: Step }
  | { type: "set-phase"; phase: FlowPhase }
  | { type: "confirm-v1" }
  | { type: "reset" }
  | { type: "cosmetic" }
  | { type: "release" }
  | { type: "gateway" }
  | { type: "manual-letter" }
  | { type: "escalate" }
  | { type: "stale-hash" }
  | { type: "upload-v2" }
  | { type: "vigilance"; caseId: string }
  | { type: "dismiss-notice" }
  | { type: "notify"; notice: Notice };

const STORAGE_KEY = "fdr-setu-demo-v1";

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

function fresh(step: Step = 1): DemoState {
  return {
    screen: "workspace",
    tab: "recheck",
    step,
    phase: 1,
    caseId: "DEMO-001",
    role: "RO-104",
    cases: { ...seedCases(), "DEMO-001": buildDemo001(step) },
    gatewayOutage: false,
    frozenHash: null,
    notice: null,
  };
}

function createInitial(): DemoState {
  const stored = loadStored();
  const cases = seedCases();
  for (const [id, snapshot] of Object.entries(stored?.cases ?? {})) {
    if (id === "DEMO-001" || !snapshot?.versions?.length || snapshot.caseId !== id) continue;
    cases[id] = snapshot;
  }
  cases["DEMO-001"] = buildDemo001(1);
  return {
    screen: "workspace",
    tab: "recheck",
    step: 1,
    phase: 1,
    caseId: "DEMO-001",
    role: "RO-104",
    cases,
    gatewayOutage: stored?.gatewayOutage ?? false,
    frozenHash: null,
    notice: null,
  };
}

function withCanonicalStep(state: DemoState, step: Step, patch: Partial<DemoState>): DemoState {
  return {
    ...state,
    ...patch,
    step,
    caseId: "DEMO-001",
    cases: { ...state.cases, "DEMO-001": buildDemo001(step) },
    frozenHash: null,
    notice: null,
  };
}

function putCase(state: DemoState, snapshot: CaseSnapshot, notice: Notice): DemoState {
  return {
    ...state,
    cases: { ...state.cases, [snapshot.caseId]: snapshot },
    notice,
  };
}

function refuse(state: DemoState, title: string, body: string): DemoState {
  return { ...state, notice: { tone: "deny", http: 403, title, body } };
}

function reduce(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "set-role":
      return { ...state, role: action.role };
    case "navigate":
      return {
        ...state,
        screen: action.screen ?? state.screen,
        tab: action.tab ?? state.tab,
        caseId: action.caseId && state.cases[action.caseId] ? action.caseId : state.caseId,
      };
    case "set-step":
      return withCanonicalStep(state, action.step, { screen: "workspace" });
    case "set-phase":
      if (action.phase === 1) return withCanonicalStep(state, 1, { screen: "workspace", phase: 1, role: "RO-104" });
      return { ...state, screen: "workspace", phase: action.phase, notice: null };
    case "confirm-v1":
      return withCanonicalStep(state, 2, { screen: "workspace", phase: 2, role: "RO-104" });
    case "reset":
      return fresh(1);
    case "dismiss-notice":
      return { ...state, notice: null };
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
      const current = state.cases[state.caseId];
      const presented = evaluateCase(current).evaluationHash;
      const decision = decideRelease(current, state.role, presented);
      return putCase(state, decision.snapshot, {
        tone: decision.ok ? "ok" : decision.http === 403 ? "deny" : "warn",
        title: decision.ok
          ? "Release authorised"
          : decision.http === 403
            ? "Director approval required"
            : decision.http === 409
              ? "Case is not ready"
              : decision.title,
        body: decision.ok
          ? "The case is verified. The NOC and payment stay with the authorised AICTE process."
          : decision.http === 403
            ? "Only DIR-01 can authorise release."
            : decision.body,
      });
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
      if (!can(state.role, "upload-v2")) {
        return refuse(
          state,
          "Submission refused",
          "Switch the acting role to INST-01 to submit the corrected instrument.",
        );
      }
      if (state.cases["DEMO-001"].currentVersionId === "V2" && state.step >= 3) {
        return { ...state, screen: "workspace", tab: "recheck", phase: 3, notice: null };
      }
      return {
        ...withCanonicalStep(state, 3, { screen: "workspace", tab: "recheck", phase: 3 }),
        notice: {
          tone: "ok",
          title: "Corrected instrument submitted",
          body: "Two unchanged checks were preserved. Only modified fields were re-evaluated.",
        },
      };
    }
    case "vigilance": {
      if (!can(state.role, "vigilance-hold")) {
        return refuse(state, "Hold refused", `${state.role} cannot place or lift a vigilance hold. HTTP 403. Required role: VIG-22.`);
      }
      const current = state.cases[action.caseId];
      if (!current) return state;
      const next = applyVigilanceHold(current, state.role, !current.vigilanceHold);
      return putCase(state, next, {
        tone: "ok",
        title: next.vigilanceHold ? "Vigilance hold placed" : "Vigilance hold lifted",
        body: next.vigilanceHold
          ? `${action.caseId} cannot be released while the hold stands. Instrument checks are unchanged.`
          : `${action.caseId} hold lifted. Release still requires DIR-01 and a current evaluation hash.`,
      });
    }
    default:
      return state;
  }
}

interface DemoApi {
  state: DemoState;
  evaluation: Evaluation;
  engineSource: EngineSource;
  setRole: (role: RoleId) => void;
  navigate: (partial: { screen?: ScreenId; tab?: WorkspaceTab; caseId?: string }) => void;
  setStep: (step: Step) => void;
  setPhase: (phase: FlowPhase) => void;
  confirmV1: () => void;
  submitV2: () => void;
  reset: () => void;
  dismissNotice: () => void;
  cosmeticRescan: () => void;
  attemptRelease: () => void;
  toggleGateway: () => void;
  recordManualLetter: () => void;
  escalateDemo005: () => void;
  runStaleHashBlock: () => void;
  uploadV2: () => void;
  toggleVigilance: (caseId: string) => void;
  exportJson: () => void;
  exportCsv: () => void;
}

const DemoContext = createContext<DemoApi | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
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

  const api = useMemo<DemoApi>(() => {
    const send = (action: DemoAction) => {
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
      confirmV1: () => send({ type: "confirm-v1" }),
      submitV2: () => send({ type: "upload-v2" }),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        send({ type: "reset" });
      },
      dismissNotice: () => send({ type: "dismiss-notice" }),
      cosmeticRescan: () => send({ type: "cosmetic" }),
      attemptRelease: () => send({ type: "release" }),
      toggleGateway: () => send({ type: "gateway" }),
      recordManualLetter: () => send({ type: "manual-letter" }),
      escalateDemo005: () => send({ type: "escalate" }),
      runStaleHashBlock: () => send({ type: "stale-hash" }),
      uploadV2: () => send({ type: "upload-v2" }),
      toggleVigilance: (caseId) => send({ type: "vigilance", caseId }),
      exportJson: () => {
        const snapshot = state.cases[state.caseId];
        void evaluateCaseWithFallback(snapshot).then(({ evaluation }) => {
          downloadText(
            `${snapshot.caseId}-evaluate-case.json`,
            `${JSON.stringify(evaluation, null, 2)}\n`,
            "application/json",
          );
          dispatch({
            type: "notify",
            notice: {
              tone: "ok",
              title: "JSON exported",
              body: `${snapshot.caseId} verification file downloaded.`,
            },
          });
        });
      },
      exportCsv: () => {
        downloadText("fdr-setu-register.csv", registerCsv(Object.values(state.cases)), "text/csv");
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

  return <DemoContext.Provider value={api}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoApi {
  const api = useContext(DemoContext);
  if (!api) throw new Error("useDemo must be used inside DemoProvider");
  return api;
}
