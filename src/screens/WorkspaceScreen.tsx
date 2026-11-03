import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { activeVersion, amountGap, glanceRows, PILL_CLASS, roleChip } from "../lib/caseView";
import { formatInr, routeLabel } from "../lib/format";
import { formatCaseRef } from "../lib/labels";
import { useDemo } from "../state/store";
import type { CaseSnapshot, RoleId, Step, WorkspaceTab } from "../types";
import { AuditHistory } from "./AuditHistory";
import { Clearances } from "./Clearances";
import { FinalResult } from "./FinalResult";
import { ProvenanceDiff } from "./ProvenanceDiff";
import { RecheckMatrix } from "./RecheckMatrix";
import { Btn } from "../components/ui";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "1. V1 Intake" },
  { step: 2, label: "2. Discrepancy Flagged" },
  { step: 3, label: "3. V2 Resubmitted" },
  { step: 4, label: "4. Selective Recheck" },
  { step: 5, label: "5. Final Decision" },
];

export function WorkspaceScreen() {
  const demo = useDemo();
  const { state, evaluation, navigate, setStep, setOfficerNote, setDirectorNote } = demo;
  const snapshot = state.cases[state.caseId];
  const caseUi = state.caseUi[state.caseId] ?? { step: state.step, officerNote: "", directorNote: "" };
  const officerNote = caseUi.officerNote;
  const directorNote = caseUi.directorNote;
  const current = activeVersion(snapshot);
  const declared = current?.fields.declaredAmountInr ?? evaluation.declaredAmountInr;
  const observed = current?.fields.observedAmountInr ?? evaluation.observedAmountInr;
  const shortfall = amountGap(declared, observed);
  const rows = glanceRows(snapshot);
  const locked = rows.filter((row) => row.kind === "locked").length;
  const reverified = rows.filter((row) => row.kind === "reverified").length;
  const saved = rows.length ? Math.round((locked / rows.length) * 100) : 0;
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
          <HeaderBadge snapshot={snapshot} step={state.step} shortfall={shortfall} releaseReady={evaluation.releaseReady} releaseAuthorised={evaluation.releaseAuthorised} />
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
              onClick={() => action.run()}
            >
              {action.label}
            </Btn>
          ) : (
            <span className="ml-auto shrink-0 whitespace-nowrap text-[12px] font-medium text-emerald-800">Verification record issued</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex shrink-0 gap-1" role="group" aria-label="Regulation Bureau lifecycle">
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
          <LiveBar
            snapshot={snapshot}
            step={state.step}
            shortfall={shortfall}
            observed={observed}
            locked={locked}
            reverified={reverified}
            saved={saved}
            releaseAuthorised={evaluation.releaseAuthorised}
            maturityDue={evaluation.actions[0]?.dueOn}
          />
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

function HeaderBadge({
  snapshot,
  step,
  shortfall,
  releaseReady,
  releaseAuthorised,
}: {
  snapshot: CaseSnapshot;
  step: Step;
  shortfall: number;
  releaseReady: boolean;
  releaseAuthorised: boolean;
}) {
  const v2 = snapshot.currentVersionId !== "V1";
  const rejectedV1 = shortfall > 0 || (step <= 2 && !v2 && shortfall >= 0 && !releaseReady && !releaseAuthorised && step === 2);
  let text = "In review";
  let tone: keyof typeof PILL_CLASS = "slate";
  if (snapshot.vigilanceHold) {
    text = "Vigilance Hold · VIG-22";
    tone = "amber";
  } else if (shortfall > 0 || (step <= 2 && !v2 && step >= 2)) {
    text = `Shortfall: -${formatInr(Math.max(shortfall, 0))} · Needs V2`;
    tone = "rose";
  } else if (v2 && (step === 3 || step === 4)) {
    text = "Selective Recheck Active";
    tone = "indigo";
  } else if (releaseAuthorised) {
    text = "RELEASED — Verified";
    tone = "emerald";
  } else if (releaseReady && step >= 5) {
    text = "Ready for Director Sign-Off";
    tone = "emerald";
  } else if (releaseReady) {
    text = "Ready for Director Sign-Off";
    tone = "emerald";
  }
  if (rejectedV1 && shortfall <= 0 && step === 2 && !v2) {
    text = "Awaiting V2 replacement";
    tone = "amber";
  }
  return <span className={`shrink-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${PILL_CLASS[tone]}`}>{text}</span>;
}

function LiveBar({
  snapshot,
  step,
  shortfall,
  observed,
  locked,
  reverified,
  saved,
  releaseAuthorised,
  maturityDue,
}: {
  snapshot: CaseSnapshot;
  step: Step;
  shortfall: number;
  observed: number;
  locked: number;
  reverified: number;
  saved: number;
  releaseAuthorised: boolean;
  maturityDue?: string;
}) {
  const current = activeVersion(snapshot);
  const bank = current?.fields.bankName ?? "Bank";
  const version = current?.versionId ?? "V1";
  const declared = current?.fields.declaredAmountInr ?? 0;
  const v2 = version !== "V1";
  const evidence = snapshot.bankEvidence.filter((item) => item.coversVersionId === version).at(-1);
  const ocr = declared > 0 ? Math.round((Math.min(observed, declared) / declared) * 100) : 0;
  let dot = "bg-slate-400";
  let headline = `${bank} ${version} is in review`;
  let next = `${roleChip("RO-104")} → Review file`;
  if (snapshot.vigilanceHold) {
    dot = "bg-amber-500";
    headline = `${bank} ${version} is on vigilance hold`;
    next = `${roleChip("VIG-22")} → Lift hold`;
  } else if (releaseAuthorised) {
    dot = "bg-emerald-500";
    headline = `${bank} ${version} record is verified`;
    next = "✓ Verified & Cleared";
  } else if (shortfall > 0 && step <= 1) {
    dot = "bg-rose-500";
    headline = `${bank} ${version} scan is short ${formatInr(shortfall)}`;
    next = `${roleChip("RO-104")} → Flag Discrepancy`;
  } else if (shortfall > 0 || (step === 2 && !v2)) {
    dot = "bg-amber-500";
    headline = `${bank} ${version} rejected, awaiting V2 upload`;
    next = `${roleChip("INST-01")} → Upload V2 FDR`;
  } else if (v2 && (step === 3 || step === 4)) {
    dot = "bg-indigo-500";
    headline = `${bank} ${version}: ${locked} locked, ${reverified} recomputed`;
    next = `${roleChip("RO-104")} → Confirm Recheck`;
  } else if (step >= 5) {
    dot = "bg-emerald-500";
    headline = `${bank} ${version} ${formatInr(observed)} awaits director`;
    next = `${roleChip("DIR-01")} → Authorise Release`;
  }
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${dot}`} />
      <p className="min-w-0 text-[12px] font-semibold text-slate-900">{headline}</p>
      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm">{next}</span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PILL_CLASS.indigo}`}>T1 {evidence ? evidence.id : "Pending"}</span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${snapshot.identityConfirmed && snapshot.lienConfirmed ? PILL_CLASS.emerald : PILL_CLASS.amber}`}>
        T2 {snapshot.identityConfirmed ? "Identity" : "Identity open"} · {snapshot.lienConfirmed ? "Lien" : "Lien open"}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ocr === 100 ? PILL_CLASS.emerald : PILL_CLASS.rose}`}>T3 OCR {ocr}%</span>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${maturityDue ? PILL_CLASS.amber : PILL_CLASS.slate}`}>
        {maturityDue ? `Due ${maturityDue}` : `Matures ${current?.fields.maturityOrValueDate ?? "—"}`}
      </span>
      {locked > 0 ? <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PILL_CLASS.emerald}`}>{locked} kept · {reverified} redone · {saved}% saved</span> : null}
    </div>
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
  }, [snapshot.currentVersionId, step, snapshot.caseId]);
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-900">{preview.fields.bankName}</p>
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
  const current = activeVersion(snapshot);
  const declared = current?.fields.declaredAmountInr ?? 0;
  const observed = current?.fields.observedAmountInr ?? 0;
  const shortfall = amountGap(declared, observed);
  const hasV2 = snapshot.currentVersionId === "V2" || snapshot.versions.some((item) => item.versionId === "V2");
  if (evaluation.releaseAuthorised) return null;
  if (snapshot.vigilanceHold) {
    return {
      label: "Lift vigilance hold",
      role: "VIG-22",
      target: "step1-flag-btn",
      run: () => toggleVigilance(snapshot.caseId, "VIG-22"),
    };
  }
  if ((state.step <= 1 || (!hasV2 && shortfall > 0 && state.step < 2)) && shortfall > 0 && !hasV2) {
    return {
      label: `Flag ${formatInr(shortfall)} Discrepancy & Return to Institution`,
      role: "RO-104",
      target: "step1-flag-btn",
      run: () => confirmV1(officerNote, "RO-104"),
    };
  }
  if (state.step === 2 && !hasV2) {
    return {
      label: "Open institution portal",
      role: "INST-01",
      target: "workflow-primary-cta",
      run: () => {
        if (state.role !== "INST-01") demo.setRole("INST-01");
        navigate({ screen: "institution" });
      },
    };
  }
  if (hasV2 && (state.step === 3 || state.step === 4) && !evaluation.releaseReady) {
    return {
      label: "Confirm Selective Recheck & Forward to Director",
      role: "RO-104",
      target: "step4-confirm-btn",
      run: () => {
        if (state.role !== "RO-104") demo.setRole("RO-104");
        forwardReview();
      },
    };
  }
  if (evaluation.releaseReady || (hasV2 && state.step >= 5)) {
    return {
      label: "Authorise Verification Record",
      role: "DIR-01",
      target: "step5-authorise-btn",
      run: () => attemptRelease(directorNote, "DIR-01"),
    };
  }
  return null;
}
