# Meridian — connected risk workspace

Meridian combines two separate trained models with an evidence-based context layer. A transaction model estimates simulated fraud involvement. A repayment model estimates whether the next EMI will still have an unpaid balance at the end of its seventh calendar day after due date. Context compares the observed payment sequence, cash shock, income and loan position to suggest a possible connection. It does not prove causation or customer role.

The app labels synthetic scenarios and trained model estimates, uses actual exported model inference, and includes the investigation reporter and browser-local cases. The portfolio contains five authored comparison scenarios and 107 independently generated customer histories scored by the models; the 2,000 generated customers supply training and evaluation data, not 2,000 extra dashboard records.

## What was built

- A seeded financial simulator: **2,000 customers**, **43,630 completed history transactions** over 60 days, plus **26,446 completed follow-up transactions** and **1,800 pending instructions**. The transaction CSV has 71,876 rows. Eight source tables, integer-paise amounts, manifest hashes and an independent validator are saved in `data/synthetic/`.
- Two scikit-learn histogram gradient-boosted tree classifiers, simple logistic baselines, customer-disjoint splits, validation tuning/calibration and saved Python/browser artifacts. The fraud target is transaction-level; repayment is loan/snapshot-level. Forty thousand transactions do not mean forty thousand independent customers.
- Browser inference in all four existing views, historical score charts, transaction evidence and newly generated case reports. No API key or inference server is needed. Old saved reports retain their original captured provenance until explicitly regenerated.
- Exceptions including adequate cash after a scam, recovery, familiar-device scams, legitimate large payments, ordinary device changes, unrelated prior distress, income gaps, same-sender payments and pooled-payment patterns.

Read **[ml/README.md](ml/README.md)** for exact commands and feature contracts. Measured results are saved in [ml/artifacts/evaluation.json](ml/artifacts/evaluation.json) and [ml/artifacts/independent-audit.json](ml/artifacts/independent-audit.json).

## Run the app

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

Open http://127.0.0.1:5173/. Use the same origin/browser for saved cases. The app binds to loopback. After setup it works without internet access.

```powershell
npm run typecheck
npm test -- --configLoader runner
npm run build -- --configLoader runner
```

The runner config loader avoids a sandbox-specific esbuild config-loader access error. The production output is `dist/`. No deployment was performed.

## Reproduce the data and models

Python 3.12 and the local `.venv` were used. No cloud training service is required.

```powershell
.\.venv\Scripts\python.exe generator/generate.py
.\.venv\Scripts\python.exe generator/validate.py
.\.venv\Scripts\python.exe ml/train.py
.\.venv\Scripts\python.exe ml/export_demo.py
.\.venv\Scripts\python.exe -m unittest discover -s ml -p test_*.py
.\.venv\Scripts\python.exe -m unittest discover -s generator -p test_*.py
```

Training writes `ml/artifacts/fraud.joblib`, `repayment.joblib`, `models.json`, `evaluation.json`, split IDs, numerical parity probes and feature-row exports. It also refreshes `src/ml-models.json`, which the app loads. Packages are pinned in `ml/requirements-lock.txt`.

## The demonstration

Overview has a clickable two-risk scatterplot and queue. Customer Risk Profile has replay, available evidence, loan position and recommendations. Transactions & Network has individual transfer inspection and fan-in/pass-through comparison. Cases & Actions retains the local investigation report, evidence sources, local topic lookup, disposition, notes, checklists and export. Replay alone creates no case. Saving a task changes neither score nor loan terms.

Arjun's ledger is unchanged: two transfers of ₹47,000 and ₹31,000 take ₹96,000 to ₹18,000. On 24 September, cash is ₹12,000, known essentials are ₹6,000, and funds for the ₹18,000 EMI are ₹6,000: a **₹12,000 due-date shortfall**. The due date is 27 September and salary is expected on 1 October. The model gives a scam episode peak of **88.8** and a seven-day repayment estimate of **4.6**. Salary before the 4 October label cutoff can cure the shortfall. The old scripted 91/68 scores are retained only as historical fixtures/reference tests and do not drive the app.

## Evidence and limits

The measured test is an unseen-customer **synthetic** holdout. Real-world accuracy, causal effects, robust time generalization, bank policy and real-population calibration remain unverified. Four repayment snapshots from one customer can concern overlapping outcomes, so split groups are customers, not rows.

The context engine is a transparent rule layer, not a third trained causal model. Model alert thresholds are 27.5/100 for both models; narrative gates and cash/network rules remain prototype choices. Legitimate pooled payments can resemble mule activity, and a model score cannot identify guilt, scam subtype or confirmed victim status.

Pending instructions may remain unexecuted; they are known commitments until their scheduled time, not guaranteed future settlement. Generated profile/reputation values are assumptions and excluded from downstream learned features. The UI loan principal/history are supplied fixture values; generated multiple-loan training is not a full multiple-loan UI migration.

No messages, holds, account freezes, debt changes or recovery actions are executed. Cases use `meridian.cases.v1` browser storage, without authentication, server audit guarantees or synchronization. FastAPI, SQLite, SHAP and production deployment are deferred; direct local inference already serves the demo.

## Source map

| File | Responsibility |
|---|---|
| `generator/generate.py`, `generator/validate.py` | Source simulation, hashes, independent ledger/relationship checks |
| `ml/features.py`, `ml/train.py` | As-of features, target maturity, grouped splits, training/evaluation/export |
| `src/ml-inference.ts`, `src/ml-models.json` | Numeric feature extraction and actual browser forest inference |
| `src/scoring.ts`, `src/components.tsx` | Shared trained provider and model-driven historical chart |
| `src/selectors.ts`, `src/context.ts` | Observed ledger, known commitments and cautious contextual routing |
| `src/investigation.ts`, `src/InvestigationPanel.tsx` | Captured evidence reports, sources and local lookup |
| `src/persistence.ts` | Existing browser-local case persistence and audit mutations |

`THIRD_PARTY_NOTICES.md` records reused frontend library/font licenses. External datasets and pretrained weights were not imported.


Portfolio expansion: the recording portfolio now contains 112 synthetic customer records. The original 24 IDs and histories are retained; 88 new records come from a separately validated source at `data/presentation-extension/`, seed 20261006, with distinct EXT IDs. New records use the same frozen trained models. Queue pagination displays 20 records per page; search/filtering covers the whole portfolio. No real customer data was imported and no model retraining was needed.
