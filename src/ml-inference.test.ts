import { describe, expect, it } from 'vitest';
import fraudProbes from '../ml/artifacts/fraud-probes.json';
import repaymentProbes from '../ml/artifacts/repayment-probes.json';
import demoProbes from '../ml/artifacts/demo-feature-probes.json';
import { customers, endOfDay } from './data';
import { modelProbability, repaymentFeatures, transactionFeatures } from './ml-inference';
import { trainedScoreProvider } from './scoring';
import { financialState } from './selectors';
import { assessContext } from './context';

describe('trained inference boundaries', () => {
  it('matches source feature extraction on every exported presentation record', () => {
    for (const probe of demoProbes as { customerId: string; asOf?: string; transactionId?: string; features: number[] }[]) {
      const c = customers.find((c) => c.id === probe.customerId)!;
      const values = probe.asOf ? repaymentFeatures(c, probe.asOf)
        : transactionFeatures(c, c.transactions.find((t) => t.id === probe.transactionId)!);
      for (let i = 0; i < values.length; i++) expect(values[i]).toBeCloseTo(probe.features[i], 8);
    }
  });
  it('keeps previous installment payments from paying the upcoming installment', () => {
    for (const c of customers.filter((c) => c.dataSource === 'generated-holdout')) {
      expect(c.transactions.filter((t) => t.category === 'transfer').length).toBeGreaterThan(0);
      expect(financialState(c, endOfDay(24)).emiStatus).toBe('Upcoming');
      expect(financialState(c, endOfDay(24)).daysPastDue).toBe(0);
    }
  });
  it('assesses actual portfolio scores and historical ranges', () => {
    const audit = customers.map((c) => {
      const history = Array.from({ length: 24 }, (_, i) => ({ day: i + 1, ...trainedScoreProvider.score(c, endOfDay(i + 1)) }));
      return { id: c.id, name: c.name, dataSource: c.dataSource ?? 'authored',
        transactionCount: c.transactions.length, final: history.at(-1), history,
        context: assessContext(c, endOfDay(24)).context };
    });
    expect(audit.filter((r) => r.dataSource === 'generated-holdout')).toHaveLength(107);
    expect(customers).toHaveLength(112);
    expect(new Set(customers.map((c) => c.id)).size).toBe(112);
  });
  it('matches Python probabilities across both exported forests', () => {
    for (const [name, probes] of [['fraud', fraudProbes], ['repayment', repaymentProbes]] as const)
      for (const probe of probes) expect(modelProbability(name, probe.features)).toBeCloseTo(probe.probability, 12);
  });
  it('does not use authored scores or scenario labels', () => {
    const c = customers[0];
    const changed = { ...c, story: 'arbitrary', scorePoints: c.scorePoints.map((p) => ({ ...p, scam: 0, repayment: 0 })) };
    expect(trainedScoreProvider.score(changed, endOfDay(24))).toEqual(trainedScoreProvider.score(c, endOfDay(24)));
  });
  it('ignores future settled events and records', () => {
    const c = customers[0];
    const changed = { ...c, transactions: c.transactions.map((t) => Date.parse(t.at) > Date.parse(endOfDay(12)) && t.status === 'Completed' ? { ...t, amount: 900000 } : t) };
    expect(trainedScoreProvider.score(changed, endOfDay(12))).toEqual(trainedScoreProvider.score(c, endOfDay(12)));
  });
  it('responds to a changed observed cash buffer', () => {
    const c = customers[0];
    const original = trainedScoreProvider.score(c, endOfDay(24));
    const buffered = trainedScoreProvider.score({ ...c, openingCash: c.openingCash + 100000 }, endOfDay(24));
    expect(buffered.repaymentScore).toBeLessThan(original.repaymentScore);
  });
  it('returns finite scores and displays actual fixture outcomes', () => {
    for (const c of customers) for (let day=1;day<=24;day++) {
      const risk=trainedScoreProvider.score(c,endOfDay(day));
      expect(risk.source).toBe('model');
      expect(risk.scamScore).toBeGreaterThanOrEqual(0);expect(risk.scamScore).toBeLessThanOrEqual(100);
      expect(risk.repaymentScore).toBeGreaterThanOrEqual(0);expect(risk.repaymentScore).toBeLessThanOrEqual(100);
    }
  });
});
