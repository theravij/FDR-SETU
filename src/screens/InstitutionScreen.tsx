import { useEffect, useMemo, useState } from "react";
import { registerRows } from "../engine/register";
import { formatInr } from "../lib/format";
import { displayStatus, formatCaseRef } from "../lib/labels";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

function sanitizeAmount(raw: string): string {
  return raw.replace(/[₹,\s]/g, "").replace(/[^\d]/g, "");
}

function nextSerial(current: string): string {
  const match = current.match(/^(.*?)(\d+)$/);
  if (!match) return current ? `${current}-V2` : "FDR/PNB/2025/91007";
  const next = String(Number(match[2]) + 1).padStart(match[2].length, "0");
  return `${match[1]}${next}`;
}

export function InstitutionScreen() {
  const { state, uploadV2, navigate, setRole } = useDemo();
  const active = state.cases[state.caseId] ?? state.cases["DEMO-001"];
  const activeEvalStatus = useMemo(() => {
    const rows = registerRows([active]);
    return rows[0]?.statusLabel ?? "IN PROGRESS";
  }, [active]);
  const needsV2 = registerRows(Object.values(state.cases)).filter((row) =>
    row.statusLabel === "DISCREPANCY" || row.statusLabel === "RECHECK REQUIRED" || row.caseId === "DEMO-001",
  );
  const released = activeEvalStatus === "RELEASED" || active.release.authorised;

  const v1 = active.versions.find((item) => item.versionId === "V1") ?? active.versions[0];
  const required = v1?.fields.declaredAmountInr ?? 0;
  const [serial, setSerial] = useState(v1?.fields.referenceNumber ?? "");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [fileMeta, setFileMeta] = useState<string | null>(null);
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    const seed = state.cases[state.caseId] ?? state.cases["DEMO-001"];
    const seedV1 = seed.versions.find((item) => item.versionId === "V1") ?? seed.versions[0];
    setSerial(seedV1?.fields.referenceNumber ?? "");
    setAmount("");
    setToken("");
    setNote("");
    setVerified(false);
    setScanStep(0);
    setFileMeta(null);
    setAmountError("");
  }, [state.caseId, state.cases]);

  const rows = registerRows(Object.values(state.cases)).filter((row) =>
    state.role === "INST-01" ? row.institutionId === "INST-NITS" : true,
  );
  const parsedRaw = sanitizeAmount(amount);
  const parsed = parsedRaw === "" ? 0 : Number(parsedRaw);
  const amountValid = Number.isFinite(parsed) && parsed > 0;
  const shortfall = required - parsed;
  const matched = amountValid && parsed >= required;
  const already = active.currentVersionId === "V2";

  const runScan = () =>
    new Promise<boolean>((resolve) => {
      if (scanning) {
        resolve(verified && matched);
        return;
      }
      if (!amountValid) {
        setAmountError("Enter a principal amount greater than zero.");
        resolve(false);
        return;
      }
      setAmountError("");
      setScanning(true);
      setVerified(false);
      setScanStep(0);
      if (matched) {
        window.setTimeout(() => setScanStep(1), 80);
        window.setTimeout(() => setScanStep(2), 280);
        window.setTimeout(() => setScanStep(3), 480);
      }
      window.setTimeout(() => {
        setScanning(false);
        const ok = matched;
        setVerified(ok);
        resolve(ok);
      }, 650);
    });

  const autoFill = () => {
    const baseSerial = v1?.fields.referenceNumber || "FDR/PNB/2025/91006";
    setSerial(baseSerial.includes("88421") || required === 3_500_000 ? "FDR/PNB/2025/91007" : nextSerial(baseSerial));
    setAmount(String(required));
    setToken("PNB-GW-2026-44802");
    setNote("Submitted corrected V2 FDR matching full declared principal with CBS confirmation.");
    setVerified(false);
    setAmountError("");
  };

  const submit = async () => {
    let ok = verified && matched;
    if (!ok) ok = await runScan();
    if (!amountValid || parsed <= 0) {
      setAmountError("Enter a principal amount greater than zero.");
      return;
    }
    if (state.role !== "INST-01") setRole("INST-01");
    uploadV2({
      serial,
      amount: parsed,
      token,
      note,
      ocrMatched: ok && matched,
      asRole: "INST-01",
    });
    navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
  };

  return (
    <ScreenFrame
      title="Institution Portal"
      meta={state.role === "INST-01" ? active.institutionName : "All institutions · submit as INST-01"}
    >
      {released ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px]">
          <span className="font-semibold text-amber-950">
            {formatCaseRef(active.caseId)} is {displayStatus("RELEASED")}. Switch to a case needing V2, or stay to file a renewal instrument.
          </span>
          {needsV2.map((row) => (
            <button
              key={row.caseId}
              type="button"
              onClick={() => navigate({ screen: "institution", caseId: row.caseId })}
              className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
            >
              {formatCaseRef(row.caseId)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 lg:grid-cols-5">
        <article data-demo-target="institution-compare" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-semibold text-slate-700">{formatCaseRef(active.caseId)} · flagged by RO-104</p>
              <h2 className="mt-1 text-[15px] font-semibold text-slate-900">V2 replacement instrument</h2>
            </div>
            <Btn onClick={autoFill}>⚡ Auto-Fill Valid V2 Replacement</Btn>
          </div>
          <div className="mt-3 grid gap-2">
            <label className="block text-[11px] font-medium text-slate-600">
              Replacement FDR serial number
              <input data-demo-target="inst-fdr-input" value={serial} onChange={(event) => setSerial(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-indigo-400" />
            </label>
            <label className="block text-[11px] font-medium text-slate-600">
              Corrected principal amount in ₹
              <input
                data-demo-target="inst-amount-input"
                inputMode="numeric"
                value={amount}
                onChange={(event) => {
                  const next = sanitizeAmount(event.target.value);
                  setAmount(next);
                  setVerified(false);
                  const value = Number(next);
                  if (next && (!Number.isFinite(value) || value <= 0)) setAmountError("Amount must be a positive number.");
                  else setAmountError("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-indigo-400"
              />
            </label>
            {amountError ? <p className="text-[11px] font-medium text-rose-700">{amountError}</p> : null}
            <p className={`rounded-md px-2 py-1 text-[12px] font-semibold ${matched ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              {!amountValid
                ? `Enter principal to compare against ${formatInr(required)} requirement`
                : matched
                  ? `✓ Principal Matched: ${formatInr(parsed)} · Ready for Selective Recheck`
                  : `Shortfall of ${formatInr(Math.abs(shortfall))} remains against ${formatInr(required)} requirement`}
            </p>
            <label className="block text-[11px] font-medium text-slate-600">
              Bank gateway confirmation token
              <input data-demo-target="inst-token-input" value={token} onChange={(event) => setToken(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-indigo-400" />
            </label>
            <label className="block text-[11px] font-medium text-slate-600">
              Reviewer resubmission note
              <input data-demo-target="inst-note-input" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none focus:border-indigo-400" />
            </label>
          </div>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) setFileMeta(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`);
              void runScan();
            }}
            className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" data-demo-target="inst-ocr-scan" onClick={() => void runScan()} className="text-[12px] font-semibold text-slate-900">Verify Instrument & Gateway Hash</button>
              <label className="cursor-pointer text-[11px] font-medium text-indigo-700 hover:underline">
                Choose PDF / image
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setFileMeta(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`);
                  }}
                />
              </label>
              {fileMeta ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{fileMeta}</span> : null}
            </div>
            {scanning && matched ? (
              <div className="relative mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-mono text-[11px] text-slate-500">{serial || "Replacement instrument"}</p>
                <p className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">{formatInr(parsed)}</p>
                <p className="font-mono text-[11px] text-slate-600">{token || "Gateway token pending"}</p>
                <span className="fdr-scan-line pointer-events-none absolute left-0 right-0 top-0 h-0.5 bg-emerald-500" />
                <div className="mt-2 flex flex-wrap gap-1">
                  {scanStep >= 1 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">✓ OCR Principal: {formatInr(parsed)}</span> : null}
                  {scanStep >= 2 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">✓ Gateway Token: {token || "Pending"}</span> : null}
                  {scanStep >= 3 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">✓ SHA-256 Digest Verified</span> : null}
                </div>
              </div>
            ) : null}
            {scanning && !matched ? <p className="mt-1 text-[11px] text-slate-600">Verifying {v1?.fields.bankName ?? "bank"} gateway token...</p> : null}
            {verified ? <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-800">{token || "Gateway"} verified · SHA-256 match</p> : null}
          </div>
          <div className="mt-3">
            <Btn kind="primary" data-demo-target="inst-submit-v2" onClick={() => void submit()}>
              {already ? "Open selective recheck" : "Submit Corrected V2 Instrument"}
            </Btn>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-[13px] font-semibold text-slate-900">V1 rejected vs V2 typed</h2>
          <div className="mt-3 grid gap-2">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">{v1?.versionId ?? "V1"} rejected</p>
              <p className="font-mono text-[12px] text-slate-800">{v1?.fields.referenceNumber}</p>
              <p className="font-mono text-[12px] font-semibold text-rose-800">{formatInr(v1?.fields.declaredAmountInr ?? 0)} form · {formatInr(v1?.fields.observedAmountInr ?? 0)} scan</p>
            </div>
            <div className={`rounded-lg border px-2 py-1.5 transition-colors duration-300 ${matched ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">V2 being typed</p>
              <p className="font-mono text-[12px] text-slate-800">{serial || "Serial pending"}</p>
              <p className="font-mono text-[12px] font-semibold text-slate-900">{formatInr(parsed)} · {token || "Token pending"}</p>
            </div>
          </div>
        </article>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {["Institution", "Case", "Route", "Version", "Status", ""].map((heading) => (
                <th key={heading} className="border-b border-slate-200 px-3 py-2 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const snapshot = state.cases[row.caseId];
              return (
                <tr key={row.caseId}>
                  <td className="border-b border-slate-100 px-3 py-2 text-[12px]">
                    <span className="block font-medium text-slate-900">{row.institutionName}</span>
                    <span className="font-mono text-[10px] text-slate-500">{row.institutionId}</span>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px]">{formatCaseRef(row.caseId)}</td>
                  <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-600">{row.routeLabel}</td>
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px]">{snapshot.currentVersionId}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <StatusBadge status={row.statusLabel} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-right">
                    <Btn onClick={() => navigate({ screen: "workspace", tab: "recheck", caseId: row.caseId })}>Open workspace</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}
