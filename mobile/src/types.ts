export type ApiDemoRole = "agripreneur";

export type TransactionType =
  | "sale"
  | "service"
  | "other_income"
  | "purchase"
  | "other_expense"
  | "loan_received"
  | "loan_repayment"
  | "savings_deposit"
  | "savings_out"
  | "owner_in"
  | "owner_out";

export type TransactionCategory =
  | "sales"
  | "services"
  | "feed"
  | "chicks"
  | "vaccines"
  | "equipment"
  | "transport"
  | "wages"
  | "rent"
  | "phone_data"
  | "loan"
  | "savings"
  | "owner"
  | "other";

export type FinanceProfile = {
  decision_notice: string;
  period: { from: string; to: string };
  business: {
    revenue_kes: number;
    expenses_kes: number;
    operating_surplus_kes: number;
    unpaid_income_kes: number;
    unpaid_expenses_kes: number;
    existing_obligations_kes: number;
    savings_balance_estimate_kes: number;
  };
  record_coverage: {
    months_with_entries: number;
    months_with_income: number;
    months_with_expenses: number;
    months_in_period: number;
    entry_count: number;
    unpaid_without_due_date: number;
  };
};

export type BusinessTransaction = {
  id: string;
  transactionType: TransactionType;
  category: TransactionCategory;
  amountKes: number;
  transactionDate: string;
  paymentStatus: "paid" | "unpaid";
  dueDate: string | null;
  notes: string | null;
  counterparty: string | null;
  evidenceStatus: string;
};

export type FarmerReference = {
  id: string;
  synthetic: boolean;
  name?: string;
};

export type BlockerStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "cannot_resolve" | "closed";

export type MobileBlocker = {
  id: string;
  category: string;
  description: string | null;
  ward: string;
  urgency: "low" | "medium" | "high";
  routeTo: string;
  status: BlockerStatus;
  dueAt: string;
  overdue: boolean;
  resolutionNote: string | null;
  farmerConfirmed: boolean;
  synthetic: true;
};

export type MobileOrder = {
  id: string;
  item: string;
  quantity: number;
  neededBy: string;
  ward: string;
  status: "open" | "committed" | "fulfilled";
  synthetic: true;
};
