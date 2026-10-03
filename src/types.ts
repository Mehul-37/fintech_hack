export type Channel = 'UPI' | 'Wallet' | 'Card' | 'Digital banking';
export type Context =
  | 'Healthy'
  | 'Suspected scam'
  | 'Possible scam-linked distress'
  | 'Organic distress'
  | 'Possible mule'
  | 'Uncertain / manual review';
export interface Transaction {
  id: string;
  at: string;
  amount: number;
  direction: 'in' | 'out';
  channel: Channel;
  counterparty: string;
  account: string;
  status: 'Completed' | 'Pending';
  category: 'salary' | 'essential' | 'transfer' | 'credit' | 'emi';
  signals: string[];
  risk: number;
  newBeneficiary?: boolean;
  unusualDevice?: boolean;
  knownAt?: string;
  loanId?: string;
  installmentNum?: number;
}
export interface CustomerEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: 'baseline' | 'device' | 'transfer' | 'liquidity' | 'income' | 'verification';
  transactionIds?: string[];
}
export interface ScorePoint {
  day: number;
  scam: number;
  repayment: number;
  episodeDay?: number;
}
export interface Customer {
  id: string;
  name: string;
  occupation: string;
  city: string;
  salary: number;
  expenses: number;
  openingCash: number;
  openingCredit: number;
  creditLimit: number;
  usualTransfer: number;
  loan: {
    id?: string;
    installmentNum?: number;
    principal: number;
    emi: number;
    dueAt: string;
    salaryAt: string;
    history: { month: string; status: 'Paid' | 'Late' | 'Missed'; daysLate: number; observedAt?: string }[];
  };
  transactions: Transaction[];
  events: CustomerEvent[];
  scorePoints: ScorePoint[];
  story?: string;
  dataSource?: 'authored' | 'generated-holdout';
  sourceSeed?: number;
}
export interface FinancialState {
  cash: number;
  creditUsed: number;
  utilization: number;
  suspectedOutflow: number;
  essentialsBeforeEmi: number;
  fundsForEmi: number;
  shortfall: number;
  daysPastDue: number;
  emiStatus: string;
}
export interface RiskSnapshot {
  customerId: string;
  asOf: string;
  scamScore: number;
  repaymentScore: number;
  source: 'simulated' | 'model';
  providerVersion: string;
  evidenceIds: string[];
  observedSignals: string[];
  episode?: { peak: number; observedAt: string; windowStart: string; status: 'open' };
  latestTransactionScore?: number;
}
export interface ScoreProvider {
  score(customer: Customer, asOf: string): RiskSnapshot;
}
export interface Assessment {
  context: Context;
  strength: string;
  explanation: string;
  alternative: string;
  evidence: CustomerEvent[];
}
export type ActionKind =
  'investigation' | 'support' | 'verification' | 'cashflow' | 'beneficiary' | 'reminder';
export interface Intervention {
  kind: ActionKind;
  title: string;
  detail: string;
  priority: 'High' | 'Medium' | 'Low';
}
export type CaseStatus = 'Open' | 'In review' | 'Awaiting customer' | 'Resolved';
export interface AuditEntry {
  at: string;
  text: string;
}
export interface CaseRecord {
  id: string;
  customerId: string;
  kind: ActionKind;
  title: string;
  priority: string;
  owner: string;
  status: CaseStatus;
  createdAt: string;
  evidenceAsOf: string;
  evidenceIds: string[];
  explanation: string;
  followUp: string;
  contactOutcome: string;
  disposition: string;
  checklist: string[];
  notes: { at: string; text: string }[];
  activity: AuditEntry[];
  investigation?: import('./investigation').InvestigationSnapshot;
  reviewedBy?: string;
  reviewedAt?: string;
}
