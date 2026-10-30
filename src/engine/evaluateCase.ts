import { canonical } from "../lib/canonical";
import { ageingDays, formatInr } from "../lib/format";
import { sha256 } from "../lib/sha256";
import type {
  BankEvidence,
  CaseSnapshot,
  CheckId,
  CheckStatus,
  EvaluatedCheck,
  DueAction,
  Evaluation,
  EvidenceView,
  InstrumentKind,
  InstrumentVersion,
  OfficerAnswers,
  SelectiveBucket,
} from "../types";
import { SIM_AS_OF, SUPERSEDED_V1_BADGE } from "../types";
import { identityScopeHash, lienScopeHash } from "./material";
import { DEMO_RULES, type DemoRules } from "./rules";

interface CheckCopy {
  title: string;
  scope: string;
}

export function currentVersion(snapshot: CaseSnapshot): InstrumentVersion {
  const version = snapshot.versions.find((item) => item.versionId === snapshot.currentVersionId);
  if (!version) throw new Error(`Missing version ${snapshot.currentVersionId} on ${snapshot.caseId}`);
  return version;
}

export function acceptedAmount(snapshot: CaseSnapshot, version: InstrumentVersion): number {
  const matches = snapshot.reconciliations.filter((item) => item.versionId === version.versionId);
  if (matches.length === 0) return version.fields.declaredAmountInr;
  return matches[matches.length - 1].acceptedAmountInr;
}

export function checkCatalog(kind: InstrumentKind): Record<CheckId, CheckCopy> {
  const identity: CheckCopy = {
    title: "Institution identity",
    scope: "PAN + AISHE + legal name",
  };
  if (kind === "SANCTION_RTGS") {
    return {
      "CHK-01": { title: "Sanction amount vs RTGS credit", scope: "sanctioned amount vs credited amount" },
      "CHK-02": { title: "Bank confirmation of UTR", scope: "version id + substantive hash" },
      "CHK-03": identity,
      "CHK-04": { title: "Sanction-order identity", scope: "order number + DDO" },
    };
  }
  return {
    "CHK-01": {
      title: "Principal agreement",
      scope: "declared or reconciled amount vs OCR principal",
    },
    "CHK-02": {
      title: "Bank confirmation of current instrument",
      scope: "version id + substantive hash",
    },
    "CHK-03": identity,
    "CHK-04": {
      title: kind === "RPGF" ? "Lien on the performance guarantee" : "Lien / pledge beneficiary",
      scope: "lien beneficiary",
    },
  };
}

export function viewEvidence(
  evidence: BankEvidence,
  version: InstrumentVersion,
): EvidenceView {
  const covers =
    evidence.coversVersionId === version.versionId &&
    evidence.coversSubstantiveHash === version.substantiveHash;
  if (covers) {
    const manual = evidence.source === "MANUAL_LETTER";
    return {
      id: evidence.id,
      disposition: "CURRENT_COVER",
      badge: manual ? "COVERS CURRENT VERSION · T4 MANUAL LETTER" : "COVERS CURRENT VERSION",
      coversVersionId: evidence.coversVersionId,
      tier: evidence.tier,
      source: evidence.source,
      statement: evidence.statement,
      reference: evidence.reference,
      amountInr: evidence.amountInr,
      gatewayStatus: evidence.gatewayStatus,
    };
  }
  return {
    id: evidence.id,
    disposition: "HISTORICAL",
    badge:
      evidence.coversVersionId === "V1"
        ? SUPERSEDED_V1_BADGE
        : `HISTORICAL / SUPERSEDED (Covered ${evidence.coversVersionId} Only)`,
    coversVersionId: evidence.coversVersionId,
    tier: evidence.tier,
    source: evidence.source,
    statement: evidence.statement,
    reference: evidence.reference,
    amountInr: evidence.amountInr,
    gatewayStatus: evidence.gatewayStatus,
  };
}

function bucketFor(
  id: CheckId,
  status: CheckStatus,
  armed: boolean,
): SelectiveBucket {
  if (!armed) {
    return status === "CONFIRMED" || status === "PRESERVED_CONFIRMED" ? "stable" : "open";
  }
  if (status === "RECHECK_REQUIRED" || status === "DISCREPANCY") return "invalidated";
  if (status === "PRESERVED_CONFIRMED") return "preserved";
  if (status === "CONFIRMED" && (id === "CHK-01" || id === "CHK-02")) return "recomputed";
  if (status === "CONFIRMED") return "stable";
  return "open";
}

function officerAnswers(
  snapshot: CaseSnapshot,
  version: InstrumentVersion,
  prior: InstrumentVersion | undefined,
  checks: EvaluatedCheck[],
  accepted: number,
  superseded: EvidenceView[],
  releaseReady: boolean,
): OfficerAnswers {
  const kind = version.fields.instrumentKind;
  const observedLabel = kind === "SANCTION_RTGS" ? "credited" : "OCR";
  let whatIsCurrent = `${version.versionId} is current (${version.fields.referenceNumber}, ${observedLabel} ${formatInr(version.fields.observedAmountInr)}).`;
  if (prior) {
    whatIsCurrent += ` ${prior.versionId} stays on the file and is not the instrument under decision.`;
  }
  if (accepted !== version.fields.observedAmountInr) {
    const label = accepted === version.fields.declaredAmountInr ? "Declared" : "Accepted";
    whatIsCurrent += ` ${label} ${formatInr(accepted)} does not match observed ${formatInr(version.fields.observedAmountInr)}.`;
  } else if (version.fields.declaredAmountInr !== accepted) {
    whatIsCurrent += ` Declaration ${formatInr(version.fields.declaredAmountInr)} was reconciled to ${formatInr(accepted)} on ${version.versionId}.`;
  }

  const confirmed = checks.filter((check) => check.status === "CONFIRMED");
  const preserved = checks.filter((check) => check.status === "PRESERVED_CONFIRMED");
  let independentlyConfirmed = "No check is independently confirmed.";
  if (confirmed.length > 0 || preserved.length > 0) {
    const parts = [
      ...confirmed.map((check) => `${check.id} is confirmed on the current version`),
      ...preserved.map((check) => `${check.id} is preserved because its scope did not change`),
    ];
    independentlyConfirmed = `${parts.join(". ")}.`;
  }
  if (superseded.length > 0) {
    const ids = superseded.map((item) => item.id).join(", ");
    const verb = superseded.length === 1 ? "remains" : "remain";
    independentlyConfirmed += ` ${ids} ${verb} visible and ${superseded.length === 1 ? "is" : "are"} badged ${SUPERSEDED_V1_BADGE}.`;
  }

  const open = checks.filter(
    (check) => check.status !== "CONFIRMED" && check.status !== "PRESERVED_CONFIRMED",
  );
  let unresolved =
    open.length === 0
      ? "No material check is unresolved."
      : `${open.map((check) => `${check.id} is ${check.status}`).join(". ")}.`;
  if (snapshot.vigilanceHold) unresolved += ` Vigilance hold: ${snapshot.vigilanceNote}`;

  let whoActsNext = "RO-104 clears the remaining checks.";
  const amountOpen = checks.some((check) => check.id === "CHK-01" && check.status === "DISCREPANCY");
  const bankOpen = checks.some(
    (check) => check.id === "CHK-02" && (check.status === "RECHECK_REQUIRED" || check.status === "PENDING"),
  );
  if (snapshot.release.authorised) whoActsNext = "No further action. Release is authorised.";
  else if (snapshot.vigilanceHold) whoActsNext = "VIG-22. The hold must be lifted before anyone authorises release.";
  else if (amountOpen) whoActsNext = "RO-104. Reconcile the amount or return the instrument to the institution.";
  else if (bankOpen) {
    whoActsNext =
      "RO-104. Obtain bank confirmation that covers the current version. Evidence for an earlier version must not be reused.";
  } else if (releaseReady && snapshot.caseId === "DEMO-001" && version.versionId === "V1") {
    whoActsNext =
      "DIR-01 may authorise reconciled V1. Or INST-01 uploads the ₹35,00,000 replacement, which reopens only the checks whose inputs change.";
  } else if (releaseReady) {
    whoActsNext = "DIR-01. Record the review decision against the current evaluation. RO-104 cannot approve. The NOC and the payment are not executed here.";
  }

  return { whatIsCurrent, independentlyConfirmed, unresolved, whoActsNext };
}

function nextActor(
  snapshot: CaseSnapshot,
  checks: EvaluatedCheck[],
  releaseReady: boolean,
): string {
  if (snapshot.release.authorised) return "—";
  if (snapshot.vigilanceHold) return "VIG-22";
  if (checks.some((check) => check.id === "CHK-01" && check.status === "DISCREPANCY")) return "RO-104";
  if (
    checks.some(
      (check) => check.id === "CHK-02" && (check.status === "RECHECK_REQUIRED" || check.status === "PENDING"),
    )
  ) {
    return "RO-104";
  }
  if (releaseReady) return "DIR-01";
  return "RO-104";
}

function statusLabel(snapshot: CaseSnapshot, checks: EvaluatedCheck[], releaseReady: boolean): string {
  if (snapshot.release.authorised) return "RELEASED";
  if (snapshot.vigilanceHold) return "VIGILANCE HOLD";
  if (checks.some((check) => check.status === "DISCREPANCY")) return "DISCREPANCY";
  if (checks.some((check) => check.status === "RECHECK_REQUIRED")) return "RECHECK REQUIRED";
  if (releaseReady) return "READY FOR RELEASE";
  return "IN PROGRESS";
}

/**
 * Pure selective-recheck evaluation.
 * A check reopens only when its own dependency changes.
 * File sha256 is deliberately absent from the hash preimage.
 */
export function evaluateCase(
  snapshot: CaseSnapshot,
  rules: DemoRules = DEMO_RULES,
  now: string = SIM_AS_OF,
): Evaluation {
  const version = currentVersion(snapshot);
  const prior = snapshot.versions.find((item) => item.versionId !== snapshot.currentVersionId);
  const armed = snapshot.versions.length > 1 && version.versionId !== snapshot.versions[0].versionId;
  const catalog = checkCatalog(version.fields.instrumentKind);
  const accepted = acceptedAmount(snapshot, version);
  const observed = version.fields.observedAmountInr;
  const ledger = snapshot.bankEvidence.map((item) => viewEvidence(item, version));
  const covering = ledger.filter((item) => item.disposition === "CURRENT_COVER");
  const historical = ledger.filter((item) => item.disposition === "HISTORICAL");
  const identityNow = identityScopeHash(version.fields);
  const lienNow = lienScopeHash(version.fields);

  const chk01 = evaluateAmount(catalog["CHK-01"], accepted, observed, version, armed);
  const chk02 = evaluateBank(catalog["CHK-02"], version, covering, historical, armed);
  const chk03 = evaluateScope({
    copy: catalog["CHK-03"],
    id: "CHK-03",
    confirmed: snapshot.identityConfirmed,
    stored: snapshot.identityScopeHash,
    current: identityNow,
    armed,
    preservedReason:
      "PAN, AISHE code and legal name match the confirmed institution scope. The replacement did not change that scope, so CHK-03 stays preserved.",
    confirmedReason: "PAN, AISHE code and legal name match the institution master.",
    pendingReason: "Institution identity has not been confirmed against the master.",
    changedReason: "Institution identity scope changed. The earlier confirmation does not cover it.",
    basis: "Institution master",
  });
  const chk04 = evaluateScope({
    copy: catalog["CHK-04"],
    id: "CHK-04",
    confirmed: snapshot.lienConfirmed,
    stored: snapshot.lienScopeHash,
    current: lienNow,
    armed,
    preservedReason:
      version.fields.instrumentKind === "SANCTION_RTGS"
        ? "Sanction-order number and DDO match the confirmed scope. That scope was not touched, so CHK-04 stays preserved."
        : "The lien beneficiary is unchanged. The replacement does not re-open CHK-04.",
    confirmedReason:
      version.fields.instrumentKind === "SANCTION_RTGS"
        ? "Sanction-order number and DDO match the confirmed scope."
        : `Lien beneficiary matches ${version.fields.beneficiaryOrDdo}.`,
    pendingReason: "Beneficiary scope has not been confirmed.",
    changedReason: "Beneficiary scope changed. The earlier confirmation does not cover it.",
    basis: version.fields.instrumentKind === "SANCTION_RTGS" ? "Sanction master" : "Lien clause",
  });

  const checks = [chk01, chk02, chk03, chk04];
  const blockers = checks
    .filter((check) => check.status !== "CONFIRMED" && check.status !== "PRESERVED_CONFIRMED")
    .map((check) => `${check.id} ${check.status}`);
  if (snapshot.vigilanceHold) blockers.push("Vigilance hold");
  const releaseReady = blockers.length === 0;
  const supersededEvidence = historical;
  const answers = officerAnswers(snapshot, version, prior, checks, accepted, supersededEvidence, releaseReady);

  const selectiveRecheck = {
    armed,
    invalidated: checks.filter((check) => check.bucket === "invalidated").map((check) => check.id),
    preserved: checks.filter((check) => check.bucket === "preserved").map((check) => check.id),
    recomputed: checks.filter((check) => check.bucket === "recomputed").map((check) => check.id),
  };

  const evaluationHash = sha256(
    canonical({
      caseId: snapshot.caseId,
      route: snapshot.route,
      currentVersionId: snapshot.currentVersionId,
      substantiveHash: version.substantiveHash,
      acceptedAmountInr: accepted,
      observedAmountInr: observed,
      referenceNumber: version.fields.referenceNumber,
      identityConfirmed: snapshot.identityConfirmed && snapshot.identityScopeHash === identityNow,
      identityScopeHash: identityNow,
      lienConfirmed: snapshot.lienConfirmed && snapshot.lienScopeHash === lienNow,
      lienScopeHash: lienNow,
      vigilanceHold: snapshot.vigilanceHold,
      escalationId: snapshot.escalation?.id ?? null,
      ruleVersion: rules.version,
      evaluatedAt: now,
      raceToken: snapshot.raceToken,
      actionIds: dueActions(snapshot, version, rules, now).map((item) => item.id),
      reconciliations: snapshot.reconciliations.map((item) => ({
        id: item.id,
        versionId: item.versionId,
        acceptedAmountInr: item.acceptedAmountInr,
      })),
      evidence: snapshot.bankEvidence.map((item) => ({
        id: item.id,
        coversVersionId: item.coversVersionId,
        coversSubstantiveHash: item.coversSubstantiveHash,
        tier: item.tier,
        source: item.source,
        amountInr: item.amountInr,
      })),
      checks: checks.map((check) => ({ id: check.id, status: check.status })),
    }),
  );

  const actions = dueActions(snapshot, version, rules, now);
  return {
    function: "evaluate_case",
    ruleVersion: rules.version,
    evaluatedAt: now,
    caseId: snapshot.caseId,
    route: snapshot.route,
    asOf: now,
    currentVersion: version.versionId,
    fileSha256: version.fileSha256,
    substantiveHash: version.substantiveHash,
    evaluationHash,
    acceptedAmountInr: accepted,
    observedAmountInr: observed,
    declaredAmountInr: version.fields.declaredAmountInr,
    referenceNumber: version.fields.referenceNumber,
    releaseReady,
    releaseAuthorised: snapshot.release.authorised,
    blockers,
    nextActor: nextActor(snapshot, checks, releaseReady),
    officerAnswers: answers,
    checks,
    evidenceLedger: ledger,
    supersededEvidence,
    selectiveRecheck,
    statusLabel: statusLabel(snapshot, checks, releaseReady),
    raceToken: snapshot.raceToken,
    vigilanceHold: snapshot.vigilanceHold,
    actions,
    financialRelease: "NOT_EXECUTED_HERE",
  };
}

function duty(status: CheckStatus): { responsibleRole: string; nextAction: string } {
  if (status === "DISCREPANCY") {
    return { responsibleRole: "RO-104", nextAction: "Reconcile the amount or return the instrument to the institution." };
  }
  if (status === "RECHECK_REQUIRED") {
    return {
      responsibleRole: "RO-104",
      nextAction: "Obtain confirmation that covers this version. Evidence for an earlier version stays historical.",
    };
  }
  if (status === "PENDING") {
    return { responsibleRole: "RO-104", nextAction: "Record independent confirmation for the current version, or leave the check pending." };
  }
  if (status === "PRESERVED_CONFIRMED") {
    return { responsibleRole: "—", nextAction: "No action. This check's inputs did not change." };
  }
  if (status === "BLOCKED") return { responsibleRole: "VIG-22", nextAction: "Clear the block before a review decision." };
  return { responsibleRole: "—", nextAction: "No action on this check." };
}

function dueActions(
  snapshot: CaseSnapshot,
  version: InstrumentVersion,
  rules: DemoRules,
  now: string,
): DueAction[] {
  if (snapshot.release.authorised) return [];
  const dueOn = version.fields.maturityOrValueDate;
  const daysLeft = ageingDays(now, dueOn);
  if (daysLeft < 0 || daysLeft > rules.maturityWindowDays) return [];
  return [
    {
      id: "MAT-01",
      responsibleRole: "RO-104",
      nextAction: `Maturity or value date ${dueOn} is within ${rules.maturityWindowDays} days. Open a follow-up. This does not reopen unrelated checks.`,
      dueOn,
    },
  ];
}

function evaluateAmount(
  copy: CheckCopy,
  accepted: number,
  observed: number,
  version: InstrumentVersion,
  armed: boolean,
): EvaluatedCheck {
  const agreed = accepted === observed;
  const status: CheckStatus = agreed ? "CONFIRMED" : "DISCREPANCY";
  const reason = agreed
    ? `Accepted ${formatInr(accepted)} matches the observed figure on ${version.versionId}. Recomputed from the current version, not carried forward.`
    : `Discrepancy on ${version.versionId}: declared or accepted ${formatInr(accepted)} against observed ${formatInr(observed)}.`;
  return {
    id: "CHK-01",
    title: copy.title,
    status,
    scope: copy.scope,
    reason,
    basis: `${version.versionId} amounts`,
    bucket: bucketFor("CHK-01", status, armed),
    evidence: [],
    ...duty(status),
  };
}

function evaluateBank(
  copy: CheckCopy,
  version: InstrumentVersion,
  covering: EvidenceView[],
  historical: EvidenceView[],
  armed: boolean,
): EvaluatedCheck {
  let status: CheckStatus;
  let reason: string;
  let basis: string;
  if (covering.length > 0) {
    const evidence = covering[covering.length - 1];
    status = "CONFIRMED";
    basis = evidence.id;
    reason =
      evidence.source === "MANUAL_LETTER"
        ? `Confirmed by ${evidence.id} at T4. ${evidence.statement}`
        : `Confirmed by ${evidence.id}. The evidence covers ${evidence.coversVersionId} and the current substantive hash only.`;
  } else if (historical.length > 0) {
    status = "RECHECK_REQUIRED";
    basis = historical.map((item) => item.id).join(", ");
    reason = `Recheck required. ${basis} does not cover ${version.versionId} (${version.fields.referenceNumber}, ${formatInr(version.fields.observedAmountInr)}). ${historical[0]?.badge ?? SUPERSEDED_V1_BADGE}.`;
  } else {
    status = "PENDING";
    basis = "—";
    reason = "Pending. No bank evidence is on the file.";
  }
  return {
    id: "CHK-02",
    title: copy.title,
    status,
    scope: copy.scope,
    reason,
    basis,
    bucket: bucketFor("CHK-02", status, armed),
    evidence: [...covering, ...historical],
    ...duty(status),
  };
}

function evaluateScope(input: {
  copy: CheckCopy;
  id: CheckId;
  confirmed: boolean;
  stored: string;
  current: string;
  armed: boolean;
  preservedReason: string;
  confirmedReason: string;
  pendingReason: string;
  changedReason: string;
  basis: string;
}): EvaluatedCheck {
  let status: CheckStatus;
  let reason: string;
  if (input.confirmed && input.stored === input.current && input.armed) {
    status = "PRESERVED_CONFIRMED";
    reason = input.preservedReason;
  } else if (input.confirmed && input.stored === input.current) {
    status = "CONFIRMED";
    reason = input.confirmedReason;
  } else if (input.confirmed && input.stored !== input.current) {
    status = "RECHECK_REQUIRED";
    reason = input.changedReason;
  } else {
    status = "PENDING";
    reason = input.pendingReason;
  }
  return {
    id: input.id,
    title: input.copy.title,
    status,
    scope: input.copy.scope,
    reason,
    basis: input.basis,
    bucket: bucketFor(input.id, status, input.armed),
    evidence: [],
    ...duty(status),
  };
}
