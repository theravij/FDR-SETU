import { useMemo, useState } from "react";
import { registerRows } from "../engine/register";
import { formatInr } from "../lib/format";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

const FILTERS = ["All", "Discrepancy", "Recheck", "Ready", "Released", "Hold"] as const;
type Filter = (typeof FILTERS)[number];

export function QueueScreen() {
  const { state, navigate, toggleVigilance, setRole } = useDemo();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => registerRows(Object.values(state.cases)), [state.cases]);
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) => {
    if (filter === "Discrepancy") return row.statusLabel === "DISCREPANCY";
    if (filter === "Recheck") return row.statusLabel === "RECHECK REQUIRED";
    if (filter === "Ready") return row.statusLabel === "READY FOR RELEASE";
    if (filter === "Released") return row.statusLabel === "RELEASED";
    if (filter === "Hold") return row.statusLabel === "VIGILANCE HOLD";
    return true;
  }).filter((row) => {
    if (!needle) return true;
    return [row.caseId, row.institutionName, row.routeLabel].some((value) => value.toLowerCase().includes(needle));
  });
  const open = rows.filter((row) => row.statusLabel !== "RELEASED");
  const actionRequired = rows.filter((row) => row.statusLabel === "DISCREPANCY" || row.statusLabel === "RECHECK REQUIRED").length;
  const ready = rows.filter((row) => row.statusLabel === "READY FOR RELEASE").length;
  const value = open.reduce((sum, row) => sum + row.evaluation.declaredAmountInr, 0);

  return (
    <ScreenFrame
      title="Officer Queue"
      meta="Triage open FDR and sanction-order files. Search by case, institution, or route."
      actions={
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search case, institution, route"
          aria-label="Search the register"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] shadow-sm outline-none focus:border-indigo-400"
        />
      }
    >
      <div className="mb-3 grid grid-cols-4 gap-3">
        <Summary label="Total cases" value={String(rows.length)} />
        <Summary label="Action required" value={String(actionRequired)} />
        <Summary label="Ready for approval" value={String(ready)} />
        <Summary label="Value under review" value={formatInr(value)} />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              filter === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Case", "Institution", "Route", "Status", "Ageing", "Assignee", "Next", ""].map((heading) => (
                <th key={heading} className="border-b border-slate-200 px-3 py-2 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.caseId} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px] font-semibold text-slate-900">{row.caseId}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[12px]">{row.institutionName}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-600">{row.routeLabel}</td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <StatusBadge status={row.statusLabel} />
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <AgeBar days={row.ageingDays} />
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 font-mono text-[9px] font-semibold text-white">
                      {row.assignee.slice(0, 2)}
                    </span>
                    <span className="font-mono">{row.assignee}</span>
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px]">{row.nextActor}</td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Btn onClick={() => navigate({ screen: "workspace", tab: "recheck", caseId: row.caseId })}>Open workspace</Btn>
                    {row.caseId === "DEMO-004" ? (
                      <Btn
                        kind={row.vigilanceHold ? "secondary" : "danger"}
                        onClick={() => {
                          if (state.role !== "VIG-22") setRole("VIG-22");
                          else toggleVigilance(row.caseId);
                        }}
                      >
                        {state.role === "VIG-22" ? (row.vigilanceHold ? "Lift hold" : "Place hold") : "Switch to VIG-22"}
                      </Btn>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[12px] text-slate-500">
                  No cases match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-slate-900">{value}</p>
    </article>
  );
}

function AgeBar({ days }: { days: number }) {
  const tone = days < 15 ? "bg-emerald-500" : days <= 45 ? "bg-amber-500" : "bg-rose-500";
  const width = Math.max(8, Math.min(100, (days / 60) * 100));
  return (
    <div className="w-24">
      <div className="mb-1 font-mono text-[11px] tabular-nums text-slate-700">{days}d</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
