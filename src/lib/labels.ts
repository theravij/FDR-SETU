import type { CheckId } from "../types";

const CASE_REFS: Record<string, string> = {
  "DEMO-001": "AICTE-FDR-2026-0104",
  "DEMO-002": "AICTE-RPGF-2026-0108",
  "DEMO-003": "AICTE-RTGS-2026-0112",
  "DEMO-004": "AICTE-FDR-2026-0119",
  "DEMO-005": "AICTE-FDR-2026-0125",
};

export function formatCaseRef(caseId: string): string {
  return CASE_REFS[caseId] ?? caseId;
}

export function formatRuleVersion(rule: string): string {
  if (rule === "DEMO-POLICY-6.46") return "AICTE-HANDBOOK-2026-v6.4";
  return rule;
}

export function formatReleaseScope(value: string): string {
  if (value === "NOT_EXECUTED_HERE") {
    return "Scope: Verification & Lien Clearance Only (Disbursement via Public Financial Management System)";
  }
  return value;
}

export function maskOperationalText(text: string): string {
  return text
    .replaceAll("DEMO-POLICY-6.46", "AICTE-HANDBOOK-2026-v6.4")
    .replaceAll("NOT_EXECUTED_HERE", "Verification & Lien Clearance Only")
    .replaceAll("ESC-DEMO-005", "ESC-2026-0125")
    .replaceAll("DEMO-005", "AICTE-FDR-2026-0125")
    .replaceAll("DEMO-004", "AICTE-FDR-2026-0119")
    .replaceAll("DEMO-003", "AICTE-RTGS-2026-0112")
    .replaceAll("DEMO-002", "AICTE-RPGF-2026-0108")
    .replaceAll("DEMO-001", "AICTE-FDR-2026-0104");
}

export const CHECK_TITLES: Record<CheckId, string> = {
  "CHK-01": "Principal Amount Agreement",
  "CHK-02": "Bank Gateway Confirmation",
  "CHK-03": "Institution Identity Verification",
  "CHK-04": "AICTE Lien & Pledge Clause",
};

export const CHECK_LABELS: Record<CheckId, string> = {
  "CHK-01": "1. Principal Amount Match",
  "CHK-02": "2. Bank Instrument Verification",
  "CHK-03": "3. Institution Identity",
  "CHK-04": "4. AICTE Lien & Beneficiary",
};

export const FLOW_STEPS = [
  { id: 1 as const, title: "Initial FDR Check", hint: "Discrepancy detected" },
  { id: 2 as const, title: "Corrected V2 FDR", hint: "Institution resubmits" },
  { id: 3 as const, title: "Smart Selective Recheck", hint: "Only changed fields" },
  { id: 4 as const, title: "Director Approval", hint: "Authorise release" },
];

export function displayStatus(status: string): string {
  switch (status) {
    case "DISCREPANCY":
      return "Mismatch found";
    case "RECHECK_REQUIRED":
    case "RECHECK REQUIRED":
      return "Needs recheck";
    case "PRESERVED_CONFIRMED":
    case "PRESERVED":
      return "PRESERVED FROM V1";
    case "CONFIRMED":
      return "Confirmed";
    case "PENDING":
      return "Pending";
    case "BLOCKED":
      return "Blocked";
    case "RELEASED":
      return "RELEASED — Verified";
    case "READY FOR RELEASE":
      return "Ready for approval";
    case "VIGILANCE HOLD":
      return "On hold";
    case "IN PROGRESS":
      return "In progress";
    default:
      return status;
  }
}

export function recheckBadge(id: CheckId, status: string): { label: string; tone: "reverify" | "preserved" | "open" } {
  if (id === "CHK-03" || id === "CHK-04") {
    if (status === "PRESERVED_CONFIRMED" || status === "CONFIRMED") {
      return { label: "PRESERVED FROM V1", tone: "preserved" };
    }
  }
  if (status === "CONFIRMED" || status === "PRESERVED_CONFIRMED") {
    return { label: "RE-VERIFIED ON V2", tone: "reverify" };
  }
  if (status === "RECHECK_REQUIRED") return { label: "Needs recheck", tone: "open" };
  if (status === "DISCREPANCY") return { label: "Mismatch found", tone: "open" };
  return { label: displayStatus(status), tone: "open" };
}
