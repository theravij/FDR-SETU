import { buildDemo001 } from "../data/cases";
import { evaluateCase } from "../engine/evaluateCase";
import { CHECK_NAMES } from "../lib/caseView";
import { ScreenFrame } from "../components/ui";
import type { CheckId } from "../types";

const MINUTES = 12;

export function BaselineScreen() {
  const snapshot = buildDemo001(3);
  const selective = evaluateCase(snapshot);
  const rows = selective.checks.map((check) => {
    return {
      id: check.id as CheckId,
      title: CHECK_NAMES[check.id],
      selective: check.status,
    };
  });
  const baselineOpen = rows.length;
  const selectiveOpen = selective.selectiveRecheck.invalidated.length + selective.selectiveRecheck.recomputed.length;
  const kept = Math.max(0, baselineOpen - selectiveOpen);
  const saved = baselineOpen ? Math.round((kept / baselineOpen) * 100) : 0;

  return (
    <ScreenFrame
      title="Baseline Comparison"
      meta={`${baselineOpen} Checks vs ${selectiveOpen} Checks = ${saved}% Re-verification Saved`}
    >
      <div className="mb-3 grid grid-cols-3 gap-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Checks reopened</p>
          <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-slate-900">{selectiveOpen} <span className="text-[12px] font-medium text-slate-500">of {baselineOpen}</span></p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Confirmations kept</p>
          <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-emerald-950">{selective.selectiveRecheck.preserved.length}</p>
        </article>
        <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">Officer minutes saved</p>
          <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-indigo-950">{(baselineOpen - selectiveOpen) * MINUTES}</p>
        </article>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <section className="col-span-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {["Check", "Full recheck", "Selective"].map((heading) => (
                  <th key={heading} className="border-b border-slate-200 px-3 py-2 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    <span className="font-mono text-[12px] font-semibold text-navy">{row.id}</span>
                    <span className="mt-0.5 block text-[12px] text-slate-700">{row.title}</span>
                  </td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-rose-700">Reopen</td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-slate-900">{row.selective === "PRESERVED_CONFIRMED" ? "Locked" : row.selective === "RECHECK_REQUIRED" ? "Reopen" : "Kept"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="col-span-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h2 className="text-[13px] font-semibold text-navy">Measurable impact</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${saved}%` }} />
          </div>
          <dl className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Checks compared</dt>
              <dd className="font-semibold tabular-nums">{baselineOpen} vs {selectiveOpen}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Kept from prior version</dt>
              <dd className="font-semibold tabular-nums">{kept}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Minutes at {MINUTES} each</dt>
              <dd className="font-semibold tabular-nums">{baselineOpen * MINUTES} → {selectiveOpen * MINUTES}</dd>
            </div>
          </dl>
        </section>
      </div>
    </ScreenFrame>
  );
}
