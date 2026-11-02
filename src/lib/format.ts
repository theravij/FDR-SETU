import type { CheckStatus, RouteKind } from "../types";
import { SIM_AS_OF } from "../types";

export function formatInr(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(Math.round(amount)).toString();
  if (digits.length <= 3) return `${sign}₹${digits}`;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const groups: string[] = [];
  let rest = head;
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${sign}₹${groups.join(",")},${tail}`;
}

export function shortHash(hash: string, size = 12): string {
  if (hash.length <= size) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-4)}`;
}

export function routeLabel(route: RouteKind): string {
  switch (route) {
    case "NOC_FDR":
      return "FDR · NOC";
    case "NOC_RPGF":
      return "RPGF · NOC";
    case "SANCTION_RTGS":
      return "RTGS · Sanction";
  }
}

export function statusText(status: CheckStatus): string {
  switch (status) {
    case "PRESERVED_CONFIRMED":
      return "PRESERVED";
    case "RECHECK_REQUIRED":
      return "RECHECK REQUIRED";
    case "DISCREPANCY":
      return "DISCREPANCY";
    case "CONFIRMED":
      return "CONFIRMED";
    case "PENDING":
      return "PENDING";
    case "BLOCKED":
      return "BLOCKED";
  }
}

export function ageingDays(openedOn: string, asOf: string = SIM_AS_OF): number {
  const opened = Date.parse(`${openedOn}T00:00:00Z`);
  const clock = Date.parse(`${asOf}T00:00:00Z`);
  return Math.round((clock - opened) / 86_400_000);
}

export function csvCell(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
