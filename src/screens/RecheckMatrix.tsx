import { useState } from "react";
import { EDGE_CLASS, glanceRows, glanceSummary, PILL_CLASS } from "../lib/caseView";
import { useDemo } from "../state/store";

export function RecheckMatrix() {
  const { state } = useDemo();
  const snapshot = state.cases[state.caseId];
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = glanceRows(snapshot);
  const summary = glanceSummary(rows);

  return (
    <div data-demo-target="recheck-matrix" className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="grid shrink-0 grid-cols-3 gap-2 text-[12px]">
        {summary.map((item) => (
          <p key={item.label} className={`rounded-lg border px-2 py-1.5 font-medium transition-colors duration-300 ${PILL_CLASS[item.tone]}`}>
            {item.label}
          </p>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left">
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-demo-target={`check-row-${row.id}`}
                onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                className={`cursor-pointer border-b border-l-4 border-slate-100 transition-colors duration-300 last:border-b-0 ${EDGE_CLASS[row.tone]} ${openId === row.id ? "bg-slate-50" : ""}`}
              >
                <td className="w-[28%] px-3 py-2 align-middle">
                  <p className="text-[13px] font-semibold text-slate-900">{row.title}</p>
                  <p className="font-mono text-[10px] text-slate-500">{row.id}</p>
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap gap-1">
                    {row.facts.map((fact) => (
                      <span key={fact} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                        {fact}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="w-[34%] px-3 py-2 text-right align-middle">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors duration-300 ${PILL_CLASS[row.tone]}`}>{row.pill}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
