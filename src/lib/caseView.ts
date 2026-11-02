import { formatInr } from "./format";
import type { CaseSnapshot, CheckId, InstrumentVersion, RoleId } from "../types";

export const CHECK_NAMES: Record<CheckId, string> = {
  "CHK-01": "Principal Amount",
  "CHK-02": "Bank Gateway CBS",
  "CHK-03": "Institution Identity",
  "CHK-04": "AICTE Lien Clause",
};

const ROLE_TITLES: Record<RoleId, string> = {
  "RO-104": "Review Officer",
  "DIR-01": "Director",
  "VIG-22": "Vigilance",
  "INST-01": "Institution",
};

export function roleChip(role: string): string {
  if (role in ROLE_TITLES) return `${role} · ${ROLE_TITLES[role as RoleId]}`;
  return role;
}

export function activeVersion(snapshot: CaseSnapshot): InstrumentVersion | undefined {
  return snapshot.versions.find((item) => item.versionId === snapshot.currentVersionId) ?? snapshot.versions[0];
}

export function priorVersion(snapshot: CaseSnapshot, current: InstrumentVersion | undefined): InstrumentVersion | undefined {
  if (!current) return undefined;
  return snapshot.versions.find((item) => item.versionId !== current.versionId);
}

export function amountGap(declared: number, observed: number): number {
  return Math.max(0, declared - observed);
}

export type PillTone = "rose" | "amber" | "emerald" | "indigo" | "slate";

export interface GlanceRow {
  id: CheckId;
  title: string;
  facts: string[];
  pill: string;
  tone: PillTone;
  kind: "shortfall" | "needs-v2" | "verified-v1" | "reverified" | "locked" | "open";
}

export function glanceRows(snapshot: CaseSnapshot): GlanceRow[] {
  const current = activeVersion(snapshot);
  const earlier = snapshot.versions.find((item) => item.versionId === "V1") ?? snapshot.versions[0];
  const fields = current?.fields;
  const declared = fields?.declaredAmountInr ?? 0;
  const observed = fields?.observedAmountInr ?? 0;
  const shortfall = amountGap(declared, observed);
  const versionId = current?.versionId ?? "V1";
  const onReplacement = versionId !== "V1" && shortfall === 0;
  const covering = snapshot.bankEvidence.filter((item) => item.coversVersionId === versionId);
  const evidence = covering[covering.length - 1];
  const bank = fields?.bankName || "Bank";
  const identitySame = Boolean(
    earlier &&
      current &&
      earlier.fields.aisheCode === current.fields.aisheCode &&
      earlier.fields.pan === current.fields.pan &&
      earlier.fields.institutionName === current.fields.institutionName,
  );
  const lienSame = Boolean(earlier && current && earlier.fields.beneficiaryOrDdo === current.fields.beneficiaryOrDdo);

  const principalFacts = [
    `Form ${formatInr(declared)}`,
    `${versionId} Scan ${formatInr(observed)}`,
    shortfall > 0 ? `-${formatInr(shortfall)} Shortfall` : "100% Match",
  ];
  const gatewayFacts = [
    evidence ? `${bank} · ${evidence.id}` : `${bank} · ${fields?.referenceNumber || "No token"}`,
    evidence ? `${formatInr(evidence.amountInr)} covered` : shortfall > 0 ? "Shortfall on this version" : "Gateway pending",
  ];
  const identityFacts = [
    fields?.aisheCode || "AISHE pending",
    snapshot.identityConfirmed ? "PAN & Legal Name Matched" : "Identity open",
  ];
  const lienFacts = [snapshot.lienConfirmed ? "100% Lien Pledged to AICTE" : "Lien open", fields?.beneficiaryOrDdo || "Beneficiary pending"];

  const principal: GlanceRow = shortfall > 0
    ? { id: "CHK-01", title: CHECK_NAMES["CHK-01"], facts: principalFacts, pill: `✕ -${formatInr(shortfall)} Shortfall`, tone: "rose", kind: "shortfall" }
    : onReplacement
      ? { id: "CHK-01", title: CHECK_NAMES["CHK-01"], facts: principalFacts, pill: "⚡ Re-verified on V2", tone: "indigo", kind: "reverified" }
      : { id: "CHK-01", title: CHECK_NAMES["CHK-01"], facts: principalFacts, pill: "✓ Verified on V1", tone: "emerald", kind: "verified-v1" };

  const gateway: GlanceRow = shortfall > 0 && versionId === "V1"
    ? { id: "CHK-02", title: CHECK_NAMES["CHK-02"], facts: gatewayFacts, pill: "⏳ Needs V2", tone: "amber", kind: "needs-v2" }
    : onReplacement
      ? { id: "CHK-02", title: CHECK_NAMES["CHK-02"], facts: gatewayFacts, pill: "⚡ Re-verified on V2", tone: "indigo", kind: "reverified" }
      : { id: "CHK-02", title: CHECK_NAMES["CHK-02"], facts: gatewayFacts, pill: evidence ? "✓ Gateway on file" : "⏳ Gateway pending", tone: evidence ? "emerald" : "amber", kind: evidence ? "verified-v1" : "open" };

  const identity: GlanceRow = onReplacement && identitySame && snapshot.identityConfirmed
    ? { id: "CHK-03", title: CHECK_NAMES["CHK-03"], facts: identityFacts, pill: "🔒 Locked from V1 (Saved)", tone: "emerald", kind: "locked" }
    : { id: "CHK-03", title: CHECK_NAMES["CHK-03"], facts: identityFacts, pill: snapshot.identityConfirmed ? "✓ Verified on V1" : "⏳ Identity open", tone: snapshot.identityConfirmed ? "emerald" : "amber", kind: snapshot.identityConfirmed ? "verified-v1" : "open" };

  const lien: GlanceRow = onReplacement && lienSame && snapshot.lienConfirmed
    ? { id: "CHK-04", title: CHECK_NAMES["CHK-04"], facts: lienFacts, pill: "🔒 Locked from V1 (Saved)", tone: "emerald", kind: "locked" }
    : { id: "CHK-04", title: CHECK_NAMES["CHK-04"], facts: lienFacts, pill: snapshot.lienConfirmed ? "✓ Verified on V1" : "⏳ Lien open", tone: snapshot.lienConfirmed ? "emerald" : "amber", kind: snapshot.lienConfirmed ? "verified-v1" : "open" };

  return [principal, gateway, identity, lien];
}

export function glanceSummary(rows: GlanceRow[]): Array<{ label: string; tone: PillTone }> {
  const locked = rows.filter((row) => row.kind === "locked").length;
  const reverified = rows.filter((row) => row.kind === "reverified").length;
  const discrepancies = rows.filter((row) => row.kind === "shortfall").length;
  const verified = rows.filter((row) => row.kind === "verified-v1").length;
  const waiting = rows.some((row) => row.kind === "needs-v2" || row.kind === "shortfall");
  if (waiting) {
    return [
      { label: `${discrepancies} Discrepancy Found`, tone: "rose" },
      { label: `${verified} Identity/Lien Verified`, tone: "emerald" },
      { label: "Awaiting V2 Instrument", tone: "amber" },
    ];
  }
  const saved = rows.length ? Math.round((locked / rows.length) * 100) : 0;
  const blockers = rows.filter((row) => row.kind === "open" || row.kind === "shortfall" || row.kind === "needs-v2").length;
  return [
    { label: `🔒 ${locked} Checks Locked from V1 (${saved}% Time Saved)`, tone: "emerald" },
    { label: `⚡ ${reverified} Amount Checks Re-verified on V2`, tone: "indigo" },
    { label: `✓ ${blockers} Blockers Remaining`, tone: blockers ? "amber" : "emerald" },
  ];
}

export const PILL_CLASS: Record<PillTone, string> = {
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export const EDGE_CLASS: Record<PillTone, string> = {
  rose: "border-l-rose-500",
  amber: "border-l-amber-400",
  emerald: "border-l-emerald-500",
  indigo: "border-l-indigo-500",
  slate: "border-l-slate-200",
};
