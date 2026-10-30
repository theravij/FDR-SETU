import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { CheckStatus } from "../types";
import { displayStatus } from "../lib/labels";

const STATUS_CLASS: Record<string, string> = {
  DISCREPANCY: "border-rose-200 bg-rose-50 text-crimson",
  RECHECK_REQUIRED: "border-amber-300 bg-amber-50 text-amber-950",
  "RECHECK REQUIRED": "border-amber-300 bg-amber-50 text-amber-950",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  PRESERVED_CONFIRMED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  PRESERVED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  BLOCKED: "border-rose-200 bg-rose-50 text-crimson",
  RELEASED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  "READY FOR RELEASE": "border-emerald-200 bg-emerald-50 text-emerald-900",
  "VIGILANCE HOLD": "border-amber-300 bg-amber-50 text-amber-950",
  "IN PROGRESS": "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ status }: { status: CheckStatus | string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${STATUS_CLASS[status] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      {displayStatus(status)}
    </span>
  );
}

export function Btn({
  kind = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "secondary" | "danger" }) {
  const tone =
    kind === "primary"
      ? "border-navy bg-navy text-white hover:bg-slate-800"
      : kind === "danger"
        ? "border-rose-300 bg-white text-crimson hover:bg-rose-50"
        : "border-slate-300 bg-white text-navy hover:bg-slate-50";
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[12px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ScreenFrame({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-navy">{title}</h1>
          {meta ? <p className="truncate text-[11px] text-slate-500">{meta}</p> : null}
        </div>
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
