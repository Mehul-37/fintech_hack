import { describe, expect, it } from 'vitest';
import { at, customers, endOfDay } from './data';
import {
  assessContext,
  financialState,
  interventions,
  simulatedScoreProvider,
  visibleEvents,
  visibleTransactions,
  highlightedEvents,
} from './engine';
import { createCase, loadCases, saveCases, updateCase } from './persistence';
import { transactionModelScore } from './ml-inference';
const arjun = customers[0];
describe('ledger and as-of invariants', () => {
  it('highlights the observed payment behind a generated customer episode peak', () => {
    const c = customers.find((c) => c.name === 'Riya Malhotra')!;
    const asOf = endOfDay(24);
    const peak = visibleTransactions(c, asOf).filter((t) => t.category === 'transfer' && t.status === 'Completed')
      .sort((a, b) => transactionModelScore(c, b) - transactionModelScore(c, a))[0];
    expect(highlightedEvents(c, asOf).some((e) => e.transactionIds?.includes(peak.id))).toBe(true);
  });
  it('keeps highlighted evidence unique, chronological and strictly as-of at every replay step', () => {
    for (const c of customers)
      for (let day = 1; day <= 24; day++) {
        const events = highlightedEvents(c, endOfDay(day));
        expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
        expect(events.every((e) => Date.parse(e.at) <= Date.parse(endOfDay(day)))).toBe(true);
        expect(events.map((e) => e.at)).toEqual(
          [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map((e) => e.at),
        );
      }
  });
  it('reconciles every customer at every replay day without negative cash', () => {
    for (const c of customers)
      for (let day = 1; day <= 24; day++) {
        const ts = visibleTransactions(c, endOfDay(day)).filter((t) => t.status === 'Completed');
        const expected = (Math.round(c.openingCash * 100) + ts.reduce((sum, t) =>
          sum + Math.round(t.amount * 100) * (t.direction === 'in' ? 1 : -1), 0)) / 100;
        expect(financialState(c, endOfDay(day)).cash).toBe(expected);
        expect(expected).toBeGreaterThanOrEqual(0);
      }
  });
  it('reproduces the exact six-minute shock', () => {
    expect(financialState(arjun, at(13, '14:01')).cash).toBe(96000);
    expect(financialState(arjun, at(13, '14:08')).cash).toBe(18000);
    expect(
      arjun.transactions.find((t) => t.id === 'A-T2')!.amount +
        arjun.transactions.find((t) => t.id === 'A-T1')!.amount,
    ).toBe(78000);
    expect((96000 - 18000) / 96000).toBe(0.8125);
  });
  it('counts credit as cash and a liability, not income', () => {
    const state = financialState(arjun, endOfDay(17));
    expect(state.cash).toBe(19000);
    expect(state.creditUsed).toBe(10000);
    expect(state.utilization).toBeCloseTo(16.6667, 3);
  });
  it('forecasts the EMI before salary without marking it missed', () => {
    const state = financialState(arjun, endOfDay(24));
    expect(state.cash).toBe(12000);
    expect(state.essentialsBeforeEmi).toBe(6000);
    expect(state.fundsForEmi).toBe(6000);
    expect(state.shortfall).toBe(12000);
    expect(state.daysPastDue).toBe(0);
    expect(state.emiStatus).toBe('Upcoming');
    expect(Date.parse(arjun.loan.dueAt)).toBeLessThan(Date.parse(arjun.loan.salaryAt));
  });
  it('hides future evidence and transactions on backwards replay', () => {
    expect(visibleEvents(arjun, endOfDay(12)).map((e) => e.id)).toEqual(['A-E1', 'A-E2']);
    expect(visibleTransactions(arjun, endOfDay(12)).some((t) => t.id === 'A-T1')).toBe(false);
    expect(assessContext(arjun, endOfDay(12)).explanation).not.toContain('78,000');
    expect(simulatedScoreProvider.score(arjun, endOfDay(12)).evidenceIds).not.toContain('A-E3');
  });
  it('does not expose an episode score before its observation timestamp', () => {
    expect(simulatedScoreProvider.score(arjun, at(13, '14:01')).scamScore).toBe(23);
    expect(simulatedScoreProvider.score(arjun, at(13, '14:01')).episode).toBeUndefined();
    expect(simulatedScoreProvider.score(arjun, at(13, '14:08')).scamScore).toBe(91);
  });
  it('does not use future settled consumption as a known commitment', () => {
    const c = { ...arjun, transactions: arjun.transactions.filter((t) => t.status !== 'Pending') };
    expect(financialState(c, endOfDay(1)).essentialsBeforeEmi).toBe(0);
  });
});
describe('score provider and context routing', () => {
  it('matches canonical scripted scores and stable backwards/forwards replay', () => {
    const sequence = [
      [1, 8, 17],
      [12, 23, 17],
      [13, 91, 22],
      [17, 91, 31],
      [20, 91, 46],
      [24, 91, 68],
    ];
    for (const [day, scam, repayment] of [...sequence, ...sequence.reverse()]) {
      const r = simulatedScoreProvider.score(arjun, endOfDay(day));
      expect([r.scamScore, r.repaymentScore]).toEqual([scam, repayment]);
      expect(r.source).toBe('simulated');
    }
  });
  it('keeps open episode peak separate from latest transaction', () => {
    const r = simulatedScoreProvider.score(arjun, endOfDay(24));
    expect(r.episode?.observedAt).toContain('09-13');
    expect(r.episode?.peak).toBe(91);
    expect(r.latestTransactionScore).toBe(5);
  });
  it('produces five distinct contexts and interventions from observable evidence', () => {
    expect(customers.slice(0, 5).map((c) => assessContext(c, endOfDay(24)).context)).toEqual([
      'Possible scam-linked distress',
      'Healthy',
      'Organic distress',
      'Possible mule',
      'Uncertain / manual review',
    ]);
    expect(interventions(customers[1], endOfDay(24))).toEqual([]);
    expect(interventions(customers[3], endOfDay(24)).some((a) => a.kind === 'support')).toBe(false);
    expect(interventions(arjun, endOfDay(24)).map((a) => a.kind)).toContain('support');
  });
  it('does not consult hidden scenario labels', () => {
    const altered = { ...arjun, story: 'Healthy' };
    expect(assessContext(altered, endOfDay(24))).toEqual(assessContext(arjun, endOfDay(24)));
  });
  it('routes pre-existing distress and competing income gaps to manual review', () => {
    const priorDistress = {
      ...arjun,
      loan: { ...arjun.loan, history: [{ month: 'Aug 2026', status: 'Missed' as const, daysLate: 32 }] },
    };
    expect(assessContext(priorDistress, endOfDay(24)).context).toBe('Uncertain / manual review');
    const incomeGap = {
      ...arjun,
      events: [
        ...arjun.events,
        {
          id: 'COMPETING',
          at: at(10),
          title: 'Payroll gap',
          detail: 'Competing income explanation',
          kind: 'income' as const,
        },
      ],
    };
    expect(assessContext(incomeGap, endOfDay(24)).context).toBe('Uncertain / manual review');
  });
  it('requires distinct senders for a possible mule inference', () => {
    const repeated = {
      ...customers[3],
      transactions: customers[3].transactions.map((t) =>
        t.direction === 'in' ? { ...t, account: 'same-sender' } : t,
      ),
    };
    expect(assessContext(repeated, endOfDay(24)).context).not.toBe('Possible mule');
  });
  it('requires deterioration after the shock for linked distress', () => {
    expect(assessContext(arjun, endOfDay(13)).context).toBe('Suspected scam');
    expect(interventions(arjun, endOfDay(13)).some((a) => a.kind === 'support')).toBe(false);
  });
});
describe('persistent case actions', () => {
  const store = {
    data: new Map<string, string>(),
    getItem(key: string) {
      return this.data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      this.data.set(key, value);
    },
  };
  it('round-trips status, notes, contact outcome and audit entries', () => {
    const a = interventions(arjun, endOfDay(24))[0];
    const result = createCase(
      [],
      arjun,
      endOfDay(24),
      a,
      assessContext(arjun, endOfDay(24)),
      '2026-10-03T12:00:00Z',
    );
    const changed = updateCase(
      result.record,
      {
        status: 'In review',
        contactOutcome: 'Customer initiated payment · legitimacy unconfirmed',
        notes: [{ at: '2026-10-03T12:01:00Z', text: 'Customer confirmation pending.' }],
      },
      'Status changed to In review.',
    );
    saveCases(store, [changed]);
    expect(loadCases(store)).toEqual([changed]);
    expect(loadCases(store)[0].activity).toHaveLength(2);
  });
  it('prevents duplicate customer/action tasks even after resolution', () => {
    const a = interventions(arjun, endOfDay(24))[0];
    const first = createCase([], arjun, endOfDay(24), a, assessContext(arjun, endOfDay(24)));
    const second = createCase(
      first.cases,
      arjun,
      endOfDay(24),
      a,
      assessContext(arjun, endOfDay(24)),
    );
    expect(second.created).toBe(false);
    expect(second.cases).toHaveLength(1);
  });
  it('reports corrupt stored records instead of silently deleting them', () => {
    const invalid = { getItem: () => '{broken', setItem: () => {} };
    expect(() => loadCases(invalid)).toThrow();
  });
});
