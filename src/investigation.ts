import type { CaseRecord, Customer, FinancialState, RiskSnapshot, Transaction } from './types';
import { visibleEvents, visibleTransactions, financialState } from './selectors';
import { scoreProvider } from './scoring';
import { assessContext } from './context';
import { interventions } from './interventions';
import { thresholds } from './config';
import { money } from './format';
import { transactionModelScore, expectedSalaryAt, repaymentHistoryAt } from './ml-inference';

export const REPORT_VERSION = 'local-evidence-reporter-v1';
const MISSING = 'Insufficient evidence available.';
export const investigationLimits = { transactions: 30, events: 20, relatedAccounts: 8 };
export interface EvidenceSource {
  id: string;
  label: string;
  kind: 'profile' | 'risk' | 'financial' | 'loan' | 'transaction' | 'event' | 'relationship';
  at?: string;
  details: string;
}
export interface Claim {
  text: string;
  sourceIds: string[];
}
export interface InvestigationEvidence {
  caseId: string;
  customerId: string;
  customerName: string;
  asOf: string;
  risk: RiskSnapshot;
  financial: FinancialState;
  triggerTransaction: Transaction | null;
  baseline: {
    usualTransfer: number;
    salary: number;
    expenses: number;
    source: 'configured profile';
  };
  transactions: Transaction[];
  sources: EvidenceSource[];
  gaps: string[];
}
export interface InvestigationReport {
  executiveSummary: Claim;
  riskLevel: 'High' | 'Medium' | 'Low';
  riskFactors: (Claim & { severity: 'High' | 'Medium' })[];
  behavioralAnalysis: Claim;
  financialAnalysis: Claim;
  deviceAnalysis: Claim;
  merchantAnalysis: Claim;
  recipientAnalysis: Claim[];
  possiblePattern: Claim;
  supportingEvidence: Claim[];
  alternatives: Claim[];
  recommendedActions: Claim[];
  timeline: EvidenceSource[];
  humanDecisionRequired: true;
}
export interface InvestigationSnapshot {
  schemaVersion: 1;
  reporter: typeof REPORT_VERSION;
  generatedAt: string;
  retrievalMs: number;
  generationMs: number;
  evidence: InvestigationEvidence;
  report: InvestigationReport;
}
const claim = (text: string, ...sourceIds: string[]): Claim => ({ text, sourceIds });
const chronological = <T extends { at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

/** Controlled, as-of collection. No scenario labels, future outcomes, or inferred device IDs. */
export function collectInvestigationEvidence(
  record: CaseRecord,
  customer: Customer,
  portfolio: Customer[],
): InvestigationEvidence {
  if (customer.id !== record.customerId) throw new Error('The case customer is unavailable.');
  if (!Number.isFinite(Date.parse(record.evidenceAsOf))) throw new Error('Invalid evidence date.');
  const asOf = record.evidenceAsOf;
  customer = { ...customer, loan: { ...customer.loan, salaryAt: expectedSalaryAt(customer, asOf), history: repaymentHistoryAt(customer, asOf) } };
  const risk = scoreProvider.score(customer, asOf);
  const financial = financialState(customer, asOf);
  const all = chronological(visibleTransactions(customer, asOf)).map((t) => ({ ...t, risk: transactionModelScore(customer, t) }));
  const transfers = all.filter((t) => t.category === 'transfer' && t.status === 'Completed');
  const trigger = [...transfers].sort((a, b) => b.risk - a.risk || b.amount - a.amount)[0] ?? null;
  // Retain the trigger even if it falls outside the recent window.
  const recent = all.slice(-investigationLimits.transactions);
  if (trigger && !recent.some((t) => t.id === trigger.id)) {
    recent.shift();
    recent.push(trigger);
  }
  const transactions = chronological(recent).map((t) => ({ ...t, signals: [...t.signals] }));
  const observedEvents = chronological(visibleEvents(customer, asOf));
  const firstObservation = observedEvents[0];
  const baselineRisk = firstObservation ? scoreProvider.score(customer, firstObservation.at) : null;
  const events = observedEvents.slice(-investigationLimits.events);
  const profileId = `${customer.id}:profile`;
  const financialId = `${customer.id}:financial`;
  const loanId = `${customer.id}:loan`;
  const sources: EvidenceSource[] = [
    {
      id: profileId,
      label: 'Configured customer baseline',
      kind: 'profile',
      details: `${customer.name} (${customer.id}). Usual transfer ${money(customer.usualTransfer)}; monthly salary ${money(customer.salary)}; recurring expense budget ${money(customer.expenses)}. These are configured synthetic profile values, not estimates from a full historical dataset.`,
    },
    {
      id: `${customer.id}:risk`,
      label: 'Risk provider snapshot',
      kind: 'risk',
      at: asOf,
      details: `Scam Risk ${risk.scamScore}/100; Repayment Risk ${risk.repaymentScore}/100. Source: ${risk.source}; version: ${risk.providerVersion}. ${risk.source === 'model' ? 'Synthetic-trained estimates: repayment targets seven-day delinquency; scam episode peak is not an account probability. Real-world validity is unverified.' : 'These simulated indices are not probabilities.'} Neither score is a feature attribution.${baselineRisk ? ` First observed comparison at ${baselineRisk.asOf}: Scam Risk ${baselineRisk.scamScore}/100; Repayment Risk ${baselineRisk.repaymentScore}/100, from ${baselineRisk.providerVersion}.` : ' No earlier observed comparison is available.'}${risk.episode ? ` Open episode peak ${risk.episode.peak} observed ${risk.episode.observedAt}; later transactions have separate scores.` : ''}`,
    },
    {
      id: financialId,
      label: 'As-of ledger and commitment calculation',
      kind: 'financial',
      at: asOf,
      details: `Cash ${money(financial.cash)}; credit liability ${money(financial.creditUsed)}; known pending essentials before EMI ${money(financial.essentialsBeforeEmi)}; available EMI funds ${money(financial.fundsForEmi)}; forecast shortfall ${money(financial.shortfall)}. Calculated from opening balances, completed ledger entries and pending commitments known by the captured date.`,
    },
    {
      id: loanId,
      label: 'Loan schedule and prior repayments',
      kind: 'loan',
      details: `Loan principal ${money(customer.loan.principal)} (not a current outstanding-balance estimate); EMI ${money(customer.loan.emi)} due ${customer.loan.dueAt}; expected salary ${customer.loan.salaryAt} (schedule, not a guaranteed credit). Installment status: ${financial.emiStatus}. Prior repayments: ${customer.loan.history.map((h) => `${h.month}: ${h.status}, ${h.daysLate} days late`).join('; ') || MISSING}`,
    },
    ...transactions.map((t): EvidenceSource => ({
      id: t.id,
      label: `${t.counterparty} · ${money(t.amount)}`,
      kind: 'transaction',
      at: t.at,
      details: `${t.id}: ${t.direction === 'out' ? 'Outgoing' : 'Incoming'} ${money(t.amount)} INR via ${t.channel}; ${t.category}; ${t.status}; account key ${t.account}; synthetic-trained transaction estimate ${t.risk}/100. Observed signals: ${t.signals.join('; ') || 'None recorded'}.`,
    })),
    ...events.map((e): EvidenceSource => ({
      id: e.id,
      label: e.title,
      kind: 'event',
      at: e.at,
      details: e.detail,
    })),
  ];
  const accounts = [
    ...new Set(transfers.filter((t) => t.direction === 'out').map((t) => t.account)),
  ].slice(0, investigationLimits.relatedAccounts);
  // One pass through the small local portfolio, matching explicit account keys only.
  const relationships = new Map<string, { customerId: string; transaction: Transaction }[]>();
  const accountSet = new Set(accounts);
  for (const other of portfolio) {
    for (const t of visibleTransactions(other, asOf)) {
      if (
        t.category === 'transfer' &&
        t.direction === 'out' &&
        t.status === 'Completed' &&
        accountSet.has(t.account)
      ) {
        const matches = relationships.get(t.account) ?? [];
        matches.push({ customerId: other.id, transaction: t });
        relationships.set(t.account, matches);
      }
    }
  }
  for (const account of accounts) {
    const matches = relationships.get(account) ?? [];
    sources.push({
      id: `${customer.id}:recipient:${account}`,
      label: `Recipient account key: ${account}`,
      kind: 'relationship',
      details: `${matches.length} observed completed outgoing transfer(s), ${money(matches.reduce((n, m) => n + m.transaction.amount, 0))} total, from ${new Set(matches.map((m) => m.customerId)).size} customer(s) in the supplied synthetic portfolio as of ${asOf}. Exact-key matches: ${
        matches
          .slice(0, 30)
          .map((m) => `${m.transaction.id} (${m.customerId})`)
          .join(', ') || 'None'
      }.${matches.length > 30 ? ' Source listing limited to 30 matches.' : ''} Shared destinations do not prove collusion or ownership.`,
    });
  }
  const gaps = [
    'No typed device/session table or cross-customer device IDs; device findings use recorded events and transaction flags only.',
    'No merchant registry, merchant risk history, verified recipient ownership, IP or transaction location records.',
    'No empirical full-history baseline for frequency, time of day or location; no calibrated scam-pattern confidence.',
    'No observed monthly income/expense series, current loan outstanding balance or previous intervention outcomes.',
  ];
  if (all.length > transactions.length || visibleEvents(customer, asOf).length > events.length)
    gaps.push(
      `Recent detail limited to ${investigationLimits.transactions} transactions and ${investigationLimits.events} events; ledger totals use all observed entries.`,
    );
  if (!trigger) gaps.push('No completed transfer is available as a trigger transaction.');
  return {
    caseId: record.id,
    customerId: customer.id,
    customerName: customer.name,
    asOf,
    risk,
    financial,
    triggerTransaction: trigger ? { ...trigger, signals: [...trigger.signals] } : null,
    baseline: {
      usualTransfer: customer.usualTransfer,
      salary: customer.salary,
      expenses: customer.expenses,
      source: 'configured profile',
    },
    transactions,
    sources,
    gaps,
  };
}

export function generateLocalReport(
  e: InvestigationEvidence,
  customer: Customer,
): InvestigationReport {
  customer = { ...customer, loan: { ...customer.loan, salaryAt: expectedSalaryAt(customer, e.asOf), history: repaymentHistoryAt(customer, e.asOf) } };
  const assessment = assessContext(customer, e.asOf, e.risk);
  const profileId = `${e.customerId}:profile`;
  const riskId = `${e.customerId}:risk`;
  const financialId = `${e.customerId}:financial`;
  const loanId = `${e.customerId}:loan`;
  const tx = e.triggerTransaction;
  const sourceIds = new Set(e.sources.map((s) => s.id));
  const observedIds = assessment.evidence
    .map((event) => event.id)
    .filter((id) => sourceIds.has(id));
  const paymentIds = e.transactions
    .filter((t) => t.category === 'transfer' && t.signals.length)
    .map((t) => t.id);
  const riskFactors: InvestigationReport['riskFactors'] = [];
  if (tx && tx.amount >= e.baseline.usualTransfer * thresholds.largeTransferMultiple)
    riskFactors.push({
      ...claim(
        `${money(tx.amount)} is ${(tx.amount / e.baseline.usualTransfer).toFixed(1)}× the configured usual transfer of ${money(e.baseline.usualTransfer)}.`,
        tx.id,
        profileId,
      ),
      severity: 'High',
    });
  if (tx?.newBeneficiary)
    riskFactors.push({
      ...claim('A new beneficiary flag is recorded on the trigger transfer.', tx.id),
      severity: 'High',
    });
  if (tx?.unusualDevice)
    riskFactors.push({
      ...claim(
        'An unusual-device flag is recorded on the trigger transfer. This does not establish device ownership or a scam.',
        tx.id,
      ),
      severity: 'High',
    });
  if (e.financial.shortfall > 0)
    riskFactors.push({
      ...claim(
        `Available EMI funds ${money(e.financial.fundsForEmi)} leave a forecast shortfall of ${money(e.financial.shortfall)}. This is a forecast, not proof of a missed payment.`,
        financialId,
        loanId,
      ),
      severity: 'High',
    });
  const signalTxs = e.transactions.filter((t) => t.signals.length > 0);
  const supportingEvidence = signalTxs.map((t) =>
    claim(`${t.id}: recorded signals — ${t.signals.join('; ')}.`, t.id),
  );
  const alternatives = [
    claim(assessment.alternative, ...observedIds.slice(-2), financialId, loanId),
  ];
  for (const source of e.sources.filter(
    (s) =>
      s.kind === 'event' && customer.events.find((v) => v.id === s.id)?.kind === 'verification',
  ))
    alternatives.push(claim(`${source.label}: ${source.details}`, source.id));
  if (e.financial.shortfall === 0)
    alternatives.push(
      claim(
        'The observed buffer covers the upcoming EMI after known essential commitments. Repayment coverage alone does not establish payment legitimacy.',
        financialId,
        loanId,
      ),
    );
  if (
    customer.loan.history.length &&
    customer.loan.history.every((h) => h.status === 'Paid' && h.daysLate === 0)
  )
    alternatives.push(
      claim(
        'All supplied prior installments were paid on time. Prior repayment behavior does not confirm the legitimacy of the trigger payment.',
        loanId,
      ),
    );
  const devices = e.sources.filter(
    (s) => s.kind === 'event' && customer.events.find((v) => v.id === s.id)?.kind === 'device',
  );
  const recipients = e.sources.filter((s) => s.kind === 'relationship');
  const high =
    e.risk.scamScore >= thresholds.scamAlert ||
    e.risk.repaymentScore >= thresholds.repaymentWarning;
  return {
    executiveSummary: claim(
      `${e.customerName}: ${assessment.explanation} ${e.risk.source === 'model' ? 'Estimates are trained on synthetic data; the scam episode peak is distinct from the seven-day repayment probability estimate.' : 'Both scores are simulated indices.'} Final determination requires human review.`,
      riskId,
      financialId,
      loanId,
      ...observedIds,
    ),
    riskLevel: high
      ? 'High'
      : e.risk.scamScore >= 20 || e.risk.repaymentScore >= 35
        ? 'Medium'
        : 'Low',
    riskFactors,
    behavioralAnalysis: tx
      ? claim(
          `Trigger ${tx.id} is a ${money(tx.amount)} ${tx.direction === 'out' ? 'outgoing' : 'incoming'} transfer. Configured usual transfer: ${money(e.baseline.usualTransfer)}. Frequency, usual transaction times and location deviations cannot be established from this limited dataset.`,
          tx.id,
          profileId,
        )
      : claim(`${MISSING} No completed transfer is recorded at the captured date.`, profileId),
    financialAnalysis: claim(
      `${money(e.financial.cash)} cash; ${money(e.financial.creditUsed)} credit liability. Known essentials before EMI: ${money(e.financial.essentialsBeforeEmi)}. ${money(customer.loan.emi)} EMI due ${customer.loan.dueAt.slice(0, 10)} is ${e.financial.emiStatus.toLowerCase()}. Expected salary date: ${customer.loan.salaryAt.slice(0, 10)}. Prior delay series: ${customer.loan.history.map((h) => `${h.month}: ${h.daysLate} days`).join(' → ') || MISSING}. No measured income or expense trend is available.`,
      financialId,
      loanId,
    ),
    deviceAnalysis: devices.length
      ? claim(
          `${devices.map((s) => `${s.label}: ${s.details}`).join(' ')} No cross-customer device associations can be verified.`,
          ...devices.map((s) => s.id),
        )
      : tx?.unusualDevice
        ? claim(
            'Only the unusual-device flag is available; device ID, first/last seen and cross-customer history are unavailable.',
            tx.id,
          )
        : claim(`${MISSING} No device history is recorded.`),
    merchantAnalysis: claim(
      `${MISSING} Counterparty labels are available in transactions, but no merchant registry or merchant-history evidence is supplied.`,
    ),
    recipientAnalysis: recipients.length
      ? recipients.map((s) => claim(s.details, s.id))
      : [claim(`${MISSING} No outgoing recipient transfer is available.`)],
    possiblePattern:
      assessment.context === 'Possible mule'
        ? claim(
            'Possible rapid pass-through pattern. Role and source of funds remain unconfirmed; legitimate pooled payments are an alternative. No calibrated confidence estimate is available.',
            ...paymentIds,
          )
        : claim(
            `${assessment.context}. Scam subtype: Unknown. ${MISSING} A verified subtype and calibrated confidence estimate are unavailable.`,
            riskId,
            ...paymentIds,
          ),
    supportingEvidence,
    alternatives,
    recommendedActions: [
      ...interventions(customer, e.asOf, assessment).map((a) =>
        claim(`${a.title}: ${a.detail}`, riskId, financialId, loanId),
      ),
      claim(
        'Review source records, verify payment purpose and recipient ownership, then record your decision and notes below. These are review suggestions; no banking action or contact is executed.',
      ),
    ],
    timeline: e.sources
      .filter((s) => s.at && (s.kind === 'transaction' || s.kind === 'event'))
      .sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!)),
    humanDecisionRequired: true,
  };
}

export function buildInvestigation(
  record: CaseRecord,
  customer: Customer,
  portfolio: Customer[],
  now = new Date().toISOString(),
): InvestigationSnapshot {
  const start = performance.now();
  const evidence = collectInvestigationEvidence(record, customer, portfolio);
  const retrieved = performance.now();
  const report = generateLocalReport(evidence, customer);
  const snapshot: InvestigationSnapshot = {
    schemaVersion: 1,
    reporter: REPORT_VERSION,
    generatedAt: now,
    retrievalMs: Math.round(retrieved - start),
    generationMs: Math.round(performance.now() - retrieved),
    evidence,
    report,
  };
  validateInvestigation(snapshot, record);
  return snapshot;
}

/** Reject malformed saved reports in the feature boundary without blocking the rest of V1. */
export function validateInvestigation(
  value: unknown,
  record: CaseRecord,
): asserts value is InvestigationSnapshot {
  const v = value as InvestigationSnapshot;
  if (
    !v ||
    v.schemaVersion !== 1 ||
    v.reporter !== REPORT_VERSION ||
    !Number.isFinite(Date.parse(v.generatedAt)) ||
    v.evidence?.caseId !== record.id ||
    v.evidence?.customerId !== record.customerId ||
    v.evidence?.asOf !== record.evidenceAsOf ||
    !Array.isArray(v.evidence?.sources) ||
    !Array.isArray(v.evidence?.transactions) ||
    !Array.isArray(v.evidence?.gaps) ||
    !v.evidence?.risk ||
    !v.evidence?.financial ||
    !v.evidence?.baseline ||
    !v.report ||
    v.report.humanDecisionRequired !== true ||
    !['High', 'Medium', 'Low'].includes(v.report.riskLevel)
  )
    throw new Error('Saved investigation report is invalid. Generate it again.');
  const ids = new Set(v.evidence.sources.map((s) => s.id));
  if (
    ids.size !== v.evidence.sources.length ||
    v.evidence.sources.some(
      (s) =>
        typeof s.id !== 'string' ||
        typeof s.label !== 'string' ||
        typeof s.details !== 'string' ||
        !['profile', 'risk', 'financial', 'loan', 'transaction', 'event', 'relationship'].includes(
          s.kind,
        ),
    )
  )
    throw new Error('Saved evidence sources are invalid. Generate the report again.');
  const lists = [
    v.report.riskFactors,
    v.report.recipientAnalysis,
    v.report.supportingEvidence,
    v.report.alternatives,
    v.report.recommendedActions,
  ];
  if (
    lists.some((list) => !Array.isArray(list)) ||
    !Array.isArray(v.report.timeline) ||
    v.evidence.gaps.some((g) => typeof g !== 'string')
  )
    throw new Error('Saved investigation sections are invalid. Generate the report again.');
  const claims = [
    v.report.executiveSummary,
    v.report.behavioralAnalysis,
    v.report.financialAnalysis,
    v.report.deviceAnalysis,
    v.report.merchantAnalysis,
    v.report.possiblePattern,
    ...lists.flat(),
  ];
  if (
    claims.some(
      (c) =>
        !c ||
        typeof c.text !== 'string' ||
        !Array.isArray(c.sourceIds) ||
        c.sourceIds.some((id) => !ids.has(id)),
    ) ||
    v.report.timeline.some(
      (s) =>
        !s ||
        !ids.has(s.id) ||
        typeof s.label !== 'string' ||
        typeof s.details !== 'string' ||
        !Number.isFinite(Date.parse(s.at!)) ||
        Date.parse(s.at!) > Date.parse(record.evidenceAsOf),
    )
  )
    throw new Error(
      'The report contains invalid or unavailable evidence references. Generate it again.',
    );
  if (
    typeof v.evidence.customerName !== 'string' ||
    typeof v.evidence.risk.providerVersion !== 'string' ||
    !['simulated', 'model'].includes(v.evidence.risk.source) ||
    ![
      v.evidence.risk.scamScore,
      v.evidence.risk.repaymentScore,
      v.evidence.financial.cash,
      v.evidence.financial.creditUsed,
      v.evidence.baseline.usualTransfer,
      v.evidence.baseline.salary,
      v.evidence.baseline.expenses,
    ].every(Number.isFinite) ||
    v.report.riskFactors.some((f) => !['High', 'Medium'].includes(f.severity)) ||
    !v.evidence.sources.some((s) => s.id === `${record.customerId}:risk` && s.kind === 'risk')
  )
    throw new Error('Saved investigation values are invalid. Generate the report again.');
}

/** Local evidence lookup, intentionally not presented as an open-ended LLM chat. */
export function askInvestigation(snapshot: InvestigationSnapshot, question: string): Claim[] {
  const q = question.trim().toLowerCase();
  const { report: r, evidence: e } = snapshot;
  const exact = e.sources.filter((s) => q.includes(s.id.toLowerCase()));
  if (exact.length) return exact.map((s) => claim(s.details, s.id));
  if (/contradict|alternative|false positive|legitimate/.test(q)) return r.alternatives;
  if (/device|session/.test(q)) return [r.deviceAnalysis];
  if (/merchant/.test(q)) return [r.merchantAnalysis];
  if (/recipient|beneficiar|other customer/.test(q)) return r.recipientAnalysis;
  if (/baseline|normal|usual|behavior/.test(q)) return [r.behavioralAnalysis];
  if (/loan|emi|repay|income|expense|financial|shortfall/.test(q)) return [r.financialAnalysis];
  if (/timeline|histor|transaction|activity/.test(q))
    return r.timeline.map((s) => claim(`${s.at}: ${s.details}`, s.id));
  if (/pattern|scam type|investment/.test(q)) return [r.possiblePattern];
  if (/why|risk|score|flag/.test(q))
    return [
      claim(e.sources.find((s) => s.kind === 'risk')!.details, `${e.customerId}:risk`),
      ...r.riskFactors,
      ...r.supportingEvidence,
    ];
  if (/next|action|step/.test(q)) return r.recommendedActions;
  return [
    claim(
      `${MISSING} Local lookup supports risk signals, baseline, device, merchant, recipient, loan, timeline and alternative evidence questions, or an exact source ID. It cannot infer new facts or search outside this captured case.`,
    ),
  ];
}
