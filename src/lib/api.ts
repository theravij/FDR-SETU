import { evaluateCase } from "../engine/evaluateCase";
import type { CaseSnapshot, Evaluation } from "../types";

export type EngineSource = "local" | "api";

const API_TIMEOUT_MS = 4500;

export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/$/, "");
}

function isEvaluation(value: unknown, caseId: string): value is Evaluation {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<Evaluation>;
  return record.function === "evaluate_case" && record.caseId === caseId && typeof record.evaluationHash === "string";
}

/** Uses the Render API when it answers in time. Otherwise the in-browser engine. */
export async function evaluateCaseWithFallback(
  snapshot: CaseSnapshot,
): Promise<{ evaluation: Evaluation; source: EngineSource }> {
  const local = evaluateCase(snapshot);
  const base = apiBaseUrl();
  if (!base) return { evaluation: local, source: "local" };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/api/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snapshot }),
      signal: controller.signal,
    });
    if (!response.ok) return { evaluation: local, source: "local" };
    const body: unknown = await response.json();
    if (!isEvaluation(body, snapshot.caseId) || body.evaluationHash !== local.evaluationHash) {
      return { evaluation: local, source: "local" };
    }
    return { evaluation: local, source: "api" };
  } catch {
    return { evaluation: local, source: "local" };
  } finally {
    window.clearTimeout(timer);
  }
}
