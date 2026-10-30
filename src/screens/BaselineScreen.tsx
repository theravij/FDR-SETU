import { buildDemo001 } from "../data/cases";
import { evaluateCase } from "../engine/evaluateCase";
import { statusText } from "../lib/format";
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
      title: check.title,
      baseline,
      selective: check.status,
    };
  });
  const baselineOpen = rows.length;
  const selectiveOpen = selective.selectiveRecheck.invalidated.length;

  return (
    <ScreenFrame
      title="Baseline Comparison"
      meta="Canonical DEMO-001 at the moment V2 is uploaded. Baseline reopens every check. FDR Setu reopens only CHK-02."
    >
      <div className="grid h-full grid-cols-5 gap-3 p-3">
        <section className="col-span-3 border border-slate-200 bg-white">
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
        <section className="col-span-2 border border-slate-200 bg-white p-3">
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
