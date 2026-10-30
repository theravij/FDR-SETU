import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildDemo001, seedCases } from "../data/cases";
import { PITCH } from "../data/pitch";
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
import { readUrl, writeUrl, type UrlState } from "../lib/url";
import type { CaseSnapshot, Evaluation, Notice, RoleId, ScreenId, Step, WorkspaceTab } from "../types";

export interface DemoState {
  screen: ScreenId;
  tab: WorkspaceTab;
  step: Step;
  caseId: string;
  role: RoleId;
  cases: Record<string, CaseSnapshot>;
  pitchPlaying: boolean;
  pitchIndex: number;
  gatewayOutage: boolean;
  frozenHash: string | null;
  notice: Notice | null;
}

type DemoAction =
  | { type: "apply-url"; url: UrlState }
  | { type: "set-role"; role: RoleId }
  | { type: "navigate"; screen?: ScreenId; tab?: WorkspaceTab; caseId?: string }
  | { type: "set-step"; step: Step }
  | { type: "pitch-to"; index: number }
  | { type: "pitch-advance" }
  | { type: "toggle-pitch" }
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

function pitchIndexFor(step: Step): number {
  const index = PITCH.findIndex((stage) => stage.step === step);
  return index === -1 ? 0 : index;
}

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
    caseId: "DEMO-001",
    role: "RO-104",
    cases: { ...seedCases(), "DEMO-001": buildDemo001(step) },
    pitchPlaying: false,
    pitchIndex: pitchIndexFor(step),
    gatewayOutage: false,
    frozenHash: null,
    notice: null,
  };
}

function createInitial(): DemoState {
  const stored = loadStored();
  const url = readUrl();
  const step = url.step ?? 1;
  const cases = seedCases();
  for (const [id, snapshot] of Object.entries(stored?.cases ?? {})) {
    if (id === "DEMO-001" || !snapshot?.versions?.length || snapshot.caseId !== id) continue;
    cases[id] = snapshot;
  }
  cases["DEMO-001"] = buildDemo001(step);
  const requestedCase = url.caseId && cases[url.caseId] ? url.caseId : "DEMO-001";
  return {
    screen: url.screen ?? "workspace",
    tab: url.tab ?? "recheck",
    step,
    caseId: requestedCase,
    role: url.role ?? "RO-104",
    cases,
    pitchPlaying: false,
    pitchIndex: pitchIndexFor(step),
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
    pitchIndex: pitchIndexFor(step),
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
    case "apply-url": {
      const step = action.url.step ?? state.step;
      const caseId = action.url.caseId && state.cases[action.url.caseId] ? action.url.caseId : state.caseId;
      const next: DemoState = {
        ...state,
        screen: action.url.screen ?? state.screen,
        tab: action.url.tab ?? state.tab,
        role: action.url.role ?? state.role,
        caseId,
        step,
        pitchIndex: pitchIndexFor(step),
      };
      if (action.url.step && action.url.step !== state.step) {
        next.cases = { ...state.cases, "DEMO-001": buildDemo001(action.url.step) };
        next.frozenHash = null;
      }
      return next;
    }
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
    case "pitch-to": {
      const stage = PITCH[action.index] ?? PITCH[0];
      return withCanonicalStep(state, stage.step, {
        screen: stage.screen,
        tab: stage.tab,
        pitchPlaying: state.pitchPlaying,
      });
    }
    case "pitch-advance": {
      const index = (state.pitchIndex + 1) % PITCH.length;
      const stage = PITCH[index];
      return withCanonicalStep(state, stage.step, {
        screen: stage.screen,
        tab: stage.tab,
        pitchPlaying: true,
      });
    }
    case "toggle-pitch":
      return { ...state, pitchPlaying: !state.pitchPlaying };
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
        http: decision.http,
        title: decision.title,
        body: decision.body,
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
            ? "The simulated gateway is online. New confirmations can be T1 again."
            : "The simulated bank gateway is down. A manual letter may be recorded. It will stay T4 and will not be labelled as an API confirmation.",
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
          "Upload refused",
          `${state.role} cannot upload a replacement instrument. HTTP 403. That action belongs to INST-01.`,
        );
      }
      if (state.cases["DEMO-001"].currentVersionId === "V2") {
        return {
          ...state,
          notice: {
            tone: "info",
            title: "V2 is already current",
            body: "DEMO-001 already has the replacement instrument. Open step 3 to see the selective recheck.",
          },
        };
      }
      return {
        ...withCanonicalStep(state, 3, { screen: "workspace", tab: "recheck" }),
        notice: {
          tone: "ok",
          title: "V2 uploaded",
          body: "INST-01 uploaded the replacement FDR. CHK-02 is RECHECK_REQUIRED. CHK-03 and CHK-04 stay preserved. EV-BNK-101 covers V1 only.",
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
  pitchTo: (index: number) => void;
  togglePitch: () => void;
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
  const historyMode = useRef<"push" | "replace">("replace");
  const skipWrite = useRef(false);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
    } else {
      writeUrl(state, historyMode.current);
      historyMode.current = "push";
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cases: state.cases, gatewayOutage: state.gatewayOutage }),
    );
  }, [state]);

  useEffect(() => {
    const onPop = () => {
      skipWrite.current = true;
      dispatch({ type: "apply-url", url: readUrl() });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!state.pitchPlaying) return;
    const timer = window.setTimeout(() => {
      historyMode.current = "replace";
      dispatch({ type: "pitch-advance" });
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [state.pitchPlaying, state.pitchIndex]);

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
    const send = (action: DemoAction, history: "push" | "replace" = "push") => {
      historyMode.current = history;
      dispatch(action);
    };
    return {
      state,
      evaluation: evaluateCase(state.cases[state.caseId] ?? state.cases["DEMO-001"]),
      engineSource,
      setRole: (role) => send({ type: "set-role", role }),
      navigate: (partial) => send({ type: "navigate", ...partial }),
      setStep: (step) => send({ type: "set-step", step }),
      pitchTo: (index) => send({ type: "pitch-to", index }),
      togglePitch: () => send({ type: "toggle-pitch" }, "replace"),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        send({ type: "reset" });
      },
      dismissNotice: () => send({ type: "dismiss-notice" }, "replace"),
      cosmeticRescan: () => send({ type: "cosmetic" }, "replace"),
      attemptRelease: () => send({ type: "release" }, "replace"),
      toggleGateway: () => send({ type: "gateway" }, "replace"),
      recordManualLetter: () => send({ type: "manual-letter" }, "replace"),
      escalateDemo005: () => send({ type: "escalate" }, "replace"),
      runStaleHashBlock: () => send({ type: "stale-hash" }, "replace"),
      uploadV2: () => send({ type: "upload-v2" }),
      toggleVigilance: (caseId) => send({ type: "vigilance", caseId }, "replace"),
      exportJson: () => {
        const snapshot = state.cases[state.caseId];
        void evaluateCaseWithFallback(snapshot).then(({ evaluation, source }) => {
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
              body:
                source === "api"
                  ? `${snapshot.caseId}-evaluate-case.json downloaded from the API. It matches the in-browser engine.`
                  : `${snapshot.caseId}-evaluate-case.json downloaded from the in-browser engine.`,
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
            body: "fdr-setu-register.csv downloaded for DEMO-001 through DEMO-005.",
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
