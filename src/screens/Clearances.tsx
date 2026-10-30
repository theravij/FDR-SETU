import { useDemo } from "../state/store";
import { Btn } from "../components/ui";

export function Clearances() {
  const demo = useDemo();
  const { state } = demo;
  const demo005 = state.cases["DEMO-005"];
  const tests = [
    {
      title: "Cosmetic PDF rescan",
      copy: "Replaces the file sha256 of the current instrument and leaves the substantive hash alone. Expect zero checks invalidated and the same evaluationHash.",
      action: "Run rescan",
      onClick: demo.cosmeticRescan,
    },
    {
      title: "RBAC release attempt",
      copy: "Submits the current evaluationHash for authorisation. RO-104, VIG-22 and INST-01 receive HTTP 403. DIR-01 is refused with HTTP 409 until the case is ready.",
      action: `Attempt release as ${state.role}`,
      onClick: demo.attemptRelease,
    },
    {
      title: "Bank gateway outage",
      copy: state.gatewayOutage
        ? "Gateway is OUTAGE. Record an attested branch letter. It covers the current version at T4 and does not rewrite EV-BNK-101."
        : "Gateway is online. Mark an outage first, then record the manual letter. The letter stays honest T4 provenance.",
      action: state.gatewayOutage ? "Record manual letter" : "Mark gateway outage",
      onClick: state.gatewayOutage ? demo.recordManualLetter : demo.toggleGateway,
    },
    {
      title: "Idempotent escalation · DEMO-005",
      copy: demo005.escalation
        ? `${demo005.escalation.id} is already open. A second request must return that id and must not add an audit event.`
        : "DEMO-005 has an open amount discrepancy and no escalation. The first request opens ESC-DEMO-005. The second returns the same id.",
      action: demo005.escalation ? "Repeat escalation" : "Escalate DEMO-005",
      onClick: demo.escalateDemo005,
    },
    {
      title: "Stale evaluationHash",
      copy: "Freezes the current hash, applies a concurrent institution edit, then asks DIR-01 to release against the frozen hash. Expect HTTP 412. Check statuses need not change.",
      action: "Run stale-hash block",
      onClick: demo.runStaleHashBlock,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
      {tests.map((test) => (
        <article key={test.title} className="flex min-h-0 flex-col border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-2.5 py-2">
            <h2 className="text-[12px] font-semibold leading-tight text-navy">{test.title}</h2>
          </header>
          <p className="min-h-0 flex-1 overflow-auto px-2.5 py-2 text-[11px] leading-snug text-slate-700">{test.copy}</p>
          <div className="border-t border-slate-200 px-2.5 py-2">
            <Btn onClick={test.onClick}>{test.action}</Btn>
          </div>
        </article>
      ))}
      </div>
      {state.notice ? (
        <pre className="max-h-24 shrink-0 overflow-auto border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] leading-snug text-slate-800 whitespace-pre-wrap">
          {state.notice.title}: {state.notice.body}
          {state.frozenHash ? ` Frozen hash ${state.frozenHash}.` : ""}
        </pre>
      ) : null}
    </div>
  );
}
