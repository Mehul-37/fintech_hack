import type { Customer, FinancialState } from './types';
import { isSuspiciousTransfer, transactionModelScore } from './ml-inference';
export const visibleEvents = (c: Customer, asOf: string) =>
  c.events.filter((e) => Date.parse(e.at) <= Date.parse(asOf));
export function highlightedEvents(c: Customer, asOf: string) {
  const events = visibleEvents(c, asOf);
  if (events.length <= 3) return events;
  const peak = visibleTransactions(c, asOf)
    .filter((t) => t.status === 'Completed' && t.category === 'transfer')
    .map((t) => ({ t, score: transactionModelScore(c, t) }))
    .sort((a, b) => b.score - a.score)[0]?.t;
  const focal = events.find((e) => peak && e.transactionIds?.includes(peak.id))
    ?? events.find((e) => e.kind === 'transfer') ?? events[0];
  return [focal, ...events.filter((e) => e.id !== focal.id).slice(-2)].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );
}
export const visibleTransactions = (c: Customer, asOf: string) =>
  c.transactions.filter((t) => Date.parse(t.at) <= Date.parse(asOf));
export function financialState(c: Customer, asOf: string): FinancialState {
  const settled = visibleTransactions(c, asOf).filter((t) => t.status === 'Completed');
  const cash = (Math.round(c.openingCash * 100) + settled.reduce((n, t) =>
    n + Math.round(t.amount * 100) * (t.direction === 'in' ? 1 : -1), 0)) / 100;
  const creditUsed =
    c.openingCredit +
    settled
      .filter((t) => t.category === 'credit' && t.direction === 'in')
      .reduce((n, t) => n + t.amount, 0);
  // Pending essential instructions are known commitments, not leaked future settled outcomes.
  const essentialsBeforeEmi = c.transactions
    .filter(
      (t) =>
        t.status === 'Pending' &&
        t.knownAt &&
        Date.parse(t.knownAt) <= Date.parse(asOf) &&
        t.category === 'essential' &&
        t.direction === 'out' &&
        Date.parse(t.at) > Date.parse(asOf) &&
        Date.parse(t.at) < Date.parse(c.loan.dueAt),
    )
    .reduce((n, t) => n + t.amount, 0);
  const fundsForEmi = Math.max(0, cash - essentialsBeforeEmi);
  const paid = settled.filter((t) => t.category === 'emi' && t.direction === 'out' &&
    (!c.loan.id || (t.loanId === c.loan.id && t.installmentNum === c.loan.installmentNum)))
    .reduce((sum, t) => sum + t.amount, 0);
  const emiRemaining = Math.max(0, c.loan.emi - paid);
  const emiPaid = emiRemaining < .005;
  const daysPastDue = emiPaid
    ? 0
    : Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(c.loan.dueAt)) / 86400000));
  return {
    cash,
    creditUsed,
    utilization: (creditUsed / c.creditLimit) * 100,
    suspectedOutflow: settled
      .filter(
        (t) =>
          isSuspiciousTransfer(c, t),
      )
      .reduce((n, t) => n + t.amount, 0),
    essentialsBeforeEmi,
    fundsForEmi,
    shortfall: Math.max(0, emiRemaining - fundsForEmi),
    daysPastDue,
    emiStatus: emiPaid
      ? 'Paid'
      : daysPastDue > 0
        ? 'Past due'
        : Date.parse(asOf) >= Date.parse(c.loan.dueAt)
          ? 'Due today'
          : 'Upcoming',
  };
}
