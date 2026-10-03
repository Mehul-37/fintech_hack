**Current V2.1 update:** new reports use trained model estimates; the descriptions and verification below preserve the original reporter implementation. Saved reports retain captured provider/version and now display an earlier-provider notice when applicable. See `MODEL_REVIEW.md`.

# Investigation reporter — local V1 integration

**V2 update, 4 October 2026:** the paragraphs below preserve the reporter's V1 implementation snapshot. The shared risk provider now uses two trained synthetic models; new reports capture `histgb-synthetic-v2.0` provenance. Old saved reports retain their captured source until explicitly regenerated. Arjun now shows a 100 scam episode peak and 8 seven-day repayment estimate; his ₹12,000 due-date cash shortfall remains. `ML_RESULTS.md` and `ML_VERIFICATION.md` describe current model checks. The reporter itself is still deterministic local evidence lookup, not an LLM or feature-attribution model.

The user selected a fully local, clearly labelled deterministic reporter. This feature adds the investigation-report workflow to the existing React/TypeScript prototype. It does not add an LLM, backend, external API, authentication system or trained risk model.

## Use it

1. Open a customer at the desired replay date and create a task using an existing recommended response.
2. In **Cases & Actions**, select **View investigation**. A new task already has a saved report. Older saved tasks show **Generate investigation** instead.
3. Read the summary, observed review signals, configured baseline comparison, financial position, possible pattern and alternative explanations. Expand supporting evidence, entity analysis, timeline or missing evidence as needed.
4. Expand **Evidence sources** under a claim, then select a source ID to inspect the captured record or calculation.
5. Use **Ask the case** for risk, baseline, device, merchant, recipient, repayment, timeline or alternative evidence questions, or enter a source ID. This is topic-based local lookup from the saved report, not generative chat or database search. Unsupported topics return insufficient evidence.
6. Record the human assessment with **Disposition** and **Analyst notes**. Disposition records the current case owner and a review timestamp. Resolving a case still requires an explicit human status change and disposition. No payment or communication is executed.
7. Export structured evidence and report JSON if needed. Refresh preserves the report, disposition, notes and audit activity in this browser.

## Existing demos

Use the existing fixtures at 24 September; no score or customer fixture was changed.

| Customer | Demonstration |
| --- | --- |
| Arjun Mehta | High simulated scam and repayment indices, unusual device/new beneficiary, two transfers totalling ₹78,000, upcoming EMI shortfall. The report also notes pending customer confirmation and prior on-time repayments. |
| Dev Shah | Medium simulated risk with mixed evidence: a large first payment, a reported property-deposit purpose and invoice, unverified beneficiary ownership, adequate EMI funds. |
| Rohan Kapoor | High simulated risk with a rapid pass-through pattern; role remains unconfirmed and legitimate pooled payments remain a plausible alternative. |

The tests additionally raise the score on a copy of Dev's fixture to verify that a high score does not suppress legitimate-purpose evidence. This test-only variation does not appear in the app or change the demo dataset.

## Integration and limits

- `src/investigation.ts` collects evidence using the existing score provider, selectors, context and intervention rules. It returns a versioned JSON-compatible evidence/report snapshot and validates source references on generation and display.
- `src/InvestigationPanel.tsx` provides the report, expandable citations, source sheets, local lookup, retry/regeneration and JSON export inside the existing case detail. Generation errors or invalid optional saved reports are contained in this feature, leaving existing case controls available.
- `src/App.tsx` attaches a report when the existing task-creation action succeeds, records reporter/provider versions and timing in case activity, and reuses the existing human disposition and notes workflow. Cases are still created by an investigator action; replay alone does not create tasks.
- `src/types.ts` adds optional investigation/review fields to `CaseRecord`. Existing `meridian.cases.v1` records remain compatible; no migration or replacement storage key is required. Duplicate tasks still open the original captured case date.
- Reports use the case's **evidenceAsOf**, independently of the current customer, replay date and subsequent analyst notes. Regeneration uses that captured date. Evidence is a persisted snapshot of the currently supplied fixtures at generation, not a production immutable database audit trail.
- Recent detail is limited to 30 transactions, 20 events and eight outgoing recipient accounts, retaining the highest-risk observed transfer. Financial totals use all observed local ledger entries. Exact recipient account keys are matched in one pass through the supplied portfolio; source listings are capped at 30 matches. A large future database would need targeted server queries in place of the in-memory portfolio pass.
- Device evidence consists of event text and transaction flags. There is no typed device/session registry, cross-customer device association, merchant registry or independently verified recipient ownership. The report explicitly marks these gaps and does not invent them.
- Transfer and budget baselines are configured synthetic profile values, not empirically learned behavior. No usual-time/location baseline, measured income/expense trend, calibrated scam-subtype confidence or feature attribution is claimed. Loan principal is not presented as a measured current outstanding balance. Known pending commitments and loan schedules are distinct from future settled outcomes.
- Scores remain the existing simulated indices, with the open episode peak distinct from transaction-level scores. Reporter findings do not reconstruct model contributions or establish fraud, collusion, causation or customer role.
- Local lookup uses simple topic matching, so ambiguous questions can receive a topic summary. Every answer is labelled as local lookup and is limited to the saved case context.
- Browser storage limitations remain unchanged: no cross-user synchronization, authenticated reviewer identity or production audit guarantees. `reviewedBy` records the selected local case owner, not a signed-in identity.

## Validation

`src/investigation.test.ts` covers strict captured-date evidence, known future commitments, configured baselines, recipient exact-key relationships, missing device/merchant evidence, bounded retrieval, missing input, deterministic reports, suspicious/mixed/alternative demos, JSON schema/reference rejection, case persistence and compatibility, replay independence, local lookup and human review storage. Existing financial/replay/routing tests remain intact.

Run `npm run typecheck`, `npm test`, and `npm run build`. Browser checks use a separate local origin on port 5174 to preserve any existing saved cases on port 5173.

Verified on 3 October 2026: TypeScript checking, all 34 tests (18 existing and 16 new), and the production build pass. Browser exercises confirmed new-case report creation, source inspection, local evidence lookup, saved disposition/notes after refresh, regeneration, captured-date independence from replay, the existing transaction detail and money-flow network, and narrow-layout containment. No warning/error console entries were observed. The downloaded `CASE-001-investigation.json` was parsed and checked for the case, schema, as-of date, risk score, sources and human-review flag. The report preview is saved in `screenshots/investigation-reporter.jpg`.
