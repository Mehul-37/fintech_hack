import { describe, expect, it } from 'vitest';
import { customers, at, endOfDay } from './data';
import { assessContext } from './context';
import { scoreProvider } from './scoring';
import { interventions } from './interventions';
import { createCase, loadCases, saveCases, updateCase, STORAGE_KEY } from './persistence';
import {
  askInvestigation,
  buildInvestigation,
  collectInvestigationEvidence,
  generateLocalReport,
  investigationLimits,
  validateInvestigation,
} from './investigation';
import type { Customer } from './types';

const arjun = customers[0];
const dev = customers[4];
const now = '2026-10-03T18:00:00.000Z';
function caseFor(customer = arjun, asOf = endOfDay(24)) {
  const assessment = assessContext(customer, asOf);
  const action = interventions(customer, asOf, assessment)[0] ?? {
    kind: 'verification' as const,
    title: 'Manual verification',
    detail: '',
    priority: 'Medium' as const,
  };
  return createCase([], customer, asOf, action, assessment, now).record;
}

describe('controlled investigation evidence', () => {
  it('captures only observed facts and leaves risk fixtures untouched', () => {
    const before = JSON.stringify(customers);
    const evidence = collectInvestigationEvidence(
      caseFor(arjun, at(13, '14:02')),
      arjun,
      customers,
    );
    expect(evidence.transactions.some((t) => t.id === 'A-T1')).toBe(true);
    expect(evidence.transactions.some((t) => t.id === 'A-T2')).toBe(false);
    expect(evidence.sources.some((s) => s.id === 'A-E3')).toBe(false);
    expect(
      evidence.sources
        .filter((s) => s.kind === 'transaction' || s.kind === 'event')
        .every((s) => Date.parse(s.at!) <= Date.parse(evidence.asOf)),
    ).toBe(true);
    expect(JSON.stringify(evidence)).not.toContain(arjun.story);
    expect(JSON.stringify(evidence)).not.toContain('A-ESS3');
    expect(JSON.stringify(customers)).toBe(before);
  });
  it('keeps known future commitments separate from observed transactions and loan outcomes', () => {
    const e = collectInvestigationEvidence(caseFor(), arjun, customers);
    expect(e.transactions.some((t) => t.id === 'A-FUTURE')).toBe(false);
    expect(e.financial.essentialsBeforeEmi).toBe(6000);
    expect(e.financial.shortfall).toBe(12000);
    expect(e.financial.emiStatus).toBe('Upcoming');
    expect(e.baseline.source).toBe('configured profile');
  });
  it('matches actual recipient keys across customers, excludes future matches and does not fuzzy match', () => {
    const tx = arjun.transactions.find((t) => t.id === 'A-T1')!;
    const other: Customer = {
      ...customers[1],
      transactions: [
        { ...tx, id: 'MATCH', at: at(10) },
        { ...tx, id: 'FUTURE', at: at(25) },
        { ...tx, id: 'LOOKALIKE', account: `${tx.account}-other` },
        { ...tx, id: 'PENDING', status: 'Pending' },
      ],
    };
    const e = collectInvestigationEvidence(caseFor(), arjun, [arjun, other]);
    const relationship = e.sources.find((s) => s.kind === 'relationship')!;
    expect(relationship.details).toContain('2 customer(s)');
    expect(relationship.details).toContain('MATCH');
    expect(relationship.details).not.toContain('FUTURE');
    expect(relationship.details).not.toContain('LOOKALIKE');
    expect(relationship.details).not.toContain('PENDING');
  });
  it('does not invent device associations or merchant registries', () => {
    const snapshot = buildInvestigation(caseFor(), arjun, customers, now);
    expect(snapshot.report.deviceAnalysis.text).toContain('No cross-customer device associations');
    expect(snapshot.report.merchantAnalysis.text).toContain('Insufficient evidence available');
    expect(snapshot.evidence.gaps).toHaveLength(4);
  });
  it('limits detail and preserves an older highest-risk trigger', () => {
    const c = structuredClone(arjun);
    const sample = c.transactions[0];
    c.transactions.push(
      ...Array.from({ length: 50 }, (_, i) => ({
        ...sample,
        id: `EXTRA-${i}`,
        amount: 1,
        at: at(22),
        risk: 1,
      })),
    );
    const e = collectInvestigationEvidence(caseFor(c), c, [c]);
    expect(e.transactions).toHaveLength(investigationLimits.transactions);
    expect(e.transactions.some((t) => t.id === 'A-T2')).toBe(true);
    expect(e.gaps.join(' ')).toContain('Recent detail limited');
  });
  it('handles missing transactions and validates customer and date input', () => {
    const c = { ...customers[1], transactions: [], events: [] };
    const record = caseFor(c);
    const e = collectInvestigationEvidence(record, c, [c]);
    expect(e.triggerTransaction).toBeNull();
    expect(generateLocalReport(e, c).behavioralAnalysis.text).toContain(
      'Insufficient evidence available',
    );
    expect(() => collectInvestigationEvidence(record, dev, customers)).toThrow('customer');
    expect(() =>
      collectInvestigationEvidence({ ...record, evidenceAsOf: 'invalid' }, c, [c]),
    ).toThrow('date');
  });
});

describe('local reporter, review and persisted snapshots', () => {
  it('produces deterministic evidence and report content from identical inputs', () => {
    const record = caseFor();
    const first = buildInvestigation(record, arjun, customers, now);
    const second = buildInvestigation(record, arjun, customers, now);
    expect(second.evidence).toEqual(first.evidence);
    expect(second.report).toEqual(first.report);
  });
  it('completes a synthetic risk → case → report → human decision → reload flow', () => {
    const record = caseFor();
    const investigation = buildInvestigation(record, arjun, customers, now);
    expect(investigation.evidence.risk.source).toBe('model');
    expect(investigation.evidence.risk.scamScore).toBeGreaterThanOrEqual(70);
    expect(investigation.evidence.sources.find((s) => s.kind === 'risk')?.details).toContain(
      `Repayment Risk ${scoreProvider.score(arjun, arjun.events[0].at).repaymentScore}/100`,
    );
    expect(investigation.report.riskLevel).toBe('High');
    expect(investigation.report.riskFactors.some((f) => f.text.includes('8.9×'))).toBe(true);
    expect(investigation.report.financialAnalysis.text).toContain('upcoming');
    expect(investigation.report.alternatives.length).toBeGreaterThan(0);
    expect(investigation.report.humanDecisionRequired).toBe(true);
    const reviewed = updateCase(
      record,
      {
        investigation,
        disposition: 'Requires customer verification',
        reviewedBy: record.owner,
        reviewedAt: now,
        notes: [{ at: now, text: 'Verify recipient ownership.' }],
      },
      'Human decision recorded',
      now,
    );
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    saveCases(storage, [reviewed]);
    const restored = loadCases(storage)[0];
    expect(restored.investigation).toEqual(investigation);
    expect(restored.reviewedBy).toBe(record.owner);
    expect(restored.notes[0].text).toBe('Verify recipient ownership.');
    expect(restored.status).toBe('Open');
    expect(() => validateInvestigation(restored.investigation, restored)).not.toThrow();
  });
  it('preserves existing case format and duplicate prevention', () => {
    const record = caseFor();
    expect(
      loadCases({ getItem: () => JSON.stringify([record]), setItem: () => {} })[0].investigation,
    ).toBeUndefined();
    const duplicate = createCase(
      [record],
      arjun,
      endOfDay(13),
      interventions(arjun, endOfDay(24))[0],
      assessContext(arjun, endOfDay(24)),
      now,
    );
    expect(duplicate.created).toBe(false);
    expect(duplicate.record.evidenceAsOf).toBe(endOfDay(24));
    expect(STORAGE_KEY).toBe('meridian.cases.v1');
  });
  it('uses the saved case date after replay changes', () => {
    const record = caseFor(arjun, endOfDay(12));
    const report = buildInvestigation(record, arjun, customers, now);
    expect(report.evidence.risk.scamScore).toBe(scoreProvider.score(arjun, endOfDay(12)).scamScore);
    expect(JSON.stringify(report)).not.toContain('A-T1');
    expect(report.evidence.asOf).toBe(endOfDay(12));
  });
  it('offers supporting and alternative evidence for suspicious, mixed and plausible false-positive demos', () => {
    const suspicious = buildInvestigation(caseFor(), arjun, customers, now);
    const mixed = buildInvestigation(caseFor(dev), dev, customers, now);
    // Authored score changes must not change a model-backed assessment.
    const plausible = {
      ...structuredClone(dev),
      scorePoints: dev.scorePoints.map((p) => ({ ...p, scam: 88 })),
    };
    const high = buildInvestigation(caseFor(plausible), plausible, [plausible], now);
    expect(suspicious.report.riskLevel).toBe('High');
    expect(high.report.riskLevel).toBe(mixed.report.riskLevel);
    expect(high.evidence.risk).toEqual(mixed.evidence.risk);
    for (const snapshot of [suspicious, mixed, high]) {
      expect(snapshot.report.supportingEvidence.length).toBeGreaterThan(0);
      expect(snapshot.report.alternatives.length).toBeGreaterThan(0);
      expect(snapshot.report.humanDecisionRequired).toBe(true);
    }
    expect(high.report.alternatives.some((a) => a.text.includes('property deposit'))).toBe(true);
    expect(high.report.possiblePattern.text).toContain('Unknown');
  });
  it('explains observed loan pressure without inventing income trends or overdue outcomes', () => {
    const neha = customers[2];
    const snapshot = buildInvestigation(caseFor(neha), neha, customers, now);
    expect(snapshot.report.financialAnalysis.text).toContain('No measured income or expense trend');
    expect(snapshot.report.financialAnalysis.text).toContain('upcoming');
    expect(snapshot.report.financialAnalysis.sourceIds).toContain(`${neha.id}:loan`);
  });
  it('reports possible pass-through without establishing participation', () => {
    const rohan = customers[3];
    const snapshot = buildInvestigation(caseFor(rohan), rohan, customers, now);
    expect(snapshot.report.possiblePattern.text).toContain('Possible rapid pass-through');
    expect(snapshot.report.possiblePattern.text).toContain('legitimate pooled payments');
  });
  it('rejects malformed reports, unknown references, future timeline and mismatched case snapshots', () => {
    const record = caseFor();
    const snapshot = buildInvestigation(record, arjun, customers, now);
    for (const bad of [
      null,
      '{invalid json',
      {},
      { ...snapshot, report: {} },
      { ...snapshot, evidence: {} },
    ])
      expect(() => validateInvestigation(bad, record)).toThrow();
    const unknown = structuredClone(snapshot);
    unknown.report.executiveSummary.sourceIds.push('INVENTED');
    expect(() => validateInvestigation(unknown, record)).toThrow('references');
    const future = structuredClone(snapshot);
    future.report.timeline[0].at = at(25);
    expect(() => validateInvestigation(future, record)).toThrow('references');
    expect(() => validateInvestigation(snapshot, { ...record, id: 'OTHER' })).toThrow('invalid');
    expect(() => validateInvestigation(snapshot, { ...record, evidenceAsOf: endOfDay(1) })).toThrow(
      'invalid',
    );
  });
  it('does not make a bad optional report prevent loading existing case controls', () => {
    const record = { ...caseFor(), investigation: { bad: true } };
    const loaded = loadCases({ getItem: () => JSON.stringify([record]), setItem: () => {} });
    expect(loaded[0].status).toBe('Open');
    expect(() => validateInvestigation(loaded[0].investigation, loaded[0])).toThrow();
  });
  it('answers case questions from sources and returns insufficient evidence for unsupported topics', () => {
    const snapshot = buildInvestigation(caseFor(), arjun, customers, now);
    expect(askInvestigation(snapshot, 'A-T1')[0].text).toContain('₹47,000');
    expect(askInvestigation(snapshot, 'What contradicts the alert?')).toEqual(
      snapshot.report.alternatives,
    );
    expect(askInvestigation(snapshot, 'Has this device appeared with other customers?')).toEqual([
      snapshot.report.deviceAnalysis,
    ]);
    expect(askInvestigation(snapshot, 'What is the EMI shortfall?')).toEqual([
      snapshot.report.financialAnalysis,
    ]);
    expect(askInvestigation(snapshot, 'What is the customer password?')[0].text).toContain(
      'Insufficient evidence available',
    );
    const ids = new Set(snapshot.evidence.sources.map((s) => s.id));
    expect(
      askInvestigation(snapshot, 'Why was this flagged?').every((a) =>
        a.sourceIds.every((id) => ids.has(id)),
      ),
    ).toBe(true);
  });
});
