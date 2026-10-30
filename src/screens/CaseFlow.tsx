import { TechnicalPayload } from "../components/TechnicalPayload";
import { Btn, StatusBadge } from "../components/ui";
import { currentVersion } from "../engine/evaluateCase";
import { can } from "../engine/permissions";
import { CHECK_LABELS, FLOW_STEPS, recheckBadge } from "../lib/labels";
import { formatInr } from "../lib/format";
import { useDemo } from "../state/store";
import type { CheckId } from "../types";

const SIDEBAR_ROLES = ["RO-104", "DIR-01", "INST-01"] as const;

export function CaseFlow() {
  const demo = useDemo();
  const { state, evaluation, confirmV1, submitV2, setPhase, setRole, attemptRelease, exportJson, exportCsv } = demo;
  const snapshot = state.cases[state.caseId];
  const version = currentVersion(snapshot);
  const v1 = snapshot.versions.find((item) => item.versionId === "V1");
  const v2 = snapshot.versions.find((item) => item.versionId === "V2");
  const phase = state.phase;
  const hasV2 = Boolean(v2);
  const mismatch = Boolean(v1 && v1.fields.declaredAmountInr !== v1.fields.observedAmountInr);

  const go = (next: 1 | 2 | 3 | 4) => {
    if (next === 1) {
      setPhase(1);
      return;
    }
    if (next === 2 && state.step >= 2) setPhase(2);
    if (next >= 3 && hasV2) setPhase(next);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-navy">
            {snapshot.caseId} · {snapshot.institutionName}
          </h1>
          <p className="truncate text-[12px] text-slate-500">FDR security-deposit verification</p>
        </div>
        <div className="ml-auto">
          <StatusBadge
            status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel}
          />
        </div>
      </header>

      <nav className="grid shrink-0 grid-cols-4 border-b border-slate-200 bg-white" aria-label="Verification steps">
        {FLOW_STEPS.map((item) => {
          const current = phase === item.id;
          const done = phase > item.id || evaluation.releaseAuthorised;
          const locked = (item.id === 2 && state.step < 2) || (item.id >= 3 && !hasV2);
          return (
            <button
              key={item.id}
              type="button"
              data-tour={`flow-${item.id}`}
              disabled={locked && !current}
              onClick={() => go(item.id)}
              className={`border-b-2 px-3 py-2.5 text-left ${
                current ? "border-navy bg-slate-50" : done ? "border-emerald-600" : "border-transparent"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Step {item.id}</p>
              <p className={`text-[13px] font-semibold leading-tight ${current ? "text-navy" : "text-slate-700"}`}>{item.title}</p>
              <p className="text-[11px] text-slate-500">{item.hint}</p>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
        {phase === 1 ? (
          <article className="mx-auto flex max-w-3xl flex-col gap-4 border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-navy">Initial FDR Check</h2>
              <p className="mt-1 text-[13px] text-slate-600">The declared amount and the scanned instrument do not match.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`border p-4 ${mismatch ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Declared on form</p>
                <p className="mt-1 text-2xl font-semibold text-navy">{formatInr(v1?.fields.declaredAmountInr ?? 0)}</p>
                <p className="mt-1 text-[12px] text-slate-600">{v1?.fields.referenceNumber}</p>
              </div>
              <div className={`border p-4 ${mismatch ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OCR / bank scan</p>
                <p className="mt-1 text-2xl font-semibold text-navy">{formatInr(v1?.fields.observedAmountInr ?? 0)}</p>
                <p className="mt-1 text-[12px] text-slate-600">Instrument version V1</p>
              </div>
            </div>
            {mismatch ? (
              <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] font-medium text-crimson">
                ₹5,00,000 mismatch — the file cannot be cleared on V1 as declared.
              </p>
            ) : null}
            <Btn kind="primary" data-tour="confirm-v1" className="self-start px-4 py-2 text-[13px]" onClick={confirmV1}>
              Confirm V1 Discrepancy
            </Btn>
          </article>
        ) : null}

        {phase === 2 ? (
          <article className="mx-auto flex max-w-3xl flex-col gap-4 border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-navy">Corrected V2 FDR Submission</h2>
              <p className="mt-1 text-[13px] text-slate-600">
                The institution replaces the instrument. Sign in as INST-01 to submit the file.
              </p>
            </div>
            <div className="border border-navy bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Replacement instrument</p>
              <p className="mt-1 text-xl font-semibold text-navy">FDR/PNB/2025/91007</p>
              <p className="mt-1 text-[15px] font-medium text-navy">{formatInr(3_500_000)}</p>
              <p className="mt-1 text-[12px] text-slate-600">Punjab National Bank · version V2</p>
            </div>
            <Btn
              kind="primary"
              data-tour="submit-v2"
              className="self-start px-4 py-2 text-[13px]"
              onClick={submitV2}
              disabled={hasV2 && state.step >= 5}
            >
              Submit V2 & Run Smart Recheck
            </Btn>
            {state.role !== "INST-01" && !hasV2 ? (
              <p className="text-[12px] text-slate-500">Switch the acting role to INST-01, then submit.</p>
            ) : null}
          </article>
        ) : null}

        {phase === 3 ? (
          <article className="mx-auto flex max-w-3xl flex-col gap-4 border border-slate-200 bg-white p-5">
            <div>
              <h2 className="text-lg font-semibold text-navy">Smart Selective Recheck</h2>
              <p className="mt-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-900">
                2 unchanged checks preserved automatically — only modified fields re-evaluated.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {evaluation.checks.map((check) => {
                const badge = recheckBadge(check.id as CheckId, check.status);
                const tone =
                  badge.tone === "preserved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : badge.tone === "reverify"
                      ? "border-navy bg-white text-navy"
                      : "border-amber-300 bg-amber-50 text-amber-950";
                return (
                  <button
                    type="button"
                    key={check.id}
                    data-tour={`check-${check.id}`}
                    className="flex w-full items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3 text-left"
                  >
                    <span className="text-[14px] font-semibold text-navy">{CHECK_LABELS[check.id as CheckId]}</span>
                    <span className={`border px-2 py-1 text-[11px] font-semibold tracking-wide ${tone}`}>{badge.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-slate-600">
              Current file {version.fields.referenceNumber} · {formatInr(version.fields.observedAmountInr)}
            </p>
            <Btn data-tour="continue-approval" className="self-start px-4 py-2 text-[13px]" onClick={() => setPhase(4)}>
              Continue to approval
            </Btn>
          </article>
        ) : null}

        {phase === 4 ? (
          <article className="mx-auto flex max-w-3xl flex-col gap-4 border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy">Final Director Approval</h2>
                <p className="mt-1 text-[13px] text-slate-600">
                  Recording this decision does not issue the NOC or move the payment.
                </p>
              </div>
              <StatusBadge
                status={evaluation.releaseAuthorised ? "RELEASED" : evaluation.releaseReady ? "READY FOR RELEASE" : evaluation.statusLabel}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Acting as</p>
              <div className="flex gap-2">
                {SIDEBAR_ROLES.filter((id) => id !== "INST-01").map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={state.role === id}
                    onClick={() => setRole(id)}
                    className={`border px-3 py-1.5 text-[12px] font-semibold ${
                      state.role === id ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-navy"
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <Btn
              kind="primary"
              data-tour="authorise"
              className="self-start px-4 py-2 text-[13px]"
              onClick={attemptRelease}
              disabled={evaluation.releaseAuthorised}
            >
              Authorise Release (DIR-01)
            </Btn>
            {!can(state.role, "authorise") && !evaluation.releaseAuthorised ? (
              <p className="text-[12px] text-slate-500">Switch to DIR-01 to authorise.</p>
            ) : null}
            <div className="flex gap-2">
              <Btn data-tour="export-json" onClick={exportJson}>
                Export JSON
              </Btn>
              <Btn data-tour="export-csv" onClick={exportCsv}>
                Export CSV
              </Btn>
            </div>
          </article>
        ) : null}
      </div>
      <TechnicalPayload />
    </section>
  );
}
