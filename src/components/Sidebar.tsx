import { BarChart3, Download, GitCompare, Landmark, List, Lock, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { ROLES } from "../engine/permissions";
import { useDemo } from "../state/store";
import type { RoleId, ScreenId } from "../types";

const NAV: Array<{ id: ScreenId; label: string; hint: string; icon: ReactNode }> = [
  { id: "workspace", label: "Case Workspace", hint: "Current file", icon: <Scale size={15} aria-hidden /> },
  { id: "queue", label: "Officer Queue", hint: "Triage the register", icon: <List size={15} aria-hidden /> },
  { id: "institution", label: "Institution Portal", hint: "Corrected instrument", icon: <Landmark size={15} aria-hidden /> },
  { id: "reports", label: "Workload & Ageing", hint: "Open cases", icon: <BarChart3 size={15} aria-hidden /> },
  { id: "baseline", label: "Baseline Comparison", hint: "Full recheck vs selective", icon: <GitCompare size={15} aria-hidden /> },
];

export function Sidebar() {
  const { state, navigate, setRole, exportJson, exportCsv, reset, signOut, evaluation } = useDemo();

  return (
    <aside className="flex w-[268px] min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
            <Landmark size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">AICTE · SIH26265</p>
            <p className="text-[15px] font-semibold leading-tight text-white">FDR Setu</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-slate-400">Security deposit verification. A recorded decision does not move funds.</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Screens">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Workspace</p>
        {NAV.map((item) => {
          const active = state.screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-demo-target={`nav-${item.id}`}
              onClick={() => navigate({ screen: item.id })}
              aria-current={active ? "page" : undefined}
              className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-left ${
                active
                  ? "border-indigo-400 bg-indigo-500/15 text-indigo-300"
                  : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                <span className={`block text-[11px] ${active ? "text-indigo-200/70" : "text-slate-500"}`}>{item.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acting as</p>
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Role">
          {ROLES.map((item) => {
            const active = state.role === item.id;
            const pending = evaluation.nextActor === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-demo-target={`role-${item.id}`}
                aria-pressed={active}
                onClick={() => setRole(item.id as RoleId)}
                className={`rounded-lg border px-2 py-1.5 text-left ${
                  active ? "border-indigo-400 bg-indigo-500/15 text-indigo-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="font-mono text-[11px] font-semibold">{item.id}</span>
                  {pending ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Action waiting" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[11px]">
          <button type="button" onClick={exportJson} className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
            <Download size={11} aria-hidden /> Export JSON
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 text-slate-300 hover:text-white">
            <Download size={11} aria-hidden /> Export CSV
          </button>
        </div>
        <button type="button" onClick={reset} className="mt-2 w-full text-center text-[11px] text-slate-500 hover:text-slate-200">
          Reset
        </button>
        <button type="button" onClick={signOut} className="mt-1 inline-flex w-full items-center justify-center gap-1 text-center text-[11px] text-slate-500 hover:text-slate-200">
          <Lock size={11} aria-hidden /> Lock / Sign out
        </button>
      </div>
    </aside>
  );
}
