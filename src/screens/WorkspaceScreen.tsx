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
  const [officerNote, setOfficerNote] = useState("");
  const [directorNote, setDirectorNote] = useState("");
  const action = primaryAction(demo, officerNote, directorNote);
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
          {state.step >= 5 && !evaluation.releaseAuthorised ? (
            <input
              data-demo-target="director-note-input"
              value={directorNote}
              onChange={(event) => setDirectorNote(event.target.value)}
              placeholder="Enter final authorization remark..."
              aria-label="Director sign-off remark"
              className="ml-auto w-64 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-indigo-400"
            />
          ) : null}
          {action ? (
            <Btn
              kind="primary"
              className={`${state.step >= 5 && !evaluation.releaseAuthorised ? "" : "ml-auto"} shrink-0 whitespace-nowrap`}
              data-demo-target={action.target}
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
        <Certificate snapshot={snapshot} step={state.step} officerNote={officerNote} onOfficerNote={setOfficerNote} />

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

function Certificate({
  snapshot,
  step,
  officerNote,
  onOfficerNote,
}: {
  snapshot: CaseSnapshot;
  step: number;
  officerNote: string;
  onOfficerNote: (value: string) => void;
}) {
  const versions = snapshot.versions;
  const [previewId, setPreviewId] = useState(snapshot.currentVersionId);
  useEffect(() => {
    setPreviewId(snapshot.currentVersionId);
  }, [snapshot.currentVersionId, step]);
  const preview = versions.find((item) => item.versionId === previewId) ?? versions[0];
  if (!preview) return null;
  const mismatch = preview.fields.declaredAmountInr !== preview.fields.observedAmountInr;
  const delta = preview.fields.observedAmountInr - preview.fields.declaredAmountInr;
  const coverage = preview.fields.declaredAmountInr > 0 ? Math.min(100, Math.max(0, (preview.fields.observedAmountInr / preview.fields.declaredAmountInr) * 100)) : 0;
  const shortfallPct = preview.fields.declaredAmountInr > 0 ? ((Math.abs(delta) / preview.fields.declaredAmountInr) * 100).toFixed(1) : "0.0";
  const evidence = snapshot.bankEvidence.find((item) => item.coversVersionId === preview.versionId);
  const rejected = preview.versionId === "V1" && mismatch;

  return (
    <article data-demo-target="fdr-certificate" className="group col-span-4 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
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
      {mismatch ? (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
          <div className="h-1.5 overflow-hidden rounded-full bg-rose-100">
            <div className="h-full rounded-full bg-rose-600" style={{ width: `${coverage}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-semibold text-rose-800">
            Δ {formatInr(delta)} Principal Shortfall ({shortfallPct}% under-deposit)
            {rejected ? " · V1 original rejected" : ""}
          </p>
        </div>
      ) : (
        <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">100% OCR verified match</p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div><dt className="text-slate-500">Issue date</dt><dd className="font-mono tabular-nums">{preview.fields.issueDate}</dd></div>
        <div><dt className="text-slate-500">Maturity date</dt><dd className="font-mono tabular-nums">{preview.fields.maturityOrValueDate}</dd></div>
        <div><dt className="text-slate-500">Lien beneficiary</dt><dd>{preview.fields.beneficiaryOrDdo}</dd></div>
        <div><dt className="text-slate-500">Institution</dt><dd className="font-mono">{preview.fields.aisheCode}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Bank gateway evidence</dt><dd className="font-mono">{evidence?.id ?? "Pending"}</dd></div>
      </dl>
      {step <= 1 && mismatch ? (
        <input
          data-demo-target="officer-note-input"
          value={officerNote}
          onChange={(event) => onOfficerNote(event.target.value)}
          placeholder="Add verification observation for institution..."
          aria-label="Officer review note"
          className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-indigo-400"
        />
      ) : null}
    </article>
  );
}

function primaryAction(demo: ReturnType<typeof useDemo>, officerNote: string, directorNote: string): {
  label: string;
  role: RoleId;
  target: string;
  run: () => void;
} | null {
  const { state, evaluation, confirmV1, forwardReview, attemptRelease, toggleVigilance, navigate } = demo;
  const snapshot = state.cases[state.caseId];
  if (evaluation.releaseAuthorised) return null;
  if (snapshot.vigilanceHold) {
    return {
      label: "Lift vigilance hold",
      role: "VIG-22",
      target: "step1-flag-btn",
      run: () => toggleVigilance(snapshot.caseId),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step <= 1) {
    return {
      label: "Flag ₹5L Discrepancy & Return to Institution",
      role: "RO-104",
      target: "step1-flag-btn",
      run: () => confirmV1(officerNote),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step === 2) {
    return {
      label: "Open institution portal",
      role: "INST-01",
      target: "workflow-primary-cta",
      run: () => navigate({ screen: "institution" }),
    };
  }
  if (snapshot.caseId === "DEMO-001" && (state.step === 3 || state.step === 4)) {
    return {
      label: "Confirm Selective Recheck & Forward to Director",
      role: "RO-104",
      target: "step4-confirm-btn",
      run: () => forwardReview(),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step >= 5 && evaluation.releaseReady) {
    return {
      label: "Authorise Verification Record",
      role: "DIR-01",
      target: "step5-authorise-btn",
      run: () => attemptRelease(directorNote),
    };
  }
  if (evaluation.releaseReady) {
    return {
      label: "Authorise Verification Record",
      role: "DIR-01",
      target: "step5-authorise-btn",
      run: () => attemptRelease(directorNote),
    };
  }
  return null;
}
