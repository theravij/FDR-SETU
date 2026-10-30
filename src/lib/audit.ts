import { canonical } from "./canonical";
import { sha256 } from "./sha256";
import type { AuditEvent, CaseSnapshot } from "../types";

export function sealAudit(
  events: Array<{ at: string; actor: string; action: string; detail: string }>,
): AuditEvent[] {
  const sealed: AuditEvent[] = [];
  let prevHash = "GENESIS";
  for (const event of events) {
    const body = { at: event.at, actor: event.actor, action: event.action, detail: event.detail, prevHash };
    const hash = sha256(canonical(body));
    sealed.push({ ...body, hash });
    prevHash = hash;
  }
  return sealed;
}

export function appendAudit(
  snapshot: CaseSnapshot,
  event: { at?: string; actor: string; action: string; detail: string },
): CaseSnapshot {
  const prevHash = snapshot.audit.length > 0 ? snapshot.audit[snapshot.audit.length - 1].hash : "GENESIS";
  const at = event.at ?? `2026-10-30T11:${String(snapshot.audit.length).padStart(2, "0")}:00+05:30`;
  const body = { at, actor: event.actor, action: event.action, detail: event.detail, prevHash };
  const hash = sha256(canonical(body));
  return { ...snapshot, audit: [...snapshot.audit, { ...body, hash }] };
}

export function verifyAuditChain(events: AuditEvent[]): boolean {
  let prevHash = "GENESIS";
  for (const event of events) {
    if (event.prevHash !== prevHash) return false;
    const body = {
      at: event.at,
      actor: event.actor,
      action: event.action,
      detail: event.detail,
      prevHash,
    };
    if (sha256(canonical(body)) !== event.hash) return false;
    prevHash = event.hash;
  }
  return true;
}
