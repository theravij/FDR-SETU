import type { CheckId } from "../types";

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
