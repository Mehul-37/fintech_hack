# V2 implementation handoff — 4 October 2026 (IST)

The generator, two trained models, customer-disjoint evaluation, saved artifacts and browser inference are complete. See `ML_RESULTS.md` for the explanation, `ml/README.md` for rerun commands, and `ML_VERIFICATION.md` for historical checks; see `MODEL_REVIEW.md` for current V2.1 results. The original V1 prototype and its historical verification remain reference material.

## Completed contracts

- `generator/generate.py`: seeded eight-table financial simulation, 2,000 customers, 43,630 completed history transactions, 26,446 completed follow-up transactions and 1,800 pending instructions. Source hashes and independent validation are saved.
- `ml/features.py`: strictly as-of numerical inputs; transaction fraud target and mature loan/snapshot seven-day unpaid-balance target. Final repayment summaries, fraud truth and scenario tags are excluded from features.
- `ml/train.py`: 1,400/300/300 customer groups, logistic baselines, two HistGradientBoosting candidates per target, validation-only selection/calibration/thresholds, test metrics, exception-cohort errors, warning lead time and portable forest export.
- `src/ml-inference.ts`: numerical browser evaluation of the exported forests and observed feature extraction. Python parity is tested. Both models run without a service; invalid input fails explicitly.
- `src/scoring.ts`: the shared binding now uses `trainedScoreProvider`; the old `simulatedScoreProvider` remains an explicit reference, not a fallback. Charts compute historical scores through the same binding. Scam display is an observed transaction episode peak; repayment estimates seven-day delinquency.
- `src/context.ts`: separate rule layer considers observed outflows, cash shock, later liquidity pressure, competing income/prior distress and fan-in/pass-through. Familiar-device scams are allowed. Due-date cash shortfall is distinguished from seven-day delinquency. Moderate estimates and competing explanations route to manual review. No causal inference is claimed.
- `src/config.ts`: validation alert thresholds are fraud 27.5 and repayment 27.5. Narrative confidence 75, cash shock .5, repayment rise 20, transfer multiple 5 and network .85 / 20 minutes / three distinct senders are transparent prototype rules, not learned bank policy.
- Investigation reports use trained score provenance for new captures. Existing reports keep their saved source/time/version until explicitly regenerated. Local persistence retains its current storage key and shape.

The live demo has five authored comparison fixtures and 107 generated customers (19 from seed 20261004, plus 88 from seed 20261006), evaluated using the trained models. They are selected by single-loan/date compatibility, without filtering scores or outcomes. The generated 2,000 customers are training/evaluation records, not imported dashboard rows. Multiple-loan training is supported; the current presentation contract still displays one loan per fixture. Supplied profile values, prior history and loan schedules are assumptions, not inferred truth. Arjun is outside all generated training/evaluation groups.

## Canonical target

At snapshot T, choose the next installment with T < dueAt <= T + 30 days. `overdue_7d = 1` iff its allocated completed payments leave an unpaid paise balance at the end of its seventh calendar day after due date in IST. Partial payment counts as positive. Full payment by the cutoff is negative. Exclude incomplete follow-up or no qualifying installment. This is early delinquency, not permanent default or a low/medium/high training class.

Financial forecasts subtract only already-known pending essentials before due. Future settled consumption is not input evidence. A credit draw raises both cash and liability. Salary dates are expectations, not guaranteed future receipts. Generated pending instructions may remain unexecuted; they are not assured settlement.

## Current demonstrated outcome

Arjun retains the ₹78,000 outflow and ₹12,000 due-date shortfall. His trained episode peak is 88.8; the seven-day estimate is 4.6 on 24 September. Expected salary 1 October precedes the 4 October cutoff. These measured fixture results replace the historical 91/68 sequence; the score is not forced to fit a presentation narrative.

The two models outperform logistic baselines on synthetic PR-AUC. Calibration is selected using customer-grouped cross-validation within validation: fraud uses Platt mapping and repayment keeps the identity mapping. See the measured results. Exception cohorts have standalone model errors in `evaluation.json`, while context validation currently covers targeted controls. A population-level contextual false-link/causal study and robust chronological generalization remain unverified.

## Deferred production work

FastAPI and SQLite are unnecessary for the current direct browser inference and are deferred. Before real deployment, add typed sessions, full multi-loan UI support, rolling/closable episode identities, empirical profile baselines, a richer settlement/cancellation lifecycle, real linked labelled data, purged chronological experiments, institutional threshold/cost selection and operator authentication.

If moving case persistence server-side, preserve captured evidence and timestamps, add transactional UUID/episode-aware idempotency, migrate `meridian.cases.v1` explicitly and retain original saved report provenance. Browser-local audit entries are not a secure institutional trail. No migration, public deployment, messages, holds, debt changes or recovery execution was performed here.

SHAP/feature contributions were not implemented. Input features and observed explanations are available, but narrative evidence must never be labelled a model attribution. Any dependency upgrade must rerun numerical export parity because the exporter reads pinned scikit-learn tree internals.


Portfolio expansion: the recording portfolio now contains 112 synthetic customer records. The original 24 IDs and histories are retained; 88 new records come from a separately validated source at `data/presentation-extension/`, seed 20261006, with distinct EXT IDs. New records use the same frozen trained models. Queue pagination displays 20 records per page; search/filtering covers the whole portfolio. No real customer data was imported and no model retraining was needed.
