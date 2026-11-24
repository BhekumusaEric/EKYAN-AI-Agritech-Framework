export type FarmerPreviewScenario = {
  id: string;
  label: string;
  ward: string;
  flockSize: number;
  input: string;
  inputQuantity: number;
  inputStatus: "waiting" | "confirmed";
  inputTiming: "thisWeek" | "nextWeek";
  supportIssue: string;
  supportStatus: "assigned" | "inProgress" | "resolved";
};

export const FARMER_PREVIEW_SCENARIOS: FarmerPreviewScenario[] = [
  {
    id: "farm-demo-a",
    label: "Demo farm A",
    ward: "Teso South",
    flockSize: 48,
    input: "Feed (bags)",
    inputQuantity: 3,
    inputStatus: "waiting",
    inputTiming: "thisWeek",
    supportIssue: "Water access",
    supportStatus: "assigned",
  },
  {
    id: "farm-demo-b",
    label: "Demo farm B",
    ward: "Nambale",
    flockSize: 72,
    input: "Day-old chicks",
    inputQuantity: 50,
    inputStatus: "confirmed",
    inputTiming: "nextWeek",
    supportIssue: "Poultry health question",
    supportStatus: "inProgress",
  },
  {
    id: "farm-demo-c",
    label: "Demo farm C",
    ward: "Matayos",
    flockSize: 32,
    input: "Vaccines (doses)",
    inputQuantity: 32,
    inputStatus: "waiting",
    inputTiming: "thisWeek",
    supportIssue: "Input availability",
    supportStatus: "resolved",
  },
];
