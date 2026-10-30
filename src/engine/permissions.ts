import type { RoleId } from "../types";

export type PermissionAction =
  | "authorise"
  | "rescan"
  | "manual-letter"
  | "escalate"
  | "upload-v2"
  | "vigilance-hold"
  | "export";

const ALLOWED: Record<PermissionAction, RoleId[]> = {
  authorise: ["DIR-01"],
  rescan: ["RO-104", "DIR-01"],
  "manual-letter": ["RO-104", "DIR-01"],
  escalate: ["RO-104", "DIR-01", "VIG-22"],
  "upload-v2": ["INST-01"],
  "vigilance-hold": ["VIG-22"],
  export: ["RO-104", "DIR-01", "VIG-22", "INST-01"],
};

export function can(role: RoleId, action: PermissionAction): boolean {
  return ALLOWED[action].includes(role);
}

export const ROLES: Array<{ id: RoleId; title: string; summary: string }> = [
  {
    id: "RO-104",
    title: "Review Officer",
    summary: "Reconciles figures and records evidence. Cannot authorise release.",
  },
  {
    id: "DIR-01",
    title: "Director",
    summary: "Release authority. Authorises only against the current evaluation hash.",
  },
  {
    id: "VIG-22",
    title: "Vigilance",
    summary: "Reads the audit trail and may place or lift a hold. Cannot approve.",
  },
  {
    id: "INST-01",
    title: "Institution",
    summary: "Uploads a replacement instrument for its own case. Cannot approve.",
  },
];
