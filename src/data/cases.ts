import { sealAudit } from "../lib/audit";
import { evaluateCase } from "../engine/evaluateCase";
import { identityScopeHash, lienScopeHash, makeVersion } from "../engine/material";
import type {
  AuditEvent,
  BankEvidence,
  CaseSnapshot,
  InstrumentFields,
  InstrumentVersion,
  Step,
} from "../types";

const AUTHORITY = "All India Council for Technical Education";

function blankRelease(): CaseSnapshot["release"] {
  return { authorised: false, by: null, at: null, evaluationHash: null };
}

function base(input: Omit<CaseSnapshot, "identityScopeHash" | "lienScopeHash"> & { anchor: InstrumentFields }): CaseSnapshot {
  const { anchor, ...rest } = input;
  return {
    ...rest,
    identityScopeHash: identityScopeHash(anchor),
    lienScopeHash: lienScopeHash(anchor),
  };
}

function demo001Versions(): { v1: InstrumentVersion; v2: InstrumentVersion } {
  const shared = {
    bankName: "Punjab National Bank",
    branchCode: "0142",
    beneficiaryOrDdo: AUTHORITY,
    institutionName: "National Institute of Technical Studies",
    aisheCode: "C-42817",
    pan: "AAACN1234F",
    instrumentKind: "FDR" as const,
    utr: "",
  };
  const v1 = makeVersion({
    versionId: "V1",
    label: "Original scan",
    uploadedAt: "2026-10-12T09:20:00+05:30",
    uploadedBy: "INST-01",
    fileName: "DEMO-001-FDR-V1.pdf",
    fileSeed: "FDR-SETU-FILE|DEMO-001|V1|PDF-BYTES",
    fields: {
      ...shared,
      referenceNumber: "FDR/PNB/2024/88421",
      declaredAmountInr: 3_500_000,
      observedAmountInr: 3_000_000,
      issueDate: "2024-04-12",
      maturityOrValueDate: "2027-04-12",
    },
  });
  const v2 = makeVersion({
    versionId: "V2",
    label: "Replacement instrument",
    uploadedAt: "2026-10-28T14:10:00+05:30",
    uploadedBy: "INST-01",
    fileName: "DEMO-001-FDR-V2.pdf",
    fileSeed: "FDR-SETU-FILE|DEMO-001|V2|PDF-BYTES",
    fields: {
      ...shared,
      referenceNumber: "FDR/PNB/2025/91007",
      declaredAmountInr: 3_500_000,
      observedAmountInr: 3_500_000,
      issueDate: "2025-11-02",
      maturityOrValueDate: "2028-11-02",
    },
  });
  return { v1, v2 };
}

function bankEvidence(input: {
  id: string;
  version: InstrumentVersion;
  at: string;
  reference: string;
  statement: string;
}): BankEvidence {
  return {
    id: input.id,
    coversVersionId: input.version.versionId,
    coversSubstantiveHash: input.version.substantiveHash,
    tier: "T1_BANK_API",
    source: "BANK_GATEWAY",
    gatewayStatus: "CONFIRMED",
    amountInr: input.version.fields.observedAmountInr,
    referenceNumber: input.version.fields.referenceNumber,
    recordedAt: input.at,
    recordedBy: "RO-104",
    reference: input.reference,
    statement: input.statement,
  };
}

function demo001Audit(step: Step, v1: InstrumentVersion, v2: InstrumentVersion): AuditEvent[] {
  const events: Array<{ at: string; actor: string; action: string; detail: string }> = [
    {
      at: "2026-10-12T09:15:00+05:30",
      actor: "INST-01",
      action: "CASE_OPENED",
      detail: "DEMO-001 opened on the NOC / FDR route.",
    },
    {
      at: "2026-10-12T09:20:00+05:30",
      actor: "INST-01",
      action: "INSTRUMENT_UPLOADED",
      detail: `V1 uploaded. File sha256 ${v1.fileSha256}.`,
    },
    {
      at: "2026-10-12T09:32:00+05:30",
      actor: "RO-104",
      action: "OCR_RECORDED",
      detail: "OCR principal on V1 is ₹30,00,000. Declaration is ₹35,00,000. CHK-01 is a discrepancy.",
    },
    {
      at: "2026-10-12T09:40:00+05:30",
      actor: "RO-104",
      action: "IDENTITY_CONFIRMED",
      detail: "PAN AAACN1234F, AISHE C-42817 and the legal name match the institution master.",
    },
    {
      at: "2026-10-12T09:44:00+05:30",
      actor: "RO-104",
      action: "LIEN_CONFIRMED",
      detail: `Lien is marked in favour of ${AUTHORITY}.`,
    },
  ];
  if (step >= 2) {
    events.push(
      {
        at: "2026-10-18T11:05:00+05:30",
        actor: "RO-104",
        action: "PRINCIPAL_RECONCILED",
        detail: "Accepted principal on V1 set to ₹30,00,000. The ₹35,00,000 declaration stays visible. This reconciliation covers V1 only.",
      },
      {
        at: "2026-10-18T11:22:00+05:30",
        actor: "RO-104",
        action: "BANK_EVIDENCE_RECORDED",
        detail: "EV-BNK-101 confirms V1 through the bank gateway. Coverage does not extend to a later version.",
      },
    );
  }
  if (step >= 3) {
    events.push(
      {
        at: "2026-10-28T14:10:00+05:30",
        actor: "INST-01",
        action: "INSTRUMENT_UPLOADED",
        detail: `V2 replacement uploaded (${v2.fields.referenceNumber}). Substantive hash ${v2.substantiveHash}.`,
      },
      {
        at: "2026-10-28T14:11:00+05:30",
        actor: "SYSTEM",
        action: "SELECTIVE_RECHECK",
        detail: "CHK-02 set to RECHECK_REQUIRED. CHK-03 and CHK-04 preserved. EV-BNK-101 marked historical, covered V1 only.",
      },
    );
  }
  if (step >= 4) {
    events.push({
      at: "2026-10-29T10:18:00+05:30",
      actor: "RO-104",
      action: "BANK_EVIDENCE_RECORDED",
      detail: "EV-BNK-202 confirms V2 through the bank gateway. EV-BNK-101 remains on the file as superseded history.",
    });
  }
  if (step >= 5) {
    events.push({
      at: "2026-10-30T09:00:00+05:30",
      actor: "SYSTEM",
      action: "RELEASE_READINESS",
      detail: "evaluate_case() reports release readiness on V2. Authorisation is still required from DIR-01.",
    });
  }
  return sealAudit(events);
}

export function buildDemo001(step: Step): CaseSnapshot {
  const { v1, v2 } = demo001Versions();
  const ev101 = bankEvidence({
    id: "EV-BNK-101",
    version: v1,
    at: "2026-10-18T11:22:00+05:30",
    reference: "PNB-GW-2026-44190",
    statement:
      "SAMPLE. Simulated gateway confirmation of FDR/PNB/2024/88421 for ₹30,00,000. Lien marked in favour of AICTE. Coverage is limited to instrument version V1.",
  });
  const ev202 = bankEvidence({
    id: "EV-BNK-202",
    version: v2,
    at: "2026-10-29T10:18:00+05:30",
    reference: "PNB-GW-2026-44802",
    statement:
      "SAMPLE. Simulated gateway confirmation of FDR/PNB/2025/91007 for ₹35,00,000. This evidence covers the replacement bank reference on V2 only and does not revive EV-BNK-101.",
  });
  return base({
    anchor: v1.fields,
    caseId: "DEMO-001",
    institutionId: "INST-NITS",
    institutionName: "National Institute of Technical Studies",
    route: "NOC_FDR",
    openedOn: "2026-10-12",
    assignee: "RO-104",
    currentVersionId: step >= 3 ? "V2" : "V1",
    versions: step >= 3 ? [v1, v2] : [v1],
    reconciliations:
      step >= 2
        ? [
            {
              id: "RCN-001",
              versionId: "V1",
              acceptedAmountInr: 3_000_000,
              at: "2026-10-18T11:05:00+05:30",
              by: "RO-104",
              note: "Officer accepts the V1 instrument figure of ₹30,00,000. The declaration of ₹35,00,000 remains on the record. This reconciliation does not cover a replacement instrument.",
            },
          ]
        : [],
    bankEvidence: step >= 4 ? [ev101, ev202] : step >= 2 ? [ev101] : [],
    identityConfirmed: true,
    lienConfirmed: true,
    vigilanceHold: false,
    vigilanceNote: "",
    escalation: null,
    release: blankRelease(),
    audit: demo001Audit(step, v1, v2),
    raceToken: "",
  });
}

function simpleCase(input: {
  caseId: string;
  institutionId: string;
  institutionName: string;
  route: CaseSnapshot["route"];
  openedOn: string;
  assignee: string;
  fileSeed: string;
  fileName: string;
  uploadedAt: string;
  fields: InstrumentFields;
  evidence?: { id: string; at: string; reference: string; statement: string };
  vigilanceHold?: boolean;
  vigilanceNote?: string;
  released?: { at: string };
  audit: Array<{ at: string; actor: string; action: string; detail: string }>;
}): CaseSnapshot {
  const version = makeVersion({
    versionId: "V1",
    label: "Instrument on file",
    uploadedAt: input.uploadedAt,
    uploadedBy: "INST-01",
    fileName: input.fileName,
    fileSeed: input.fileSeed,
    fields: input.fields,
  });
  const evidence = input.evidence
    ? [
        bankEvidence({
          id: input.evidence.id,
          version,
          at: input.evidence.at,
          reference: input.evidence.reference,
          statement: input.evidence.statement,
        }),
      ]
    : [];
  let snapshot = base({
    anchor: input.fields,
    caseId: input.caseId,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    route: input.route,
    openedOn: input.openedOn,
    assignee: input.assignee,
    currentVersionId: "V1",
    versions: [version],
    reconciliations: [],
    bankEvidence: evidence,
    identityConfirmed: true,
    lienConfirmed: true,
    vigilanceHold: input.vigilanceHold ?? false,
    vigilanceNote: input.vigilanceNote ?? "",
    escalation: null,
    release: blankRelease(),
    audit: sealAudit(input.audit),
    raceToken: "",
  });
  if (input.released) {
    const evaluationHash = evaluateCase(snapshot).evaluationHash;
    const audit = sealAudit([
      ...input.audit,
      {
        at: input.released.at,
        actor: "DIR-01",
        action: "RELEASE_AUTHORISED",
        detail: `Authorised against evaluationHash ${evaluationHash}.`,
      },
    ]);
    snapshot = {
      ...snapshot,
      audit,
      release: { authorised: true, by: "DIR-01", at: input.released.at, evaluationHash },
    };
  }
  return snapshot;
}

function buildDemo002(): CaseSnapshot {
  return simpleCase({
    caseId: "DEMO-002",
    institutionId: "INST-CPAS",
    institutionName: "City Polytechnic of Applied Sciences",
    route: "NOC_RPGF",
    openedOn: "2026-08-01",
    assignee: "RO-104",
    fileSeed: "FDR-SETU-FILE|DEMO-002|V1",
    fileName: "DEMO-002-RPGF.pdf",
    uploadedAt: "2026-08-01T10:00:00+05:30",
    fields: {
      referenceNumber: "FDR/SBI/2025/22018",
      bankName: "State Bank of India",
      branchCode: "00312",
      declaredAmountInr: 800_000,
      observedAmountInr: 800_000,
      issueDate: "2025-06-01",
      maturityOrValueDate: "2028-06-01",
      beneficiaryOrDdo: AUTHORITY,
      institutionName: "City Polytechnic of Applied Sciences",
      aisheCode: "C-19044",
      pan: "AABCC7781K",
      instrumentKind: "RPGF",
      utr: "",
    },
    evidence: {
      id: "EV-BNK-220",
      at: "2026-08-12T15:00:00+05:30",
      reference: "SBI-GW-2026-22018",
      statement: "SAMPLE. Simulated gateway confirmation of the refundable performance guarantee. Coverage is V1.",
    },
    released: { at: "2026-09-02T12:00:00+05:30" },
    audit: [
      { at: "2026-08-01T10:00:00+05:30", actor: "INST-01", action: "CASE_OPENED", detail: "RPGF case opened." },
      { at: "2026-08-12T15:00:00+05:30", actor: "RO-104", action: "BANK_EVIDENCE_RECORDED", detail: "EV-BNK-220 covers V1." },
    ],
  });
}

function buildDemo003(): CaseSnapshot {
  return simpleCase({
    caseId: "DEMO-003",
    institutionId: "INST-GCT",
    institutionName: "Government College of Textiles",
    route: "SANCTION_RTGS",
    openedOn: "2026-10-20",
    assignee: "RO-104",
    fileSeed: "FDR-SETU-FILE|DEMO-003|V1",
    fileName: "DEMO-003-SO.pdf",
    uploadedAt: "2026-10-20T11:00:00+05:30",
    fields: {
      referenceNumber: "SO/AICTE/2025/118",
      bankName: "State Bank of India",
      branchCode: "00001",
      declaredAmountInr: 1_240_000,
      observedAmountInr: 1_240_000,
      issueDate: "2025-10-01",
      maturityOrValueDate: "2025-10-22",
      beneficiaryOrDdo: "DDO-AICTE-EDN-04",
      institutionName: "Government College of Textiles",
      aisheCode: "C-33410",
      pan: "AAAGV5520P",
      instrumentKind: "SANCTION_RTGS",
      utr: "SBINR52025103000441822",
    },
    evidence: {
      id: "EV-BNK-318",
      at: "2026-10-22T16:40:00+05:30",
      reference: "SBINR52025103000441822",
      statement: "SAMPLE. Simulated RTGS credit advice matches sanction order SO/AICTE/2025/118 for ₹12,40,000.",
    },
    audit: [
      { at: "2026-10-20T11:00:00+05:30", actor: "INST-01", action: "CASE_OPENED", detail: "Sanction-order / RTGS case opened." },
      { at: "2026-10-22T16:40:00+05:30", actor: "RO-104", action: "BANK_EVIDENCE_RECORDED", detail: "UTR confirmed. Awaiting DIR-01." },
    ],
  });
}

function buildDemo004(): CaseSnapshot {
  return simpleCase({
    caseId: "DEMO-004",
    institutionId: "INST-HRIP",
    institutionName: "Hill Region Institute of Pharmacy",
    route: "NOC_FDR",
    openedOn: "2026-08-15",
    assignee: "VIG-22",
    fileSeed: "FDR-SETU-FILE|DEMO-004|V1",
    fileName: "DEMO-004-FDR.pdf",
    uploadedAt: "2026-08-15T09:30:00+05:30",
    fields: {
      referenceNumber: "FDR/CNRB/2024/55102",
      bankName: "Canara Bank",
      branchCode: "0881",
      declaredAmountInr: 500_000,
      observedAmountInr: 500_000,
      issueDate: "2024-09-01",
      maturityOrValueDate: "2027-09-01",
      beneficiaryOrDdo: AUTHORITY,
      institutionName: "Hill Region Institute of Pharmacy",
      aisheCode: "C-55201",
      pan: "AADCH4412Q",
      instrumentKind: "FDR",
      utr: "",
    },
    evidence: {
      id: "EV-BNK-441",
      at: "2026-08-28T13:00:00+05:30",
      reference: "CNRB-GW-2026-55102",
      statement: "SAMPLE. Simulated gateway confirmation of FDR/CNRB/2024/55102 for ₹5,00,000.",
    },
    vigilanceHold: true,
    vigilanceNote: "Vigilance query on the source of the deposit. Instrument checks are not the hold.",
    audit: [
      { at: "2026-08-15T09:30:00+05:30", actor: "INST-01", action: "CASE_OPENED", detail: "FDR case opened." },
      { at: "2026-08-28T13:00:00+05:30", actor: "RO-104", action: "BANK_EVIDENCE_RECORDED", detail: "EV-BNK-441 covers V1." },
      {
        at: "2026-09-04T10:00:00+05:30",
        actor: "VIG-22",
        action: "VIGILANCE_HOLD_PLACED",
        detail: "Hold placed. Instrument checks are not the reason.",
      },
    ],
  });
}

function buildDemo005(): CaseSnapshot {
  return simpleCase({
    caseId: "DEMO-005",
    institutionId: "INST-RIT",
    institutionName: "Regional Institute of Technology",
    route: "NOC_FDR",
    openedOn: "2026-09-14",
    assignee: "RO-104",
    fileSeed: "FDR-SETU-FILE|DEMO-005|V1",
    fileName: "DEMO-005-FDR.pdf",
    uploadedAt: "2026-09-14T12:15:00+05:30",
    fields: {
      referenceNumber: "FDR/BARB/2025/77310",
      bankName: "Bank of Baroda",
      branchCode: "2206",
      declaredAmountInr: 1_800_000,
      observedAmountInr: 1_550_000,
      issueDate: "2025-03-19",
      maturityOrValueDate: "2026-11-12",
      beneficiaryOrDdo: AUTHORITY,
      institutionName: "Regional Institute of Technology",
      aisheCode: "C-61008",
      pan: "AABCR9088L",
      instrumentKind: "FDR",
      utr: "",
    },
    audit: [
      { at: "2026-09-14T12:15:00+05:30", actor: "INST-01", action: "CASE_OPENED", detail: "FDR case opened." },
      {
        at: "2026-09-14T12:40:00+05:30",
        actor: "RO-104",
        action: "OCR_RECORDED",
        detail: "Declared ₹18,00,000 against OCR ₹15,50,000. Escalation has not been opened.",
      },
    ],
  });
}

export function seedCases(): Record<string, CaseSnapshot> {
  return {
    "DEMO-001": buildDemo001(1),
    "DEMO-002": buildDemo002(),
    "DEMO-003": buildDemo003(),
    "DEMO-004": buildDemo004(),
    "DEMO-005": buildDemo005(),
  };
}

export const CASE_ORDER = ["DEMO-001", "DEMO-002", "DEMO-003", "DEMO-004", "DEMO-005"] as const;
