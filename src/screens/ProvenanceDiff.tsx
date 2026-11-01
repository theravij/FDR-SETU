import { provenanceDiff, valueLayers } from "../engine/provenance";
import { useDemo } from "../state/store";

const TIERS = [
  ["T1", "Bank API", "Gateway confirmation bound to one version and one substantive hash."],
  ["T2", "Signed record", "Institution master, declaration, lien or sanction identity."],
  ["T3", "Officer OCR", "Values read from the scan. A new scan can change the file hash without changing these."],
  ["T4", "Manual letter", "Used only when the gateway is down. Never presented as an API confirmation."],
];

export function ProvenanceDiff() {
  const { state } = useDemo();
  const snapshot = state.cases[state.caseId];
  const rows = provenanceDiff(snapshot);
  const layers = valueLayers(snapshot);
  const hasV2 = snapshot.versions.some((item) => item.versionId === "V2");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
      <div className="grid shrink-0 grid-cols-4 gap-2">
        {TIERS.map(([tier, name, copy]) => (
          <article key={tier} className="rounded-xl border border-slate-200/80 bg-white px-2 py-1.5 shadow-sm">
            <h2 className="text-[12px] font-semibold text-navy">
              {tier} · {name}
            </h2>
            <p className="text-[11px] leading-snug text-slate-600">{copy}</p>
          </article>
        ))}
      </div>
      <div className="shrink-0 overflow-auto border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Field", "Institution-entered", "OCR suggestion", "Reviewer-corrected", "Independently confirmed"].map((heading) => (
                <th key={heading} className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layers.map((row) => (
              <tr key={row.field}>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] font-medium text-navy">{row.field}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px]">{row.institutionEntered}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px]">{row.ocrSuggestion}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px]">{row.reviewerCorrected}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px]">{row.independentlyConfirmed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Field</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Tier</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">V1</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">V2</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Change</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Affects</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className={row.material ? "bg-amber-50" : row.changed ? "bg-slate-50" : "bg-emerald-50/40"}>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] font-medium text-navy">{row.field}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] text-slate-700">{row.tier}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-800">{row.v1}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-800">{row.v2}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[11px] font-semibold">
                  {!hasV2 ? (
                    <span className="text-slate-400">No V2</span>
                  ) : row.material ? (
                    <span className="text-amber-950">Material</span>
                  ) : row.changed ? (
                    <span className="text-slate-600">Non-material</span>
                  ) : (
                    <span className="text-emerald-800">Locked & unchanged</span>
                  )}
                </td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] text-slate-700">{row.affects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="shrink-0 text-[11px] text-slate-600">
        Amber rows are material differences. A cosmetic rescan changes only the file sha256 row, and that row affects no check.
        {hasV2 ? " Identity and lien rows stay unchanged, which is why CHK-03 and CHK-04 can be preserved." : " Upload a replacement instrument from the Institution Portal to see the field-level change."}
      </p>
    </div>
  );
}
