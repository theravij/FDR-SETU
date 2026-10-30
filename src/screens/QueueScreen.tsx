import { useMemo, useState } from "react";
import { registerRows } from "../engine/register";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

const FILTERS = ["All", "Discrepancy", "Recheck", "Ready", "Released", "Hold"] as const;
type Filter = (typeof FILTERS)[number];

export function QueueScreen() {
  const { state, navigate, toggleVigilance } = useDemo();
  const [filter, setFilter] = useState<Filter>("All");
  const rows = useMemo(() => registerRows(Object.values(state.cases)), [state.cases]);
  const visible = rows.filter((row) => {
    if (filter === "Discrepancy") return row.statusLabel === "DISCREPANCY";
    if (filter === "Recheck") return row.statusLabel === "RECHECK REQUIRED";
    if (filter === "Ready") return row.statusLabel === "READY FOR RELEASE";
    if (filter === "Released") return row.statusLabel === "RELEASED";
    if (filter === "Hold") return row.statusLabel === "VIGILANCE HOLD";
    return true;
  });

  return (
    <ScreenFrame
      title="Officer Queue & Register"
      meta="Demo policy DEMO-POLICY-6.46: NOC route for FDR and RPGF, sanction-order route for RTGS. Figures are synthetic."
      actions={
        <div className="flex gap-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={`border px-2 py-1 text-[11px] font-medium ${
                filter === item ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-navy"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      <table className="w-full border-collapse bg-white text-left">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            {["Case", "Institution", "Route", "Status", "Ageing", "Assignee", "Next", "Escalation", ""].map((heading) => (
              <th key={heading} className="border-b border-slate-200 px-3 py-2 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.caseId} className="hover:bg-slate-50">
              <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px] font-semibold text-navy">{row.caseId}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-[12px]">{row.institutionName}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-700">{row.routeLabel}</td>
              <td className="border-b border-slate-100 px-3 py-2">
                <StatusBadge status={row.statusLabel} />
              </td>
              <td className="border-b border-slate-100 px-3 py-2 text-right text-[12px] tabular-nums">{row.ageingDays}d</td>
              <td className="border-b border-slate-100 px-3 py-2 text-[12px]">{row.assignee}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-[12px]">{row.nextActor}</td>
              <td className="border-b border-slate-100 px-3 py-2 font-mono text-[11px] text-slate-600">{row.escalationId || "—"}</td>
              <td className="border-b border-slate-100 px-3 py-2">
                <div className="flex justify-end gap-1">
                  <Btn
                    onClick={() => navigate({ screen: "workspace", tab: "recheck", caseId: row.caseId })}
                  >
                    Open
                  </Btn>
                  {row.caseId === "DEMO-004" ? (
                    <Btn kind={row.vigilanceHold ? "secondary" : "danger"} onClick={() => toggleVigilance(row.caseId)}>
                      {row.vigilanceHold ? "Lift hold" : "Place hold"}
                    </Btn>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScreenFrame>
  );
}
