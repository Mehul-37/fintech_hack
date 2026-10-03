import type { ScoreProvider, RiskSnapshot } from './types';
import { dayOf } from './data';
import { visibleEvents, visibleTransactions } from './selectors';
import { modelProbability, modelVersion, probabilityScore, repaymentFeatures, transactionModelScore } from './ml-inference';
import { thresholds } from './config';
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

// All current views share this trained provider; authored values stay an explicit reference.
export const trainedScoreProvider: ScoreProvider = {
  score(c, asOf): RiskSnapshot {
    const transactions = visibleTransactions(c, asOf).filter((t) => t.status === 'Completed');
    const relevant = transactions.filter((t) => t.category === 'transfer');
    const scored = relevant.map((t) => ({ t, score: transactionModelScore(c, t) }));
    const peak = scored.reduce<(typeof scored)[number] | undefined>((p, s) => !p || s.score > p.score ? s : p, undefined);
    return {
      customerId: c.id, asOf, source: 'model', providerVersion: modelVersion,
      scamScore: peak?.score ?? 0,
      repaymentScore: probabilityScore(modelProbability('repayment', repaymentFeatures(c, asOf))),
      evidenceIds: visibleEvents(c, asOf).map((e) => e.id),
      observedSignals: [...new Set(transactions.flatMap((t) => t.signals))],
      latestTransactionScore: transactions.length ? transactionModelScore(c, transactions.at(-1)!) : undefined,
      episode: peak && peak.score >= thresholds.scamAlert ? { peak: peak.score, observedAt: peak.t.at, windowStart: peak.t.at, status: 'open' } : undefined,
    };
  },
};
export const scoreProvider: ScoreProvider = trainedScoreProvider;
