# Train and use the models

Run commands from the project root. Python 3.12 is recommended.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements-lock.txt
.\.venv\Scripts\python.exe generator/generate.py
.\.venv\Scripts\python.exe generator/validate.py
.\.venv\Scripts\python.exe ml/train.py
.\.venv\Scripts\python.exe ml/export_demo.py
```

The already-created `.venv` and saved artifacts are ready to use; recreating them is optional. The frontend uses the exported forest, so Python need not remain running while presenting. Training plus feature construction took roughly 7–10 seconds locally. Export relies on scikit-learn private tree structures, so keep the pinned version and numerical parity test when changing dependencies.

## Exact training process

1. Simulate 60 days of ledger history and 37 days of follow-up with seed 42. Monetary outcomes reconcile with actual simulated payment transactions.
2. Shuffle customer IDs with seed 42 and assign 1,400 training, 300 validation and 300 test customers. All loans/transactions/snapshots from a customer stay together.
3. Build transaction examples from September history. The first month supplies baseline cash/history; each transaction uses strictly earlier completed transactions plus its current observed attributes. Target: simulated `is_fraud`, including scam and mule transaction involvement.
4. Build loan examples at 3, 11, 19 and 29 September. Select the next EMI due within 30 days. Target is 1 if unpaid paise remain at the end of the seventh calendar day after due in IST. Partial payment counts as overdue. An installment paid by that cutoff is 0. Outcomes not yet mature at the simulation horizon are excluded.
5. Fit a standardized logistic-regression baseline on training customers. Fit two HistGradientBoosting candidates per target, with 7 or 15 leaves, 100 rounds, learning rate .08, minimum leaf 25, L2 regularization 2 and automatic row splitting disabled. Select by validation log loss.
6. Compare raw probabilities with a Platt mapping using three customer-grouped cross-fitting folds inside validation. Use Platt only if cross-fit log loss improves; otherwise retain raw probabilities. The current fraud model uses Platt and repayment uses identity calibration. Select an alert threshold on validation only with false-negative cost twice false-positive cost. Evaluate frozen models on test; never tune to test customers or Arjun's fixture.
7. Save Python models, calibration, ordered features, grouped split IDs, evaluation and browser trees. The TypeScript parity test compares 60 saved Python probabilities to the exported forests.

## Inputs and prediction

Fraud inputs, in order: amount relative to usual transfer, beneficiary novelty, device novelty, unusual hour, previous-hour and previous-day transaction counts, amount relative to prior cash, distinct incoming senders over 20 minutes, pass-through ratio and outgoing flag.

Repayment inputs, in order: cash/EMI, cash after known commitments/EMI, commitments/EMI, salary/EMI, expense/income, credit utilization, days until due, salary delay after due, past seven-day unpaid fraction, past unpaid count, observed income gap and recent credit draws/EMI. Ratios are bounded to [0,50]; zero-denominator protection is 1 rupee. See `features.py` for exact calculations.

Neither model receives scenario labels, authored scores, fraud truth, final repayment summaries or future settled balances as inputs. Repayment does not mechanically take the fraud score as an input. Profile values and known loan/salary schedules are available assumptions. The context layer combines the separate estimates and observed sequence afterward.

To score an ordered numerical vector directly:

```powershell
.\.venv\Scripts\python.exe ml/predict.py --model repayment --features '[1,1,0,4,0.5,0.1,3,4,0,0,0,0]'
```

Use the bundle's `features` field to confirm order. Load only this project's trusted local joblib artifacts. The app calls the corresponding `modelProbability()` function and does not send feature data elsewhere.

## Validation

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s ml -p test_*.py
.\.venv\Scripts\python.exe -m unittest discover -s generator -p test_*.py
npm test -- --configLoader runner
npm run build -- --configLoader runner
```

Results and cohort error counts are in `artifacts/evaluation.json`. `../ML_RESULTS.md` explains what they mean and their limits. The current evaluation is customer-disjoint and synthetic; it does not establish causal linkage or temporal/real-world generalization. There is no XGBoost comparison or imported pretrained model in this run.

## Presentation export and fresh audit

`ml/export_demo.py` generates a separate 128-customer source with seed 20261004, validates it, and exports the original 19 plus 88 additional customers meeting the single-loan/due-date UI contract. It never filters by predicted score or outcome. Five authored comparison fixtures remain. Feature parity probes cover every exported completed transaction and three repayment snapshots per customer.

```powershell
.\.venv\Scripts\python.exe ml/audit.py
```

This generates 2,000 further customers with seed 20261005 and distinct AUD IDs, validates them, and evaluates the frozen models and thresholds. It does not refit anything. `artifacts/independent-audit.json` holds the results. V2.0 models and source code are preserved under `archive/v2.0/`; their old metrics describe an easier simulator and are not a like-for-like comparison. See `../MODEL_REVIEW.md`.


Portfolio expansion: the recording portfolio now contains 112 synthetic customer records. The original 24 IDs and histories are retained; 88 new records come from a separately validated source at `data/presentation-extension/`, seed 20261006, with distinct EXT IDs. New records use the same frozen trained models. Queue pagination displays 20 records per page; search/filtering covers the whole portfolio. No real customer data was imported and no model retraining was needed.
