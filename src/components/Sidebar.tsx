import { BarChart3, List, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { useDemo } from "../state/store";
import type { RoleId, ScreenId } from "../types";
import { TourToggle } from "./CursorTour";

const NAV: Array<{ id: ScreenId; label: string; hint: string; icon: ReactNode }> = [
  { id: "workspace", label: "Case Workspace", hint: "Current file", icon: <Scale size={15} aria-hidden /> },
  { id: "queue", label: "Officer Queue", hint: "Open register", icon: <List size={15} aria-hidden /> },
  { id: "reports", label: "Workload Summary", hint: "Ageing & load", icon: <BarChart3 size={15} aria-hidden /> },
];

const VISIBLE_ROLES: RoleId[] = ["RO-104", "DIR-01", "INST-01"];

export function Sidebar() {
  const { state, navigate, setRole, reset } = useDemo();

  return (
    <aside className="flex w-[248px] min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">SIH26265</p>
        <p className="text-[15px] font-semibold text-navy">FDR Setu</p>
        <p className="mt-1 break-words text-[11px] leading-snug text-slate-500">AICTE Security Deposit Verification Portal</p>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label="Screens">
        {NAV.map((item) => {
          const active = state.screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-tour={`nav-${item.id}`}
              onClick={() => navigate({ screen: item.id })}
              aria-current={active ? "page" : undefined}
              className={`mb-1.5 flex w-full items-start gap-2.5 border px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                active ? "border-navy bg-navy text-white" : "border-transparent text-navy hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                <span className={`block text-[11px] leading-snug ${active ? "text-slate-300" : "text-slate-500"}`}>{item.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-3 py-3">
        <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acting as</p>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Role">
          {VISIBLE_ROLES.map((id) => (
            <button
              key={id}
              type="button"
              data-tour={`role-${id}`}
              aria-pressed={state.role === id}
              onClick={() => setRole(id)}
              className={`border px-1 py-1.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                state.role === id ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy hover:bg-slate-50"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <TourToggle />
          <button type="button" onClick={reset} className="text-[12px] text-slate-600 underline-offset-2 hover:text-navy hover:underline">
            Reset Workspace
          </button>
        </div>
      </div>
    </aside>
  );
}
