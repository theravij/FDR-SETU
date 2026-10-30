import { verifyAuditChain } from "../lib/audit";
import { shortHash } from "../lib/format";
import { useDemo } from "../state/store";
import { StatusBadge } from "../components/ui";

export function AuditHistory() {
  const { state } = useDemo();
  const snapshot = state.cases[state.caseId];
  const intact = verifyAuditChain(snapshot.audit);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <StatusBadge status={intact ? "CONFIRMED" : "DISCREPANCY"} />
        <p className="text-[12px] text-slate-700">
          {intact
            ? "Chain intact. Each event hash commits the previous hash. Events are not editable in this simulation."
            : "Chain failed verification."}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">When</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Actor</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Action</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Detail</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Event hash</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.audit.map((event) => (
              <tr key={event.hash}>
                <td className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-700">{event.at}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] font-medium text-navy">{event.actor}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-800">{event.action}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 text-[12px] leading-snug text-slate-700">{event.detail}</td>
                <td className="border-b border-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-600" title={`${event.prevHash} → ${event.hash}`}>
                  {shortHash(event.hash, 14)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
