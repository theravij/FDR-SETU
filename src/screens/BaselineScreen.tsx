import { buildDemo001 } from "../data/cases";
import { evaluateCase } from "../engine/evaluateCase";
import { statusText } from "../lib/format";
import { CHECK_TITLES } from "../lib/labels";
import { ScreenFrame } from "../components/ui";
import type { CheckId, CheckStatus } from "../types";

const MINUTES = 12;

export function BaselineScreen() {
  const snapshot = buildDemo001(3);
  const selective = evaluateCase(snapshot);
  const rows = selective.checks.map((check) => {
    const baseline: CheckStatus = "RECHECK_REQUIRED";
    return {
      id: check.id as CheckId,
      title: CHECK_TITLES[check.id],
      baseline,
      selective: check.status,
    };
  });
  const baselineOpen = rows.length;
  const selectiveOpen = selective.selectiveRecheck.invalidated.length + selective.selectiveRecheck.recomputed.length;

  return (
    <ScreenFrame
      title="Baseline Comparison"
      meta="National Institute of Technical Studies at the moment the replacement instrument is uploaded. A full recheck reopens every check. Selective recheck reopens only the changed bank confirmation."
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
      <div data-demo-target="baseline-compare" className="grid grid-cols-5 gap-3">
        <section className="col-span-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {["Check", "Baseline: any new version reopens all", "FDR Setu: reopen only a changed scope"].map((heading) => (
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
                  <td className="px-3 py-2 text-[12px] font-semibold text-crimson">{statusText(row.baseline)}</td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-navy">{statusText(row.selective)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="col-span-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h2 className="text-[13px] font-semibold text-navy">What the officer must redo</h2>
          <dl className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Checks reopened</dt>
              <dd className="font-semibold tabular-nums">
                {baselineOpen} baseline · {selectiveOpen} selective
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Confirmations kept</dt>
              <dd className="font-semibold tabular-nums">0 baseline · {selective.selectiveRecheck.preserved.length} selective</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt>Officer minutes at {MINUTES} per reopened check</dt>
              <dd className="font-semibold tabular-nums">
                {baselineOpen * MINUTES} · {selectiveOpen * MINUTES}
              </dd>
            </div>
          </dl>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-[12px] leading-snug text-slate-700">
            <li>Each check names the fields it reads.</li>
            <li>A new file hash alone changes nothing.</li>
            <li>A new version reopens a check only when those fields, or evidence bound to them, change.</li>
            <li>Evidence for an earlier version stays on the file and is marked historical.</li>
          </ol>
        </section>
      </div>
    </ScreenFrame>
  );
}
