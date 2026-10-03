# Customer 360 model review - V2.1, 4 October 2026 IST

## Diagnosis

The complaint exposed three real issues. Nineteen of the 24 displayed accounts were older thin fixtures with two routine transfers and large cash buffers, rather than fuller simulated histories. The original fraud simulator also separated fraud and legitimate activity too neatly: roughly 91% of validation estimates were below 1%, and only about 3% were between 10% and 90%. Whole-number score formatting hid further differences. The original repayment model already had about 38% of validation estimates between 10% and 90%; its fuller range was poorly represented in the displayed portfolio.

Graph shape alone cannot establish training quality. Many low scores are expected for ordinary payments; an evenly spread portfolio is not a model objective. The repair changes the underlying simulation and observations, then evaluates the learned estimates. It does not rescale scores for appearance.

## Changes

- V2.1 includes authorized bursts, legitimate beneficiary/device changes, variable-sized fraud bursts, familiar-device fraud and occasional concealed ordinary scams. Observable features now overlap across labels.
- Regenerated and validated the 2,000-customer fitting source: 43,630 completed history transactions, 26,446 completed follow-up transactions, 1,800 pending instructions, 2,000 loans and 6,000 installment records.
- Retrained both HistGradientBoosting models on the same customer split. Grouped cross-fit calibration comparison selected Platt for fraud and identity for repayment. Validation-selected alert thresholds are 27.5 for both. Test results did not choose models or thresholds.
- Replaced 19 thin portfolio fixtures with independent generated histories, seed 20261004. Selection uses source order and the single-loan/due-date presentation contract only; no score/outcome selection. New DEMO IDs preserve the identity of older saved cases. The five authored comparison scenarios remain.
- Checked Python/browser input parity for every exported completed transaction and three repayment snapshots per generated customer. The 60 exported probability probes still match to 12 decimal places.
- Fixed installment-specific EMI matching, integer-paise cash totals, as-of past repayment availability and recurring salary schedule alignment.
- Cards show decimal scores. The graph keeps fixed 0-100 axes and step curves, with a separate ledger-derived cash gap as a percentage of EMI. The third line is not a model probability. Generated histories have six convenient replay checkpoints; all actual observations remain in evidence.
- Saved investigation reports retain their original provider and capture date. An older-provider notice explains differences; regeneration is explicit.

## Actual displayed scores at 24 September

| Customer | Transaction records | Scam episode peak | Seven-day repayment estimate |
|---|---:|---:|---:|
| Arjun Mehta | 10 | 88.8 | 4.6 |
| Riya Malhotra | 25 | 57.1 | 47.7 |
| Kunal Verma | 21 | 70.5 | 46.0 |
| Dhruv Bansal | 28 | 23.4 | 20.0 |
| Simran Kaur | 21 | 36.0 | 10.6 |
| Ishita Das | 19 | 9.1 | 0.8 |

Generated records contain 19-29 source transactions each. `ml/artifacts/dashboard-score-audit.json` records all 24 customers and each of the 24 replay days. Episode peaks are historical transaction maxima, not account-level probabilities.

## Independent frozen-model audit

After freezing the generator/model choices, generated 2,000 additional customers with seed 20261005 and distinct AUD IDs. This audit validated all eight source tables and scored the saved models without fitting or tuning.

| Audit metric | Fraud | Repayment |
|---|---:|---:|
| Examples | 23,313 | 8,000 |
| Positive outcomes | 988 | 2,359 |
| PR-AUC | 0.7314 | 0.8543 |
| Precision | 65.2% | 68.4% |
| Recall | 70.4% | 79.5% |
| False alerts / 1,000 rows | 16.0 | 108.5 |

These figures describe a harder synthetic simulation. V2.0's high metrics were measured against an easier generator, so they are not a controlled accuracy comparison. Full internal test and fresh audit results are in `ML_RESULTS.md`, `ml/artifacts/evaluation.json` and `ml/artifacts/independent-audit.json`. Calibration and real-world effectiveness remain unverified.

## Verification

- 48 application tests and three Python tests passed, including ledger, target maturity, leakage exclusions, model/feature parity, contextual controls, persistence and report evidence contracts.
- Independent ledger/key/timestamp/hash validation passed for fitting, presentation and fresh audit sources.
- Browser replay for Riya shows 0.4 scam / 1.4 repayment at day 12 with healthy cash cover; later observations are unavailable. At day 24 it shows 57.1 / 47.7, a ₹20,634 cash gap and manual-review context. Her September EMI remains Upcoming; August's payment does not settle it.
- Final TypeScript and Vite production build passed. The remaining >500 kB chunk notice is advisory. Browser console showed no warning/error entries; the revised chart screenshot is `screenshots/revised-risk-chart.jpg`. No further edge-case sweep was performed before recording.

The earlier models, evaluation and relevant Python source are archived under `ml/archive/v2.0/`. Historical V2.0 browser verification remains in `ML_VERIFICATION.md`. The original downloaded specification was preserved. No deployment or banking action was performed.

## Final demo-flow repairs

Highlighted evidence now includes the observed transfer behind the episode peak; the remaining observed events are expandable and stay strictly as-of. A regression check covers this linkage. Rapid same-recipient bursts use the sequence start for the pre-shock comparison, and prior repayment warnings must already be known at that time. Context wording distinguishes moderate estimates from recorded competing distress; recovered salary gaps no longer remain active competing gaps. Regression controls cover the distinction. Beneficiary recommendations no longer hard-code Arjun's account. Cases from replaced demo histories retain saved evidence and notes, with current-customer navigation safely disabled when that history is unavailable.

48 application tests and the final TypeScript/Vite build passed. A 1920 by 1080 browser check confirmed score cards, graph, peak-event detail and matching transaction estimate; no warning/error console entries were observed. Screenshot: `screenshots/revised-customer-recording.jpg`. The temporary viewport was reset. The separate rehearsal origin did not modify the recording origin's saved cases. A new comprehensive case-mutation walkthrough was not completed in this extension.

## Recording portfolio expansion to 112

Added 88 synthetic customer histories from a separate 768-customer source, seed 20261006, selected by the existing loan/date contract without score or outcome filtering. The original 24 customers retain their IDs, names, observations and model inputs. Extra transaction/loan IDs are namespaced to avoid collisions. All 107 generated histories pass Python/browser feature parity; all 112 customers pass cash/as-of checks. The historical `dashboard-score-audit.json` captures the earlier 24-customer portfolio, not the expanded one.

Overview totals and charts now include 112 customers. Queue pagination displays 20 per page, with whole-portfolio search and filters. Browser checks verified page 2 shows 21-40 of 112, and searching Ishan Verma finds one record and resets pagination. High repayment warnings without a suspicious-outflow chain route to manual cash-flow review instead of a Healthy label. 49 app tests passed; model fitting/evaluation results are unchanged.
