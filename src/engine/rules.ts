export interface DemoRules {
  version: string;
  source: string;
  maturityWindowDays: number;
}

/** Synthetic policy for the prototype. It is not a reconciled AICTE circular. */
export const DEMO_RULES: DemoRules = {
  version: "DEMO-POLICY-6.46",
  source:
    "Synthetic demo policy. It keeps the NOC route (FDR/RPGF) separate from the sanction-order route (RTGS), in the shape of AICTE handbook clause 6.46. A prior confirmation covers only the instrument version it reviewed.",
  maturityWindowDays: 30,
};
