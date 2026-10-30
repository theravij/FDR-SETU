import { BarChart3, Download, GitCompare, Landmark, List, RotateCcw, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { ROLES } from "../engine/permissions";
import { apiBaseUrl } from "../lib/api";
import { useDemo } from "../state/store";
import type { RoleId, ScreenId } from "../types";

const NAV: Array<{ id: ScreenId; label: string; hint: string; icon: ReactNode }> = [
  { id: "workspace", label: "Case Workspace", hint: "DEMO-001", icon: <Scale size={15} aria-hidden /> },
  { id: "queue", label: "Officer Queue & Register", hint: "DEMO-001 – DEMO-005", icon: <List size={15} aria-hidden /> },
  { id: "institution", label: "Institution Portal", hint: "Upload & status", icon: <Landmark size={15} aria-hidden /> },
  { id: "reports", label: "Workload & Ageing Reports", hint: "Open cases", icon: <BarChart3 size={15} aria-hidden /> },
  { id: "baseline", label: "Baseline Comparison", hint: "Full recheck vs selective", icon: <GitCompare size={15} aria-hidden /> },
];

export function Sidebar() {
  const { state, engineSource, navigate, setRole, exportJson, exportCsv, reset } = useDemo();
  const role = ROLES.find((item) => item.id === state.role) ?? ROLES[0];
  const workspaceHint = state.caseId;

  return (
    <aside className="flex w-[240px] min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">SIH26265</p>
        <p className="text-sm font-semibold text-navy">FDR Setu</p>
        <p className="text-[11px] leading-snug text-slate-500">AICTE security-deposit cases. Sample workflow only.</p>
      </div>
      <nav className="min-h-0 flex-1 overflow-auto p-2" aria-label="Screens">
        {NAV.map((item) => {
          const active = state.screen === item.id;
          const hint = item.id === "workspace" ? workspaceHint : item.hint;
          const label = item.id === "workspace" ? `Case Workspace (${workspaceHint})` : item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate({ screen: item.id })}
              aria-current={active ? "page" : undefined}
              className={`mb-1 flex w-full items-start gap-2 border px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                active ? "border-navy bg-navy text-white" : "border-transparent text-navy hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="mt-0.5">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-[12px] font-medium leading-tight">{label}</span>
                <span className={`block truncate text-[10px] ${active ? "text-slate-300" : "text-slate-500"}`}>{hint}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acting as</p>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Role">
          {ROLES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={state.role === item.id}
              onClick={() => setRole(item.id as RoleId)}
              className={`border px-1.5 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                state.role === item.id ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy hover:bg-slate-50"
              }`}
            >
              {item.id}
            </button>
          ))}
        </div>
        <p className="px-1 pt-1.5 text-[10px] leading-snug text-slate-600">
          <span className="font-semibold text-navy">{role.title}.</span> {role.summary}
        </p>
        <p className="truncate px-1 pt-1 text-[10px] text-slate-500">
          {apiBaseUrl() === ""
            ? "Engine: in-browser"
            : engineSource === "api"
              ? "Engine: API confirmed"
              : "Engine: in-browser (API unavailable)"}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1">
          <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2 py-1 text-[12px] font-medium text-navy hover:bg-slate-50">
            <Download size={13} aria-hidden /> Export JSON
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2 py-1 text-[12px] font-medium text-navy hover:bg-slate-50">
            <Download size={13} aria-hidden /> Export CSV
          </button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2 py-1 text-[12px] font-medium text-navy hover:bg-slate-50">
            <RotateCcw size={13} aria-hidden /> Reset Demo State
          </button>
        </div>
      </div>
    </aside>
  );
}
