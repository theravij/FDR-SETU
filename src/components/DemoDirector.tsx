import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDemo } from "../state/store";

type CursorKind = "arrow" | "hand" | "ibeam";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function setNativeValue(node: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(node, value);
  node.dispatchEvent(new Event("input", { bubbles: true }));
}

function kindAt(x: number, y: number): CursorKind {
  const node = document.elementFromPoint(x, y);
  if (!(node instanceof Element)) return "arrow";
  if (node.closest("input, textarea")) return "ibeam";
  if (node.closest("button, a, [role='tab'], tr")) return "hand";
  return "arrow";
}

export function DemoDirector({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [kind, setKind] = useState<CursorKind>("arrow");
  const [point, setPoint] = useState({ x: 36, y: 72 });
  const pointRef = useRef(point);
  const cancel = useRef(false);
  const running = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const setCursor = (next: { x: number; y: number }) => {
    pointRef.current = next;
    setPoint(next);
    setKind(kindAt(next.x + 2, next.y + 2));
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
    setFading(false);
    setPressed(false);
    stopRecorder(download);
  }, []);

  const spot = (selector: string) => {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) return null;
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
    const box = node.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    return { node, x: box.left + Math.min(box.width * 0.42, 120), y: box.top + Math.min(box.height * 0.55, 18) };
  };

  const moveTo = async (selector: string) => {
    const target = spot(selector);
    if (!target || cancel.current) return null;
    const from = pointRef.current;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = 36 + Math.random() * 28;
    const c1 = { x: from.x + dx * 0.28 + (-dy / len) * bend, y: from.y + dy * 0.18 + (dx / len) * bend * 0.45 };
    const c2 = { x: from.x + dx * 0.72 + (dy / len) * bend * 0.3, y: from.y + dy * 0.78 + (-dx / len) * bend * 0.22 };
    const duration = Math.min(780, Math.max(480, 420 + len * 0.35));
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (cancel.current) return resolve();
        const t = Math.min(1, (performance.now() - started) / duration);
        const e = ease(t);
        const u = 1 - e;
        setCursor({
          x: u * u * u * from.x + 3 * u * u * e * c1.x + 3 * u * e * e * c2.x + e * e * e * target.x,
          y: u * u * u * from.y + 3 * u * u * e * c1.y + 3 * u * e * e * c2.y + e * e * e * target.y,
        });
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      frame();
    });
    if (cancel.current) return target.node;
    const settle = 4 + Math.random() * 4;
    setCursor({ x: target.x + settle * 0.4, y: target.y + settle * 0.2 });
    await sleep(70);
    setCursor({ x: target.x, y: target.y });
    setCursor({ x: target.x + (Math.random() * 2 - 1), y: target.y + (Math.random() * 2 - 1) });
    return target.node;
  };

  const pressClick = async (node: HTMLElement | null) => {
    if (cancel.current) return;
    await sleep(180 + Math.random() * 80);
    setPressed(true);
    await sleep(90);
    setPressed(false);
    if (cancel.current) return;
    if (node instanceof HTMLElement) node.click();
  };

  const glideClick = async (selector: string, extra?: () => void) => {
    const node = await moveTo(selector);
    await pressClick(node);
    extra?.();
  };

  const humanType = async (selector: string, text: string, options?: { replace?: boolean; correctOnce?: boolean }) => {
    let node = await moveTo(selector);
    if (!node) {
      await sleep(180);
      node = await moveTo(selector);
    }
    if (!(node instanceof HTMLInputElement) || cancel.current) return;
    node.focus();
    await sleep(150);
    await pressClick(node);
    if (options?.replace && node.value) {
      node.select();
      await sleep(160);
      await sleep(90);
      setNativeValue(node, "");
    }
    const correctionAt = options?.correctOnce ? Math.min(14, Math.max(6, Math.floor(text.length / 3))) : -1;
    for (let index = 0; index < text.length; index += 1) {
      if (cancel.current) return;
      if (index === correctionAt) {
        setNativeValue(node, `${node.value}x`);
        await sleep(140);
        setNativeValue(node, node.value.slice(0, -1));
      }
      const char = text[index];
      const previous = text[index - 1];
      setNativeValue(node, `${node.value}${char}`);
      let delay = 32 + Math.random() * 26;
      if (previous && char === previous && /\d/.test(char)) delay = 22 + Math.random() * 13;
      if (/[ /\-.]/.test(char)) delay += 85 + Math.random() * 45;
      await sleep(delay);
    }
    node.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(200);
  };

  const runWalk = useCallback(async (download: boolean) => {
    if (running.current) return;
    running.current = true;
    cancel.current = false;
    setFading(false);
    setVisible(true);
    const api = () => demoRef.current;
    const beats: Array<() => Promise<void> | void> = [
      () => {
        api().reset();
        api().setRole("RO-104");
        api().navigate({ screen: "queue" });
        api().dismissNotice();
      },
      () => humanType('[data-demo-target="queue-search"]', "National Institute"),
      () => glideClick('[data-demo-target="open-DEMO-001"]'),
      async () => {
        await moveTo('[data-demo-target="fdr-certificate"]');
        await sleep(900);
      },
      () => moveTo('[data-demo-target="check-row-CHK-01"]'),
      () => humanType('[data-demo-target="officer-note-input"]', "V1 scan confirms ₹30L against ₹35L declared. Returning for V2.", { correctOnce: true }),
      () => glideClick('[data-demo-target="step1-flag-btn"]'),
      () => glideClick('[data-demo-target="nav-institution"]', () => {
        api().setRole("INST-01");
        api().navigate({ screen: "institution" });
      }),
      () => humanType('[data-demo-target="inst-fdr-input"]', "FDR/PNB/2025/91007", { replace: true }),
      () => humanType('[data-demo-target="inst-amount-input"]', "3500000", { replace: true }),
      () => humanType('[data-demo-target="inst-token-input"]', "PNB-GW-2026-44802"),
      () => humanType('[data-demo-target="inst-note-input"]', "Uploaded supplementary PNB FDR for ₹35,00,000 with gateway confirmation."),
      () => glideClick('[data-demo-target="inst-ocr-scan"]'),
      async () => { await sleep(700); },
      () => glideClick('[data-demo-target="inst-submit-v2"]'),
      () => {
        api().setRole("RO-104");
        api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
      },
      async () => {
        await moveTo('[data-demo-target="check-row-CHK-03"]');
        await sleep(900);
      },
      () => moveTo('[data-demo-target="check-row-CHK-04"]'),
      () => glideClick('[data-demo-target="check-row-CHK-01"]'),
      () => glideClick('[data-demo-target="check-row-CHK-02"]'),
      async () => {
        await glideClick('[data-demo-target="tab-provenance"]');
        await sleep(900);
      },
      () => glideClick('[data-demo-target="tab-clearances"]'),
      () => glideClick('[data-demo-target="tab-audit"]'),
      () => glideClick('[data-demo-target="step4-confirm-btn"]'),
      () => humanType('[data-demo-target="director-note-input"]', "Selective recheck verified on V2. Cleared for record."),
      async () => {
        await glideClick('[data-demo-target="step5-authorise-btn"]');
        await sleep(120);
        await moveTo('[data-demo-target="verification-seal"]');
        await sleep(900);
      },
      () => glideClick('[data-demo-target="nav-reports"]'),
      () => moveTo('[data-demo-target="workload-board"]'),
      () => glideClick('[data-demo-target="nav-baseline"]'),
      () => moveTo('[data-demo-target="baseline-compare"]'),
      () => glideClick('[data-demo-target="nav-workspace"]', () => api().navigate({ screen: "workspace", tab: "result", caseId: "DEMO-001" })),
    ];
    for (const beat of beats) {
      if (cancel.current) break;
      await beat();
      if (cancel.current) break;
      await sleep(80);
    }
    if (!cancel.current) {
      setFading(true);
      await sleep(420);
      abort(download);
    }
  }, [abort]);

  const record = useCallback(async () => {
    if (running.current) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: false,
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions & { preferCurrentTab?: boolean });
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
          className={`pointer-events-none fixed z-[80] transition-opacity duration-300 ${pressed ? "scale-95" : ""} ${fading ? "opacity-0" : "opacity-100"}`}
          style={{ left: point.x, top: point.y, transformOrigin: "4px 2px" }}
          aria-hidden
        >
          <CursorGraphic kind={kind} />
        </div>
      ) : null}
    </>
  );
}

function CursorGraphic({ kind }: { kind: CursorKind }) {
  if (kind === "ibeam") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]">
        <path d="M7 3h6M10 3v14M7 17h6" fill="none" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "hand") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]">
        <path d="M7.2 8.2V4.8a1 1 0 0 1 2 0V8M9.2 7.2V3.8a1 1 0 0 1 2 0V8M11.2 7.6V5.2a1 1 0 0 1 2 0V9.2M13.2 8.4V7a1 1 0 0 1 2 .2c0 2.2-.2 4.2-1.2 5.8-1 1.6-2.4 2.2-4.2 2.2-2.2 0-3.4-1.2-4.2-2.6L6 10.2a1.1 1.1 0 0 1 1.2-2Z" fill="#fff" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]">
      <path d="M3 2.2 3 15.2 6.6 11.8 9 17.4 11.4 16.4 9.1 10.9 14.2 10.6Z" fill="#fff" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
