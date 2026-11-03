import { Copy, Landmark } from "lucide-react";
import { formatInr, shortHash } from "../lib/format";
import { glanceRows, PILL_CLASS } from "../lib/caseView";
import { formatCaseRef, formatRuleVersion } from "../lib/labels";
import { useApp } from "../state/store";
import { StatusBadge } from "../components/ui";

export function FinalResult() {
  const { state, evaluation } = useApp();
  const snapshot = state.cases[state.caseId];
  const remark = (action: string) => snapshot.audit.filter((event) => event.action === action).at(-1)?.detail;
  const officer = remark("OFFICER_OBSERVATION");
  const institution = remark("INSTITUTION_RESUBMISSION");
  const director = remark("DIRECTOR_REMARK");
  const rows = glanceRows(snapshot);
  const v2 = snapshot.versions.find((item) => item.versionId === "V2");
  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <article className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-800">
            <Landmark size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Official AICTE verification certificate</p>
            <h2 className="font-mono text-[13px] font-semibold text-slate-900">{formatCaseRef(snapshot.caseId)}</h2>
          </div>
          {evaluation.releaseAuthorised ? (
            <aside className="max-w-[220px] rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900">Verified & cleared</p>
              <p className="mt-0.5 font-mono text-[10px] text-emerald-800">{formatRuleVersion(evaluation.ruleVersion)}</p>
              <p className="font-mono text-[10px] text-emerald-800">{shortHash(evaluation.evaluationHash, 12)}</p>
              {officer ? <p className="mt-1 text-[10px] leading-snug text-slate-700">{officer}</p> : null}
              {director ? <p className="text-[10px] leading-snug text-slate-700">{director}</p> : null}
            </aside>
          ) : (
            <StatusBadge status={evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel} />
          )}
        </header>
        <div className="grid grid-cols-2 gap-4 p-4">
          <section>
            <h3 className="text-[12px] font-semibold text-slate-900">Verification sign-off</h3>
            <ul className="mt-2 space-y-1.5">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10px] text-slate-500">{row.id}</span>
                  <span className="min-w-0 flex-1 text-slate-800">{row.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PILL_CLASS[row.tone]}`}>{row.pill}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${evaluation.blockers.length ? PILL_CLASS.rose : PILL_CLASS.emerald}`}>
                {evaluation.blockers.length ? `${evaluation.blockers.length} blockers` : "No Blockers"}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${v2 ? PILL_CLASS.indigo : PILL_CLASS.slate}`}>
                {v2 ? `${v2.versionId} ${formatInr(v2.fields.observedAmountInr)}` : `${evaluation.currentVersion} on file`}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL_CLASS.slate}`}>PFMS Disbursement Scope</span>
            </div>
            {officer ? <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[12px] text-indigo-950">{officer}</p> : null}
            {institution ? <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-800">{institution}</p> : null}
            {director ? <p className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] text-emerald-950">{director}</p> : null}
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-[12px] font-semibold text-slate-900">Provenance and governance</h3>
            <HashRow label="Policy" value={formatRuleVersion(evaluation.ruleVersion)} />
            <HashRow label="Instrument" value={evaluation.currentVersion} />
            <HashRow label="Evaluation hash" value={shortHash(evaluation.evaluationHash, 18)} full={evaluation.evaluationHash} onCopy={copy} />
            <HashRow label="File sha256" value={shortHash(evaluation.fileSha256, 18)} full={evaluation.fileSha256} onCopy={copy} />
            <p className="mt-2 text-[11px] font-semibold text-slate-700">Next: {evaluation.nextActor}</p>
          </section>
        </div>
        <footer className="border-t border-slate-200 px-4 py-2 text-[12px] text-slate-500">
          {evaluation.releaseAuthorised ? `Recorded by ${snapshot.release.by}` : "Awaiting the workspace action"}
        </footer>
      </article>
    </div>
  );
}

function HashRow({ label, value, full, onCopy }: { label: string; value: string; full?: string; onCopy?: (value: string) => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[12px]">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-800">{value}</span>
      {full && onCopy ? (
        <button type="button" aria-label={`Copy ${label}`} onClick={() => onCopy(full)} className="text-slate-500 hover:text-slate-900">
          <Copy size={12} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
