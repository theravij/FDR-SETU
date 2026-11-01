import { useState } from "react";
import { useDemo } from "../state/store";
import { CHECK_TITLES } from "../lib/labels";
import type { EvaluatedCheck } from "../types";

function pill(check: EvaluatedCheck): { text: string; className: string; edge: string } {
  if (check.status === "DISCREPANCY") return { text: "DISCREPANCY", className: "bg-rose-50 text-rose-800", edge: "border-l-rose-500" };
  if (check.bucket === "preserved" || check.status === "PRESERVED_CONFIRMED") {
    return { text: "🔒 LOCKED FROM V1 · No Re-check Required", className: "bg-emerald-50 text-emerald-800", edge: "border-l-emerald-500" };
  }
  if (check.bucket === "recomputed") {
    return { text: "⚡ RECOMPUTED ON V2 · Confirmed via EV-BNK-202", className: "bg-indigo-50 text-indigo-800", edge: "border-l-indigo-500" };
  }
  if (check.status === "RECHECK_REQUIRED") return { text: "NEEDS RECHECK", className: "bg-amber-50 text-amber-900", edge: "border-l-amber-400" };
  return { text: "CONFIRMED", className: "bg-slate-50 text-slate-700", edge: "border-l-slate-200" };
}

export function RecheckMatrix() {
  const { evaluation } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
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
                <tr
                  key={check.id}
                  data-demo-target={`check-row-${check.id}`}
                  onClick={() => setOpenId((current) => (current === check.id ? null : check.id))}
                  className={`cursor-pointer border-b border-l-4 border-slate-100 last:border-b-0 ${mark.edge} ${openId === check.id ? "bg-slate-50" : ""}`}
                >
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
