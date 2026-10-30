import { MousePointer2, Square } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CURSOR_TOUR } from "../data/cursorTour";
import {
  animatePoint,
  centerOf,
  pressElement,
  sleep,
  travelMs,
  waitForElement,
  type Point,
} from "../lib/cursorMotion";
import { useDemo } from "../state/store";

interface TourApi {
  running: boolean;
  toggle: () => void;
  stop: () => void;
}

const TourContext = createContext<TourApi | null>(null);

export function useTour(): TourApi {
  const api = useContext(TourContext);
  if (!api) throw new Error("useTour must be used inside TourController");
  return api;
}

export function TourController({ children }: { children: ReactNode }) {
  const { reset } = useDemo();
  const [running, setRunning] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [point, setPoint] = useState<Point>({ x: 28, y: 28 });
  const cancel = useRef(false);
  const runningRef = useRef(false);
  const pointRef = useRef<Point>(point);
  const hoverEl = useRef<HTMLElement | null>(null);

  const setPointBoth = (next: Point) => {
    pointRef.current = next;
    setPoint(next);
  };

  const clearHover = () => {
    hoverEl.current?.classList.remove("tour-target");
    hoverEl.current = null;
  };

  const stop = useCallback(() => {
    cancel.current = true;
    runningRef.current = false;
    setRunning(false);
    setVisible(false);
    setPressing(false);
    clearHover();
  }, []);

  const play = useCallback(async () => {
    cancel.current = false;
    runningRef.current = true;
    setRunning(true);
    setVisible(true);
    reset();
    await sleep(480);
    if (cancel.current) return;
    const origin = document.querySelector("[data-tour-toggle]");
    if (origin instanceof HTMLElement) setPointBoth(centerOf(origin));

    try {
      for (const beat of CURSOR_TOUR) {
        if (cancel.current) return;
        const el = await waitForElement(beat.selector);
        if (cancel.current) return;
        if (!el) continue;
        const target = centerOf(el);
        await animatePoint(pointRef.current, target, travelMs(pointRef.current, target), setPointBoth, () => cancel.current);
        if (cancel.current) return;
        setPointBoth(centerOf(el));
        clearHover();
        el.classList.add("tour-target");
        hoverEl.current = el;
        await sleep(140);
        if (cancel.current) return;
        setPressing(true);
        await sleep(90);
        try {
          pressElement(el);
        } catch {
          /* keep walking even if a target is not clickable */
        }
        await sleep(220);
        setPressing(false);
        await sleep(beat.dwell);
      }
    } finally {
      if (!cancel.current) {
        clearHover();
        runningRef.current = false;
        setRunning(false);
        setVisible(false);
        setPressing(false);
      }
    }
  }, [reset]);

  const toggle = useCallback(() => {
    if (runningRef.current) stop();
    else void play();
  }, [play, stop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && runningRef.current) {
        event.preventDefault();
        stop();
        return;
      }
      if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "KeyD") {
        event.preventDefault();
        toggle();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!runningRef.current || !event.isTrusted) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-tour-toggle]")) return;
      stop();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [stop, toggle]);

  useEffect(() => () => stop(), [stop]);

  return (
    <TourContext.Provider value={{ running, toggle, stop }}>
      {children}
      {visible ? (
        <div
          className={`pointer-events-none fixed z-[9999] ${pressing ? "tour-cursor-press" : ""}`}
          style={{ left: point.x, top: point.y, transform: "translate(-2px, -1px)" }}
          aria-hidden
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            className={`origin-[2px_2px] drop-shadow-[1px_2px_1px_rgba(15,23,42,0.45)] ${pressing ? "scale-90" : ""}`}
          >
            <path
              d="M4 3.2 4 20.4 9.1 15.8 12.2 23.4 15.6 22 12.6 14.6 19.4 14.4Z"
              fill="#fff"
              stroke="#0F172A"
              strokeLinejoin="round"
              strokeWidth="1.4"
            />
          </svg>
          {pressing ? <span className="tour-ripple" /> : null}
        </div>
      ) : null}
    </TourContext.Provider>
  );
}

export function TourToggle() {
  const { running, toggle } = useTour();
  return (
    <button
      type="button"
      data-tour-toggle="true"
      onClick={toggle}
      aria-pressed={running}
      aria-label={running ? "Stop guided walkthrough" : "Play guided walkthrough"}
      title="Alt+D"
      className="inline-flex h-6 w-6 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      {running ? <Square size={12} aria-hidden /> : <MousePointer2 size={13} aria-hidden />}
    </button>
  );
}
