import type { ScoreProvider, RiskSnapshot } from './types';
import { dayOf } from './data';
import { visibleEvents, visibleTransactions } from './selectors';
export const simulatedScoreProvider: ScoreProvider = {
  score(c, asOf): RiskSnapshot {
    const p =
      [...c.scorePoints].reverse().find((p) => {
        const observation = c.events.find((e) => dayOf(e.at) === p.day);
        return (
          p.day <= dayOf(asOf) && (!observation || Date.parse(observation.at) <= Date.parse(asOf))
        );
      }) ?? c.scorePoints[0];
    const events = visibleEvents(c, asOf);
    const transactions = visibleTransactions(c, asOf);
    return {
      customerId: c.id,
      asOf,
      scamScore: p.scam,
      repaymentScore: p.repayment,
      source: 'simulated',
      providerVersion: 'authored-v1.0',
      evidenceIds: events.map((e) => e.id),
      observedSignals: [...new Set(transactions.flatMap((t) => t.signals))],
      latestTransactionScore: transactions.at(-1)?.risk,
      episode: p.episodeDay
        ? {
            peak: p.scam,
            observedAt: c.events.find((e) => e.kind === 'transfer')!.at,
            windowStart: c.events.find((e) => e.kind === 'transfer')!.at,
            status: 'open',
          }
        : undefined,
    };
  },
};

// Replace this binding for V2. Views depend on the provider contract.
export const scoreProvider: ScoreProvider = simulatedScoreProvider;
