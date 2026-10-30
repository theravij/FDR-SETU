import { ageingDays, routeLabel } from "../lib/format";
import { useDemo } from "../state/store";
import type { WorkspaceTab } from "../types";
import { AuditHistory } from "./AuditHistory";
import { Clearances } from "./Clearances";
import { FinalResult } from "./FinalResult";
import { ProvenanceDiff } from "./ProvenanceDiff";
import { RecheckMatrix } from "./RecheckMatrix";
import { StatusBadge } from "../components/ui";

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "recheck", label: "Selective Recheck Matrix" },
  { id: "provenance", label: "Document & 4-Tier Provenance Diff" },
  { id: "clearances", label: "Clearances & Edge-Case Tests" },
  { id: "audit", label: "Immutable Audit History" },
  { id: "result", label: "Final Result + evaluate_case() JSON" },
];

export function WorkspaceScreen() {
  const { state, evaluation, navigate } = useDemo();
  const snapshot = state.cases[state.caseId];
  const answers = [
    ["What is current?", evaluation.officerAnswers.whatIsCurrent],
    ["Independently confirmed?", evaluation.officerAnswers.independentlyConfirmed],
    ["Unresolved?", evaluation.officerAnswers.unresolved],
    ["Who acts next?", evaluation.officerAnswers.whoActsNext],
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-navy">
            {snapshot.caseId} · {snapshot.institutionName}
          </h1>
          <p className="truncate text-[11px] text-slate-500">
            {routeLabel(snapshot.route)} · opened {snapshot.openedOn} · ageing {ageingDays(snapshot.openedOn)} days · assignee {snapshot.assignee}
            {evaluation.actions.length > 0 ? ` · ${evaluation.actions.map((action) => `${action.id} due ${action.dueOn}`).join(", ")}` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={evaluation.statusLabel} />
          <span className="text-[11px] text-slate-500">Next {evaluation.nextActor}</span>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {answers.map(([question, answer]) => (
          <article key={question} className="min-w-0 border border-slate-200 bg-white px-2 py-1.5" title={answer}>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{question}</h2>
            <p className="line-clamp-2 text-[11px] leading-snug text-slate-800">{answer}</p>
          </article>
        ))}
      </div>

      <div className="flex shrink-0 gap-1 overflow-hidden border-b border-slate-200 bg-white px-2" role="tablist" aria-label="Case workspace">
        {TABS.map((tab) => {
          const selected = state.tab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => navigate({ tab: tab.id })}
              className={`border-b-2 px-2 py-2 text-[12px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-navy ${
                selected ? "border-navy text-navy" : "border-transparent text-slate-500 hover:text-navy"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col" role="tabpanel">
        {state.tab === "recheck" ? <RecheckMatrix /> : null}
        {state.tab === "provenance" ? <ProvenanceDiff /> : null}
        {state.tab === "clearances" ? <Clearances /> : null}
        {state.tab === "audit" ? <AuditHistory /> : null}
        {state.tab === "result" ? <FinalResult /> : null}
      </div>
    </section>
  );
}
