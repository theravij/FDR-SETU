import { Square, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { FLOW_DURATION_MS } from "../data/demoFlow";
import { useDemo } from "../state/store";

export function DemoFlowButton() {
  const { flowRunning, flowStartedAt, toggleFlow } = useDemo();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!flowRunning || flowStartedAt == null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.min(FLOW_DURATION_MS, Date.now() - flowStartedAt));
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [flowRunning, flowStartedAt]);

  const remaining = Math.max(0, Math.ceil((FLOW_DURATION_MS - elapsed) / 1000));
  const progress = Math.min(100, (elapsed / FLOW_DURATION_MS) * 100);

  return (
    <button
      type="button"
      onClick={toggleFlow}
      aria-pressed={flowRunning}
      title={flowRunning ? "Stop the 60-second walkthrough and keep this screen" : "Play the 60-second prototype walkthrough"}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-navy bg-white px-2 text-[12px] font-medium text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      {flowRunning ? <Square size={12} aria-hidden /> : <Zap size={13} aria-hidden />}
      <span className="whitespace-nowrap">{flowRunning ? "Stop" : "60s Demo Flow"}</span>
      {flowRunning ? (
        <span className="relative h-4 w-10 overflow-hidden border border-slate-300 bg-slate-100 text-[10px] leading-4">
          <span className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${progress}%` }} />
          <span className="relative block text-center tabular-nums">{remaining}s</span>
        </span>
      ) : null}
    </button>
  );
}
