import { shortHash } from "../lib/format";
import { useDemo } from "../state/store";
import { Btn, StatusBadge } from "../components/ui";

export function FinalResult() {
  const { state, evaluation, attemptRelease } = useDemo();
  const snapshot = state.cases[state.caseId];
  const json = JSON.stringify(evaluation, null, 2);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-5 gap-3 p-3">
      <div className="col-span-2 flex min-h-0 flex-col gap-2">
        <article className="border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-navy">Verification summary</h2>
            <StatusBadge status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel} />
          </div>
          <p className="mt-1 text-[12px] leading-snug text-slate-700">
            Recording this decision does not issue the NOC or execute the payment. Those remain with the authorised AICTE process.
          </p>
          <dl className="mt-2 space-y-1 text-[12px]">
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-slate-500">Rule</dt>
              <dd className="font-mono text-[11px] text-navy">{evaluation.ruleVersion}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-slate-500">evaluationHash</dt>
              <dd className="min-w-0 break-all font-mono text-[11px] text-navy">{evaluation.evaluationHash}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-slate-500">File sha256</dt>
              <dd className="font-mono text-[11px] text-slate-700" title={evaluation.fileSha256}>
                {shortHash(evaluation.fileSha256, 18)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-slate-500">Substantive</dt>
              <dd className="font-mono text-[11px] text-slate-700" title={evaluation.substantiveHash}>
                {shortHash(evaluation.substantiveHash, 18)}
              </dd>
            </div>
          </dl>
          <ul className="mt-2 space-y-1">
            {evaluation.checks.map((check) => (
              <li key={check.id} className="flex items-center gap-2 text-[12px]">
                <span className="w-14 font-mono text-[11px] text-navy">{check.id}</span>
                <StatusBadge status={check.status} />
                <span className="truncate text-slate-600">{check.title}</span>
              </li>
            ))}
          </ul>
          {evaluation.blockers.length > 0 ? (
            <p className="mt-2 text-[12px] text-crimson">Blockers: {evaluation.blockers.join("; ")}</p>
          ) : (
            <p className="mt-2 text-[12px] text-emerald-800">No blockers on the current version.</p>
          )}
          {snapshot.release.authorised ? (
            <p className="mt-2 text-[12px] text-slate-700">
              Authorised by {snapshot.release.by} at {snapshot.release.at}. Hash {shortHash(snapshot.release.evaluationHash ?? "", 16)}.
            </p>
          ) : null}
          <div className="mt-3">
            <Btn kind="primary" data-tour="authorise" onClick={attemptRelease}>
              Authorise release as {state.role}
            </Btn>
          </div>
        </article>
        {state.notice ? (
          <pre className="min-h-0 flex-1 overflow-auto border border-slate-200 bg-white p-2 font-mono text-[11px] leading-snug text-slate-800 whitespace-pre-wrap">
            {state.notice.title}
            {"\n"}
            {state.notice.body}
          </pre>
        ) : null}
      </div>
      <article className="col-span-3 flex min-h-0 flex-col border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-navy">
          Verification payload
        </header>
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-slate-800">{json}</pre>
      </article>
    </div>
  );
}
