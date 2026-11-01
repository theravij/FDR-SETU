import { useDemo } from "../state/store";
import { CHECK_TITLES } from "../lib/labels";
import type { EvaluatedCheck } from "../types";

function pill(check: EvaluatedCheck): { text: string; className: string } {
  if (check.status === "DISCREPANCY") return { text: "DISCREPANCY", className: "bg-rose-50 text-rose-800" };
  if (check.bucket === "preserved" || check.status === "PRESERVED_CONFIRMED") {
    return { text: "PRESERVED FROM V1", className: "bg-emerald-50 text-emerald-800" };
  }
  if (check.bucket === "recomputed") return { text: "RECOMPUTED ON V2", className: "bg-indigo-50 text-indigo-800" };
  if (check.status === "RECHECK_REQUIRED") return { text: "NEEDS RECHECK", className: "bg-amber-50 text-amber-900" };
  return { text: "CONFIRMED", className: "bg-slate-50 text-slate-700" };
}

export function RecheckMatrix() {
  const { evaluation } = useDemo();
  const { preserved, recomputed, invalidated } = evaluation.selectiveRecheck;

  return (
    <div data-demo-target="recheck-matrix" className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="grid shrink-0 grid-cols-3 gap-2 text-[12px]">
        <p className="rounded-lg bg-rose-50 px-2 py-1.5 font-medium text-rose-900">{invalidated.length} invalidated</p>
        <p className="rounded-lg bg-emerald-50 px-2 py-1.5 font-medium text-emerald-900">{preserved.length} preserved from V1 (locked)</p>
        <p className="rounded-lg bg-indigo-50 px-2 py-1.5 font-medium text-indigo-900">{recomputed.length} recomputed on V2</p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left">
          <tbody>
            {evaluation.checks.map((check) => {
              const mark = pill(check);
              return (
                <tr key={check.id} data-demo-target={`check-${check.id}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 align-top">
                    <p className="text-[13px] font-semibold text-slate-900">{CHECK_TITLES[check.id]}</p>
                    <p className="font-mono text-[10px] text-slate-500">{check.id}</p>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${mark.className}`}>{mark.text}</span>
                  </td>
                  <td className="px-3 py-2 align-top text-[12px] leading-snug text-slate-600">{check.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
