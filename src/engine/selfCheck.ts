import { seedCases, buildDemo001 } from "../data/cases";

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual: unknown, expected: unknown): void {
  if (actual === expected) throw new Error(`Expected values to differ: ${JSON.stringify(actual)}`);
}

function assertMatch(actual: string, pattern: RegExp): void {
  if (!pattern.test(actual)) throw new Error(`Expected ${JSON.stringify(actual)} to match ${pattern}`);
}

function assertOk(value: unknown): void {
  if (!value) throw new Error("Expected a truthy value");
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`Expected ${right} but received ${left}`);
}
import { verifyAuditChain } from "../lib/audit";
import { sha256 } from "../lib/sha256";
import { SUPERSEDED_V1_BADGE, type Step } from "../types";
import {
  applyCosmeticRescan,
  applyEscalation,
  applyManualLetter,
  applyRaceToken,
  decideRelease,
} from "./actions";
import { evaluateCase } from "./evaluateCase";

function byId(evaluation: ReturnType<typeof evaluateCase>) {
  return Object.fromEntries(evaluation.checks.map((check) => [check.id, check]));
}

assertEqual(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
assertEqual(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

const step1 = byId(evaluateCase(buildDemo001(1)));
assertEqual(step1["CHK-01"].status, "DISCREPANCY");
assertMatch(step1["CHK-01"].reason, /₹35,00,000/);
assertMatch(step1["CHK-01"].reason, /₹30,00,000/);
assertEqual(step1["CHK-02"].status, "PENDING");
assertEqual(step1["CHK-03"].status, "CONFIRMED");
assertEqual(step1["CHK-04"].status, "CONFIRMED");

const evaluation2 = evaluateCase(buildDemo001(2));
const step2 = byId(evaluation2);
assertEqual(step2["CHK-01"].status, "CONFIRMED");
assertEqual(step2["CHK-02"].status, "CONFIRMED");
assertEqual(step2["CHK-02"].basis, "EV-BNK-101");
assertEqual(step2["CHK-02"].evidence[0]?.badge, "COVERS CURRENT VERSION");
assertEqual(evaluation2.releaseReady, true);

const evaluation3 = evaluateCase(buildDemo001(3));
const step3 = byId(evaluation3);
assertEqual(step3["CHK-01"].status, "CONFIRMED");
assertEqual(step3["CHK-02"].status, "RECHECK_REQUIRED");
assertEqual(step3["CHK-03"].status, "PRESERVED_CONFIRMED");
assertEqual(step3["CHK-04"].status, "PRESERVED_CONFIRMED");
assertEqual(step3["CHK-02"].evidence[0]?.id, "EV-BNK-101");
assertEqual(step3["CHK-02"].evidence[0]?.badge, SUPERSEDED_V1_BADGE);
assertDeepEqual(evaluation3.selectiveRecheck.invalidated, ["CHK-02"]);
assertDeepEqual(evaluation3.selectiveRecheck.preserved, ["CHK-03", "CHK-04"]);
assertDeepEqual(evaluation3.selectiveRecheck.recomputed, ["CHK-01"]);
assertEqual(evaluation3.releaseReady, false);

const evaluation4 = evaluateCase(buildDemo001(4));
const step4 = byId(evaluation4);
assertEqual(step4["CHK-02"].status, "CONFIRMED");
assertEqual(step4["CHK-02"].basis, "EV-BNK-202");
assertEqual(step4["CHK-03"].status, "PRESERVED_CONFIRMED");
assertEqual(step4["CHK-04"].status, "PRESERVED_CONFIRMED");
assertOk(step4["CHK-02"].evidence.some((item) => item.id === "EV-BNK-101" && item.badge === SUPERSEDED_V1_BADGE));
assertEqual(evaluation4.releaseReady, true);

const evaluation5 = evaluateCase(buildDemo001(5));
assertEqual(evaluation5.releaseReady, true);
assertEqual(evaluation5.releaseAuthorised, false);
assertEqual(decideRelease(buildDemo001(5), "RO-104", evaluation5.evaluationHash).http, 403);
assertEqual(decideRelease(buildDemo001(5), "DIR-01", evaluation5.evaluationHash).http, 200);
assertEqual(decideRelease(buildDemo001(1), "DIR-01", evaluateCase(buildDemo001(1)).evaluationHash).http, 409);

const canonical = buildDemo001(3);
const rescanned = applyCosmeticRescan(canonical, 1, "RO-104");
const before = evaluateCase(canonical);
const after = evaluateCase(rescanned);
assertNotEqual(before.fileSha256, after.fileSha256);
assertEqual(before.substantiveHash, after.substantiveHash);
assertEqual(before.evaluationHash, after.evaluationHash);
assertDeepEqual(
  before.checks.map((check) => check.status),
  after.checks.map((check) => check.status),
);

const frozen = evaluateCase(canonical).evaluationHash;
const raced = applyRaceToken(
  canonical,
  "Concurrent edit: INST-01 attached a revised covering letter after the officer froze the hash.",
  "INST-01",
);
assertEqual(decideRelease(raced, "DIR-01", frozen).http, 412);

const letter = applyManualLetter(buildDemo001(3), "RO-104");
assertEqual(letter.created, true);
const manual = byId(evaluateCase(letter.snapshot));
assertEqual(manual["CHK-02"].status, "CONFIRMED");
assertMatch(manual["CHK-02"].reason, /not an API confirmation/);
assertOk(manual["CHK-02"].evidence.some((item) => item.badge === SUPERSEDED_V1_BADGE));
assertEqual(manual["CHK-03"].status, "PRESERVED_CONFIRMED");

const seeded = seedCases();
const first = applyEscalation(seeded["DEMO-005"], "RO-104");
const second = applyEscalation(first.snapshot, "DIR-01");
assertEqual(first.created, true);
assertEqual(first.id, "ESC-DEMO-005");
assertEqual(second.created, false);
assertEqual(second.id, first.id);
assertEqual(second.snapshot.audit.length, first.snapshot.audit.length);

for (const step of [1, 2, 3, 4, 5] as Step[]) {
  assertEqual(verifyAuditChain(buildDemo001(step).audit), true);
}
for (const snapshot of Object.values(seedCases())) {
  assertEqual(verifyAuditChain(snapshot.audit), true);
}

assertEqual(evaluateCase(buildDemo001(3)).evaluationHash, evaluateCase(buildDemo001(3)).evaluationHash);
assertEqual(byId(evaluateCase(seeded["DEMO-003"]))["CHK-02"].status, "CONFIRMED");
assertEqual(evaluateCase(seeded["DEMO-002"]).releaseAuthorised, true);
assertEqual(evaluateCase(seeded["DEMO-004"]).releaseReady, false);
assertEqual(byId(evaluateCase(seeded["DEMO-005"]))["CHK-01"].status, "DISCREPANCY");
assertEqual(evaluation3.ruleVersion, "DEMO-POLICY-6.46");
assertEqual(evaluation3.evaluatedAt, "2026-10-30");
assertEqual(evaluation3.financialRelease, "NOT_EXECUTED_HERE");
assertEqual(evaluateCase(seeded["DEMO-005"]).actions[0]?.id, "MAT-01");
assertEqual(evaluateCase(buildDemo001(3)).actions.length, 0);

console.log("self-check ok");
