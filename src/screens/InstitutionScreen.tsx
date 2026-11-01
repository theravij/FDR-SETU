import { registerRows } from "../engine/register";
import { formatInr } from "../lib/format";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

export function InstitutionScreen() {
  const { state, uploadV2, navigate, setRole } = useDemo();
  const rows = registerRows(Object.values(state.cases)).filter((row) =>
    state.role === "INST-01" ? row.institutionId === "INST-NITS" : true,
  );
  const demo = state.cases["DEMO-001"];
  const v1 = demo.versions.find((item) => item.versionId === "V1");
  const gap = v1 ? v1.fields.declaredAmountInr - v1.fields.observedAmountInr : 0;
  const already = demo.currentVersionId === "V2";

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
        <article className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm lg:col-span-3">
          <p className="font-mono text-[11px] font-semibold text-rose-800">DEMO-001 · flagged by RO-104</p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-900">The form and the scan do not match</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <figure className="rounded-lg bg-slate-50 px-3 py-2">
              <figcaption className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Declared</figcaption>
              <p className="font-mono text-[14px] font-semibold tabular-nums">{v1 ? formatInr(v1.fields.declaredAmountInr) : "—"}</p>
            </figure>
            <figure className="rounded-lg bg-rose-50 px-3 py-2">
              <figcaption className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Scanned</figcaption>
              <p className="font-mono text-[14px] font-semibold tabular-nums text-rose-900">{v1 ? formatInr(v1.fields.observedAmountInr) : "—"}</p>
            </figure>
            <figure className="rounded-lg bg-rose-50 px-3 py-2">
              <figcaption className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Gap</figcaption>
              <p className="font-mono text-[14px] font-semibold tabular-nums text-rose-900">{formatInr(gap)}</p>
            </figure>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-slate-600">
            Submit the corrected FDR. Principal and bank confirmation reopen. Institution identity and the AICTE lien stay locked when those fields do not change.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.role === "INST-01" ? (
              <Btn
                kind="primary"
                data-demo-target="submit-v2"
                onClick={() => {
                  uploadV2();
                  navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
                }}
              >
                {already ? "Open selective recheck" : "Submit Corrected V2 FDR (₹35,00,000)"}
              </Btn>
            ) : (
              <Btn kind="primary" onClick={() => setRole("INST-01")}>
                Switch to INST-01
              </Btn>
            )}
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
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px]">{row.caseId}</td>
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
