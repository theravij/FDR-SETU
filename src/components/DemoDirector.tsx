import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDemo } from "../state/store";

type CursorKind = "arrow" | "hand" | "ibeam";

const GLIDE_MS = 650;
const HOVER_MS = 200;
const PRESS_MS = 90;
const SELECT_MS = 220;
const CLEAR_MS = 120;
const CHAR_MS = 55;
const PUNCT_MS = 95;
const CORRECT_MS = 320;
const AFTER_TYPE_MS = 200;
/** Anchors from the locked physics model + 400ms breathing buffer between scenes. */
const SCENE_START_MS = [
  0, // 1 Login
  10_860, // 2 Queue
  16_120, // 3 V1 Flag
  24_320, // 4 Institution V2
  36_740, // 5 Selective Recheck
  47_980, // 6 Director Certificate
  55_705, // 7 Workload & Baseline
] as const;

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

function isPunct(char: string): boolean {
  return /[\s/\-.@#]/.test(char);
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
  const t0 = useRef(0);

  const setCursor = (next: { x: number; y: number }) => {
    pointRef.current = next;
    setPoint(next);
    setKind(kindAt(next.x + 2, next.y + 2));
    const node = document.elementFromPoint(next.x, next.y);
    node?.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: next.x,
        clientY: next.y,
        pointerId: 1,
        pointerType: "mouse",
      }),
    );
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

  const waitUntil = async (sceneStartMs: number) => {
    const elapsed = performance.now() - t0.current;
    if (elapsed < sceneStartMs) await sleep(sceneStartMs - elapsed);
  };

  const markScene = (index: number) => {
    if (import.meta.env.DEV) {
      console.debug(`[Walkthrough] Scene ${index} started at ${Math.round(performance.now() - t0.current)}ms`);
    }
  };

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
    const bend = 48;
    const c1 = { x: from.x + dx * 0.28 + (-dy / len) * bend, y: from.y + dy * 0.18 + (dx / len) * bend * 0.45 };
    const c2 = { x: from.x + dx * 0.72 + (dy / len) * bend * 0.3, y: from.y + dy * 0.78 + (-dx / len) * bend * 0.22 };
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        if (cancel.current) return resolve();
        const t = Math.min(1, (performance.now() - started) / GLIDE_MS);
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
    setCursor({ x: target.x, y: target.y });
    return target.node;
  };

  const pressClick = async (node: HTMLElement | null) => {
    if (cancel.current) return;
    await sleep(HOVER_MS);
    setPressed(true);
    await sleep(PRESS_MS);
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
      await sleep(HOVER_MS);
      node = await moveTo(selector);
    }
    if (!(node instanceof HTMLInputElement) || cancel.current) return;
    node.focus();
    await pressClick(node);
    if (options?.replace && node.value) {
      node.select();
      await sleep(SELECT_MS);
      await sleep(CLEAR_MS);
      setNativeValue(node, "");
    }
    const correctionAt = options?.correctOnce ? Math.min(14, Math.max(6, Math.floor(text.length / 3))) : -1;
    for (let index = 0; index < text.length; index += 1) {
      if (cancel.current) return;
      if (index === correctionAt) {
        setNativeValue(node, `${node.value}x`);
        await sleep(CORRECT_MS / 2);
        setNativeValue(node, node.value.slice(0, -1));
        await sleep(CORRECT_MS / 2);
      }
      const char = text[index];
      setNativeValue(node, `${node.value}${char}`);
      await sleep(isPunct(char) ? PUNCT_MS : CHAR_MS);
    }
    node.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(AFTER_TYPE_MS);
  };

  const runWalk = useCallback(async (download: boolean) => {
    if (running.current) return;
    running.current = true;
    cancel.current = false;
    setFading(false);
    setVisible(true);
    t0.current = performance.now();
    const api = () => demoRef.current;

    const scene = async (index: number, work: () => Promise<void>) => {
      if (cancel.current) return;
      await waitUntil(SCENE_START_MS[index] ?? 0);
      if (cancel.current) return;
      markScene(index + 1);
      await work();
    };

    await scene(0, async () => {
      api().reset();
      api().signOut();
      api().dismissNotice();
      await sleep(650);
      setCursor({ x: 280, y: 460 });
      await moveTo("#f");
      await humanType('[data-demo-target="login-id"]', "AICTE-RO-104", { replace: true });
      await humanType('[data-demo-target="login-pw"]', "Setu@2026#Verify", { replace: true });
      await glideClick('[data-demo-target="login-toggle-pw"]');
      await sleep(320);
      await glideClick('[data-demo-target="login-toggle-pw"]');
      await glideClick('[data-demo-target="login-remember"]');
      await glideClick('[data-demo-target="login-submit"]');
      // LoginScreen: Checking… 650ms + transition 450ms.
      await sleep(1100);
    });

    await scene(1, async () => {
      await humanType('[data-demo-target="queue-search"]', "National Institute");
      await glideClick('[data-demo-target="open-DEMO-001"]');
      await moveTo('[data-demo-target="fdr-certificate"]');
      await sleep(1100);
    });

    await scene(2, async () => {
      await moveTo('[data-demo-target="check-row-CHK-01"]');
      await humanType(
        '[data-demo-target="officer-note-input"]',
        "V1 scan confirms ₹30L against ₹35L declared. Returning for V2.",
        { correctOnce: true },
      );
      await glideClick('[data-demo-target="step1-flag-btn"]');
      await sleep(900);
    });

    await scene(3, async () => {
      await glideClick('[data-demo-target="nav-institution"]', () => {
        api().setRole("INST-01");
        api().navigate({ screen: "institution" });
      });
      await sleep(900);
      await humanType('[data-demo-target="inst-fdr-input"]', "FDR/PNB/2025/91007", { replace: true });
      await humanType('[data-demo-target="inst-amount-input"]', "3500000", { replace: true });
      await humanType('[data-demo-target="inst-token-input"]', "PNB-GW-2026-44802");
      await glideClick('[data-demo-target="inst-ocr-scan"]');
      await sleep(650);
      await glideClick('[data-demo-target="inst-submit-v2"]');
      await sleep(1000);
    });

    await scene(4, async () => {
      api().setRole("RO-104");
      api().navigate({ screen: "workspace", tab: "recheck", caseId: "DEMO-001" });
      await moveTo('[data-demo-target="check-row-CHK-03"]');
      await sleep(1100);
      await moveTo('[data-demo-target="check-row-CHK-04"]');
      await glideClick('[data-demo-target="check-row-CHK-01"]');
      await glideClick('[data-demo-target="check-row-CHK-02"]');
      await glideClick('[data-demo-target="tab-provenance"]');
      await sleep(1000);
      await glideClick('[data-demo-target="tab-clearances"]');
      await sleep(900);
      await glideClick('[data-demo-target="tab-audit"]');
      await sleep(900);
      await glideClick('[data-demo-target="step4-confirm-btn"]');
    });

    await scene(5, async () => {
      await humanType('[data-demo-target="director-note-input"]', "Selective recheck verified on V2. Cleared for record.");
      await glideClick('[data-demo-target="step5-authorise-btn"]');
      await sleep(120);
      await moveTo('[data-demo-target="verification-seal"]');
      await sleep(1200);
    });

    await scene(6, async () => {
      await glideClick('[data-demo-target="nav-reports"]');
      await moveTo('[data-demo-target="workload-board"]');
      await sleep(900);
      await glideClick('[data-demo-target="nav-baseline"]');
      await moveTo('[data-demo-target="baseline-compare"]');
      await sleep(1000);
      await glideClick('[data-demo-target="nav-workspace"]', () => api().navigate({ screen: "workspace", tab: "result", caseId: "DEMO-001" }));
      await sleep(900);
    });

    if (!cancel.current) {
      setFading(true);
      await sleep(420);
      if (import.meta.env.DEV) {
        console.debug(`[Walkthrough] finished at ${Math.round(performance.now() - t0.current)}ms`);
      }
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

