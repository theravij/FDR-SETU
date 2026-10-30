import { formatInr, shortHash } from "../lib/format";
import { useDemo } from "../state/store";
import type { EvaluatedCheck, Evaluation, InstrumentVersion, Step } from "../types";
import { SUPERSEDED_V1_BADGE } from "../types";
import { StatusBadge } from "../components/ui";

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "V1 on file" },
  { step: 2, label: "V1 confirmed" },
  { step: 3, label: "V2 uploaded" },
  { step: 4, label: "V2 confirmed" },
  { step: 5, label: "Ready for decision" },
];

function bucketBorder(bucket: EvaluatedCheck["bucket"]): string {
  if (bucket === "invalidated") return "border-l-crimson";
  if (bucket === "preserved") return "border-l-emerald-600";
  if (bucket === "recomputed") return "border-l-navy";
  if (bucket === "open") return "border-l-amber-500";
  return "border-l-slate-300";
}

function VersionCard({
  version,
  accepted,
  current,
  empty,
}: {
  version?: InstrumentVersion;
  accepted?: number;
  current: boolean;
  empty?: string;
}) {
  if (!version) {
    return (
      <div className="flex-1 border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <div className={`flex-1 border px-3 py-2 ${current ? "border-navy bg-white" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-navy">{version.versionId}</span>
        {current ? <span className="text-[10px] font-semibold tracking-wide text-navy">CURRENT</span> : <span className="text-[10px] font-medium text-slate-500">ON FILE</span>}
        <span className="ml-auto font-mono text-[10px] text-slate-500" title={version.substantiveHash}>
          sub {shortHash(version.substantiveHash, 10)}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-slate-800">{version.fields.referenceNumber}</p>
      <p className="text-[11px] text-slate-600">
        Declared {formatInr(version.fields.declaredAmountInr)}
        {accepted !== undefined && accepted !== version.fields.declaredAmountInr ? ` · accepted ${formatInr(accepted)}` : ""}
        {" · "}observed {formatInr(version.fields.observedAmountInr)}
      </p>
    </div>
  );
}

function ScoreCell({
  label,
  hint,
  ids,
  tone,
}: {
  label: string;
  hint: string;
  ids: string[];
  tone: "crimson" | "emerald" | "navy";
}) {
  const toneClass =
    tone === "crimson"
      ? "border-rose-200 bg-rose-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-300 bg-white";
  return (
    <div className={`border px-3 py-1.5 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-base font-semibold leading-none text-navy">{ids.length}</p>
      <p className="mt-1 text-[12px] font-medium text-navy">{ids.length ? ids.join(" · ") : "—"}</p>
      <p className="text-[10px] text-slate-600">{hint}</p>
    </div>
  );
}

function headline(evaluation: Evaluation): string {
  if (!evaluation.selectiveRecheck.armed) {
    return "One version is on file. Selective recheck arms when a replacement instrument is uploaded.";
  }
  if (evaluation.selectiveRecheck.invalidated.includes("CHK-02")) {
    return "SELECTIVE RECHECK — CHK-02 is open. CHK-03 and CHK-04 stay preserved. EV-BNK-101 covers V1 only.";
  }
  return "V2 is covered by fresh bank evidence. CHK-03 and CHK-04 were not reopened.";
}

export function RecheckMatrix() {
  const { state, evaluation, setStep } = useDemo();
  const snapshot = state.cases[state.caseId];
  const v1 = snapshot.versions.find((item) => item.versionId === "V1");
  const v2 = snapshot.versions.find((item) => item.versionId === "V2");
  const showTimeline = snapshot.caseId === "DEMO-001";
  const acceptedOnV1 = snapshot.reconciliations.find((item) => item.versionId === "V1")?.acceptedAmountInr;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
      <div className="shrink-0 border border-slate-200 bg-white px-3 py-1.5">
        <p className="text-[12px] font-semibold text-navy">{headline(evaluation)}</p>
        <p className="text-[11px] text-slate-600">
          A check reopens only when its own inputs change. A new file hash alone does not reopen a check.
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2">
        <ScoreCell label="Invalidated" hint="Must be done again" ids={evaluation.selectiveRecheck.invalidated} tone="crimson" />
        <ScoreCell label="Preserved" hint="Scope unchanged" ids={evaluation.selectiveRecheck.preserved} tone="emerald" />
        <ScoreCell label="Recomputed" hint="Re-read on the current version" ids={evaluation.selectiveRecheck.recomputed} tone="navy" />
      </div>

      <div className="flex shrink-0 items-stretch gap-2">
        <VersionCard version={v1} accepted={acceptedOnV1} current={snapshot.currentVersionId === "V1"} />
        <div className="flex w-28 shrink-0 items-center justify-center text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {v2 ? "Substantive fields changed" : "No replacement"}
        </div>
        <VersionCard
          version={v2}
          current={snapshot.currentVersionId === "V2"}
          empty="V2 not uploaded"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Check</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Dependency scope</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Status</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Why</th>
              <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.checks.map((check) => (
              <tr key={check.id} data-tour={`check-${check.id}`} className={`border-l-4 ${bucketBorder(check.bucket)}`}>
                <td className="border-b border-slate-100 px-2 py-1 align-top">
                  <p className="font-mono text-[11px] font-semibold text-navy">{check.id}</p>
                  <p className="text-[12px] text-slate-800">{check.title}</p>
                </td>
                <td className="border-b border-slate-100 px-2 py-1 align-top text-[12px] text-slate-700">{check.scope}</td>
                <td className="border-b border-slate-100 px-2 py-1 align-top">
                  <StatusBadge status={check.status} />
                </td>
                <td className="border-b border-slate-100 px-2 py-1 align-top text-[12px] leading-snug text-slate-700">{check.reason}</td>
                <td className="border-b border-slate-100 px-2 py-1 align-top">
                  {check.evidence.length === 0 ? (
                    <span className="text-[12px] text-slate-600">{check.basis}</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {check.evidence.map((item) => {
                        const historical = item.disposition === "HISTORICAL";
                        return (
                          <div key={item.id}>
                            <p className="font-mono text-[11px] font-semibold text-navy">{item.id}</p>
                            <p
                              className={`mt-0.5 border px-1.5 py-0.5 text-[10px] font-semibold leading-snug ${
                                historical
                                  ? "border-amber-300 bg-amber-50 text-amber-950"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
                              }`}
                            >
                              {item.badge}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evaluation.evidenceLedger.length > 0 ? (
        <div className="grid shrink-0 grid-cols-2 gap-1.5">
          {evaluation.evidenceLedger.map((item) => {
            const historical = item.disposition === "HISTORICAL";
            return (
              <article
                key={item.id}
                className={`border px-2.5 py-1.5 ${historical ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                title={item.statement}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-[12px] font-semibold text-navy">{item.id}</h3>
                  <span className={`text-[10px] font-semibold tracking-wide ${historical ? "text-amber-950" : "text-emerald-900"}`}>
                    {item.badge}
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-700">
                  {item.reference} · covers {item.coversVersionId} · {formatInr(item.amountInr)}
                  {item.badge === SUPERSEDED_V1_BADGE ? " · not valid for the current version" : ""}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="shrink-0 border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600">
          No bank evidence yet. CHK-02 stays pending until a confirmation covers this version.
        </p>
      )}

      {showTimeline ? (
        <div className="grid shrink-0 grid-cols-5 gap-1">
          {STEPS.map((item) => {
            const selected = state.step === item.step && state.caseId === "DEMO-001";
            return (
              <button
                key={item.step}
                type="button"
                data-tour={`step-${item.step}`}
                onClick={() => setStep(item.step)}
                aria-pressed={selected}
                className={`border px-2 py-1 text-left text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  selected ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy hover:bg-slate-50"
                }`}
              >
                <span className="block font-semibold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
