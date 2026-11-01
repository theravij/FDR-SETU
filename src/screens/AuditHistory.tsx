import { verifyAuditChain } from "../lib/audit";
import { shortHash } from "../lib/format";
import { useDemo } from "../state/store";
import { maskOperationalText } from "../lib/labels";
import { StatusBadge } from "../components/ui";

export function AuditHistory() {
  const { state } = useDemo();
  const snapshot = state.cases[state.caseId];
  const intact = verifyAuditChain(snapshot.audit);
  const events = [...snapshot.audit].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <StatusBadge status={intact ? "CONFIRMED" : "DISCREPANCY"} />
        <p className="text-[12px] text-slate-600">
          {intact
            ? "Chain intact. Newest event first. Each hash still commits the previous hash."
            : "Chain failed verification."}
        </p>
      </div>
      <ol className="relative space-y-3 border-l border-slate-200 pl-4">
        {events.map((event) => (
          <li key={event.hash} className="relative">
            <span className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500" />
            <article className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">{event.actor}</span>
                <span className="font-mono text-[11px] text-slate-800">{maskOperationalText(event.action)}</span>
                <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-500">{event.at}</span>
              </div>
              <p className="mt-1 text-[12px] leading-snug text-slate-700">{maskOperationalText(event.detail)}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-400" title={`${event.prevHash} → ${event.hash}`}>
                {shortHash(event.hash, 18)}
              </p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
