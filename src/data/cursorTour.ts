export interface TourBeat {
  selector: string;
  dwell: number;
}

/** Autonomous walkthrough of the live 4-step workspace. Times are dwell after each click. */
export const CURSOR_TOUR: TourBeat[] = [
  { selector: '[data-tour="nav-queue"]', dwell: 1200 },
  { selector: '[data-tour="open-DEMO-001"]', dwell: 1600 },
  { selector: '[data-tour="confirm-v1"]', dwell: 1400 },
  { selector: '[data-tour="role-INST-01"]', dwell: 500 },
  { selector: '[data-tour="submit-v2"]', dwell: 2800 },
  { selector: '[data-tour="check-CHK-01"]', dwell: 1100 },
  { selector: '[data-tour="check-CHK-02"]', dwell: 1100 },
  { selector: '[data-tour="check-CHK-03"]', dwell: 1100 },
  { selector: '[data-tour="check-CHK-04"]', dwell: 1300 },
  { selector: '[data-tour="flow-4"]', dwell: 800 },
  { selector: '[data-tour="role-DIR-01"]', dwell: 500 },
  { selector: '[data-tour="authorise"]', dwell: 2200 },
];
