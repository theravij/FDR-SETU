import { canonical } from "../lib/canonical";
import { sha256 } from "../lib/sha256";
import type { InstrumentFields, InstrumentVersion } from "../types";

export function substantiveHashOf(fields: InstrumentFields): string {
  return sha256(
    canonical({
      referenceNumber: fields.referenceNumber,
      bankName: fields.bankName,
      branchCode: fields.branchCode,
      observedAmountInr: fields.observedAmountInr,
      issueDate: fields.issueDate,
      maturityOrValueDate: fields.maturityOrValueDate,
      beneficiaryOrDdo: fields.beneficiaryOrDdo,
      institutionName: fields.institutionName,
      aisheCode: fields.aisheCode,
      pan: fields.pan,
      instrumentKind: fields.instrumentKind,
      utr: fields.utr,
    }),
  );
}

export function identityScopeHash(fields: InstrumentFields): string {
  return sha256(
    canonical({
      pan: fields.pan,
      aisheCode: fields.aisheCode,
      institutionName: fields.institutionName,
    }),
  );
}

export function lienScopeHash(fields: InstrumentFields): string {
  return sha256(
    canonical({
      beneficiaryOrDdo: fields.beneficiaryOrDdo,
      instrumentKind: fields.instrumentKind,
    }),
  );
}

export function makeVersion(input: {
  versionId: string;
  label: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSeed: string;
  fields: InstrumentFields;
}): InstrumentVersion {
  return {
    versionId: input.versionId,
    label: input.label,
    uploadedAt: input.uploadedAt,
    uploadedBy: input.uploadedBy,
    fileName: input.fileName,
    fileSha256: sha256(input.fileSeed),
    substantiveHash: substantiveHashOf(input.fields),
    fields: input.fields,
  };
}
