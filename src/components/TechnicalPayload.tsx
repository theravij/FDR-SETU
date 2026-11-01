import { useState } from "react";
import { useDemo } from "../state/store";

export function TechnicalPayload() {
  const { evaluation } = useDemo();
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-navy"
      >
        <span>View Technical Payload</span>
        <span aria-hidden>{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-600">Verification hash {evaluation.evaluationHash.slice(0, 18)}</p> : null}
    </div>
  );
}
