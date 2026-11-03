import { useMemo } from "react";
import { registerRows, type RegisterRow } from "../engine/register";
import { useApp } from "../state/store";
import { formatCaseRef } from "../lib/labels";
import { ScreenFrame, StatusBadge } from "../components/ui";

function bucket(days: number): string {
  if (days <= 7) return "0–7 days";
  if (days <= 15) return "8–15 days";
  if (days <= 30) return "16–30 days";
  return "31+ days";
}

function countBy(rows: RegisterRow[], key: (row: RegisterRow) => string): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + 1);
  return [...map.entries()];
}

export function ReportsScreen() {
  const { state } = useApp();
  const rows = useMemo(() => registerRows(Object.values(state.cases)), [state.cases]);
  const open = rows.filter((row) => row.statusLabel !== "RELEASED");
  const ageing = ["0–7 days", "8–15 days", "16–30 days", "31+ days"].map((label) => ({
    label,
    count: open.filter((row) => bucket(row.ageingDays) === label).length,
  }));
  const max = Math.max(1, ...ageing.map((item) => item.count));
  const openAge = open.reduce((sum, row) => sum + row.ageingDays, 0);
  const due = rows.flatMap((row) =>
    row.evaluation.actions.map((action) => ({ caseId: row.caseId, ...action })),
  );

  return (
    <ScreenFrame
      title="Workload & Ageing"
      meta={`${open.length} open · ${open.length ? Math.round(openAge / open.length) : 0}d mean age`}
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-3 py-2 text-[13px] font-semibold text-navy">Open cases by ageing</h2>
          <table className="w-full text-left">
            <tbody>
              {ageing.map((item) => (
                <tr key={item.label}>
                  <td className="px-3 py-2 text-[12px]">{item.label}</td>
                  <td className="px-3 py-2 text-[12px] tabular-nums">{item.count}</td>
                  <td className="w-1/2 px-3 py-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${item.label.startsWith("0") ? "bg-emerald-500" : item.label.startsWith("8") ? "bg-sky-500" : item.label.startsWith("16") ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <ReportTable title="By route" pairs={countBy(rows, (row) => row.routeLabel)} />
        <ReportTable title="Open cases by assignee" pairs={countBy(open, (row) => row.assignee)} />
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm lg:col-span-3">
          <h2 className="border-b border-slate-200 px-3 py-2 text-[13px] font-semibold text-navy">Maturity alerts</h2>
          {due.length === 0 ? (
            <p className="px-3 py-2 text-[12px] font-semibold text-slate-600">No maturity due</p>
          ) : (
            <div className="flex flex-wrap gap-2 p-3">
              {due.map((action) => (
                <span key={`${action.caseId}-${action.id}`} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950">
                  {formatCaseRef(action.caseId)} · Due {action.dueOn} · {action.responsibleRole}
                </span>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm lg:col-span-3">
          <h2 className="border-b border-slate-200 px-3 py-2 text-[13px] font-semibold text-navy">Register used for the counts</h2>
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {["Case", "Status", "Route", "Ageing", "Assignee"].map((heading) => (
                  <th key={heading} className="px-3 py-1.5 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.caseId} className="border-t border-slate-100 text-[12px]">
                  <td className="px-3 py-1.5 font-mono">{formatCaseRef(row.caseId)}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={row.statusLabel} />
                  </td>
                  <td className="px-3 py-1.5">{row.routeLabel}</td>
                  <td className="px-3 py-1.5 tabular-nums">{row.ageingDays}d</td>
                  <td className="px-3 py-1.5">{row.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </ScreenFrame>
  );
}

function ReportTable({ title, pairs }: { title: string; pairs: Array<[string, number]> }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-3 py-2 text-[13px] font-semibold text-navy">{title}</h2>
      <table className="w-full text-left">
        <tbody>
          {pairs.map(([label, count]) => (
            <tr key={label} className="border-t border-slate-100 text-[12px]">
              <td className="px-3 py-2">{label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
