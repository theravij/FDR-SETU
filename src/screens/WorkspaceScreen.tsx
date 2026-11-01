import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { ageingDays, formatInr, routeLabel } from "../lib/format";
import { formatCaseRef } from "../lib/labels";
import { useDemo } from "../state/store";
import type { CaseSnapshot, RoleId, Step, WorkspaceTab } from "../types";
import { AuditHistory } from "./AuditHistory";
import { Clearances } from "./Clearances";
import { FinalResult } from "./FinalResult";
import { ProvenanceDiff } from "./ProvenanceDiff";
import { RecheckMatrix } from "./RecheckMatrix";
import { Btn, StatusBadge } from "../components/ui";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "1. V1 Intake" },
  { step: 2, label: "2. Discrepancy Flagged" },
  { step: 3, label: "3. V2 Resubmitted" },
  { step: 4, label: "4. Selective Recheck" },
  { step: 5, label: "5. Final Decision" },
];

export function WorkspaceScreen() {
  const demo = useDemo();
  const { state, evaluation, navigate, setStep, setRole } = demo;
  const snapshot = state.cases[state.caseId];
  const delta = evaluation.observedAmountInr - evaluation.declaredAmountInr;
  const matched = delta === 0;
  const locked = evaluation.selectiveRecheck.preserved.length;
  const recomputed = evaluation.selectiveRecheck.recomputed.length;
  const action = primaryAction(demo);
  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "recheck", label: "Selective Recheck" },
    { id: "provenance", label: "Provenance Diff" },
    { id: "clearances", label: "Clearances" },
    { id: "audit", label: "Audit Trail" },
    { id: "result", label: "Verification Certificate" },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 font-mono text-[11px] font-semibold text-white">{formatCaseRef(snapshot.caseId)}</span>
          <h1 className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{snapshot.institutionName}</h1>
          <span className="shrink-0 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{routeLabel(snapshot.route)}</span>
          <span className="shrink-0">
            <StatusBadge status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel} />
          </span>
          {action ? (
            <Btn
              kind="primary"
              className="ml-auto shrink-0 whitespace-nowrap"
              data-demo-target="workflow-primary-cta"
              onClick={() => {
                if (state.role !== action.role) setRole(action.role);
                action.run();
              }}
            >
              {action.label}
            </Btn>
          ) : (
            <span className="ml-auto shrink-0 whitespace-nowrap text-[12px] font-medium text-emerald-800">Verification record issued</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {snapshot.caseId === "DEMO-001" ? (
            <div className="flex shrink-0 gap-1" role="group" aria-label="Case lifecycle">
              {STEPS.map((item) => {
                const selected = state.step === item.step;
                const done = state.step > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setStep(item.step)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-slate-600">
            <span>{matched ? `Declared vs scan: ${formatInr(evaluation.declaredAmountInr)} Matched` : `Declared vs scan: ${formatInr(evaluation.declaredAmountInr)} / ${formatInr(evaluation.observedAmountInr)} (${formatInr(delta)})`}</span>
            <span className="text-slate-300">|</span>
            <span>Recheck scope: {locked} locked · {recomputed} recomputed</span>
            <span className="text-slate-300">|</span>
            <span>Clearances: {snapshot.vigilanceHold ? "Hold" : snapshot.lienConfirmed ? "Lien Confirmed" : "Lien open"}</span>
            <span className="text-slate-300">|</span>
            <span>SLA: {ageingDays(snapshot.openedOn)}d Open</span>
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 px-4 pb-3 pt-3">
        <Certificate snapshot={snapshot} step={state.step} />

        <div className="col-span-8 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2" role="tablist" aria-label="Case inspection">
            {tabs.map((tab) => {
              const selected = state.tab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-demo-target={`tab-${tab.id}`}
                  aria-selected={selected}
                  onClick={() => navigate({ tab: tab.id })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium ${
                    selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
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
        </div>
      </div>
    </section>
  );
}

function Certificate({ snapshot, step }: { snapshot: CaseSnapshot; step: number }) {
  const versions = snapshot.versions;
  const [previewId, setPreviewId] = useState(snapshot.currentVersionId);
  useEffect(() => {
    setPreviewId(snapshot.currentVersionId);
  }, [snapshot.currentVersionId, step]);
  const preview = versions.find((item) => item.versionId === previewId) ?? versions[0];
  if (!preview) return null;
  const mismatch = preview.fields.declaredAmountInr !== preview.fields.observedAmountInr;
  const delta = preview.fields.observedAmountInr - preview.fields.declaredAmountInr;
  const evidence = snapshot.bankEvidence.find((item) => item.coversVersionId === preview.versionId);
  const rejected = preview.versionId === "V1" && mismatch;

  return (
    <article data-demo-target="fdr-certificate" className="col-span-4 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-800">
            <Landmark size={14} aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">Punjab National Bank</p>
            <p className="font-mono text-[12px] tabular-nums text-slate-700">{preview.fields.referenceNumber}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {versions.map((item) => (
            <button
              key={item.versionId}
              type="button"
              data-demo-target={item.versionId === "V1" ? "cert-v1" : "cert-v2"}
              aria-pressed={item.versionId === preview.versionId}
              onClick={() => setPreviewId(item.versionId)}
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                item.versionId === preview.versionId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {item.versionId}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Declared on form</p>
          <p className="font-mono text-[13px] font-semibold tabular-nums">{formatInr(preview.fields.declaredAmountInr)}</p>
        </div>
        <div className={`rounded-lg px-2 py-1.5 ${mismatch ? "bg-rose-50" : "bg-emerald-50"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">OCR scanned instrument</p>
          <p className="font-mono text-[13px] font-semibold tabular-nums">{formatInr(preview.fields.observedAmountInr)}</p>
        </div>
      </div>
      <p className={`mt-2 rounded-md px-2 py-1 text-[11px] font-semibold ${mismatch ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
        {mismatch ? `Shortfall: ${formatInr(delta)}` : "100% OCR verified match"}
        {rejected ? " · V1 original rejected" : ""}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div><dt className="text-slate-500">Issue date</dt><dd className="font-mono tabular-nums">{preview.fields.issueDate}</dd></div>
        <div><dt className="text-slate-500">Maturity date</dt><dd className="font-mono tabular-nums">{preview.fields.maturityOrValueDate}</dd></div>
        <div><dt className="text-slate-500">Lien beneficiary</dt><dd>{preview.fields.beneficiaryOrDdo}</dd></div>
        <div><dt className="text-slate-500">Institution</dt><dd className="font-mono">{preview.fields.aisheCode}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Bank gateway evidence</dt><dd className="font-mono">{evidence?.id ?? "Pending"}</dd></div>
      </dl>
    </article>
  );
}

function primaryAction(demo: ReturnType<typeof useDemo>): {
  label: string;
  role: RoleId;
  roleTitle: string;
  explanation: string;
  run: () => void;
} | null {
  const { state, evaluation, confirmV1, uploadV2, setStep, attemptRelease, toggleVigilance } = demo;
  const snapshot = state.cases[state.caseId];
  if (evaluation.releaseAuthorised) return null;
  if (snapshot.vigilanceHold) {
    return {
      label: "Lift vigilance hold",
      role: "VIG-22",
      roleTitle: "Vigilance",
      explanation: "A vigilance hold is standing. Instrument checks are unchanged until VIG-22 lifts it.",
      run: () => toggleVigilance(snapshot.caseId),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step <= 1) {
    return {
      label: "Flag ₹5L Discrepancy (as RO-104)",
      role: "RO-104",
      roleTitle: "Review Officer",
      explanation: "₹5,00,000 shortfall detected on V1 scan (₹30L observed vs ₹35L declared).",
      run: confirmV1,
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step === 2) {
    return {
      label: "Submit Corrected V2 FDR (as INST-01)",
      role: "INST-01",
      roleTitle: "Institution",
      explanation: "Institution action required: replace the deficient V1 instrument.",
      run: uploadV2,
    };
  }
  if (snapshot.caseId === "DEMO-001" && (state.step === 3 || state.step === 4)) {
    return {
      label: "Confirm Selective Recheck (as RO-104)",
      role: "RO-104",
      roleTitle: "Review Officer",
      explanation: "Selective recheck: 2 unchanged checks locked from V1; 2 amount and bank checks recomputed on V2.",
      run: () => setStep(5),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step >= 5 && evaluation.releaseReady) {
    return {
      label: "Authorise Verification Record (as DIR-01)",
      role: "DIR-01",
      roleTitle: "Director",
      explanation: "All 4 checks verified on V2; ready for final sign-off.",
      run: attemptRelease,
    };
  }
  if (evaluation.releaseReady) {
    return {
      label: "Authorise Verification Record (as DIR-01)",
      role: "DIR-01",
      roleTitle: "Director",
      explanation: "The current evaluation is ready for a director decision. Funds are not moved here.",
      run: attemptRelease,
    };
  }
  return null;
}
