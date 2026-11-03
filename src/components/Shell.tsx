import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo } from "../state/store";
import { BaselineScreen } from "../screens/BaselineScreen";
import { InstitutionScreen } from "../screens/InstitutionScreen";
import { QueueScreen } from "../screens/QueueScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { WorkspaceScreen } from "../screens/WorkspaceScreen";
import { maskOperationalText } from "../lib/labels";
import { Sidebar } from "./Sidebar";

function NoticeBar() {
  const { state, dismissNotice } = useDemo();
  const notice = state.notice;
  if (!notice) return null;
  const tone =
    notice.tone === "deny"
      ? "border-rose-200 bg-rose-50 text-crimson"
      : notice.tone === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : notice.tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-slate-200 bg-white text-slate-800";
  return (
    <div className={`mx-5 mt-3 flex shrink-0 items-start gap-3 rounded-xl border px-4 py-2 text-[12px] shadow-sm ${tone}`}>
      <p className="min-w-0 leading-snug">
        <span className="font-semibold">
          {notice.http ? `HTTP ${notice.http} · ` : ""}
          {maskOperationalText(notice.title)}.
        </span>{" "}
        <span className="line-clamp-2">{maskOperationalText(notice.body)}</span>
      </p>
      <button
        type="button"
        onClick={dismissNotice}
        className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
        aria-label="Dismiss notice"
      >
        <X size={13} aria-hidden /> Dismiss
      </button>
    </div>
  );
}

export function Shell() {
  const { state, signIn } = useDemo();
  if (!state.authenticated) {
    return <LoginScreen onSignedIn={signIn} />;
  }
  return <AuthenticatedShell />;
}

function AuthenticatedShell() {
  const { state } = useDemo();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "scale(1)" : "scale(0.985)",
        transition: "opacity 250ms ease, transform 250ms ease",
      }}
    >
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 text-slate-900">
          <NoticeBar />
          {state.screen === "workspace" ? <WorkspaceScreen /> : null}
          {state.screen === "queue" ? <QueueScreen /> : null}
          {state.screen === "institution" ? <InstitutionScreen /> : null}
          {state.screen === "reports" ? <ReportsScreen /> : null}
          {state.screen === "baseline" ? <BaselineScreen /> : null}
        </main>
      </div>
    </div>
  );
}
