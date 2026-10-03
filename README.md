# Meridian — connected risk workspace

A complete local V1 prototype for a financial-institution analyst: suspicious event → financial shock → repayment pressure → evidence-led context → persistent review task.

**Synthetic scenario • Simulated risk scores** remains visible throughout. This is an interactive investigation demonstration, not a production lending or fraud decision system.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm. The development build uses React 19, TypeScript, Vite, Recharts, Motion, React Flow, Radix Dialog and locally bundled Inter fonts. No API keys, login, Python service or runtime external data source is needed.

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/**. The server binds to loopback only. After setup, replay, charts, evidence and cases work without internet access. Keep using the same URL/browser profile for saved cases; `localhost` and `127.0.0.1` have separate browser storage.

```powershell
npm run typecheck
npm test
npm run build
```

The production output is in `dist/`. Nothing has been publicly deployed or submitted. `PROTOTYPE_PLAN.md`, `IMPLEMENTATION_PROMPT.md` and `research/` are preserved.

## The complete experience

- **Overview:** 24 deterministic customers, computed counts, a clickable Scam Risk / Repayment Risk scatterplot, searchable prioritized queue, context/risk/channel/open-review filters and direct story launch. Counts overlap; they do not add up to 24.
- **Customer 360:** five authored comparison stories plus 19 modest portfolio records. Play/pause, previous/next event, day scrubber and playback reset update both scores, cash, credit, available evidence, context and recommendations together. Future observations and settled transactions remain hidden.
- **Transactions & Network:** filters across UPI, wallet, card and digital banking; inspectable before/after balances and observed signals; separately selectable parallel transfers; directed fan-in / rapid pass-through comparison, interactive account evidence and graph zoom/fit controls.
- **Cases & Actions:** create distinct investigation/support/verification/cash-flow/beneficiary/reminder tasks from recommendations. Status, owner, disposition, checklist, contact outcome, follow-up date, notes and timestamped activity persist in local storage. Duplicate customer/action tasks open the existing record. Resolution requires a disposition; notes and follow-up dates are validated.

All relevant views share one customer and one as-of day. Opening another section pauses playback. Refresh restores saved cases and returns the view to Overview / 24 September. Case evidence is an explicitly dated snapshot, independent of replay.

## Canonical financial story

Arjun receives salary of ₹85,000. His recurring expense budget is ₹42,000 and EMI is ₹18,000, leaving normal monthly surplus of ₹25,000. Cash immediately before the 13 September transfers is ₹96,000. ₹47,000 at 14:02 and ₹31,000 at 14:08 reduce it to ₹18,000, an 81.25% shock.

A ₹6,000 credit draw on 17 September increases cash **and debt**. Subsequent settled essentials total ₹12,000. On 24 September cash is ₹12,000; ₹6,000 of already-known pending essential commitments leave ₹6,000 for the ₹18,000 EMI due 27 September. Forecast shortfall is ₹12,000. Expected next salary is 1 October. The installment is upcoming, **not missed**.

Scores follow the approved sequence: `8/17 → 23/17 → 91/22 → 91/31 → 91/46 → 91/68`. Scam Risk 91 after 13 September is the peak of an open episode observed on that date, not a score for each later transaction. Transaction scores are separately labeled in evidence. Neither index is a probability.

## Boundaries of the simulation

- Scores and prior repayment records are authored synthetic fixtures. No model training, inference accuracy, calibration, SHAP attribution or claimed real-world effectiveness is present.
- Ledger balances, credit utilization, upcoming commitment coverage, portfolio counts, context rules, intervention routing and case persistence are functional.
- Rules use available device/payment evidence, cash shock, event ordering, repayment change, income gaps and pass-through structure. Thresholds in `src/config.ts` are configurable prototype choices, not institutional policy. Conflicting explanations route to manual review.
- Financial forecasts use pending essentials with `knownAt` timestamps. They never treat future settled consumption as already-observed evidence. Expected salary is a schedule, not a guaranteed future credit.
- High Scam Risk does not identify a perpetrator. Customer-authorized payments can still involve deception. Network relationships do not prove collusion. Scam subtype remains Unknown.
- Case actions are local review requests or draft tasks. No message is sent, payment held, debt forgiven, terms changed, recovery achieved or account frozen. Completed transfers cannot be held retroactively. Saving a case never reduces a risk score.
- Local browser storage is not an institutional database. Clearing site data removes cases; there is no multi-user synchronization, authentication, authorization, real identity verification or production audit security.

## Reset and recording

**Reset replay** sets day 1 and retains cases. **Reset saved cases** opens a confirmation explaining that all local cases, notes and activity will be deleted; playback and histories remain unchanged. Two verification-created synthetic tasks are retained in the review browser so you can inspect their saved trail. A fresh browser profile starts with an empty queue; clear the sample cases explicitly before a clean recording.

Recommended recording view: 1920 × 1080, browser zoom 100%; 1440 × 900 is also checked. The main story's timeline, primary interventions and EMI state are visible together. Full case activity intentionally scrolls. Smaller windows reflow panels and preserve horizontally scrollable data tables.

See `DEMO_SCRIPT.md` for the roughly 2:20 click-by-click narration, `V2_HANDOFF.md` for model integration and migration points, and `VERIFICATION.md` for the actual checks and screenshot inventory.

## Source map

| File | Responsibility |
|---|---|
| `src/types.ts` | Customer, event, transaction, loan, financial, risk, context and case contracts |
| `src/data.ts` | Deterministic synthetic ledger / scenario fixtures |
| `src/selectors.ts` | Strict as-of selection and ledger-derived financial state |
| `src/scoring.ts` | Typed authored score provider and replaceable `scoreProvider` binding |
| `src/config.ts` | Prototype thresholds |
| `src/context.ts` | Observable evidence and temporal association rules |
| `src/interventions.ts` | Human review recommendations by context |
| `src/persistence.ts` | Versioned storage key, duplicate prevention and audit mutations |
| `src/App.tsx` | Four section views and shared customer/playback state |
| `src/components.tsx`, `src/MoneyEdge.tsx` | Charts, evidence sheets and inspectable money-flow edges |
| `src/engine.test.ts` | Financial, as-of, routing, replay and persistence invariants |

Design references informed the investigation workflow; vendor screenshots are not embedded in the app. `THIRD_PARTY_NOTICES.md` records the licenses of reused open-source libraries and bundled font assets.
