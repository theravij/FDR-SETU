import { registerRows } from "../engine/register";
import { useDemo } from "../state/store";
import { Btn, ScreenFrame, StatusBadge } from "../components/ui";

export function InstitutionScreen() {
  const { state, uploadV2, navigate } = useDemo();
  const rows = registerRows(Object.values(state.cases)).filter((row) =>
    state.role === "INST-01" ? row.institutionId === "INST-NITS" : true,
  );
  const demo = state.cases["DEMO-001"];

  return (
    <ScreenFrame
      title="Institution Portal"
      meta={
        state.role === "INST-01"
          ? "Signed in as INST-01 for National Institute of Technical Studies. Other institutions are hidden."
          : "Officer view of every institution. Uploading a replacement is reserved for INST-01."
      }
      actions={
        <Btn kind="primary" data-tour="upload-v2" onClick={uploadV2}>
          {state.role === "INST-01" && demo.currentVersionId === "V2" ? "V2 already uploaded" : "Upload V2 replacement"}
        </Btn>
      }
    >
      <table className="w-full border-collapse bg-white text-left">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            {["Institution", "Case", "Route", "Current version", "Status", ""].map((heading) => (
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
                  <span className="block font-medium text-navy">{row.institutionName}</span>
                  <span className="font-mono text-[10px] text-slate-500">{row.institutionId}</span>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 font-mono text-[12px]">{row.caseId}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[12px] text-slate-700">{row.routeLabel}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-[12px]">{snapshot.currentVersionId}</td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <StatusBadge status={row.statusLabel} />
                </td>
                <td className="border-b border-slate-100 px-3 py-2 text-right">
                  <Btn onClick={() => navigate({ screen: "workspace", tab: "recheck", caseId: row.caseId })}>View case</Btn>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScreenFrame>
  );
}
