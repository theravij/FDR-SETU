import { currentVersion } from "../engine/evaluateCase";
import { provenanceDiff } from "../engine/provenance";
import { ageingDays, formatInr, routeLabel } from "../lib/format";
import { useDemo } from "../state/store";
import type { RoleId, Step, WorkspaceTab } from "../types";
import { AuditHistory } from "./AuditHistory";
import { Clearances } from "./Clearances";
import { FinalResult } from "./FinalResult";
import { ProvenanceDiff } from "./ProvenanceDiff";
import { RecheckMatrix } from "./RecheckMatrix";
import { Btn, StatusBadge } from "../components/ui";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "V1 on file" },
  { step: 2, label: "V1 confirmed" },
  { step: 3, label: "V2 uploaded" },
  { step: 4, label: "V2 confirmed" },
  { step: 5, label: "Decision" },
];

export function WorkspaceScreen() {
  const demo = useDemo();
  const { state, evaluation, navigate, setStep, setRole } = demo;
  const snapshot = state.cases[state.caseId];
  const version = currentVersion(snapshot);
  const delta = evaluation.observedAmountInr - evaluation.declaredAmountInr;
  const matched = delta === 0;
  const locked = evaluation.selectiveRecheck.preserved.length;
  const reopen = evaluation.selectiveRecheck.invalidated.length;
  const material = provenanceDiff(snapshot).filter((row) => row.material).length;
  const openChecks = evaluation.checks.filter(
    (check) => check.status === "DISCREPANCY" || check.status === "RECHECK_REQUIRED" || check.status === "PENDING",
  ).length;
  const action = primaryAction(demo);

  const tabs: Array<{ id: WorkspaceTab; label: string; count: number }> = [
    { id: "recheck", label: "Selective Recheck", count: reopen || openChecks },
    { id: "provenance", label: "Provenance Diff", count: material },
    { id: "clearances", label: "Clearances", count: evaluation.blockers.length },
    { id: "audit", label: "Audit Trail", count: snapshot.audit.length },
    { id: "result", label: "Verification Summary", count: evaluation.releaseAuthorised ? 0 : evaluation.blockers.length },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-slate-500">
            Officer workspace <span className="text-slate-300">/</span>{" "}
            <span className="font-mono text-slate-700">{snapshot.caseId}</span>
          </p>
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">{snapshot.caseId}</span>
          <h1 className="min-w-0 truncate text-[15px] font-semibold text-slate-900">{snapshot.institutionName}</h1>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {routeLabel(snapshot.route)}
          </span>
          <div className="ml-auto">
            <StatusBadge status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel} />
          </div>
        </div>
        {snapshot.caseId === "DEMO-001" ? (
          <div className="mt-3 grid grid-cols-5 gap-1.5" role="group" aria-label="Case lifecycle">
            {STEPS.map((item) => {
              const selected = state.step === item.step;
              const done = state.step > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStep(item.step)}
                  className={`rounded-lg border px-2 py-1.5 text-left ${
                    selected
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="block font-mono text-[10px] uppercase tracking-wide opacity-80">Step {item.step}</span>
                  <span className="block text-[12px] font-semibold leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="grid shrink-0 grid-cols-4 gap-3 px-5 py-3">
        <Kpi
          label="Declared vs OCR"
          value={matched ? `Matched ${formatInr(evaluation.declaredAmountInr)}` : formatInr(evaluation.observedAmountInr)}
          detail={
            matched
              ? "Declared amount and the scan agree."
              : `Form ${formatInr(evaluation.declaredAmountInr)} · scan ${formatInr(evaluation.observedAmountInr)}`
          }
          badge={matched ? "Matched" : `${formatInr(delta)} mismatch`}
          badgeClass={matched ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}
        />
        <Kpi
          label="Selective recheck"
          value={evaluation.selectiveRecheck.armed ? `${locked} locked · ${reopen} reopened` : "Not armed"}
          detail={
            evaluation.selectiveRecheck.armed
              ? "Unchanged fields stay verified. Only a changed scope is reopened."
              : "A replacement instrument arms selective recheck."
          }
          badge={`${evaluation.checks.length} checks`}
          badgeClass="bg-slate-100 text-slate-700"
        />
        <Kpi
          label="Clearances"
          value={snapshot.vigilanceHold ? "Vigilance hold" : snapshot.lienConfirmed ? "Lien on file" : "Lien open"}
          detail={`Identity ${snapshot.identityConfirmed ? "confirmed" : "open"} · lien ${snapshot.lienConfirmed ? "confirmed" : "open"}`}
          badge={snapshot.vigilanceHold ? "Hold" : "Clear"}
          badgeClass={snapshot.vigilanceHold ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}
        />
        <Kpi
          label="SLA & next role"
          value={`${ageingDays(snapshot.openedOn)}d open`}
          detail={`Opened ${snapshot.openedOn} · assignee ${snapshot.assignee}`}
          badge={evaluation.nextActor}
          badgeClass="bg-indigo-50 text-indigo-800"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-5 px-5 pb-5">
        <article className="col-span-4 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{version.fields.bankName}</p>
                <h2 className="text-[14px] font-semibold text-slate-900">Fixed Deposit Receipt</h2>
              </div>
              <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] font-semibold text-white">{version.versionId}</span>
            </div>
            <p className="mt-1 font-mono text-[12px] text-slate-700">{version.fields.referenceNumber}</p>
          </div>
          <dl className="min-h-0 flex-1 space-y-2 overflow-auto px-4 py-3 text-[12px]">
            <Field label="Declared on form" value={formatInr(version.fields.declaredAmountInr)} warn={!matched} />
            <Field label="OCR / scan" value={formatInr(version.fields.observedAmountInr)} warn={!matched} />
            <Field label="Issue date" value={version.fields.issueDate} mono />
            <Field label="Maturity" value={version.fields.maturityOrValueDate} mono />
            <Field label="Beneficiary / lien" value={version.fields.beneficiaryOrDdo} />
            <Field label="Institution" value={version.fields.institutionName} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                T3 officer OCR
              </span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${matched ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                {matched ? "Amounts aligned" : "Scan differs"}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {version.fields.instrumentKind}
              </span>
            </div>
          </dl>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            {action ? (
              <>
                <p className="mb-2 text-[11px] leading-snug text-slate-600">{action.hint}</p>
                <div className="flex flex-wrap gap-2">
                  <Btn kind="primary" onClick={action.run} disabled={state.role !== action.role}>
                    {action.label}
                  </Btn>
                  {state.role !== action.role ? (
                    <Btn onClick={() => setRole(action.role)}>Switch to {action.role}</Btn>
                  ) : null}
                </div>
                <p className="mt-2 font-mono text-[10px] text-slate-500">Requires {action.role}</p>
              </>
            ) : evaluation.releaseAuthorised ? (
              <p className="text-[12px] text-emerald-800">Release is recorded. The NOC and the payment stay outside this workspace.</p>
            ) : (
              <p className="text-[12px] leading-snug text-slate-600">{evaluation.officerAnswers.whoActsNext}</p>
            )}
            {state.role === "VIG-22" && snapshot.caseId === "DEMO-004" ? (
              <div className="mt-2">
                <Btn kind={snapshot.vigilanceHold ? "secondary" : "danger"} onClick={() => demo.toggleVigilance(snapshot.caseId)}>
                  {snapshot.vigilanceHold ? "Lift vigilance hold" : "Place vigilance hold"}
                </Btn>
              </div>
            ) : null}
          </div>
        </article>

        <div className="col-span-8 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2" role="tablist" aria-label="Case inspection">
            {tabs.map((tab) => {
              const selected = state.tab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => navigate({ tab: tab.id })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium ${
                    selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-md px-1 font-mono text-[10px] ${selected ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/70 text-slate-600"}`}>
                    {tab.count}
                  </span>
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

function Kpi({
  label,
  value,
  detail,
  badge,
  badgeClass,
}: {
  label: string;
  value: string;
  detail: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
        <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeClass}`}>{badge}</span>
      </div>
      <p className="mt-1 truncate font-mono text-[13px] font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="line-clamp-2 text-[11px] leading-snug text-slate-500">{detail}</p>
    </article>
  );
}

function Field({ label, value, warn, mono }: { label: string; value: string; warn?: boolean; mono?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${warn ? "bg-rose-50" : "bg-slate-50"}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-[13px] font-semibold tabular-nums text-slate-900 ${mono ? "font-mono" : ""} ${warn ? "text-rose-800" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function primaryAction(demo: ReturnType<typeof useDemo>): { label: string; role: RoleId; hint: string; run: () => void } | null {
  const { state, evaluation, confirmV1, uploadV2, setStep, attemptRelease, toggleVigilance } = demo;
  const snapshot = state.cases[state.caseId];
  if (evaluation.releaseAuthorised) return null;
  if (snapshot.vigilanceHold) {
    return {
      label: "Lift vigilance hold",
      role: "VIG-22",
      hint: "Release stays blocked until VIG-22 lifts the hold. Instrument checks are unchanged.",
      run: () => toggleVigilance(snapshot.caseId),
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step <= 1) {
    return {
      label: "Confirm V1 Discrepancy",
      role: "RO-104",
      hint: "Record that the form and the scan do not match. The file cannot clear on V1 as declared.",
      run: confirmV1,
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step === 2) {
    return {
      label: "Submit corrected V2 instrument",
      role: "INST-01",
      hint: "The institution replaces the instrument. Only fields that changed will reopen.",
      run: uploadV2,
    };
  }
  if (snapshot.caseId === "DEMO-001" && state.step === 3) {
    return {
      label: "Verify recheck fields",
      role: "RO-104",
      hint: "Open the state where the changed bank confirmation is covered and unchanged checks stay locked.",
      run: () => setStep(4),
    };
  }
  if (evaluation.releaseReady) {
    return {
      label: "Authorise release",
      role: "DIR-01",
      hint: "Records the director decision against the current evaluation hash. Funds are not moved here.",
      run: attemptRelease,
    };
  }
  return null;
}
