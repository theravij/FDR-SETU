import { useState } from "react";
import { registerRows } from "../engine/register";
import { formatInr } from "../lib/format";
import { formatCaseRef } from "../lib/labels";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

export function InstitutionScreen() {
  const { state, uploadV2, navigate, setRole } = useDemo();
  const [serial, setSerial] = useState("FDR/PNB/2024/88421");
  const [amount, setAmount] = useState("3000000");
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const rows = registerRows(Object.values(state.cases)).filter((row) =>
    state.role === "INST-01" ? row.institutionId === "INST-NITS" : true,
  );
  const demo = state.cases["DEMO-001"];
  const v1 = demo.versions.find((item) => item.versionId === "V1");
  const required = v1?.fields.declaredAmountInr ?? 3_500_000;
  const parsed = Number(amount.replace(/[^\d]/g, "")) || 0;
  const shortfall = required - parsed;
  const matched = parsed === required;
  const already = demo.currentVersionId === "V2";
  const runScan = () => {
    if (scanning) return;
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
      setVerified(matched);
    }, 650);
  };

  return (
    <ScreenFrame
      title="Institution Portal"
      meta={
        state.role === "INST-01"
          ? "Signed in as INST-01 for National Institute of Technical Studies."
          : "Officer view of every institution. A replacement instrument is submitted as INST-01."
      }
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-5">
        <article data-demo-target="institution-compare" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <p className="font-mono text-[11px] font-semibold text-slate-700">{formatCaseRef("DEMO-001")} · flagged by RO-104</p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-900">V2 replacement instrument</h2>
          <div className="mt-3 grid gap-2">
            <label className="block text-[11px] font-medium text-slate-600">
              Replacement FDR serial number
              <input data-demo-target="inst-fdr-input" value={serial} onChange={(event) => setSerial(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-indigo-400" />
            </label>
            <label className="block text-[11px] font-medium text-slate-600">
              Corrected principal amount in ₹
              <input data-demo-target="inst-amount-input" inputMode="numeric" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/[^\d]/g, "")); setVerified(false); }} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[12px] outline-none focus:border-indigo-400" />
            </label>
            <p className={`rounded-md px-2 py-1 text-[12px] font-semibold ${matched ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              {matched ? `✓ Principal Matched: ${formatInr(required)}` : `Shortfall: ${formatInr(-Math.abs(shortfall))}`}
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
            onDrop={(event) => { event.preventDefault(); runScan(); }}
            className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-2"
          >
            <button type="button" data-demo-target="inst-ocr-scan" onClick={runScan} className="text-[12px] font-semibold text-slate-900">Verify Instrument & Gateway Hash</button>
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
            {scanning && !matched ? <p className="mt-1 text-[11px] text-slate-600">Verifying PNB CBS gateway token & extracting OCR principal...</p> : null}
            {verified ? <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-800">EV-BNK-202 Verified · SHA-256 Match</p> : null}
          </div>
          <div className="mt-3">
            <Btn
              kind="primary"
              data-demo-target="inst-submit-v2"
              onClick={() => {
                if (state.role !== "INST-01") setRole("INST-01");
                uploadV2({ serial, amount: parsed, token, note, ocrMatched: verified && matched });
                navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
              }}
            >
              {already ? "Open selective recheck" : "Submit Corrected V2 Instrument"}
            </Btn>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-[13px] font-semibold text-slate-900">What the institution can do</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-slate-600">
            <li>Upload a replacement instrument for its own case.</li>
            <li>See the discrepancy the review officer confirmed.</li>
            <li>Cannot authorise release or lift a vigilance hold.</li>
          </ul>
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
