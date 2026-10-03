import type { Customer, Assessment } from './types';
import { thresholds } from './config';
import { financialState, visibleEvents, visibleTransactions } from './selectors';
import { scoreProvider } from './scoring';
import { dayOf } from './data';
export function assessContext(
  c: Customer,
  asOf: string,
  risk = scoreProvider.score(c, asOf),
): Assessment {
  const evidence = visibleEvents(c, asOf);
  const ts = visibleTransactions(c, asOf).filter((t) => t.status === 'Completed');
  const f = financialState(c, asOf);
  const incoming = ts.filter((t) => t.category === 'transfer' && t.direction === 'in');
  const recentIncoming = (at: string) =>
    incoming.filter(
      (i) =>
        Date.parse(i.at) <= Date.parse(at) &&
        Date.parse(at) - Date.parse(i.at) <= thresholds.rapidMinutes * 60000,
    );
  const rapidOut = ts.find(
    (t) =>
      t.direction === 'out' &&
      t.category === 'transfer' &&
      new Set(recentIncoming(t.at).map((i) => i.account)).size >= thresholds.minimumSenders,
  );
  const passThrough = rapidOut
    ? rapidOut.amount / recentIncoming(rapidOut.at).reduce((n, t) => n + t.amount, 0)
    : 0;
  const suspicious = ts.filter(
    (t) =>
      t.direction === 'out' &&
      t.risk >= thresholds.scamAlert &&
      t.newBeneficiary &&
      t.unusualDevice,
  );
  const first = suspicious[0];
  const priorCash = first
    ? c.openingCash +
      ts
        .filter((t) => Date.parse(t.at) < Date.parse(first.at))
        .reduce((n, t) => n + (t.direction === 'in' ? t.amount : -t.amount), 0)
    : 0;
  const shock = first && f.suspectedOutflow / Math.max(1, priorCash) >= thresholds.shockFraction;
  const preShockRepayment = first
    ? ([...c.scorePoints].reverse().find((p) => p.day < dayOf(first.at))?.repayment ??
      c.scorePoints[0].repayment)
    : risk.repaymentScore;
  const competingIncomeGap = first && evidence.some((e) => e.kind === 'income');
  const deterioration =
    evidence.some(
      (e) => e.kind === 'liquidity' && first && Date.parse(e.at) > Date.parse(first.at),
    ) && risk.repaymentScore - preShockRepayment >= thresholds.repaymentRise;
  let context: Assessment['context'] = 'Healthy';
  let explanation =
    'Observed cash flow covers the upcoming installment. No suspicious payment sequence is present.';
  let strength = 'No intervention signal';
  let alternative =
    'Continue routine monitoring; absence of an alert does not establish absence of risk.';
  if (rapidOut && passThrough >= thresholds.passThrough) {
    context = 'Possible mule';
    strength = 'Strong pattern · role unconfirmed';
    explanation = `${incoming.length} senders paid in; ${Math.round(passThrough * 100)}% moved onward within ${thresholds.rapidMinutes} minutes. This is consistent with possible pass-through activity, not proof of participation.`;
    alternative =
      'Legitimate pooled payments or business activity remain possible. Verify source and purpose of funds.';
  } else if (shock && (competingIncomeGap || preShockRepayment >= thresholds.repaymentWarning)) {
    context = 'Uncertain / manual review';
    strength = 'Competing explanation · manual review';
    explanation =
      'Suspicious outflows coexist with an income interruption or pre-existing repayment warning. The available sequence does not isolate scam-linked distress.';
    alternative =
      'Investigate the suspicious payment and verify income / prior obligations separately before attributing the repayment change.';
  } else if (shock && deterioration && f.shortfall > 0) {
    context = 'Possible scam-linked distress';
    strength = 'Temporal association · confirmation pending';
    explanation = `Repayment Risk increased by ${risk.repaymentScore - c.scorePoints[0].repayment} points after a suspicious ₹${f.suspectedOutflow.toLocaleString('en-IN')} outflow depleted the buffer. The EMI falls before salary; this sequence suggests possible scam-linked distress.`;
    alternative =
      'Customer confirmation is pending. Unrecorded income, other obligations, or recovery could change the interpretation.';
  } else if (suspicious.length) {
    context = 'Suspected scam';
    strength = 'Multiple observed signals · unconfirmed';
    explanation =
      'A first-seen beneficiary, unusual device, and rapid large outflows coincide with a cash shock. Investigate the completed transfers; the customer’s role is unconfirmed.';
    alternative =
      'An authorized payment may still be a scam. Device and amount patterns alone cannot identify a scam subtype.';
  } else if (evidence.some((e) => e.kind === 'income') && risk.repaymentScore >= 35) {
    context = 'Organic distress';
    strength = 'Income interruption observed';
    explanation =
      'Expected salary is absent or delayed while essential outflows continue. Repayment deterioration is associated with an income gap; there is no suspicious-outflow chain.';
    alternative =
      'Verify payroll timing and other income. No automatic scam-victim inference is warranted.';
  } else if (
    ts.some(
      (t) => t.newBeneficiary && t.amount >= c.usualTransfer * thresholds.largeTransferMultiple,
    ) ||
    risk.scamScore >= 20
  ) {
    context = 'Uncertain / manual review';
    strength = 'Insufficient or conflicting evidence';
    explanation =
      'An unusual payment or device observation needs verification. Available evidence does not establish a scam-loss sequence or participant role.';
    alternative =
      'A legitimate payment or ordinary device replacement is possible. Check purpose and beneficiary ownership.';
  }
  return { context, strength, explanation, alternative, evidence };
}
