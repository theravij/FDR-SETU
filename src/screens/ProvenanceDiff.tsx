import { provenanceDiff } from "../engine/provenance";
import { maskOperationalText } from "../lib/labels";
import { useDemo } from "../state/store";

export function ProvenanceDiff() {
  const { state } = useDemo();
  const snapshot = state.cases[state.caseId];
  const rows = provenanceDiff(snapshot);
  const hasV2 = snapshot.versions.some((item) => item.versionId === "V2");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
      <table className="w-full border-collapse text-left">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            {["Field", "V1 → V2", "Source", "Check"].map((heading) => (
              <th key={heading} className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className={row.material ? "bg-amber-50/70" : "bg-white"}>
              <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] font-medium text-slate-900">{row.field}</td>
              <td className="border-b border-slate-100 px-2 py-1.5">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-800">
                  <span>{maskOperationalText(row.v1)}</span>
                  <span className="text-slate-400">→</span>
                  <span>{hasV2 ? maskOperationalText(row.v2) : "—"}</span>
                </span>
              </td>
              <td className="border-b border-slate-100 px-2 py-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.changed ? "bg-indigo-50 text-indigo-800" : "bg-emerald-50 text-emerald-800"}`}>
                  {row.changed ? "⚡ Recomputed" : "🔒 Locked"}
                </span>
              </td>
              <td className="border-b border-slate-100 px-2 py-1.5 text-[11px] text-slate-600">{row.affects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
