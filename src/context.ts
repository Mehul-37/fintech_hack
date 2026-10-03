import type { Customer, Assessment } from './types';
import { thresholds } from './config';
import { financialState, visibleEvents, visibleTransactions } from './selectors';
import { scoreProvider } from './scoring';
import { isSuspiciousTransfer, repaymentHistoryAt } from './ml-inference';
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
  const suspicious = ts.filter((t) => isSuspiciousTransfer(c, t));
  const firstFlag = suspicious[0];
  // Compare against the start of the observed same-recipient burst, including
  // earlier payments that individually fell below the model alert threshold.
  const first = firstFlag ? ts.filter((t) => t.category === 'transfer' && t.direction === 'out' &&
    t.account === firstFlag.account && Date.parse(t.at) <= Date.parse(firstFlag.at) &&
    Date.parse(firstFlag.at) - Date.parse(t.at) <= thresholds.rapidMinutes * 60000)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0] ?? firstFlag : undefined;
  const priorCash = first
    ? c.openingCash +
      ts
        .filter((t) => Date.parse(t.at) < Date.parse(first.at))
        .reduce((n, t) => n + (t.direction === 'in' ? t.amount : -t.amount), 0)
    : 0;
  const shock = first && f.suspectedOutflow / Math.max(1, priorCash) >= thresholds.shockFraction;
  const preShockRepayment = first
    ? scoreProvider.score(c, new Date(Date.parse(first.at) - 1).toISOString()).repaymentScore
    : risk.repaymentScore;
  const priorRepaymentWarning = repaymentHistoryAt(c, first?.at ?? asOf).some((h) => h.status === 'Missed' || h.daysLate > 7);
  const latestIncomeGap = evidence.filter((e) => e.kind === 'income').at(-1);
  const incomeAfterGap = latestIncomeGap ? ts.filter((t) => t.category === 'salary' &&
    Date.parse(t.at) > Date.parse(latestIncomeGap.at)).reduce((sum, t) => sum + t.amount, 0) : 0;
  const competingIncomeGap = first && latestIncomeGap && incomeAfterGap < c.salary * .7;
  const competingDistress = shock &&
    (competingIncomeGap || priorRepaymentWarning || preShockRepayment >= thresholds.repaymentWarning);
  const deterioration =
    evidence.some(
      (e) => e.kind === 'liquidity' && first && Date.parse(e.at) > Date.parse(first.at),
    ) && (risk.repaymentScore - preShockRepayment >= thresholds.repaymentRise || f.shortfall > 0);
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
  } else if ((suspicious.length > 0 && risk.scamScore < thresholds.scamContextConfidence) ||
    competingDistress) {
    context = 'Uncertain / manual review';
    strength = competingDistress ? 'Competing explanation · manual review'
      : 'Moderate estimate · verification needed';
    explanation = competingDistress
      ? 'Suspicious outflows coexist with an income interruption or a repayment warning known before the outflow. The available sequence does not isolate scam-linked distress.'
      : 'The transaction estimate is moderate. Verify the payment purpose and customer account before treating the cash pressure as scam-linked distress.';
    alternative =
      'Investigate the suspicious payment and verify income / prior obligations separately before attributing the repayment change.';
  } else if (shock && deterioration && f.shortfall > 0) {
    context = 'Possible scam-linked distress';
    strength = 'Due-date cash pressure · confirmation pending';
    explanation = `A suspicious ₹${f.suspectedOutflow.toLocaleString('en-IN')} outflow depleted the buffer, followed by liquidity pressure and a ₹${f.shortfall.toLocaleString('en-IN')} due-date cash shortfall. This suggests possible scam-linked distress. The separate seven-day delinquency estimate is ${risk.repaymentScore}/100; salary arriving during that window may still allow payment.`;
    alternative =
      'Customer confirmation is pending. Unrecorded income, other obligations, or recovery could change the interpretation.';
  } else if (suspicious.length) {
    context = 'Suspected scam';
    strength = 'Multiple observed signals · unconfirmed';
    explanation =
      'The model flags completed outgoing transfers using observed payment patterns. Review the amount, beneficiary, device and timing evidence; a familiar device can also be used during a scam. The customer’s role is unconfirmed.';
    alternative =
      'An authorized payment may still be a scam. Device and amount patterns alone cannot identify a scam subtype.';
  } else if (evidence.some((e) => e.kind === 'income') && risk.repaymentScore >= 35) {
    context = 'Organic distress';
    strength = 'Income interruption observed';
    explanation =
      'Expected salary is absent or delayed while essential outflows continue. Repayment deterioration is associated with an income gap; there is no suspicious-outflow chain.';
    alternative =
      'Verify payroll timing and other income. No automatic scam-victim inference is warranted.';
  } else if (risk.repaymentScore >= thresholds.repaymentWarning || f.shortfall > 0) {
    context = 'Uncertain / manual review';
    strength = 'Repayment pressure · verify cash flow';
    explanation = 'The repayment estimate or due-date cash gap needs review. No suspicious-outflow chain is established; verify income timing, available funds and existing obligations.';
    alternative = 'Expected salary, other income or available credit may change the outcome. Cash pressure alone does not establish scam involvement.';
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
