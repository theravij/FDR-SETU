import { useEffect, useRef } from "react";
import type { RoleId, ScreenId } from "../types";
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

export function LoginScreen({
  onSignedIn,
}: {
  onSignedIn: (role: RoleId, screen?: ScreenId) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let locking = false;
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
    let revealed = false;
    const paintSecurity = () => {
      if (!(password instanceof HTMLInputElement)) return;
      const mask = password.value.length > 0 && !revealed;
      password.style.setProperty("-webkit-text-security", mask ? "disc" : "none");
    };
    const onToggle = () => {
      if (!(password instanceof HTMLInputElement) || !(toggle instanceof HTMLButtonElement)) return;
      revealed = !revealed;
      toggle.textContent = revealed ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", String(revealed));
      paintSecurity();
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

    const clearFieldErrors = () => {
      setErr("id", "");
      setErr("pw", "");
    };

    const setBusy = (busy: boolean) => {
      locking = busy;
      const go = $("go");
      const guest = $("guest-go");
      if (go instanceof HTMLButtonElement) {
        go.disabled = busy;
        if (!busy) go.textContent = "Login";
      }
      if (guest instanceof HTMLButtonElement) guest.disabled = busy;
      root.querySelectorAll(".role-chip").forEach((node) => {
        if (node instanceof HTMLButtonElement) node.disabled = busy;
      });
    };

    const finishSignIn = async (role: RoleId, screen: ScreenId | undefined, message: string) => {
      if (locking || cancelled) return;
      setBusy(true);
      clearFieldErrors();
      const status = $("st");
      if (status instanceof HTMLElement) {
        status.className = "status";
        status.textContent = message;
      }
      await wait(350);
      if (cancelled) return;
      onSignedInRef.current(role, screen);
    };

    const form = $("f");
    const onSubmit = (event?: Event) => {
      event?.preventDefault();
      if (locking) return;
      if (!(password instanceof HTMLInputElement)) return;
      const accountInput = $("id");
      const status = $("st");
      const button = $("go");
      if (!(accountInput instanceof HTMLInputElement) || !(status instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;
      const account = accountInput.value.trim();
      accountInput.value = account;
      status.className = "status";
      status.textContent = "";
      const accountOk = setErr("id", account ? "" : "Enter your account number.");
      const passwordOk = setErr("pw", password.value ? "" : "Enter your password.");
      if (!accountOk || !passwordOk) {
        (accountOk ? password : accountInput).focus();
        return;
      }
      button.textContent = "Checking…";
      void finishSignIn(roleFor(account), "queue", "Signed in. Opening the deposit center…");
    };

    const onGuest = (event?: Event) => {
      event?.preventDefault();
      void finishSignIn("RO-104", "queue", "Guest evaluator session active. Opening portal…");
    };

    const onRoleChip = (event: Event) => {
      event.preventDefault();
      const target = event.currentTarget;
      if (!(target instanceof HTMLButtonElement)) return;
      const role = (target.dataset.role ?? "RO-104") as RoleId;
      const screen = (target.dataset.screen ?? "queue") as ScreenId;
      void finishSignIn(role, screen, `Signing in as ${role}…`);
    };

    const onInput = (event: Event) => {
      const target = event.currentTarget;
      if (target instanceof HTMLInputElement && (target.id === "id" || target.id === "pw")) setErr(target.id, "");
      if (target === password) paintSecurity();
    };
    const onEnter = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== "Enter") return;
      event.preventDefault();
      onSubmit(event);
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
    const onForgot = (event: Event) => {
      event.preventDefault();
      const accountInput = $("id");
      const status = $("st");
      if (accountInput instanceof HTMLInputElement) accountInput.value = "AICTE-RO-104";
      if (password instanceof HTMLInputElement) {
        password.value = "Setu@2026#Verify";
        paintSecurity();
      }
      clearFieldErrors();
      if (status instanceof HTMLElement) {
        status.className = "status";
        status.textContent = "Demo credentials populated — click Login or Continue as Guest.";
      }
    };

    const roleButtons = Array.from(root.querySelectorAll(".role-chip"));

    packets();
    fit();
    desktop.addEventListener("change", fit);
    phone.addEventListener("change", fit);
    window.addEventListener("resize", fit);
    if (document.fonts) void document.fonts.ready.then(() => { if (!cancelled) chips(); });
    paintSecurity();
    toggle?.addEventListener("click", onToggle);
    $("go")?.addEventListener("click", onSubmit);
    $("guest-go")?.addEventListener("click", onGuest);
    roleButtons.forEach((node) => node.addEventListener("click", onRoleChip));
    $("id")?.addEventListener("input", onInput);
    $("id")?.addEventListener("keydown", onEnter);
    password?.addEventListener("input", onInput);
    password?.addEventListener("keydown", onEnter);
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
      $("go")?.removeEventListener("click", onSubmit);
      $("guest-go")?.removeEventListener("click", onGuest);
      roleButtons.forEach((node) => node.removeEventListener("click", onRoleChip));
      $("id")?.removeEventListener("input", onInput);
      $("id")?.removeEventListener("keydown", onEnter);
      password?.removeEventListener("input", onInput);
      password?.removeEventListener("keydown", onEnter);
      forgot?.removeEventListener("click", onForgot);
      form?.removeEventListener("pointermove", onPointer);
      form?.removeEventListener("pointerleave", onLeave);
      const host = $("packets");
      if (host) host.replaceChildren();
    };
  }, []);

  return <div ref={rootRef} className="fdr-login-stage" dangerouslySetInnerHTML={{ __html: LOGIN_MARKUP }} />;
}
