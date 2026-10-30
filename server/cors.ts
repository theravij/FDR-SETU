import type { IncomingMessage, ServerResponse } from "node:http";

const PRODUCTION_ORIGIN = "https://fdr-setu.vercel.app";

export function originAllowed(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local) return url.protocol === "http:" || url.protocol === "https:";
  if (url.protocol !== "https:") return false;
  return url.origin === PRODUCTION_ORIGIN || url.hostname.endsWith(".vercel.app");
}

export function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (typeof origin === "string" && originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}
