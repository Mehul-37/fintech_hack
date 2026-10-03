# Historical V2.0 model verification — 4 October 2026 (IST)

**Historical snapshot:** the checks and scores below describe the earlier V2.0 build. Current V2.1 verification and independent audit are recorded in [MODEL_REVIEW.md](MODEL_REVIEW.md).

The local app at http://127.0.0.1:5173/ uses `histgb-synthetic-v2.0`. No deployment or banking action was performed. The original downloaded specification was read as reference material and preserved.

## Automated checks

| Check | Observed result |
|---|---|
| Independent eight-table validation | Passed for 2,000 customers, 69,163 transaction rows and 6,000 installments |
| Manifest consistency | CSV SHA-256 hashes match; provider report records the same dataset hashes |
| Financial checks | Unique keys, foreign keys, paise reconciliation, non-negative cash, chronological order, installment-specific matching, no premature EMI payments and IST/event timestamps passed |
| Seed repeatability | Two independently generated 60-customer runs have identical hashes for all eight CSVs |
| Python feature checks | 2 tests passed: cutoff/partial/other-loan/other-installment boundaries and immaturity; future settlements/final outcome truth excluded from inputs |
| Generator repeatability/validation test | 1 test passed |
| Application tests | 43 tests passed in four files, including existing financial, persistence and investigation tests |
| Numerical model parity | 30 fraud and 30 repayment probes match Python/browser probabilities to 12 decimal places |
| Changed input | Increasing an observed cash buffer lowers the fixture repayment estimate; changing authored scores or story labels does not affect predictions |
| Context controls | Six negative controls avoid a false linked-distress narrative; familiar-device positive control passes |
| Production build/type checking | `tsc -b` and Vite production build passed; advisory warning about a >500 kB chunk remains |
| Direct saved-model prediction | Local `ml/predict.py` successfully loads the repayment bundle and scores a numerical vector |

Commands and feature contracts are in `ml/README.md`. Tests/build use `--configLoader runner` because the default esbuild config-loader process encountered sandbox access restrictions. No test failures remain.

## Observed browser checks

- Overview displays **Trained ML scores**, 24 fixture customers, 3 scam alerts at the displayed 30 threshold, 1 repayment warning at 45 and 1 possible linked-distress context. Dev remains manual review and Rohan remains a possible pass-through/mule pattern.
- Arjun at 24 September displays 100 scam episode peak / 8 repayment estimate, cash ₹12,000, known essentials ₹6,000, EMI funds ₹6,000 and shortfall ₹12,000. The explanation explicitly distinguishes due-date pressure from salary potentially curing the seven-day outcome.
- Returning to day 12 shows 0 / 4, cash ₹96,000 and Healthy context; later transfers, liquidity observations and intervention tasks disappear from available evidence.
- Neha at day 24 shows 0 / 56, Organic distress and an income/cash-flow review recommendation; her distinct income explanation is retained.
- The transaction ledger labels numerical predictions as Trained ML. A-T1 shows 99, A-T2 shows 100; routine observed records show 0. A-T1 inspection retains ₹96,000 → ₹49,000, 13.4× usual size and individual observed signals.
- The network still displays the separate ₹47,000 at 14:02 and ₹31,000 at 14:08 edges. Edge relationships are not claimed to prove collusion.
- Created **CASE-003**, Neha's income/cash-flow review, in the review browser. Its report captures 0 / 56, the 24 September evidence date and `histgb-synthetic-v2.0`. Regeneration retains that captured date and records another timestamped activity entry. Existing CASE-001 and CASE-002 were retained. No notes or dispositions on those earlier cases were changed.
- Reload restores all three saved cases and the model-driven overview. A console check after fresh reload returned no warning/error entries.
- The current in-app browser's narrow viewport renders the new score captions without overflow. No fresh desktop-breakpoint sweep or production-browser smoke test is claimed for V2; the historical V1 layout checks remain in `VERIFICATION.md`.

Screenshot: `screenshots/trained-ml-customer.jpg` captures the live trained-model customer cards. `ML_RESULTS.md` includes the pipeline diagram and interpretation.

## Evaluation scope

The reported holdout is 300 unseen synthetic customers, with multiple transactions/snapshots per customer. No test-driven parameter choice, real-world effectiveness, causal model, population-wide contextual false-link rate, SHAP attribution or strong temporal generalization is claimed. The 12 generated exception cohorts have standalone model error counts; context checks are currently targeted fixture controls. Repayment calibration slightly worsened the synthetic test Brier score, which is reported rather than hidden.

The final saved model report is `ml/artifacts/evaluation.json`; the data report is `data/synthetic/validation.json`. Old stored reports can still show their original authored V1 scores with correct saved provenance. The generated training data are not imported as 2,000 extra dashboard records.
