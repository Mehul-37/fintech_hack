# Meridian generator assignment

**Archived assignment, not dispatched.** The user subsequently requested all work in this Codex chat. The generator, training and app integration are complete; do not run this assignment over the finished files. See `ML_RESULTS.md` and `V2_HANDOFF.md` for current state.

Workspace: `C:\Users\yadav\Documents\ChatGPT\fin_hackathon`.

Implement only the synthetic ledger generator and its independent validation. Another worker will implement features, model training, inference and UI integration. Read `SYNTHETIC_DATASET_SPECIFICATION.md` and the data/model section of `V2_HANDOFF.md` first. Their revised binary EMI target and 60-day history budget supersede older 180-day and ordinal-target proposals.

## Ownership and output contract

- Create/edit only `generator/` and `data/synthetic/`. Do not modify `src/`, any existing Markdown file, `package.json`, Git configuration, model artifacts, `.env`, deployments, or other workers' files. Do not install global packages, start servers, deploy, commit or send messages. Avoid deleting existing outputs; use a new run directory if needed.
- Entrypoint: `generator/generate.py`, invoked as `python generator/generate.py --customers 2000 --history-days 60 --followup-days 37 --seed 42 --output data/synthetic`.
- Prefer Python standard library; keep any necessary dependencies isolated and list them in `generator/requirements.txt`. The project has Python 3.12 available through Codex's bundled runtime; resolve the executable locally if needed.
- Generate UTF-8 CSVs using the eight source-table filenames and columns in the specification: customers, merchants, devices, behavioral_profiles, transactions, customer_events, loans, repayments. Put a versioned `manifest.json` beside them with seed, dates, actual row counts, currency, money units, history/follow-up counts, cohort counts, generation parameters and limitations.
- Approximately 40,000 settled history transactions across the first 60 days, including salary, spending, transfers, credit draws and EMI payments; allow variable customer activity. Report pending commitments and supplemental follow-up rows separately. The 40,000 figure is a budget, not an exact total that justifies dropping financial events.
- Use fixed ISO-8601 IST timestamps. Use 2026-08-01 as the reproducible simulation start; determine the day-60 history cutoff and day-97 follow-up cutoff from this start. Month one establishes observed baselines; month two supports assessments.
- Add `amount_paise` to transactions and `amount_due_paise` / `amount_paid_paise` to repayments; retain the spec's INR decimal columns as display representations. Integer paise is authoritative for ledger and installment comparisons. Add manifest definitions for all extra columns.

## Financial and temporal rules

1. Customer IDs, devices, merchants, loans, repayments and event links must resolve. Emit structured `scam_type` / `is_fraud` truth only in their designated columns, not encoded into identifiers, counterparty names or observed feature text.
2. Simulate chronological money movement, not independent random rows. Cash must equal opening cash plus settled incoming minus settled outgoing and must never be negative. Credit draws add both cash and a liability; they are not salary. Avoid double-counting a repayment: its actual cash payment must correspond to a linked EMI transaction.
3. Add `transaction_id` to repayment records for actual settlements. If an installment has multiple payments, add a clearly documented `payment_transaction_ids` field and account for all of them. The existing singular `payment_date` is insufficient for reconstructing partial-payment history: also write `generator/README.md` documenting an unambiguous per-payment representation (for example, an additional derived payment ledger). Do not silently treat the final cumulative amount as known before its payments happened.
4. Pending essential commitments need a `known_at` timestamp and a scheduled execution time. Model generation must distinguish a known future obligation from an unknown future settled event. A pending instruction and its later settlement must not double-count cash. Use a stable linkage if both rows are retained.
5. Generate coherent contractual EMI schedules and actual payment outcomes, including full, late, partial, unpaid, and recovery-supported repayment. Calculate EMI from principal/rate/tenure and reconcile principal balances; do not independently invent incompatible contract values.
6. `overdue_7d` means a positive balance remains at the end of the seventh calendar day after the next EMI due within 30 days of an assessment. Do not use scenario tags or simulated risk scores to assign that outcome. The eventual observed payments determine it. The other worker will construct assessment rows and training labels from your ledger.
7. Simulator archetypes and future truth may be stored for audit/evaluation, but are forbidden model inputs. Merchant/device reputation and counts must be timestamped or documented as opening-baseline facts; do not calculate full-run summaries and represent them as historical knowledge. Behavioral profiles must be opening assumptions, with the downstream worker recomputing observed baselines as-of.
8. Include customers with no loan and others with multiple loans. Keep the proposed approximate 2,000-loan total compatible with that distribution. Prefer 2,400 devices so every customer can have a primary device while some have replacements/shared devices; record this justified change in the manifest.

## Required exceptions

Include named evaluation cohorts for: scam with adequate buffer; scam recovery before EMI; small scam loss; scam on a familiar device; legitimate large payment; legitimate new-device use; income gap without fraud; repayment distress preceding unrelated fraud; missing/conflicting observations; repeated transfers from one sender; legitimate pooled payments resembling fan-in; multiple scam episodes. Cohorts may overlap, so report unique counts and intersections. Ensure at least 20 distinct customers per applicable exception, within the 2,000 customers. Do not force every scam to cause delinquency or every suspicious flag to imply a scam. Exclude the existing Arjun hero fixture from this generated dataset.

## Validation and completion

Create `generator/validate.py`, which exits nonzero on invalid joins, duplicate primary IDs, cash reconciliation errors, negative cash, incompatible repayment/customer/loan links, impossible time order, invalid target combinations (`is_fraud=0` but nonzero scam_type), or future knowledge represented as past evidence. Verify partial payments, repayment transactions, due-date schedules and pending-settlement linkage. Include small meaningful boundary tests in `generator/test_generator.py` for these financial/time rules. Re-run the same seed to verify repeatability without overwriting another run.

Run generation and validation. Save `data/synthetic/VALIDATION_REPORT.md` with exact counts, simulation boundaries, cohort counts, reconciliation checks, pending/follow-up separation, warnings and the exact commands used. Do not claim predictive accuracy or model calibration. Finish by reporting only the files created, exact counts, validation result, runtime and any unresolved limitations. Do not expand into model training or frontend work.
