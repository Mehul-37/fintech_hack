# V2 handoff — replace scoring, retain the investigation experience

V1 is complete. No Python backend, generator at scale, model artifacts or training pipeline is implemented. The contracts below describe the actual source, followed by the required V2 work.

## Existing contracts and replacement points

`src/types.ts` defines:

- **Customer:** ID/name, salary and recurring expense budget, opening cash/credit, credit limit, usual transfer size, loan principal/EMI/due date/expected salary, prior repayment history, transactions, customer events and authored score points. `story` is a demo-picker label only; do not pass it into model features.
- **Transaction:** ID, ISO timestamp with explicit offset, amount/direction/channel, counterparty/account, Completed/Pending status, salary/essential/transfer/credit/EMI category, observed signals and simulated transaction risk. Optional novelty/device flags and `knownAt` for an already-known future pending instruction.
- **CustomerEvent:** stable ID, observation time, kind, title/detail and linked transaction IDs. Device sessions are currently synthetic event evidence, not a standalone session table; V2 should add typed Session records.
- **FinancialState:** ledger cash, credit used/utilization, suspected outgoing amount, known essential commitments before EMI, EMI funds/shortfall, days past due and installment status. Cash includes completed transactions only. Credit draws also raise liability. Known commitments exclude future settled outcomes.
- **RiskSnapshot:** customerId/asOf, separate scamScore/repaymentScore, `source`, providerVersion, evidence IDs, observed signals, optional episode {peak, observedAt, windowStart, status}, and latestTransactionScore. No probability or model attribution is implied in V1.
- **Assessment:** context, evidence strength, cautious explanation, alternative explanation, available event references.
- **Intervention:** action kind/title/detail/priority. Review recommendations are separate from approval or execution.
- **CaseRecord:** action/customer identifiers, owner/status/priority, creation time, captured evidence timestamp/IDs/explanation, follow-up, contact outcome, disposition, checklist, notes and append-only timestamped activity.

Current provider contract:

```ts
interface ScoreProvider {
  score(customer: Customer, asOf: string): RiskSnapshot;
}
```

`src/scoring.ts` exports `simulatedScoreProvider` and the **single replaceable `scoreProvider` binding** consumed by the UI and context rules. It selects a score point only when that observation timestamp is available, then returns provenance and visible evidence. Context and intervention engines do not read `story`.

For V2 inference, introduce an explicitly as-of feature input rather than sending a raw Customer object containing future fixtures or authored targets. Keep the UI’s RiskSnapshot shape. A local synchronous model adapter can implement the existing interface. For the planned FastAPI service, add a small async score hook/cache keyed by `(customerId, asOf, providerVersion)`, with loading/error handling and stale-response rejection; change the provider method to return `Promise<RiskSnapshot>`. Charts should request historical as-of scores through that same adapter. These plumbing changes should not redesign the four views.

Recommended input shape:

```ts
type InferenceInput = {
  customerId: string;
  asOf: string;
  observedTransactions: Transaction[]; // at <= asOf only
  observedEvents: CustomerEvent[];    // at <= asOf only
  financialState: FinancialState;
  knownLoanSchedule: Customer['loan']; // schedule, not outcome labels
  featureSchemaVersion: string;
};
```

Do not include scenario labels, authored ScorePoints, future event details, future default flags, future balances or later contact outcomes. V1 transaction risks are authored too; V2 must replace these with transaction inference, not reuse them as truth or feed the scam index mechanically into repayment prediction.

## Rules retained from V1

- `src/selectors.ts`: as-of ledger selection, liability arithmetic and known pending commitments.
- `src/config.ts`: scam alert 70; repayment warning 60; transfer-size multiple 5; shock fraction .5; post-shock repayment rise 20; at least three distinct senders; .85 pass-through within 20 minutes. These are prototype parameters, not validated bank policy.
- `src/context.ts`: evaluate fan-in and rapid onward flow separately from loss; require suspicious outgoing evidence, a cash shock, later liquidity pressure and post-shock repayment deterioration for linked distress. Income gaps and pre-existing repayment warnings provide competing explanations and route to manual review.
- `src/interventions.ts`: victim investigation/recovery review plus manual support review; mule investigation without victim inference; income/cash-flow assessment for organic distress; verification for uncertain records; no intervention for healthy records.

Improve competing-explanation handling and episode boundaries on a broader dataset. The current rules are transparent, fixture-tested heuristics. They do not prove causation, role or legitimacy.

## Data / model work still required

1. Seed a coherent ledger generator, initially around 1,000 customers over 180 days, with at least 90 historical days and complete outcome follow-up. Include salary gaps, essential commitments, credit draws, repayments, recoveries and multiple episode windows.
2. Train two models using LightGBM or XGBoost, with reproducible seeds and versioned feature schemas. Fraud target is transaction-level suspected scam involvement; account role remains contextual. Repayment target is the next EMI due within 30 days remaining unpaid seven days after due date. Exclude snapshots with incomplete follow-up or no qualifying EMI.
3. Split by customer and time; purge overlapping outcome windows. Fit preprocessing/calibration only on training/validation. Keep Arjun’s hero customer outside training.
4. Add negative controls: scam loss with adequate buffer/recovery; distress preceding unrelated fraud; legitimate large payment; missing/conflicting evidence; repeated payments from a single sender; multiple episodes.
5. Report measured precision/recall, PR-AUC, false alerts per 1,000, repayment calibration, warning lead time and contextual false links. Label evaluation synthetic. No real-world banking effectiveness claims.
6. Compute actual model explanations with feature names, scale/units and model version. Keep SHAP contributions separate from context narratives. Never fabricate SHAP or express log-odds contributions as percentage points.
7. Add FastAPI + SQLite, artifact save/load, input validation, failure states and reproducible inference. Demonstrate a changed observed event changing an inference result. Re-run complete flows after restart.

## Persistence migration

V1 key: `meridian.cases.v1`, containing a JSON array of CaseRecord. Source: `src/persistence.ts`.

Migrate local cases once with a schema-versioned importer and deduplicate on `(customerId, action kind, episode ID)` rather than V1’s `(customerId, kind)` lifetime uniqueness. Replace sequence IDs with UUIDs/database IDs and use transactional case creation. Retain captured evidence time, evidence IDs, notes and original audit timestamps. Save follow-up as a date, audit times in UTC, and render them in IST.

Use separate tables for customers, transactions, sessions, loans, installments/repayments, financial snapshots, risk snapshots, episodes, cases, notes and audit entries. Enforce foreign keys, immutable audit entries and idempotency server-side. Browser-local status is not authorization or an institutional audit trail. Add authenticated operator identity and permissions only when moving beyond the local hackathon demonstration.

Contact outcomes currently record an analyst-entered synthetic result; they do not confirm a real contact attempt or independently verify a beneficiary. Model scores and contractual loan terms must remain unaffected by an unapproved support request.

## Tests and UI preservation

`npm test` covers ledger reconciliation across all 24 customers / 24 days, the ₹78,000 six-minute loss, credit liabilities, EMI-before-salary coverage, as-of evidence/scoring, stable canonical replay, open-episode versus fresh transaction scores, five outcome routes, conflicting evidence, distinct-sender checks, provider independence from scenario labels and persistence/duplicate prevention.

`VERIFICATION.md` documents real-browser exercises at 1440 × 900 and 1920 × 1080, case edits followed by refresh, transaction evidence, graph edges/nodes, filters and smaller-window behavior. Preserve these journeys and add automated browser regressions when the backend arrives. Add provider timeout/version/stale response tests and database concurrency/migration tests.

UI source is grouped into data, selectors, scoring, context, interventions, persistence and four section views. The `src/engine.ts` file is a compatibility re-export, not the implementation layer. Replace the scorer through the binding and async hook, keeping the simulation badge until the whole displayed history actually comes from fresh model outputs. Mixed-mode views must label each source accurately.

Bank execution, collections changes, message delivery, real-person model validity and production compliance are outside this V2 hackathon milestone too.
