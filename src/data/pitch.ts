import type { ScreenId, Step, WorkspaceTab } from "../types";

export interface PitchStage {
  index: number;
  label: string;
  window: string;
  blurb: string;
  screen: ScreenId;
  tab: WorkspaceTab;
  step: Step;
}

export const PITCH: PitchStage[] = [
  {
    index: 0,
    label: "Discrepancy",
    window: "0–6s",
    blurb: "The form says ₹35,00,000. The sample OCR says ₹30,00,000.",
    screen: "workspace",
    tab: "recheck",
    step: 1,
  },
  {
    index: 1,
    label: "V1 confirmed",
    window: "6–12s",
    blurb: "The mismatch is reviewed. Sample evidence EV-BNK-101 covers V1 only.",
    screen: "workspace",
    tab: "recheck",
    step: 2,
  },
  {
    index: 2,
    label: "Selective recheck",
    window: "12–18s",
    blurb: "V2 changes the bank reference. Only CHK-02 reopens.",
    screen: "workspace",
    tab: "recheck",
    step: 3,
  },
  {
    index: 3,
    label: "V2 confirmed",
    window: "18–24s",
    blurb: "Sample evidence for V2 is recorded. The V1 confirmation stays in history.",
    screen: "workspace",
    tab: "recheck",
    step: 4,
  },
  {
    index: 4,
    label: "Release ready",
    window: "24–30s",
    blurb: "DIR-01 may record the review decision. The funds are not moved here.",
    screen: "workspace",
    tab: "result",
    step: 5,
  },
];
