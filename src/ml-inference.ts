import artifacts from './ml-models.json';
import type { Customer, Transaction } from './types';
import { thresholds } from './config';

export const modelVersion = artifacts.version;
type TreeNode = { value: number; feature: number; threshold: number; left: number; right: number; leaf: boolean; missing_left: boolean };
type Model = { features: string[]; baseline: number; calibration: number[]; trees: TreeNode[][] };
const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-700, Math.min(700, x))));
const ratio = (a: number, b: number) => Math.max(0, Math.min(50, a / Math.max(1, b)));
export function modelProbability(name: 'fraud' | 'repayment', values: number[]): number {
  const model: Model = artifacts.models[name];
  if (values.length !== model.features.length || values.some((v) => !Number.isFinite(v)))
    throw new Error('Invalid model feature vector');
  let raw = model.baseline;
  for (const tree of model.trees) {
    let n = tree[0];
    while (!n.leaf) n = tree[values[n.feature] <= n.threshold ? n.left : n.right];
    raw += n.value;
  }
  return sigmoid(model.calibration[0] * raw + model.calibration[1]);
}
const before = (c: Customer, asOf: string) => c.transactions.filter((t) => t.status === 'Completed' && Date.parse(t.at) <= Date.parse(asOf));
const cashBalance = (c: Customer, txs: Transaction[]) => (Math.round(c.openingCash * 100) + txs.reduce((s, t) => s + Math.round(t.amount * 100) * (t.direction === 'in' ? 1 : -1), 0)) / 100;
export function transactionFeatures(c: Customer, t: Transaction): number[] {
  const at = Date.parse(t.at);
  const previous = c.transactions.filter((r) => r.status === 'Completed' && Date.parse(r.at) < at);
  const incoming = previous.filter((r) => r.direction === 'in' && r.category === 'transfer' && at - Date.parse(r.at) <= 1200000);
  const hour = new Date(at + 330 * 60000).getUTCHours();
  return [ratio(t.amount, c.usualTransfer), Number(!!t.newBeneficiary), Number(!!t.unusualDevice),
    Number(hour < 7 || hour >= 23), previous.filter((r) => at - Date.parse(r.at) <= 3600000).length,
    previous.filter((r) => at - Date.parse(r.at) <= 86400000).length,
    ratio(t.amount, cashBalance(c, previous)), new Set(incoming.map((r) => r.account)).size,
    incoming.length && t.direction === 'out' ? ratio(t.amount, incoming.reduce((s, r) => s + r.amount, 0)) : 0,
    Number(t.direction === 'out')];
}
export const probabilityScore = (p: number) => Math.round(p * 10000) / 100;
export const transactionModelScore = (c: Customer, t: Transaction) => probabilityScore(modelProbability('fraud', transactionFeatures(c, t)));
export const repaymentHistoryAt = (c: Customer, asOf: string) => c.loan.history.filter((h) => !h.observedAt || Date.parse(h.observedAt) <= Date.parse(asOf));
export function expectedSalaryAt(c: Customer, asOf: string): string {
  const at = Date.parse(asOf), local = new Date(at + 330 * 60000);
  const day = Number(c.loan.salaryAt.slice(8, 10));
  let next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), day, 3, 30);
  if (next <= at) next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, day, 3, 30);
  return new Date(next).toISOString();
}
export function isSuspiciousTransfer(c: Customer, t: Transaction): boolean {
  return t.status === 'Completed' && t.category === 'transfer' && t.direction === 'out' &&
    modelProbability('fraud', transactionFeatures(c, t)) >= thresholds.scamAlert / 100;
}
export function repaymentFeatures(c: Customer, asOf: string): number[] {
  const txs = before(c, asOf);
  const at = Date.parse(asOf), due = Date.parse(c.loan.dueAt), emi = c.loan.emi;
  const cash = cashBalance(c, txs);
  const commitments = c.transactions.filter((t) => t.status === 'Pending' && t.knownAt && Date.parse(t.knownAt) <= at && at < Date.parse(t.at) && Date.parse(t.at) < due && t.category === 'essential').reduce((s, t) => s + t.amount, 0);
  const draws = txs.filter((t) => t.category === 'credit' && t.direction === 'in');
  const credit = c.openingCredit + draws.reduce((s, t) => s + t.amount, 0);
  const history = repaymentHistoryAt(c, asOf);
  const late = history.filter((h) => h.status === 'Missed' || h.daysLate > 7).length;
  const local = new Date(at + 330 * 60000);
  const month = local.toISOString().slice(0, 7);
  const received = txs.filter((t) => t.category === 'salary' && new Date(Date.parse(t.at) + 330 * 60000).toISOString().slice(0, 7) === month).reduce((s, t) => s + t.amount, 0);
  const salaryDay = Number(c.loan.salaryAt.slice(8, 10));
  return [ratio(cash, emi), ratio(Math.max(0, cash - commitments), emi), ratio(commitments, emi),
    ratio(c.salary, emi), ratio(c.expenses, c.salary), ratio(credit, c.creditLimit), Math.max(0, (due - at) / 86400000),
    Math.max(0, (Date.parse(expectedSalaryAt(c, asOf)) - due) / 86400000), late / Math.max(1, history.length), late,
    Number(local.getUTCDate() >= salaryDay && received < c.salary * .7),
    ratio(draws.filter((t) => at - Date.parse(t.at) < 30 * 86400000).reduce((s, t) => s + t.amount, 0), emi)];
}
