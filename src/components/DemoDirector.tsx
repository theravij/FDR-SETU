import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDemo } from "../state/store";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function DemoDirector({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [point, setPoint] = useState({ x: 36, y: 72 });
  const pointRef = useRef(point);
  const cancel = useRef(false);
  const running = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const setCursor = (next: { x: number; y: number }) => {
    pointRef.current = next;
    setPoint(next);
  };

  const stopRecorder = (download: boolean) => {
    const active = recorder.current;
    recorder.current = null;
    if (!active) return;
    const save = download;
    active.onstop = () => {
      active.stream.getTracks().forEach((track) => track.stop());
      if (!save || chunks.current.length === 0) return;
      const blob = new Blob(chunks.current, { type: active.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fdr-setu-walkthrough.webm";
      link.click();
      URL.revokeObjectURL(url);
    };
    if (active.state === "recording") active.requestData();
    if (active.state !== "inactive") active.stop();
    else active.stream.getTracks().forEach((track) => track.stop());
  };

  const abort = useCallback((download = false) => {
    cancel.current = true;
    running.current = false;
    setVisible(false);
    setPressed(false);
    stopRecorder(download);
  }, []);

  const spot = (selector: string) => {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) return null;
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
    const box = node.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    return { node, x: box.left + Math.min(box.width * 0.45, 90), y: box.top + Math.min(box.height * 0.55, 22) };
  };

  const moveTo = async (selector: string) => {
    const target = spot(selector);
    if (!target || cancel.current) return null;
    const from = pointRef.current;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const arc = 28 + Math.min(56, len * 0.12);
    const cx = (from.x + target.x) / 2 + (-dy / len) * arc;
    const cy = (from.y + target.y) / 2 + (dx / len) * arc;
    const duration = Math.min(850, Math.max(550, len * 0.85));
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (cancel.current) return resolve();
        const t = Math.min(1, (performance.now() - started) / duration);
        const e = ease(t);
        const u = 1 - e;
        setCursor({
          x: u * u * from.x + 2 * u * e * cx + e * e * target.x,
          y: u * u * from.y + 2 * u * e * cy + e * e * target.y,
        });
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    if (!cancel.current) {
      setCursor({ x: target.x + 1.5, y: target.y + 1 });
      await sleep(70);
      setCursor({ x: target.x, y: target.y });
    }
    return target.node;
  };

  const glideClick = async (selector: string, extra?: () => void) => {
    const node = await moveTo(selector);
    if (cancel.current) return;
    if (node) node.classList.add("ring-2", "ring-indigo-200");
    await sleep(220);
    if (node) node.classList.remove("ring-2", "ring-indigo-200");
    if (cancel.current) return;
    setPressed(true);
    await sleep(110);
    setPressed(false);
    if (cancel.current) return;
    if (node instanceof HTMLButtonElement && !node.disabled) node.click();
    extra?.();
  };

  const runWalk = useCallback(async (download: boolean) => {
    if (running.current) return;
    running.current = true;
    cancel.current = false;
    setVisible(true);
    const api = () => demoRef.current;
    const started = performance.now();
    const beats: Array<{ at: number; run: () => Promise<void> | void }> = [
      {
        at: 0,
        run: () => {
          api().reset();
          api().setRole("RO-104");
          api().navigate({ screen: "queue" });
        },
      },
      { at: 1_200, run: () => glideClick('[data-demo-target="filter-discrepancy"]') },
      { at: 2_800, run: () => glideClick('[data-demo-target="filter-all"]') },
      { at: 4_400, run: () => moveTo('[data-demo-target="row-hold"]') },
      {
        at: 6_200,
        run: () => glideClick('[data-demo-target="open-DEMO-001"]', () => api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" })),
      },
      { at: 8_200, run: () => moveTo('[data-demo-target="fdr-certificate"]') },
      { at: 10_600, run: () => moveTo('[data-demo-target="check-CHK-01"]') },
      { at: 13_200, run: () => glideClick('[data-demo-target="workflow-primary-cta"]') },
      {
        at: 16_200,
        run: () => glideClick('[data-demo-target="nav-institution"]', () => {
          api().setRole("INST-01");
          api().navigate({ screen: "institution" });
        }),
      },
      { at: 18_800, run: () => moveTo('[data-demo-target="institution-compare"]') },
      { at: 21_600, run: () => glideClick('[data-demo-target="submit-v2"]') },
      {
        at: 25_000,
        run: () => {
          api().setRole("RO-104");
          api().setStep(4);
          api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
        },
      },
      { at: 25_600, run: () => moveTo('[data-demo-target="check-CHK-03"]') },
      { at: 26_800, run: () => moveTo('[data-demo-target="check-CHK-04"]') },
      { at: 27_800, run: () => moveTo('[data-demo-target="check-CHK-01"]') },
      { at: 28_600, run: () => moveTo('[data-demo-target="check-CHK-02"]') },
      { at: 29_000, run: () => glideClick('[data-demo-target="tab-provenance"]') },
      { at: 33_000, run: () => glideClick('[data-demo-target="tab-clearances"]') },
      { at: 36_000, run: () => glideClick('[data-demo-target="tab-audit"]') },
      { at: 38_000, run: () => glideClick('[data-demo-target="workflow-primary-cta"]') },
      { at: 40_200, run: () => glideClick('[data-demo-target="workflow-primary-cta"]') },
      { at: 42_400, run: () => glideClick('[data-demo-target="tab-result"]') },
      { at: 44_400, run: () => glideClick('[data-demo-target="cert-v2"]') },
      { at: 46_000, run: () => glideClick('[data-demo-target="cert-v1"]') },
      { at: 49_000, run: () => glideClick('[data-demo-target="nav-reports"]') },
      { at: 51_200, run: () => moveTo('[data-demo-target="workload-board"]') },
      { at: 53_000, run: () => glideClick('[data-demo-target="nav-baseline"]') },
      { at: 55_200, run: () => moveTo('[data-demo-target="baseline-compare"]') },
      {
        at: 57_000,
        run: () => glideClick('[data-demo-target="nav-workspace"]', () => api().navigate({ screen: "workspace", tab: "result", caseId: "DEMO-001" })),
      },
    ];
    let chain = Promise.resolve();
    for (const beat of beats) {
      chain = chain.then(async () => {
        if (cancel.current) return;
        const elapsed = performance.now() - started;
        if (beat.at > elapsed) await sleep(beat.at - elapsed);
        if (cancel.current) return;
        await beat.run();
      });
    }
    await chain;
    if (!cancel.current) abort(download);
    else if (!download) stopRecorder(false);
  }, [abort]);

  const record = useCallback(async () => {
    if (running.current) return;
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
      await sleep(600);
      if (cancel.current) {
        stopRecorder(false);
        return;
      }
      await runWalk(true);
    } catch {
      recorder.current = null;
    }
  }, [runWalk]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === "Escape" && running.current) {
        event.preventDefault();
        abort(false);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === "KeyD") {
        event.preventDefault();
        if (running.current) abort(false);
        else void runWalk(false);
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        void record();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abort, record, runWalk]);

  return (
    <>
      {children}
      {visible ? (
        <div
          className={`pointer-events-none fixed z-[80] ${pressed ? "scale-[0.92]" : ""}`}
          style={{ left: point.x, top: point.y, transformOrigin: "2px 2px" }}
          aria-hidden
        >
          <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]">
            <path d="M2 1.4 2 13.2 5.4 10.2 7.5 15.2 9.6 14.3 7.6 9.4 12.2 9.2Z" fill="#fff" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          {pressed ? <span className="absolute left-0 top-0 h-3 w-3 animate-ping rounded-full bg-slate-400/50" /> : null}
        </div>
      ) : null}
    </>
  );
}
