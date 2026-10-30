export interface TourBeat {
  selector: string;
  dwell: number;
}

/** Autonomous walkthrough of the live controls. Times are dwell after each click. */
export const CURSOR_TOUR: TourBeat[] = [
  { selector: '[data-tour="nav-queue"]', dwell: 1100 },
  { selector: '[data-tour="open-DEMO-001"]', dwell: 800 },
  { selector: '[data-tour="tab-provenance"]', dwell: 2400 },
  { selector: '[data-tour="role-RO-104"]', dwell: 500 },
  { selector: '[data-tour="tab-recheck"]', dwell: 700 },
  { selector: '[data-tour="step-2"]', dwell: 1400 },
  { selector: '[data-tour="role-INST-01"]', dwell: 450 },
  { selector: '[data-tour="nav-institution"]', dwell: 800 },
  { selector: '[data-tour="upload-v2"]', dwell: 1400 },
  { selector: '[data-tour="role-RO-104"]', dwell: 600 },
  { selector: '[data-tour="check-CHK-02"]', dwell: 2200 },
  { selector: '[data-tour="tab-clearances"]', dwell: 1800 },
  { selector: '[data-tour="tab-audit"]', dwell: 1800 },
  { selector: '[data-tour="tab-recheck"]', dwell: 600 },
  { selector: '[data-tour="step-5"]', dwell: 900 },
  { selector: '[data-tour="role-DIR-01"]', dwell: 550 },
  { selector: '[data-tour="tab-result"]', dwell: 1400 },
  { selector: '[data-tour="authorise"]', dwell: 1800 },
];
