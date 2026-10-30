import { ageingDays, csvCell, routeLabel } from "../lib/format";
import type { CaseSnapshot, Evaluation, RouteKind } from "../types";
import { evaluateCase } from "./evaluateCase";

export interface RegisterRow {
  caseId: string;
  institutionId: string;
  institutionName: string;
  route: RouteKind;
  routeLabel: string;
  statusLabel: string;
  ageingDays: number;
  assignee: string;
  nextActor: string;
  escalationId: string;
  evaluationHash: string;
  releaseReady: boolean;
  openedOn: string;
  vigilanceHold: boolean;
  evaluation: Evaluation;
}

export function registerRows(cases: CaseSnapshot[]): RegisterRow[] {
  return [...cases]
    .sort((a, b) => a.caseId.localeCompare(b.caseId))
    .map((snapshot) => {
      const evaluation = evaluateCase(snapshot);
      return {
        caseId: snapshot.caseId,
        institutionId: snapshot.institutionId,
        institutionName: snapshot.institutionName,
        route: snapshot.route,
        routeLabel: routeLabel(snapshot.route),
        statusLabel: evaluation.statusLabel,
        ageingDays: ageingDays(snapshot.openedOn),
        assignee: snapshot.assignee,
        nextActor: evaluation.nextActor,
        escalationId: snapshot.escalation?.id ?? "",
        evaluationHash: evaluation.evaluationHash,
        releaseReady: evaluation.releaseReady,
        openedOn: snapshot.openedOn,
        vigilanceHold: snapshot.vigilanceHold,
        evaluation: evaluation,
      };
    });
}

export function registerCsv(cases: CaseSnapshot[]): string {
  const headers = [
    "caseId",
    "institution",
    "route",
    "status",
    "ageingDays",
    "assignee",
    "nextActor",
    "escalationId",
    "evaluationHash",
    "releaseReady",
  ];
  const lines = [headers.join(",")];
  for (const row of registerRows(cases)) {
    lines.push(
      [
        row.caseId,
        row.institutionName,
        row.routeLabel,
        row.statusLabel,
        row.ageingDays,
        row.assignee,
        row.nextActor,
        row.escalationId,
        row.evaluationHash,
        row.releaseReady,
      ]
        .map((value) => csvCell(value))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
