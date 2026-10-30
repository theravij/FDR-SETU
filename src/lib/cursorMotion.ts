export interface Point {
  x: number;
  y: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function travelMs(from: Point, to: Point): number {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return Math.min(220, Math.max(80, distance * 0.2));
  return Math.min(1100, Math.max(480, distance * 0.95));
}

export function centerOf(el: Element): Point {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

export function waitForElement(selector: string, timeoutMs = 4200): Promise<HTMLElement | null> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const node = document.querySelector(selector);
      if (node instanceof HTMLElement) {
        const box = node.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) {
          window.clearInterval(timer);
          resolve(node);
          return;
        }
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    };
    const timer = window.setInterval(tick, 50);
    tick();
  });
}

export function animatePoint(
  from: Point,
  to: Point,
  durationMs: number,
  apply: (point: Point) => void,
  cancelled: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    let done = false;
    const finish = (point: Point) => {
      if (done) return;
      done = true;
      window.clearInterval(timer);
      apply(point);
      resolve();
    };
    const tick = () => {
      if (cancelled()) {
        finish(to);
        return;
      }
      const t = durationMs <= 0 ? 1 : Math.min(1, (performance.now() - started) / durationMs);
      const e = easeInOutCubic(t);
      const point = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
      };
      apply(point);
      if (t >= 1) finish(to);
    };
    const timer = window.setInterval(tick, 16);
    tick();
    window.setTimeout(() => finish(to), Math.max(durationMs, 0) + 80);
  });
}

export function pressElement(el: HTMLElement): void {
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  el.click();
  el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "mouse" }));
}
