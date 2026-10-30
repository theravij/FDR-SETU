import type { RoleId, ScreenId, Step, WorkspaceTab } from "../types";

export const FLOW_DURATION_MS = 60_000;

export interface FlowPhase {
  id: string;
  at: number;
  title: string;
  body: string;
  screen: ScreenId;
  tab: WorkspaceTab;
  step: Step;
  role: RoleId;
  probeApi: boolean;
}

/** Deterministic judge walkthrough. Times are milliseconds from the start. */
export const FLOW_PHASES: FlowPhase[] = [
  {
    id: "load",
    at: 0,
    title: "0–10s · Sample case",
    body: "DEMO-001 is loaded. The form says ₹35,00,000 and the sample OCR says ₹30,00,000. Clock 2026-10-30.",
    screen: "workspace",
    tab: "recheck",
    step: 1,
    role: "RO-104",
    probeApi: false,
  },
  {
    id: "intake",
    at: 10_000,
    title: "10–25s · Document intake",
    body: "The file shows institution-entered, OCR, reviewer-corrected, and independently confirmed values. A new file hash is not a clearance.",
    screen: "workspace",
    tab: "provenance",
    step: 1,
    role: "RO-104",
    probeApi: false,
  },
  {
    id: "v1",
    at: 18_000,
    title: "10–25s · V1 confirmation",
    body: "The amount is reconciled. Sample evidence EV-BNK-101 covers V1 only.",
    screen: "workspace",
    tab: "recheck",
    step: 2,
    role: "RO-104",
    probeApi: false,
  },
  {
    id: "engine",
    at: 25_000,
    title: "25–45s · Selective recheck",
    body: "V2 changes the bank reference. CHK-02 reopens. CHK-03 and CHK-04 stay preserved. The evaluation is running.",
    screen: "workspace",
    tab: "recheck",
    step: 3,
    role: "RO-104",
    probeApi: true,
  },
  {
    id: "ready",
    at: 45_000,
    title: "45–60s · Review readiness",
    body: "DIR-01 can record the decision against the current evaluation. Export JSON is available. This screen does not issue the NOC or move the payment.",
    screen: "workspace",
    tab: "result",
    step: 5,
    role: "DIR-01",
    probeApi: false,
  },
];

export function phaseAt(elapsedMs: number): FlowPhase {
  let current = FLOW_PHASES[0];
  for (const phase of FLOW_PHASES) {
    if (elapsedMs >= phase.at) current = phase;
  }
  return current;
}
