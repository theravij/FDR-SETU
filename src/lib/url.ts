import type { RoleId, ScreenId, Step, WorkspaceTab } from "../types";

const SCREENS: ScreenId[] = ["workspace", "queue", "institution", "reports", "baseline"];
const TABS: WorkspaceTab[] = ["recheck", "provenance", "clearances", "audit", "result"];
const ROLES: RoleId[] = ["RO-104", "DIR-01", "VIG-22", "INST-01"];

export interface UrlState {
  screen: ScreenId | null;
  tab: WorkspaceTab | null;
  step: Step | null;
  caseId: string | null;
  role: RoleId | null;
}

function oneOf<T extends string>(values: readonly T[], raw: string | null): T | null {
  if (!raw) return null;
  return values.includes(raw as T) ? (raw as T) : null;
}

export function readUrl(search: string = window.location.search): UrlState {
  const params = new URLSearchParams(search);
  const stepRaw = Number(params.get("step"));
  const step = stepRaw >= 1 && stepRaw <= 5 ? (stepRaw as Step) : null;
  return {
    screen: oneOf(SCREENS, params.get("screen")),
    tab: oneOf(TABS, params.get("tab")),
    step,
    caseId: params.get("case"),
    role: oneOf(ROLES, params.get("role")),
  };
}

export function writeUrl(
  input: { screen: ScreenId; tab: WorkspaceTab; step: Step; caseId: string; role: RoleId },
  mode: "push" | "replace",
): void {
  const params = new URLSearchParams();
  params.set("screen", input.screen);
  params.set("tab", input.tab);
  params.set("step", String(input.step));
  params.set("case", input.caseId);
  params.set("role", input.role);
  const next = `${window.location.pathname}?${params.toString()}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next === current) return;
  if (mode === "replace") window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
}
