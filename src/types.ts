export const SIM_AS_OF = "2026-10-30";

export const SUPERSEDED_V1_BADGE = "HISTORICAL / SUPERSEDED (Covered V1 Only)";

export type RoleId = "RO-104" | "DIR-01" | "VIG-22" | "INST-01";

export type ScreenId = "workspace" | "queue" | "institution" | "reports" | "baseline";

export type WorkspaceTab = "recheck" | "provenance" | "clearances" | "audit" | "result";

export type Step = 1 | 2 | 3 | 4 | 5;

export type RouteKind = "NOC_FDR" | "NOC_RPGF" | "SANCTION_RTGS";

export type CheckId = "CHK-01" | "CHK-02" | "CHK-03" | "CHK-04";

export type CheckStatus =
  | "PENDING"
  | "DISCREPANCY"
  | "CONFIRMED"
  | "RECHECK_REQUIRED"
  | "PRESERVED_CONFIRMED"
  | "BLOCKED";

export type ProvenanceTier =
  | "T1_BANK_API"
  | "T2_SIGNED_RECORD"
  | "T3_OFFICER_OCR"
  | "T4_MANUAL_LETTER";

export type InstrumentKind = "FDR" | "RPGF" | "SANCTION_RTGS";

export type SelectiveBucket = "invalidated" | "preserved" | "recomputed" | "stable" | "open";

export interface InstrumentFields {
  referenceNumber: string;
  bankName: string;
  branchCode: string;
  declaredAmountInr: number;
  observedAmountInr: number;
  issueDate: string;
  maturityOrValueDate: string;
  beneficiaryOrDdo: string;
  institutionName: string;
  aisheCode: string;
  pan: string;
  instrumentKind: InstrumentKind;
  utr: string;
}

export interface InstrumentVersion {
  versionId: string;
  label: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSha256: string;
  substantiveHash: string;
  fields: InstrumentFields;
}

export interface BankEvidence {
  id: string;
  coversVersionId: string;
  coversSubstantiveHash: string;
  tier: ProvenanceTier;
  source: "BANK_GATEWAY" | "MANUAL_LETTER";
  gatewayStatus: "CONFIRMED" | "OUTAGE" | "NOT_USED";
  amountInr: number;
  referenceNumber: string;
  recordedAt: string;
  recordedBy: string;
  reference: string;
  statement: string;
}

export interface Reconciliation {
  id: string;
  versionId: string;
  acceptedAmountInr: number;
  at: string;
  by: string;
  note: string;
}

export interface Escalation {
  id: string;
  at: string;
  by: string;
  reason: string;
}

export interface ReleaseRecord {
  authorised: boolean;
  by: string | null;
  at: string | null;
  evaluationHash: string | null;
}

export interface AuditEvent {
  at: string;
  actor: string;
  action: string;
  detail: string;
  prevHash: string;
  hash: string;
}

export interface CaseSnapshot {
  caseId: string;
  institutionId: string;
  institutionName: string;
  route: RouteKind;
  openedOn: string;
  assignee: string;
  currentVersionId: string;
  versions: InstrumentVersion[];
  reconciliations: Reconciliation[];
  bankEvidence: BankEvidence[];
  identityConfirmed: boolean;
  identityScopeHash: string;
  lienConfirmed: boolean;
  lienScopeHash: string;
  vigilanceHold: boolean;
  vigilanceNote: string;
  escalation: Escalation | null;
  release: ReleaseRecord;
  audit: AuditEvent[];
  raceToken: string;
}

export interface EvidenceView {
  id: string;
  disposition: "CURRENT_COVER" | "HISTORICAL";
  badge: string;
  coversVersionId: string;
  tier: ProvenanceTier;
  source: BankEvidence["source"];
  statement: string;
  reference: string;
  amountInr: number;
  gatewayStatus: BankEvidence["gatewayStatus"];
}

export interface EvaluatedCheck {
  id: CheckId;
  title: string;
  status: CheckStatus;
  scope: string;
  reason: string;
  basis: string;
  bucket: SelectiveBucket;
  evidence: EvidenceView[];
  responsibleRole: string;
  nextAction: string;
}

export interface DueAction {
  id: string;
  responsibleRole: string;
  nextAction: string;
  dueOn: string;
}

export interface OfficerAnswers {
  whatIsCurrent: string;
  independentlyConfirmed: string;
  unresolved: string;
  whoActsNext: string;
}

export interface Evaluation {
  function: "evaluate_case";
  ruleVersion: string;
  evaluatedAt: string;
  caseId: string;
  route: RouteKind;
  asOf: string;
  currentVersion: string;
  fileSha256: string;
  substantiveHash: string;
  evaluationHash: string;
  acceptedAmountInr: number;
  observedAmountInr: number;
  declaredAmountInr: number;
  referenceNumber: string;
  releaseReady: boolean;
  releaseAuthorised: boolean;
  blockers: string[];
  nextActor: string;
  officerAnswers: OfficerAnswers;
  checks: EvaluatedCheck[];
  evidenceLedger: EvidenceView[];
  supersededEvidence: EvidenceView[];
  selectiveRecheck: {
    armed: boolean;
    invalidated: CheckId[];
    preserved: CheckId[];
    recomputed: CheckId[];
  };
  statusLabel: string;
  raceToken: string;
  vigilanceHold: boolean;
  actions: DueAction[];
  financialRelease: "NOT_EXECUTED_HERE";
}

export interface Notice {
  tone: "ok" | "warn" | "deny" | "info";
  title: string;
  body: string;
  http?: number;
}

export interface ReleaseDecision {
  http: 200 | 403 | 409 | 412;
  ok: boolean;
  title: string;
  body: string;
  snapshot: CaseSnapshot;
}
