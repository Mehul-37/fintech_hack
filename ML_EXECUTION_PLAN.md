# Meridian 90-minute implementation plan

**Completed implementation update, 4 October 2026:** use `ML_RESULTS.md`, `ml/README.md` and `V2_HANDOFF.md` for the delivered result. This document preserves the initial plan. Direct browser forest inference replaced the proposed local service; XGBoost, external data import, SHAP and database migration were not performed. Standalone exception metrics and targeted contextual controls are measured; a population-wide contextual false-link rate remains unverified.

Prepared 3 October 2026. Time allocations are planning estimates, not measured runtimes or a promise of completion. The user requested the execution approach before implementation; no new chat or generator job was dispatched by this document.

## Ownership

- Gemini/Antigravity, if the user dispatches it: `generator/` and `data/synthetic/`, using `GEMINI_DATASET_HANDOFF.md`.
- Codex in this existing chat: generator review, `ml/` feature/training/inference code, workspace-local dependency setup, frontend adapter and validation. Keep concise progress and file-based checkpoints. Do not print dataset rows or full logs into chat.
- No simultaneous edits to shared files. Training waits for validated generator output. The public datasets are separate references/benchmarks and never joined on invented customer identities.

## Work order and time budget

| Minutes | Work | Completion evidence |
|---|---|---|
| 0–25 | Generator worker creates histories; Codex prepares environment, feature contract and adapter | Generated CSVs, manifest, independent ledger/time checks |
| 25–45 | Review generator, construct as-of fraud rows and repayment snapshots, assign customer-disjoint splits | Leakage exclusions, mature outcomes, exact row/class/split counts |
| 45–60 | Fit baseline and two histogram-boosted models; optionally compare XGBoost if setup is quick | Validation-selected parameters/thresholds, frozen test metrics, saved artifacts |
| 60–80 | Load model artifacts via local inference service and connect provider/history UI | Consistent source/version labels, score changes from changed inputs, restart check |
| 80–90 | Verify example and exception journeys; preserve demo readiness | Browser flow, no future evidence, separate scores, reproducible commands |

Avoid spending the deadline on large searches, parameter sweeps or a database/case-storage migration. Retain existing local cases for this milestone. If a step does not finish, preserve its checkpoint and label the UI's score source accurately; do not silently substitute authored values as ML.

## Algorithm decision

The current first implementation remains two scikit-learn HistGradientBoostingClassifier models plus a baseline. XGBoost with `tree_method=hist` belongs to the same gradient-boosted tree family. If XGBoost installs promptly, compare a small candidate set on the same training/validation groups; choose each deployed model by validation results and only then evaluate the held-out test set. There is no assumed winner and test results must not choose the algorithm. Only two final deployed models are required; comparisons can train additional candidates.

## Reuse research

- scikit-learn supplies established histogram boosting: https://scikit-learn.org/stable/modules/ensemble.html#histogram-based-gradient-boosting
- XGBoost supplies another implementation and a histogram tree method: https://xgboost.readthedocs.io/en/stable/treemethod.html
- PaySim, from its original authors, is a financial mobile-money simulator. Use its simulation design as a cited reference; a full Java simulator import is unnecessary for this Python deadline. Source: https://github.com/EdgarLopezPhD/PaySim . Repository code is GPL-3.0; no source code was copied into this project. Verify a dataset's own terms before importing a sample.
- UCI Default of Credit Card Clients contains 30,000 records, six months of repayment/bill/payment information and credit-default labels. It is CC BY 4.0. It can support a separately labelled credit benchmark, but its target and feature schema differ from our seven-day EMI target. Source: https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients . It is not evidence of the connected scam-to-EMI relationship.
- These sources were inspected; their data and model checkpoints were not downloaded or integrated. No compatible jointly labelled scam-and-EMI dataset or pretrained checkpoint was established in this bounded search. This is not a claim that none exists.

## Acceptance

Record artifact/package versions, seed, feature order, target cutoff, split customer IDs and measured metrics. Report the connected evaluation as synthetic and unseen-customer, not real-world or strong temporal-generalization evidence. Compute contextual false links on exceptions as well as standalone model errors. Saving a case does not change financial terms or risk scores.
