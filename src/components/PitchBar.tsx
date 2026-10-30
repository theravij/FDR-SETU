import { Pause, Play } from "lucide-react";
import { PITCH } from "../data/pitch";
import { useDemo } from "../state/store";

export function PitchBar() {
  const { state, pitchTo, togglePitch } = useDemo();
  const active = PITCH.findIndex(
    (stage) => stage.screen === state.screen && stage.tab === state.tab && stage.step === state.step,
  );
  const shown = active === -1 ? state.pitchIndex : active;
  const stage = PITCH[shown];

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-3">
        <button
          type="button"
          onClick={togglePitch}
          aria-pressed={state.pitchPlaying}
          className="inline-flex h-8 items-center gap-1.5 border border-navy bg-navy px-2.5 text-[12px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {state.pitchPlaying ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          {state.pitchPlaying ? "Pause" : "Play"}
        </button>
        <div className="w-36 shrink-0 leading-tight">
          <p className="text-[12px] font-semibold text-navy">30-second Pitch Director</p>
          <p className="text-[10px] text-slate-500">Advances every 6 seconds</p>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-5 gap-1">
          {PITCH.map((item) => {
            const selected = item.index === shown && active !== -1;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => pitchTo(item.index)}
                aria-current={selected ? "step" : undefined}
                className={`min-w-0 border px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  selected ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy hover:bg-slate-50"
                }`}
              >
                <span className="block truncate text-[11px] font-semibold">
                  {item.index + 1}. {item.label}
                </span>
                <span className={`block truncate text-[10px] ${selected ? "text-slate-200" : "text-slate-500"}`}>
                  {item.window}
                </span>
              </button>
            );
          })}
        </div>
        <p className="w-28 shrink-0 text-right text-[11px] leading-tight text-slate-600">
          Stage {shown + 1} of 5
          <span className="block text-[10px] text-slate-500">{stage.window}</span>
        </p>
      </div>
      <div className="h-1 bg-slate-100">
        {state.pitchPlaying ? <div key={`${state.pitchIndex}-${state.step}`} className="pitch-fill h-full bg-navy" /> : null}
      </div>
    </div>
  );
}
