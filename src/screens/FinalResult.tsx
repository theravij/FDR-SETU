import { useState } from "react";
import { Copy, Landmark } from "lucide-react";
import { shortHash } from "../lib/format";
import { CHECK_TITLES, formatCaseRef, formatReleaseScope, formatRuleVersion, maskOperationalText } from "../lib/labels";
import { useDemo } from "../state/store";
import { Btn, StatusBadge } from "../components/ui";

export function FinalResult() {
  const { state, evaluation, attemptRelease } = useDemo();
  const snapshot = state.cases[state.caseId];
  const [technical, setTechnical] = useState(false);
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
          <StatusBadge status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel} />
        </header>
        <div className="grid grid-cols-2 gap-4 p-4">
          <section>
            <h3 className="text-[12px] font-semibold text-slate-900">Verification sign-off</h3>
            <ul className="mt-2 space-y-1.5">
              {evaluation.checks.map((check) => (
                <li key={check.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10px] text-slate-500">{check.id}</span>
                  <span className="min-w-0 flex-1 text-slate-800">{CHECK_TITLES[check.id]}</span>
                  <StatusBadge status={check.status} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-slate-600">
              {evaluation.blockers.length > 0 ? `Active blockers: ${evaluation.blockers.join("; ")}` : "No active blockers on the current version."}
            </p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-[12px] font-semibold text-slate-900">Provenance and governance</h3>
            <HashRow label="Policy" value={formatRuleVersion(evaluation.ruleVersion)} />
            <HashRow label="Instrument" value={evaluation.currentVersion} />
            <HashRow label="Evaluation hash" value={shortHash(evaluation.evaluationHash, 18)} full={evaluation.evaluationHash} onCopy={copy} />
            <HashRow label="File sha256" value={shortHash(evaluation.fileSha256, 18)} full={evaluation.fileSha256} onCopy={copy} />
            <p className="mt-2 text-[11px] text-slate-600">Next responsible officer: {evaluation.nextActor}</p>
            <p className="mt-2 text-[12px] leading-snug text-slate-700" title={formatReleaseScope(evaluation.financialRelease)}>
              Verification & Lien Clearance Record Only — Financial release is executed via external PFMS workflow.
            </p>
          </section>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          {evaluation.releaseReady && !evaluation.releaseAuthorised ? (
            <Btn kind="primary" onClick={attemptRelease}>
              Authorise Verification Record
            </Btn>
          ) : (
            <span className="text-[12px] text-slate-500">{evaluation.releaseAuthorised ? `Recorded by ${snapshot.release.by}` : "Decision is not ready."}</span>
          )}
          <button type="button" onClick={() => setTechnical((open) => !open)} className="text-[11px] text-slate-500 underline-offset-2 hover:underline">
            View technical JSON
          </button>
        </footer>
        {technical ? (
          <pre className="max-h-40 overflow-auto border-t border-slate-200 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
            {maskOperationalText(JSON.stringify(evaluation, null, 2))}
          </pre>
        ) : null}
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
