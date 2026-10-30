import { formatInr, shortHash } from "../lib/format";
import type { CaseSnapshot, InstrumentVersion } from "../types";
import { acceptedAmount, currentVersion, viewEvidence } from "./evaluateCase";

export interface DiffRow {
  field: string;
  tier: string;
  v1: string;
  v2: string;
  changed: boolean;
  material: boolean;
  affects: string;
}

function displayAmount(amount: number): string {
  return formatInr(amount);
}

function cell(version: InstrumentVersion | undefined, read: (version: InstrumentVersion) => string): string {
  if (!version) return "—";
  return read(version);
}

export function provenanceDiff(snapshot: CaseSnapshot): DiffRow[] {
  const v1 = snapshot.versions.find((item) => item.versionId === "V1") ?? snapshot.versions[0];
  const v2 = snapshot.versions.find((item) => item.versionId === "V2");
  const specs: Array<{
    field: string;
    tier: string;
    material: boolean;
    affects: string;
    read: (version: InstrumentVersion) => string;
  }> = [
    {
      field: "Reference",
      tier: "T3 Officer OCR",
      material: true,
      affects: "CHK-02",
      read: (version) => version.fields.referenceNumber,
    },
    {
      field: "Bank / branch",
      tier: "T3 Officer OCR",
      material: true,
      affects: "CHK-02",
      read: (version) => `${version.fields.bankName} · ${version.fields.branchCode}`,
    },
    {
      field: "Declared amount",
      tier: "T2 Signed record",
      material: true,
      affects: "CHK-01",
      read: (version) => displayAmount(version.fields.declaredAmountInr),
    },
    {
      field: "Observed amount (OCR / credit)",
      tier: "T3 Officer OCR",
      material: true,
      affects: "CHK-01, CHK-02",
      read: (version) => displayAmount(version.fields.observedAmountInr),
    },
    {
      field: "Issue / order date",
      tier: "T3 Officer OCR",
      material: true,
      affects: "CHK-02",
      read: (version) => version.fields.issueDate,
    },
    {
      field: "Maturity / value date",
      tier: "T3 Officer OCR",
      material: true,
      affects: "CHK-02",
      read: (version) => version.fields.maturityOrValueDate,
    },
    {
      field: "Lien beneficiary / DDO",
      tier: "T2 Signed record",
      material: true,
      affects: "CHK-04",
      read: (version) => version.fields.beneficiaryOrDdo,
    },
    {
      field: "Institution",
      tier: "T2 Signed record",
      material: true,
      affects: "CHK-03",
      read: (version) => version.fields.institutionName,
    },
    {
      field: "AISHE",
      tier: "T2 Signed record",
      material: false,
      affects: "CHK-03",
      read: (version) => version.fields.aisheCode,
    },
    {
      field: "PAN",
      tier: "T2 Signed record",
      material: false,
      affects: "CHK-03",
      read: (version) => version.fields.pan,
    },
    {
      field: "UTR",
      tier: "T1 Bank API",
      material: true,
      affects: "CHK-02",
      read: (version) => version.fields.utr || "—",
    },
    {
      field: "Substantive hash",
      tier: "Derived",
      material: true,
      affects: "CHK-02",
      read: (version) => shortHash(version.substantiveHash, 16),
    },
    {
      field: "File sha256",
      tier: "File bytes only",
      material: false,
      affects: "None",
      read: (version) => shortHash(version.fileSha256, 16),
    },
  ];

  return specs.map((spec) => {
    const left = cell(v1, spec.read);
    const right = cell(v2, spec.read);
    const changed = Boolean(v2) && left !== right;
    return {
      field: spec.field,
      tier: spec.tier,
      v1: left,
      v2: right,
      changed,
      material: spec.material && changed,
      affects: spec.affects,
    };
  });
}

export interface ValueLayerRow {
  field: string;
  institutionEntered: string;
  ocrSuggestion: string;
  reviewerCorrected: string;
  independentlyConfirmed: string;
}

export function valueLayers(snapshot: CaseSnapshot): ValueLayerRow[] {
  const version = currentVersion(snapshot);
  const accepted = acceptedAmount(snapshot, version);
  const corrected = snapshot.reconciliations.some((item) => item.versionId === version.versionId);
  const ledger = snapshot.bankEvidence.map((item) => viewEvidence(item, version));
  const covering = ledger.find((item) => item.disposition === "CURRENT_COVER");
  const historical = ledger.find((item) => item.disposition === "HISTORICAL");
  const confirmedAmount = covering
    ? `${formatInr(covering.amountInr)} · ${covering.id} · sample`
    : historical
      ? `Not this version. ${historical.id} covered ${historical.coversVersionId} only`
      : "—";
  const confirmedReference = covering
    ? `${covering.id} covers ${version.fields.referenceNumber}`
    : historical
      ? `${historical.id} covered an earlier reference only`
      : "—";
  return [
    {
      field: "Amount",
      institutionEntered: formatInr(version.fields.declaredAmountInr),
      ocrSuggestion: formatInr(version.fields.observedAmountInr),
      reviewerCorrected: corrected ? formatInr(accepted) : "—",
      independentlyConfirmed: confirmedAmount,
    },
    {
      field: "Bank reference",
      institutionEntered: version.fields.referenceNumber,
      ocrSuggestion: version.fields.referenceNumber,
      reviewerCorrected: "—",
      independentlyConfirmed: confirmedReference,
    },
  ];
}
