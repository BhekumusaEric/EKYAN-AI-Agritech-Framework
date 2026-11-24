export const PILOT = {
  country: "Kenya",
  county: "Busia",
  valueChain: "Poultry",
  languages: ["English", "Kiswahili"],
} as const;

export const INPUT_CATALOGUE = [
  "Day-old chicks",
  "Feed (bags)",
  "Vaccines (doses)",
  "Drinkers/feeders",
] as const;

export const BLOCKER_CATEGORIES = [
  "Inputs",
  "Finance",
  "Water",
  "Market",
  "Disease",
  "Labour",
  "Land access",
  "Time",
] as const;

export const DEMO_BLOCKERS = [
  {
    id: "synthetic-blocker-001",
    category: "Inputs",
    summary: "Poultry vaccine access",
    ward: "Teso South",
    urgency: "High",
    status: "Open",
    due: "Due in 2 days",
  },
  {
    id: "synthetic-blocker-002",
    category: "Water",
    summary: "Dry-season water access",
    ward: "Nambale",
    urgency: "Medium",
    status: "In Progress",
    due: "Due in 5 days",
  },
  {
    id: "synthetic-blocker-003",
    category: "Market",
    summary: "No confirmed poultry buyer",
    ward: "Matayos",
    urgency: "Low",
    status: "Acknowledged",
    due: "Due in 7 days",
  },
] as const;

export const DEMO_DEMAND_GROUPS = [
  {
    id: "synthetic-demand-001",
    item: "Vaccines (doses)",
    ward: "Teso South",
    quantity: 120,
    farmers: 24,
    agripreneurs: 5,
    neededBy: "Next 2 weeks",
  },
  {
    id: "synthetic-demand-002",
    item: "Feed (bags)",
    ward: "Nambale",
    quantity: 86,
    farmers: 17,
    agripreneurs: 4,
    neededBy: "Next 3 weeks",
  },
] as const;

export const KPI_DICTIONARY = [
  { id: "K1", name: "Blockers logged", formula: "Count of blockers in the selected period", source: "Blocker Resolution" },
  { id: "K2", name: "Blocker resolution rate", formula: "Resolved blockers ÷ blockers logged", source: "Blocker Resolution" },
  { id: "K3", name: "Median time to resolve", formula: "Median resolvedAt − createdAt", source: "Blocker Resolution" },
  { id: "K4", name: "Order fulfilment rate", formula: "Fulfilled order lines ÷ order lines", source: "Pooled Demand" },
  { id: "K5", name: "Supplier commitment rate", formula: "Committed demand items ÷ demand items", source: "Pooled Demand" },
  { id: "K6", name: "Intention → action conversion", formula: "Farmers with a fulfilled order ÷ farmers with a logged intention (service-action proxy, not verified practice adoption)", source: "Field Log + Pooled Demand" },
  { id: "K7", name: "Agripreneurs with ready profiles", formula: "Ready profiles ÷ active agripreneurs", source: "Finance Readiness" },
  { id: "K8", name: "Farmers served per agripreneur", formula: "Active farmers ÷ active agripreneurs", source: "Field Log" },
  { id: "K9", name: "Women share", formula: "Women participants ÷ participants, by role", source: "People records" },
  { id: "K10", name: "Cost per outcome", formula: "Approved programme cost ÷ resolved blocker or fulfilled farmer", source: "Programme costs + outcomes" },
  { id: "K11", name: "Data-quality score", formula: "Records passing checks ÷ records checked", source: "Data-quality checks" },
] as const;

export const READINESS_FACTORS = [
  { name: "Record completeness and consistency", weight: "20%" },
  { name: "Cash-flow capacity", weight: "20%" },
  { name: "Revenue stability and growth", weight: "15%" },
  { name: "Customer diversification", weight: "10%" },
  { name: "Order-fulfilment reliability", weight: "10%" },
  { name: "Savings and repayment evidence", weight: "10%" },
  { name: "Verified supplier and buyer relationships", weight: "10%" },
  { name: "Operational risk management", weight: "5%" },
] as const;

export function routeForBlocker(category: string) {
  if (category === "Inputs") return "Verified suppliers in Busia";
  if (category === "Finance") return "Consent-gated lender queue";
  if (category === "Disease") return "Ask Nia mock, then extension officer";
  if (category === "Market") return "Buyer queue (MVP stub)";
  return "County extension officer";
}
