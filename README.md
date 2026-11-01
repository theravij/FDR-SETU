# FDR Setu (SIH26265)

Officer workspace for AICTE institutional security-deposit cases. The policy keeps the NOC route (FDR/RPGF) separate from the sanction-order route (RTGS). A replacement instrument reopens only the checks whose inputs changed. The workspace runs in the browser. An optional API on Render serves the same `evaluateCase` result. If that API is unset or still waking, the page keeps the in-browser engine. There is no live bank connection, and a recorded decision does not issue an NOC or move funds.

`evaluateCase(snapshot, rules, now)` in `src/engine/evaluateCase.ts` is pure: the same inputs always yield the same result.

## Run locally

```bash
npm install
npm run check
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

`npm run check` asserts the five DEMO-001 steps, the superseded-evidence badge, the cosmetic rescan, the 403, the manual letter, the idempotent escalation, and the stale-hash block.

## Screens

1. **Case Workspace** — DEMO-001 header, five-step lifecycle, amount and recheck metrics, the instrument card, and five inspection tabs: Selective Recheck, Provenance Diff, Clearances, Audit Trail, Verification Summary.
2. **Officer Queue** — search, status filters, ageing, and Open workspace. DEMO-004 hold is placed or lifted as VIG-22.
3. **Institution Portal** — INST-01 sees the V1 amount gap and submits the corrected instrument, which opens the selective recheck.
4. **Workload & Ageing** — open-case ageing and due actions as of 2026-10-30.
5. **Baseline Comparison** — full recheck versus selective recheck on canonical DEMO-001 at V2 upload.

Roles are RO-104, DIR-01, VIG-22, and INST-01. Export JSON and Export CSV sit in the sidebar. Reset workspace restores the canonical seed.

DEMO-001 steps:

1. V1 on file — declared amount and the scan do not match.
2. V1 confirmed by the review officer.
3. V2 uploaded — CHK-02 reopens; CHK-03 and CHK-04 stay preserved. EV-BNK-101 is historical.
4. V2 confirmed with fresh bank evidence.
5. Ready for a DIR-01 decision. `financialRelease` stays `NOT_EXECUTED_HERE`.

## Deploy

The Vite app deploys to Vercel from the project root (`npm run build`, output `dist`). The API deploys to Render from `render.yaml` as `fdr-setu-backend` and listens on `0.0.0.0:$PORT`. `GET /health` returns 200. Leave `VITE_API_BASE_URL` empty and the site still runs on the in-browser engine.
