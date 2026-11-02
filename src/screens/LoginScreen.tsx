import { useEffect, useRef } from "react";
import type { RoleId } from "../types";
import { LOGIN_MARKUP } from "./loginMarkup";
import "./login.css";

const NS = "http://www.w3.org/2000/svg";

function roleFor(account: string): RoleId {
  const value = account.toUpperCase();
  if (value.includes("DIR")) return "DIR-01";
  if (value.includes("VIG")) return "VIG-22";
  if (value.includes("INST")) return "INST-01";
  return "RO-104";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function LoginScreen({ onSignedIn }: { onSignedIn: (role: RoleId) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const $ = (id: string) => root.querySelector(`#${CSS.escape(id)}`);

    const chips = () => {
      root.querySelectorAll("#scene .chip").forEach((group) => {
        group.querySelectorAll(".pill,.dot").forEach((node) => node.remove());
        const label = group.querySelector(".lbl");
        if (!(label instanceof SVGGraphicsElement)) return;
        let box: DOMRect;
        try {
          box = label.getBBox();
        } catch {
          return;
        }
        if (!box.width) return;
        const height = box.height + 9;
        const pill = document.createElementNS(NS, "rect");
        pill.setAttribute("class", "pill");
        pill.setAttribute("x", String(box.x - 21));
        pill.setAttribute("y", String(box.y - 4.5));
        pill.setAttribute("width", String(box.width + 33));
        pill.setAttribute("height", String(height));
        pill.setAttribute("rx", String(height / 2));
        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("class", "dot");
        dot.setAttribute("cx", String(box.x - 10));
        dot.setAttribute("cy", String(box.y + box.height / 2));
        dot.setAttribute("r", "3.2");
        dot.setAttribute("fill", group instanceof HTMLElement || group instanceof SVGElement ? group.dataset.dot ?? "" : "");
        group.insertBefore(pill, label);
        group.insertBefore(dot, label);
      });
    };

    const packets = () => {
      const host = $("packets");
      if (!(host instanceof SVGElement)) return;
      host.replaceChildren();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const routes: Array<[string, string, number, number]> = [
        ["p-bank", "#e3ecff", 3.8, 0],
        ["p-fd", "#ffd37a", 3.4, 1.1],
        ["p-roi", "#4df0c0", 3.6, 2],
        ["p-sec", "#e3ecff", 4.2, 2.9],
      ];
      routes.forEach(([id, color, duration, offset]) => {
        ([[3.8, 0], [2.7, 0.13], [1.8, 0.26]] as Array<[number, number]>).forEach(([radius, lag], index) => {
          const comet = document.createElementNS(NS, "circle");
          comet.setAttribute("r", String(radius));
          comet.setAttribute("fill", color);
          comet.setAttribute("opacity", "0");
          if (index === 0) comet.setAttribute("filter", "url(#gl)");
          const begin = `${lag - offset}s`;
          const motion = document.createElementNS(NS, "animateMotion");
          motion.setAttribute("dur", `${duration}s`);
          motion.setAttribute("begin", begin);
          motion.setAttribute("repeatCount", "indefinite");
          motion.setAttribute("calcMode", "spline");
          motion.setAttribute("keyTimes", "0;1");
          motion.setAttribute("keySplines", ".4 0 .6 1");
          const path = document.createElementNS(NS, "mpath");
          path.setAttribute("href", `#${id}`);
          path.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${id}`);
          motion.appendChild(path);
          const fade = document.createElementNS(NS, "animate");
          fade.setAttribute("attributeName", "opacity");
          fade.setAttribute("values", "0;1;1;0");
          fade.setAttribute("keyTimes", "0;.12;.86;1");
          fade.setAttribute("dur", `${duration}s`);
          fade.setAttribute("begin", begin);
          fade.setAttribute("repeatCount", "indefinite");
          comet.append(motion, fade);
          host.appendChild(comet);
        });
      });
    };

    const scene = $("scene");
    const desktop = window.matchMedia("(max-width:860px)");
    const phone = window.matchMedia("(max-width:600px)");
    const fit = () => {
      if (!(scene instanceof SVGSVGElement)) return;
      let viewBox = "0 0 1600 900";
      let ratio = "xMidYMid slice";
      let size = 12.5;
      if (desktop.matches) {
        ratio = "xMidYMid meet";
        viewBox = phone.matches ? "108 160 864 582" : "108 243 864 497";
        const scale = scene.getBoundingClientRect().width / 864;
        if (phone.matches && scale) size = Math.min(17, Math.max(12.5, 10.5 / scale));
      }
      scene.setAttribute("viewBox", viewBox);
      scene.setAttribute("preserveAspectRatio", ratio);
      scene.style.setProperty("--fs", `${size}px`);
      chips();
    };

    root.querySelectorAll("[data-brand]").forEach((node) => {
      node.textContent = "FDR-SETU";
    });

    const toggle = $("tg");
    const password = $("pw");
    const onToggle = () => {
      if (!(password instanceof HTMLInputElement) || !(toggle instanceof HTMLButtonElement)) return;
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", String(show));
    };

    const setErr = (key: string, message: string) => {
      const field = $(`f-${key}`);
      const input = field?.querySelector("input");
      const error = $(`e-${key}`);
      field?.classList.toggle("bad", Boolean(message));
      if (input instanceof HTMLInputElement) input.setAttribute("aria-invalid", String(Boolean(message)));
      if (error) error.textContent = message;
      return !message;
    };

    const form = $("f");
    const onSubmit = (event: Event) => {
      event.preventDefault();
      if (!(password instanceof HTMLInputElement)) return;
      const accountInput = $("id");
      const status = $("st");
      const button = $("go");
      if (!(accountInput instanceof HTMLInputElement) || !(status instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;
      const account = accountInput.value.trim();
      status.className = "status";
      status.textContent = "";
      const accountOk = setErr("id", account ? "" : "Enter your account number.");
      const passwordOk = setErr("pw", password.value ? "" : "Enter your password.");
      if (!accountOk || !passwordOk) {
        (accountOk ? password : accountInput).focus();
        return;
      }
      button.disabled = true;
      button.textContent = "Checking…";
      const role = roleFor(account);
      void (async () => {
        await wait(650);
        if (cancelled) return;
        status.textContent = "Signed in. Opening the deposit center…";
        await wait(450);
        if (cancelled) return;
        onSignedInRef.current(role);
      })();
    };

    const onInput = (event: Event) => {
      const target = event.currentTarget;
      if (target instanceof HTMLInputElement && (target.id === "id" || target.id === "pw")) setErr(target.id, "");
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onPointer = (event: Event) => {
      if (!(event instanceof PointerEvent) || !(form instanceof HTMLElement)) return;
      const box = form.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      form.style.setProperty("--px", (x * 2 - 1).toFixed(3));
      form.style.setProperty("--py", (y * 2 - 1).toFixed(3));
      form.style.setProperty("--mx", (x * 100).toFixed(1));
      form.style.setProperty("--my", (y * 100).toFixed(1));
    };
    const onLeave = () => {
      if (!(form instanceof HTMLElement)) return;
      form.style.setProperty("--px", "0");
      form.style.setProperty("--py", "0");
      form.style.setProperty("--mx", "50");
      form.style.setProperty("--my", "28");
    };

    const forgot = root.querySelector('a[href="#forgot"]');
    const onForgot = (event: Event) => event.preventDefault();

    packets();
    fit();
    desktop.addEventListener("change", fit);
    phone.addEventListener("change", fit);
    window.addEventListener("resize", fit);
    if (document.fonts) void document.fonts.ready.then(() => { if (!cancelled) chips(); });
    toggle?.addEventListener("click", onToggle);
    form?.addEventListener("submit", onSubmit);
    $("id")?.addEventListener("input", onInput);
    password?.addEventListener("input", onInput);
    forgot?.addEventListener("click", onForgot);
    if (!reduced && form) {
      form.addEventListener("pointermove", onPointer);
      form.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelled = true;
      desktop.removeEventListener("change", fit);
      phone.removeEventListener("change", fit);
      window.removeEventListener("resize", fit);
      toggle?.removeEventListener("click", onToggle);
      form?.removeEventListener("submit", onSubmit);
      $("id")?.removeEventListener("input", onInput);
      password?.removeEventListener("input", onInput);
      forgot?.removeEventListener("click", onForgot);
      form?.removeEventListener("pointermove", onPointer);
      form?.removeEventListener("pointerleave", onLeave);
      const host = $("packets");
      if (host) host.replaceChildren();
    };
  }, []);

  return <div ref={rootRef} className="fdr-login-stage" dangerouslySetInnerHTML={{ __html: LOGIN_MARKUP }} />;
}
