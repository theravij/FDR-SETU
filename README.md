# FDR Setu (SIH26265)

Working prototype for AICTE institutional security-deposit cases. The demo policy keeps the NOC route (FDR/RPGF) separate from the sanction-order route (RTGS). A replacement instrument reopens only the checks whose inputs changed. The officer workspace runs in the browser. An optional API on Render serves the same `evaluateCase` result. If that API is unset or still waking, the page keeps the in-browser engine. There is no live bank connection, and a recorded decision does not issue an NOC or move funds.

`evaluateCase(snapshot, rules, now)` in `src/engine/evaluateCase.ts` is pure: the same inputs always yield the same result.

The compliance banner is always visible: **PROPOSAL DRAFT (SIH26265) — SYNTHETIC WORKFLOW SIMULATION ONLY**.

## Run locally

```bash
npm install
npm run check
npm run dev
```

Open [http://localhost:5173/?screen=workspace&tab=recheck&step=3](http://localhost:5173/?screen=workspace&tab=recheck&step=3).

`npm run check` asserts the five DEMO-001 steps, the superseded-evidence badge, the cosmetic rescan, the 403, the manual letter, the idempotent escalation, and the stale-hash block.

## What a judge should click

1. Press **Play** on the 30-second Pitch Director. It advances every 6 seconds and opens the matching tab and step.
2. Stay on step 3 of the Selective Recheck Matrix. CHK-02 is **RECHECK REQUIRED**. CHK-03 and CHK-04 stay **PRESERVED**. EV-BNK-101 is badged **HISTORICAL / SUPERSEDED (Covered V1 Only)**.
3. Switch the role among RO-104, DIR-01, VIG-22 and INST-01, then run the edge-case tests.
4. Use **Export JSON** and **Export CSV**. **Reset Demo State** restores the canonical seed.

Useful links:

- `?screen=workspace&tab=recheck&step=1`
- `?screen=workspace&tab=recheck&step=3`
- `?screen=workspace&tab=result&step=5&role=DIR-01`
- `?screen=queue`
- `?screen=baseline`

## Deploy

The Vite app deploys to Vercel. The API deploys to Render from `render.yaml` and listens on `0.0.0.0:$PORT`.

1. Push `main`. Vercel rebuilds the same production URL. Render rebuilds `fdr-setu-api` when the Blueprint is connected.
2. Vercel build command: `npm run build`. Output directory: `dist`.
3. After Render shows a live URL, set the frontend variable and redeploy:

```bash
npx vercel env add VITE_API_BASE_URL production
npx vercel --prod
```

Paste the Render origin only, for example `https://fdr-setu-api.onrender.com`. Leave `VITE_API_BASE_URL` empty and the site still runs on the in-browser engine.

Local API: `npm start`, then set `VITE_API_BASE_URL=http://127.0.0.1:3001` in `.env`. Copy `.env.example`.

Open the deployment and append `?screen=workspace&tab=recheck&step=3`.
