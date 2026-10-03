import { describe, expect, it } from 'vitest';
import { customers, endOfDay } from './data';
import { assessContext } from './context';
import type { Customer } from './types';
import { isSuspiciousTransfer } from './ml-inference';

const clone = (): Customer => structuredClone(customers[0]);
describe('contextual exception controls', () => {
  it('does not call an account healthy when it has a high repayment estimate without scam evidence', () => {
    const c = customers.find((c) => c.name === 'Ishan Verma')!;
    expect(assessContext(c, endOfDay(24)).context).toBe('Uncertain / manual review');
    expect(assessContext(c, endOfDay(24)).strength).toBe('Repayment pressure · verify cash flow');
  });
  it('distinguishes moderate model evidence from a recorded competing income explanation', () => {
    const c = customers.find((c) => c.name === 'Dev Shah')!;
    const assessment = assessContext(c, endOfDay(24));
    expect(assessment.context).toBe('Uncertain / manual review');
    expect(assessment.strength).toBe('Moderate estimate · verification needed');
    expect(assessment.explanation).not.toContain('income interruption');
    const incomeGap = customers.find((c) => c.name === 'Riya Malhotra')!;
    expect(assessContext(incomeGap, endOfDay(24)).strength).toBe('Competing explanation · manual review');
  });
  it('permits a familiar-device scam when model and cash evidence support it', () => {
    const familiar = clone();
    familiar.transactions = familiar.transactions.map((t) => ({ ...t, unusualDevice: false }));
    expect(familiar.transactions.some((t) => isSuspiciousTransfer(familiar, t))).toBe(true);
    expect(['Suspected scam', 'Possible scam-linked distress', 'Uncertain / manual review'])
      .toContain(assessContext(familiar, endOfDay(24)).context);
  });
  it('does not attribute buffered or recovered losses to EMI pressure', () => {
    const buffered = clone(); buffered.openingCash += 100000;
    const recovered = clone();
    recovered.transactions.push({ ...recovered.transactions[0], id: 'RECOVERY',
      at: '2026-09-16T12:00:00+05:30', amount: 78000, category: 'transfer',
      direction: 'in', account: 'recovery', risk: 0 });
    for (const c of [buffered, recovered])
      expect(assessContext(c, endOfDay(24)).context).not.toBe('Possible scam-linked distress');
  });
  it('keeps competing prior distress and income gaps for manual review', () => {
    const prior = clone();prior.loan.history[0].status = 'Missed';
    const income = clone();income.events.push({ id: 'INCOME', at: '2026-09-10T12:00:00+05:30',
      kind: 'income', title: 'Income gap observed', detail: 'Income needs verification' });
    for (const c of [prior, income])
      expect(assessContext(c, endOfDay(24)).context).toBe('Uncertain / manual review');
  });
  it('does not turn legitimate large transfers or a device change into a link', () => {
    const legitimate = structuredClone(customers[1]);
    legitimate.transactions.push({ ...legitimate.transactions[0], id: 'LARGE',
      at: '2026-09-13T12:00:00+05:30', amount: 15000, category: 'transfer', direction: 'out',
      newBeneficiary: false, unusualDevice: false, account: 'known', risk: 0 });
    const changed = structuredClone(customers[1]);
    changed.transactions.push({ ...changed.transactions[0], id: 'DEVICE',
      at: '2026-09-13T12:00:00+05:30', amount: 2000, category: 'transfer', direction: 'out',
      newBeneficiary: false, unusualDevice: true, account: 'known', risk: 0 });
    for (const c of [legitimate, changed])
      expect(assessContext(c, endOfDay(24)).context).not.toBe('Possible scam-linked distress');
  });
});
