import { appendAudit } from "../lib/audit";
import { sha256 } from "../lib/sha256";
import type { BankEvidence, CaseSnapshot, ReleaseDecision, RoleId } from "../types";
import { currentVersion, evaluateCase } from "./evaluateCase";
import { can } from "./permissions";

export function applyCosmeticRescan(snapshot: CaseSnapshot, serial: number, actor: RoleId): CaseSnapshot {
  const versions = snapshot.versions.map((version) => {
    if (version.versionId !== snapshot.currentVersionId) return version;
    const fileSha256 = sha256(`COSMETIC-RESCAN|${version.fileSha256}|${serial}`);
    const stem = version.fileName.replace(/\.pdf$/i, "");
    return { ...version, fileSha256, fileName: `${stem}-rescan-${serial}.pdf` };
  });
  const next: CaseSnapshot = { ...snapshot, versions };
  const current = currentVersion(next);
  return appendAudit(next, {
    actor,
    action: "COSMETIC_RESCAN",
    detail: `File sha256 is now ${current.fileSha256}. Substantive hash unchanged at ${current.substantiveHash}. No check scope changed.`,
  });
}

export function applyManualLetter(snapshot: CaseSnapshot, actor: RoleId): { snapshot: CaseSnapshot; created: boolean; reason: string } {
  const version = currentVersion(snapshot);
  const existing = snapshot.bankEvidence.find(
    (item) =>
      item.coversVersionId === version.versionId && item.coversSubstantiveHash === version.substantiveHash,
  );
  if (existing) {
    return {
      snapshot,
      created: false,
      reason: `${existing.id} already covers ${version.versionId}. A manual letter was not added.`,
    };
  }
  const evidence: BankEvidence = {
    id: `EV-BNK-MNL-${snapshot.caseId}`,
    coversVersionId: version.versionId,
    coversSubstantiveHash: version.substantiveHash,
    tier: "T4_MANUAL_LETTER",
    source: "MANUAL_LETTER",
    gatewayStatus: "OUTAGE",
    amountInr: version.fields.observedAmountInr,
    referenceNumber: version.fields.referenceNumber,
    recordedAt: "2026-10-30T16:10:00+05:30",
    recordedBy: actor,
    reference: `BRANCH-LETTER-${snapshot.caseId}`,
    statement:
      "Bank gateway outage. This record is an attested branch letter, not an API confirmation. Coverage is limited to the stated version and substantive hash.",
  };
  const next = appendAudit(
    { ...snapshot, bankEvidence: [...snapshot.bankEvidence, evidence] },
    {
      actor,
      action: "MANUAL_LETTER_RECORDED",
      detail: `${evidence.id} recorded at T4 during gateway outage. It is not presented as a T1 confirmation.`,
    },
  );
  return { snapshot: next, created: true, reason: evidence.statement };
}

export function applyEscalation(
  snapshot: CaseSnapshot,
  actor: RoleId,
): { snapshot: CaseSnapshot; id: string; created: boolean; auditLength: number } {
  if (snapshot.escalation) {
    return {
      snapshot,
      id: snapshot.escalation.id,
      created: false,
      auditLength: snapshot.audit.length,
    };
  }
  const id = snapshot.caseId === "DEMO-005" ? "ESC-DEMO-005" : `ESC-${snapshot.caseId}`;
  const escalation = {
    id,
    at: "2026-10-30T16:20:00+05:30",
    by: actor,
    reason: "Amount discrepancy remains open past the ageing threshold. One escalation record is enough.",
  };
  const next = appendAudit(
    { ...snapshot, escalation },
    {
      actor,
      action: "ESCALATION_OPENED",
      detail: `${id} opened. A repeat request must return this id and must not append another escalation.`,
    },
  );
  return { snapshot: next, id, created: true, auditLength: next.audit.length };
}

export function applyRaceToken(snapshot: CaseSnapshot, token: string, actor: string): CaseSnapshot {
  return appendAudit(
    { ...snapshot, raceToken: token },
    { actor, action: "CONCURRENT_EDIT", detail: token },
  );
}

export function decideRelease(snapshot: CaseSnapshot, role: RoleId, presentedHash: string): ReleaseDecision {
  const evaluation = evaluateCase(snapshot);
  if (!can(role, "authorise")) {
    return {
      http: 403,
      ok: false,
      title: "Release refused",
      body: `${role} cannot approve a release. HTTP 403. Release authority is DIR-01.`,
      snapshot,
    };
  }
  if (presentedHash !== evaluation.evaluationHash) {
    return {
      http: 412,
      ok: false,
      title: "Stale evaluation blocked",
      body: `Release refused. Presented evaluationHash ${presentedHash} does not match current evaluationHash ${evaluation.evaluationHash}. The snapshot changed after the hash was frozen. Nothing was authorised.`,
      snapshot,
    };
  }
  if (!evaluation.releaseReady) {
    return {
      http: 409,
      ok: false,
      title: "Preconditions not met",
      body: `DIR-01 may authorise, but this snapshot is not ready: ${evaluation.blockers.join("; ") || "unknown blocker"}.`,
      snapshot,
    };
  }
  if (snapshot.release.authorised) {
    return {
      http: 200,
      ok: true,
      title: "Already authorised",
      body: `Release was already authorised by ${snapshot.release.by} against ${snapshot.release.evaluationHash}.`,
      snapshot,
    };
  }
  const authorised = appendAudit(
    {
      ...snapshot,
      release: {
        authorised: true,
        by: role,
        at: "2026-10-30T16:40:00+05:30",
        evaluationHash: evaluation.evaluationHash,
      },
    },
    {
      actor: role,
      action: "RELEASE_AUTHORISED",
      detail: `Review decision recorded against evaluationHash ${evaluation.evaluationHash}. Financial release is not executed here.`,
    },
  );
  return {
    http: 200,
    ok: true,
    title: "Review decision recorded",
    body: `DIR-01 recorded an authorised review decision against evaluationHash ${evaluation.evaluationHash}. FDR Setu does not issue the NOC and does not execute the RTGS payment.`,
    snapshot: authorised,
  };
}

export function applyVigilanceHold(snapshot: CaseSnapshot, actor: RoleId, hold: boolean): CaseSnapshot {
  const note = hold
    ? "Vigilance query on the source of funds. Instrument checks are not the reason for the hold."
    : "";
  return appendAudit(
    { ...snapshot, vigilanceHold: hold, vigilanceNote: hold ? snapshot.vigilanceNote || note : "" },
    {
      actor,
      action: hold ? "VIGILANCE_HOLD_PLACED" : "VIGILANCE_HOLD_LIFTED",
      detail: hold ? note : "Hold lifted. Release still requires a current evaluation hash and DIR-01.",
    },
  );
}
