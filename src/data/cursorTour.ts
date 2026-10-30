export interface TourBeat {
  selector: string;
  label: string;
  clickAt: number;
}

export const TOUR_DURATION_MS = 48_000;
/** Hover 140ms + press 90ms. Click lands on clickAt. */
export const PRESS_LEAD_MS = 230;

/** Absolute click times from audio 0:00 / Alt+D start. */
export const CURSOR_TOUR: TourBeat[] = [
  { selector: '[data-tour="nav-queue"]', label: "Officer Queue", clickAt: 2_000 },
  { selector: '[data-tour="open-DEMO-001"]', label: "Open DEMO-001", clickAt: 5_000 },
  { selector: '[data-tour="confirm-v1"]', label: "Confirm V1 Discrepancy", clickAt: 12_000 },
  { selector: '[data-tour="role-INST-01"]', label: "Role INST-01", clickAt: 16_000 },
  { selector: '[data-tour="submit-v2"]', label: "Submit V2 & Run Smart Recheck", clickAt: 19_000 },
  { selector: '[data-tour="check-CHK-01"]', label: "Principal Amount · RE-VERIFIED ON V2", clickAt: 24_000 },
  { selector: '[data-tour="check-CHK-02"]', label: "Bank Confirmation · RE-VERIFIED ON V2", clickAt: 27_000 },
  { selector: '[data-tour="check-CHK-03"]', label: "Institution Identity · PRESERVED FROM V1", clickAt: 31_000 },
  { selector: '[data-tour="check-CHK-04"]', label: "AICTE Lien · PRESERVED FROM V1", clickAt: 34_000 },
  { selector: '[data-tour="flow-4"]', label: "Step 4 Director Approval", clickAt: 37_000 },
  { selector: '[data-tour="role-DIR-01"]', label: "Role DIR-01", clickAt: 40_000 },
  { selector: '[data-tour="authorise"]', label: "Authorise Release (DIR-01)", clickAt: 44_000 },
];
