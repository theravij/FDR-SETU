# FDR Setu — 45-second demo voiceover

Clock: Alt+D / footer play icon. Audio `0:00` is the same instant the cursor starts. Speak at about **145 words per minute**. Read numbers as words. Treat `...` and `—` as breath marks, not as spoken punctuation.

Drop the exported MP3 at `public/demo-voiceover.mp3`. If that file is missing, the cursor still runs and does not log errors.

---

## Version A — paste this into ElevenLabs (one take)

This is FDR Setu, case DEMO-001, National Institute of Technical Studies. Review officer RO-104 opens the file... and the amounts do not match — the form says thirty-five lakh, the scan says thirty. That is a five-lakh gap, so they click Confirm V1 Discrepancy. The institute, INST-01, puts up the corrected FDR — PNB two zero two five, nine one zero zero seven, thirty-five lakh — and clicks Submit V2 and Run Smart Recheck. Watch the engine. Principal amount and bank confirmation re-verify on V2, because those fields changed. Institution identity and the AICTE lien stay preserved from V1. Two checks skipped. Director DIR-01 clicks Authorise Release... and the badge goes to Released, Verified. Payload, JSON, and CSV are sitting there if you need the record.

**ElevenLabs:** English (India) or similar, ~145 wpm, slight pause on em dashes. Export MP3 → `public/demo-voiceover.mp3`.

---

## Version B — second-by-second cue sheet

| Timestamp | What the cursor clicks | Exact line spoken |
|---|---|---|
| `[00:00 – 00:05]` | Reset to Step 1 (role RO-104), then **Officer Queue** | This is FDR Setu, case DEMO-001, National Institute of Technical Studies. |
| `[00:05 – 00:12]` | **Open DEMO-001**; sit on V1 declared ₹35,00,000 vs scanned ₹30,00,000 | Review officer RO-104 opens the file... and the amounts do not match — the form says thirty-five lakh, the scan says thirty. |
| `[00:12 – 00:16]` | **Confirm V1 Discrepancy** → Step 2 | That is a five-lakh gap, so they click Confirm V1 Discrepancy. |
| `[00:16 – 00:24]` | **INST-01**, then **Submit V2 & Run Smart Recheck** (`FDR/PNB/2025/91007` · ₹35,00,000) | The institute, INST-01, puts up the corrected FDR — PNB two zero two five, nine one zero zero seven, thirty-five lakh — and clicks Submit V2 and Run Smart Recheck. |
| `[00:24 – 00:31]` | Principal Amount row, then Bank Confirmation row (`RE-VERIFIED ON V2`) | Watch the engine. Principal amount and bank confirmation re-verify on V2, because those fields changed. |
| `[00:31 – 00:37]` | Institution Identity row, then AICTE Lien row (`PRESERVED FROM V1`) | Institution identity and the AICTE lien stay preserved from V1. Two checks skipped. |
| `[00:37 – 00:45]` | **Step 4**, **DIR-01**, **Authorise Release (DIR-01)** → `RELEASED — Verified` | Director DIR-01 clicks Authorise Release... and the badge goes to Released, Verified. Payload, JSON, and CSV are sitting there if you need the record. |

### Click clock (from `src/data/cursorTour.ts`)

| Time | DOM target | Action |
|---|---|---|
| 00:00 | reset | Fresh Step 1, role RO-104 |
| 00:02 | `[data-tour="nav-queue"]` | Officer Queue |
| 00:05 | `[data-tour="open-DEMO-001"]` | Open DEMO-001 |
| 00:12 | `[data-tour="confirm-v1"]` | Confirm V1 Discrepancy |
| 00:16 | `[data-tour="role-INST-01"]` | Role INST-01 |
| 00:19 | `[data-tour="submit-v2"]` | Submit V2 & Run Smart Recheck |
| 00:24 | `[data-tour="check-CHK-01"]` | Principal Amount · RE-VERIFIED ON V2 |
| 00:27 | `[data-tour="check-CHK-02"]` | Bank Confirmation · RE-VERIFIED ON V2 |
| 00:31 | `[data-tour="check-CHK-03"]` | Institution Identity · PRESERVED FROM V1 |
| 00:34 | `[data-tour="check-CHK-04"]` | AICTE Lien · PRESERVED FROM V1 |
| 00:37 | `[data-tour="flow-4"]` | Step 4 Director Approval |
| 00:40 | `[data-tour="role-DIR-01"]` | Role DIR-01 |
| 00:42 | `[data-tour="authorise"]` | Authorise Release → RELEASED — Verified |
| 00:45 | hold | Badge, Technical Payload, Export JSON / CSV |

**Escape** or the play icon again stops the cursor and the audio immediately.
