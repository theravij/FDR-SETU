import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDemo } from "../state/store";

interface RunApi {
  playing: boolean;
  play: () => void;
  record: () => void;
}

const RunContext = createContext<RunApi | null>(null);

export function useDemoRun(): RunApi {
  const api = useContext(RunContext);
  if (!api) throw new Error("useDemoRun must be used inside DemoDirector");
  return api;
}

const DURATION = 60_000;

interface Cue {
  at: number;
  scene: string;
  caption: string;
  run: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function centerOf(selector: string): { x: number; y: number } | null {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return null;
  const box = node.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  return { x: box.left + box.width / 2, y: box.top + Math.min(box.height / 2, 28) };
}

export function DemoDirector({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [scene, setScene] = useState("Scene 1/6 · Officer queue");
  const [caption, setCaption] = useState("RO-104 opens the register and finds DEMO-001 still mismatched.");
  const [point, setPoint] = useState({ x: 48, y: 48 });
  const [ripple, setRipple] = useState(false);
  const cancel = useRef(false);
  const pausedRef = useRef(false);
  const started = useRef(0);
  const carried = useRef(0);
  const fired = useRef<Set<number>>(new Set());
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  const stopRecorder = (download: boolean) => {
    const active = recorder.current;
    recorder.current = null;
    if (!active) return;
    active.onstop = () => {
      active.stream.getTracks().forEach((track) => track.stop());
      if (!download || chunks.current.length === 0) return;
      const blob = new Blob(chunks.current, { type: active.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fdr-setu-60s-demo.webm";
      link.click();
      URL.revokeObjectURL(url);
    };
    if (active.state === "recording") active.requestData();
    if (active.state !== "inactive") active.stop();
    else active.stream.getTracks().forEach((track) => track.stop());
  };

  const finish = useCallback((download: boolean) => {
    cancel.current = true;
    pausedRef.current = false;
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    stopRecorder(download);
    setPlaying(false);
    setPaused(false);
    setRipple(false);
  }, []);

  const glideClick = useCallback(async (selector: string, action: () => void) => {
    const spot = centerOf(selector);
    if (spot) setPoint(spot);
    await sleep(720);
    if (cancel.current) return;
    const node = document.querySelector(selector);
    setRipple(true);
    if (node instanceof HTMLElement) {
      node.classList.add("ring-2", "ring-indigo-400", "ring-offset-2");
      window.setTimeout(() => node.classList.remove("ring-2", "ring-indigo-400", "ring-offset-2"), 900);
    }
    await sleep(160);
    if (cancel.current) return;
    if (node instanceof HTMLButtonElement && !node.disabled) node.click();
    else action();
    window.setTimeout(() => setRipple(false), 420);
  }, []);

  const cues = useCallback((): Cue[] => {
    const api = () => demoRef.current;
    return [
      {
        at: 0,
        scene: "Scene 1/6 · Officer queue",
        caption: "RO-104 triages the register. DEMO-001 is still a mismatch.",
        run: () => {
          api().reset();
          api().setRole("RO-104");
          api().navigate({ screen: "queue" });
        },
      },
      {
        at: 4_500,
        scene: "Scene 1/6 · Officer queue",
        caption: "Open DEMO-001 and start at the V1 scan.",
        run: () => {
          void glideClick('[data-demo-target="open-DEMO-001"]', () => {
            api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
          });
        },
      },
      {
        at: 10_000,
        scene: "Scene 2/6 · V1 mismatch",
        caption: "The form says ₹35,00,000. The scan says ₹30,00,000. That is a ₹5,00,000 shortfall.",
        run: () => {
          const spot = centerOf('[data-demo-target="fdr-certificate"]');
          if (spot) setPoint(spot);
        },
      },
      {
        at: 16_000,
        scene: "Scene 2/6 · V1 mismatch",
        caption: "RO-104 flags the discrepancy and returns the file to the institution.",
        run: () => {
          void glideClick('[data-demo-target="primary-action"]', () => api().confirmV1());
        },
      },
      {
        at: 20_000,
        scene: "Scene 3/6 · Institution resubmits",
        caption: "INST-01 replaces the deficient instrument with a corrected FDR.",
        run: () => {
          void glideClick('[data-demo-target="role-INST-01"]', () => api().setRole("INST-01"));
        },
      },
      {
        at: 23_500,
        scene: "Scene 3/6 · Institution resubmits",
        caption: "The portal shows the gap the review officer already confirmed.",
        run: () => {
          void glideClick('[data-demo-target="nav-institution"]', () => api().navigate({ screen: "institution" }));
        },
      },
      {
        at: 27_500,
        scene: "Scene 3/6 · Institution resubmits",
        caption: "Corrected FDR/PNB/2025/91007 for ₹35,00,000, covered later by EV-BNK-202.",
        run: () => {
          void glideClick('[data-demo-target="submit-v2"]', () => api().uploadV2());
        },
      },
      {
        at: 32_000,
        scene: "Scene 4/6 · Selective recheck",
        caption: "RO-104 returns. Identity and the AICTE lien stay locked. Only changed fields recompute.",
        run: () => {
          api().setRole("RO-104");
          api().setStep(4);
          api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
        },
      },
      {
        at: 36_000,
        scene: "Scene 4/6 · Selective recheck",
        caption: "CHK-03 and CHK-04 stay preserved from V1. CHK-01 and CHK-02 were recomputed on V2.",
        run: () => {
          const spot = centerOf('[data-demo-target="recheck-matrix"]');
          if (spot) setPoint(spot);
        },
      },
      {
        at: 40_000,
        scene: "Scene 4/6 · Selective recheck",
        caption: "The provenance diff shows what changed between V1 and V2, and what stayed locked.",
        run: () => {
          void glideClick('[data-demo-target="tab-provenance"]', () => {
            api().navigate({ screen: "workspace", tab: "provenance" });
          });
        },
      },
      {
        at: 43_500,
        scene: "Scene 4/6 · Selective recheck",
        caption: "The officer forwards the verified file to the director.",
        run: () => {
          void glideClick('[data-demo-target="primary-action"]', () => api().setStep(5));
        },
      },
      {
        at: 46_500,
        scene: "Scene 5/6 · Audit",
        caption: "Every transition is an append-only audit event.",
        run: () => {
          void glideClick('[data-demo-target="tab-audit"]', () => {
            api().navigate({ screen: "workspace", tab: "audit" });
          });
        },
      },
      {
        at: 50_500,
        scene: "Scene 5/6 · Director",
        caption: "DIR-01 is the only role that can record the release decision.",
        run: () => {
          void glideClick('[data-demo-target="role-DIR-01"]', () => api().setRole("DIR-01"));
        },
      },
      {
        at: 54_000,
        scene: "Scene 6/6 · Verification record",
        caption: "The decision is recorded. The NOC and the payment stay outside this workspace.",
        run: () => {
          void glideClick('[data-demo-target="primary-action"]', () => api().attemptRelease());
        },
      },
      {
        at: 56_500,
        scene: "Scene 6/6 · Verification record",
        caption: "RELEASED — Verified. financialRelease stays NOT_EXECUTED_HERE.",
        run: () => {
          void glideClick('[data-demo-target="tab-result"]', () => {
            api().navigate({ screen: "workspace", tab: "result" });
          });
        },
      },
      {
        at: 58_200,
        scene: "Scene 6/6 · Baseline",
        caption: "Selective recheck reopens one check instead of all four. Half the re-verification effort stays saved.",
        run: () => {
          void glideClick('[data-demo-target="nav-baseline"]', () => api().navigate({ screen: "baseline" }));
        },
      },
    ];
  }, [glideClick]);

  const begin = useCallback(() => {
    cancel.current = false;
    pausedRef.current = false;
    fired.current = new Set();
    carried.current = 0;
    started.current = performance.now();
    setElapsed(0);
    setPaused(false);
    setPlaying(true);
    setScene("Scene 1/6 · Officer queue");
    setCaption("RO-104 triages the register. DEMO-001 is still a mismatch.");
    const list = cues();
    timer.current = window.setInterval(() => {
      if (cancel.current || pausedRef.current) return;
      const ms = carried.current + (performance.now() - started.current);
      setElapsed(Math.min(DURATION, ms));
      for (const cue of list) {
        if (ms >= cue.at && !fired.current.has(cue.at)) {
          fired.current.add(cue.at);
          setScene(cue.scene);
          setCaption(cue.caption);
          cue.run();
        }
      }
      if (ms >= DURATION) finish(true);
    }, 80);
  }, [cues, finish]);

  const play = useCallback(() => {
    if (playing) return;
    begin();
  }, [begin, playing]);

  const record = useCallback(() => {
    if (playing) return;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 60 },
          audio: false,
          preferCurrentTab: true,
        } as any);
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
        const media = new MediaRecorder(stream, { mimeType: mime });
        chunks.current = [];
        media.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.current.push(event.data);
        };
        recorder.current = media;
        media.start();
      } catch {
        recorder.current = null;
      }
      begin();
    })();
  }, [begin, playing]);

  const pause = () => {
    if (!playing) return;
    if (pausedRef.current) {
      pausedRef.current = false;
      started.current = performance.now();
      setPaused(false);
      return;
    }
    carried.current += performance.now() - started.current;
    pausedRef.current = true;
    setPaused(true);
  };

  useEffect(() => () => finish(false), [finish]);

  const clock = `${formatClock(elapsed)} / 01:00`;

  return (
    <RunContext.Provider value={{ playing, play, record }}>
      {children}
      {playing ? (
        <>
          <div
            className="pointer-events-none fixed z-[80] transition-[left,top] duration-700 ease-out"
            style={{ left: point.x, top: point.y }}
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 28 28" className="drop-shadow-[1px_2px_1px_rgba(15,23,42,0.45)]">
              <path d="M4 3.2 4 20.4 9.1 15.8 12.2 23.4 15.6 22 12.6 14.6 19.4 14.4Z" fill="#fff" stroke="#0F172A" strokeLinejoin="round" strokeWidth="1.4" />
            </svg>
            {ripple ? <span className="demo-ripple" /> : null}
          </div>
          <div className="fixed bottom-4 left-1/2 z-[70] w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-slate-900/90 px-6 py-3 text-white shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">{scene}</p>
                <p className="truncate text-[12px]">{caption}</p>
              </div>
              <p className="shrink-0 font-mono text-[12px] tabular-nums">{clock}</p>
              <button type="button" onClick={pause} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => {
                  finish(false);
                  window.setTimeout(() => begin(), 40);
                }}
                className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium"
              >
                Restart
              </button>
              <button type="button" onClick={() => finish(false)} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                Exit demo
              </button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-1 rounded-full bg-indigo-400" style={{ width: `${(elapsed / DURATION) * 100}%` }} />
            </div>
          </div>
        </>
      ) : null}
    </RunContext.Provider>
  );
}

function formatClock(ms: number): string {
  const total = Math.min(60, Math.floor(ms / 1000));
  const seconds = String(total % 60).padStart(2, "0");
  return `00:${seconds}`;
}
