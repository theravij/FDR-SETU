# FDR Setu — ElevenLabs Student Voiceover (1.0x)

Synced to the locked human physics in `src/components/DemoDirector.tsx`.

## Locked cursor physics (never sped up)

| Action | Duration |
| --- | ---: |
| Cursor glide (`moveTo`) | 650 ms |
| Hover settle before click | 200 ms |
| Press animation | 90 ms |
| **Move-and-click total** | **940 ms** |
| Select-all highlight | 220 ms |
| Clear pause | 120 ms |
| **Replace existing value** | **340 ms** |
| Regular character | 55 ms |
| Space / punctuation (`/ - . @ #` and whitespace) | 95 ms |
| Officer-note backspace correction | 320 ms |
| After-type settle | 200 ms |
| Breathing buffer between scenes | 400 ms |

No distance-based glide shortening. No random typing. No “divide remaining time by characters” catch-up.

## Exact scene-by-scene table

Derived by summing every glide, type delay, system wait, and reading pause in `DemoDirector.tsx`. Scene starts are `waitUntil` anchors; each is prior scene end + 400 ms.

| Scene | Start → End | Seconds | Cursor / typing (ms) | Words @ ~2.3 wps | Spoken @ 1.0x | Bridge |
| --- | --- | ---: | --- | ---: | ---: | --- |
| 1 Login | 0 → 10,460 ms | 0.00 → 10.46 | SVG 650 + card 650 + ID 1,880 + PW 2,100 + Show/Hide/Remember 3,140 + Login 940 + Checking/open 1,100 | 24 | 10.43 s | `<break time="0.4s" />` |
| 2 Queue | 10,860 → 15,720 ms | 10.86 → 15.72 | Search 2,170 + Open 940 + FDR card read 650+1,100 | 11 | 4.78 s | `<break time="0.4s" />` |
| 3 V1 Flag | 16,120 → 23,920 ms | 16.12 → 23.92 | CHK-01 650 + officer note 5,310 (incl. 320 correction) + Flag 940 + read 900 | 18 | 7.83 s | `<break time="0.4s" />` |
| 4 Institution V2 | 24,320 → 36,340 ms | 24.32 → 36.34 | Nav 940 + portal 900 + serial 2,590 + amount 1,865 + token 2,195 + OCR 940+650 + Submit 940 + match 1,000 | 27 | 11.74 s | `<break time="0.4s" />` |
| 5 Selective Recheck | 36,740 → 47,580 ms | 36.74 → 47.58 | CHK-03/04 + clicks + Provenance 1,000 + Clearances 900 + Audit 900 + Confirm 940 | 24 | 10.43 s | `<break time="0.4s" />` |
| 6 Director Certificate | 47,980 → 55,305 ms | 47.98 → 55.30 | Director note 4,415 + Authorise 940 + seal 650 + seal read 1,200 | 17 | 7.39 s | `<break time="0.4s" />` |
| 7 Workload & Baseline | 55,705 → 63,045 ms | 55.70 → 63.05 | Reports + board 900 + Baseline 1,000 + return 900 + fade 420 | 17 | 7.39 s | end |

**Total runtime:** 63,045 ms ≈ **63.0 s**.  
**Speech rate:** 2.2–2.4 words/sec (table center **2.3**).  
**ElevenLabs speed:** **1.0x** only.

### Typing duration detail

| Field | Text | Replace | Correction | Duration |
| --- | --- | ---: | ---: | ---: |
| Login ID | `AICTE-RO-104` (12) | no (empty) | — | 1,880 ms |
| Login password | `Setu@2026#Verify` (16) | no (empty) | — | 2,100 ms |
| Queue search | `National Institute` (18) | no | — | 2,170 ms |
| Officer note | 62 chars | no | 320 ms | 5,310 ms |
| FDR serial | `FDR/PNB/2025/91007` (18) | yes 340 | — | 2,590 ms |
| Amount | `3500000` (7) | yes 340 | — | 1,865 ms |
| Gateway token | `PNB-GW-2026-44802` (17) | no | — | 2,195 ms |
| Director note | 53 chars | no | — | 4,415 ms |

Login click fires at ~9,360 ms; Scene 1’s closing words land on that click, then Checking… fills to 10,460 ms.

## Single copy-paste ElevenLabs block (1.0x)

```text
An AICTE review officer opens FDR Setu, types the account and password, briefly reveals it for a safety check, then calmly clicks Login now.
<break time="0.4s" />
The live queue finds National Institute and opens the shortfall file.
<break time="0.4s" />
On the FDR card the five-lakh shortfall is clear; the officer notes it and flags the file back.
<break time="0.4s" />
The institution replaces the FDR serial and principal amount, verifies the bank gateway token, confirms the principal match, then submits the corrected V2 instrument for selective recheck.
<break time="0.4s" />
Selective recheck locks identity and lien from V1, recomputes principal and bank on V2, then provenance and audit confirm every material field change cleanly.
<break time="0.4s" />
The director types a short clearance remark and authorises the official verification certificate on this live record.
<break time="0.4s" />
Workload ageing and baseline savings show half the checks kept, then the cleared case returns to workspace.
```

| Scene | Words | Rate | Duration |
| --- | ---: | ---: | ---: |
| 1 | 24 | 2.29 wps | 10.46 s |
| 2 | 11 | 2.26 wps | 4.86 s |
| 3 | 18 | 2.31 wps | 7.80 s |
| 4 | 27 | 2.25 wps | 12.02 s |
| 5 | 24 | 2.21 wps | 10.84 s |
| 6 | 17 | 2.32 wps | 7.33 s |
| 7 | 17 | 2.32 wps | 7.34 s |

## DevTools verification

1. Open the app (`npm run dev` or https://fdr-setu.vercel.app).
2. Open DevTools Console.
3. Press `Alt + D`.
4. Confirm `[Walkthrough] Scene N started at …ms` within ~±40 ms of: 0, 10860, 16120, 24320, 36740, 47980, 55705.
5. No Demo / Tour / Walkthrough chrome on screen.

## Record with voice

1. Generate the ElevenLabs MP3 at **1.0x**.
2. Press `Alt + R`, share the current tab, let the walkthrough finish (~63 s).
3. Mux `fdr-setu-walkthrough.webm` with the MP3; align audio t=0 to the first Scene 1 console timestamp.
