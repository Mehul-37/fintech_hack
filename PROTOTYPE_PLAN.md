# Fintechstico prototype proposal

Prepared 3 October 2026. Discussion and research deliverable; implementation has not started.

## Decision proposed

Build a desktop financial-risk investigation app with four sections: Overview, Customer 360, Transactions & Network, and Cases & Actions. The signature interaction is a replayable customer timeline: suspicious event -> financial shock -> repayment deterioration -> contextual response.

Today: working UI, deterministic synthetic histories, simulated scores, real context rules, local case persistence, and a 2 minute 20 second demonstration. Tomorrow: keep that UI and replace the score provider with two trained models, derived financial features, and measured synthetic holdout evaluation.

This is a bank/fintech operator interface. The institution's analyst is the primary user. No customer app, real payment integrations, or production banking infrastructure is necessary for this prototype.

## Submission facts

Source: user-supplied `Fintechstico’26- Prototype Round Guidelines.pdf`, two pages, visually inspected.

- Video deadline: 4 October 2026, 1:30 AM. The PDF does not name a timezone; interpret in the Delhi event/local IST context.
- Recommended video length: 2 to 2.5 minutes.
- Required content: brief problem overview, solution approach, prototype demonstration.
- One team member submits through the Google Form when shared.
- The round requests a functional prototype, but explicitly accepts progress so far and evaluates the submitted work accordingly. It does not explicitly waive ML or approve unlabeled fabricated results.
- Shortlisting results: approximately 3:00 AM on 4 October.
- Final presentation: 4 October, 10:30 AM, NSUT Dwarka, Delhi; working prototype, solution strategy, and PPT deck.
- Improvement may continue until the final presentation. Account for sleep, travel, recording, and upload time rather than treating all intervening hours as development time.

Persistent V1 label: **Synthetic scenario • Simulated risk scores**. Video narration should say that the workflow is interactive and model integration is the next phase. Do not display invented accuracy, SHAP values, loss-prevention results, or calibrated probabilities.

## Screen 1: Overview

Question answered: Who needs attention, and for what reason?

Content:

- Four counts computed from the loaded dataset: customers monitored, active scam alerts, repayment warnings, possible scam-linked distress cases. Categories may overlap; do not imply they sum to the customer count.
- Two-dimensional scatterplot: x = Scam Risk, y = Repayment Risk. Both axes 0-100. Shape/label indicates context; clicking a point opens that customer.
- Prioritized queue: customer, both scores and changes, context, next EMI, review status, recommended next step.
- Small portfolio trend/scam-pattern summary to satisfy the challenge's overview requirement.
- Filters for context, score band, payment channel, and open review status.
- A visible demo selector and Replay Customer Story button.

Interactions: search, filter, select a customer, jump to an open case. Use a manageable proposed portfolio of 24 synthetic customers, with five carefully authored stories; the exact count is not itself a selling point.

Video allocation: approximately 10 seconds. Open Arjun immediately.

## Screen 2: Customer 360

Question answered: What changed, when, and what may explain it?

This is the most important screen and should occupy roughly half the video.

Top summary:

- Customer name/ID, selected as-of date, salary, outstanding loan, next EMI and due date.
- Scam Risk and Repayment Risk with change since baseline and score provenance.
- Context badge: Healthy, Suspected scam, Possible scam-linked distress, Organic distress, Possible mule, or Uncertain/manual review.

Center:

- Two risk curves on a shared time axis and 0-100 scale, with direct labels and different line styles.
- Event markers for device change, transfers, liquidity change, emergency credit, and EMI due.
- Play, pause, previous/next event, scrubber, and reset controls.
- As-of playback reveals only events already observed. An optional full-history review must be clearly marked as retrospective.

Below the graph:

- Before/after financial state: available balance, cash buffer, expected essential commitments before EMI, credit utilization, expected salary date, and funds available for EMI.
- Loan card: outstanding principal, installment amount, upcoming schedule, paid/late/missed history, and days past due. Before a due date, show a forecast warning; do not label an installment missed early.
- Context evidence chain: suspicious outflow, balance shock, subsequent deterioration, repayment score rise. Each item links to its event.
- Evidence-strength wording and alternative explanations; incomplete evidence routes to manual review. Avoid invented confidence percentages.
- Recommended action panel leading directly to a case.

Example interpretation: “Repayment Risk increased by 51 points after a suspicious ₹78,000 outflow depleted the customer's buffer. The sequence is consistent with possible scam-linked financial distress. Customer confirmation is pending.”

Keep model explanations separate from context explanations. A model explains its score; temporal rules explain why two histories may be related.

### Canonical V1 scenario

The brief has inconsistent intermediate dates; use one agreed sequence throughout the UI, narration, and future fixtures.

| Day | New observation | Scam Risk | Repayment Risk |
|---|---|---:|---:|
| 1 | Stable income and repayment history | 8 | 17 |
| 12 | Unusual device | 23 | 17 |
| 13 | ₹47,000 then ₹31,000 to a new beneficiary, six minutes apart | 91 | 22 |
| 17 | Reduced buffer and increased credit reliance | 91 | 31 |
| 20 | Persistent liquidity pressure | 91 | 46 |
| 24 | EMI approaching before next salary | 91 | 68 |

Scores above are explicitly scripted. If 91 is retained after day 13, define it as the peak score of the open scam episode, dated day 13; distinguish it from a fresh transaction score. A high score does not mean the customer is a perpetrator.

Arithmetic:

- Starting account balance immediately before transfers: ₹96,000.
- Transfers total ₹78,000; immediately afterward balance is ₹18,000, an 81.25% reduction.
- Salary ₹85,000, recurring monthly expenses ₹42,000, EMI ₹18,000 imply a normal monthly surplus of ₹25,000 before other items.
- Put EMI before the next salary credit and include actual essential outflows before it to explain the cash shortfall.
- Derive credit utilization from credit used and credit limit, and income/expense ratios from the underlying ledger.
- Record suspected scam loss separately from ordinary consumption expenses. Do not automatically call the recurring expense/income ratio worse when neither has changed.
- Opening cash + inflows - outflows must equal closing cash. A credit draw is a cash inflow and a liability increase, not salary.

## Screen 3: Transactions & Network

Question answered: What evidence supports the alert, and where did funds move?

Transaction table:

- Timestamp, amount, direction, channel (UPI/wallet/card/digital banking), counterparty, status, risk, and triggered signals.
- Side panel: usual transfer size versus observed, beneficiary novelty, device status, velocity, balance before/after, and suspected pattern.
- Suspected subtype may be Unknown. An amount/device pattern alone does not establish impersonation versus phishing; use additional synthetic customer-report evidence when assigning a specific subtype.

Network tab:

- Small directed graph with time-stamped amounts, account labels, and selected-edge transaction details.
- Victim example: established borrower -> suspicious recipient.
- Mule example: several senders -> focal account -> rapid onward transfers.
- Show only relationships represented in the synthetic data. Distinguish transaction edges from shared-device or shared-IP relationships. A shared identifier is not proof of collusion.

V1 implementation: reusable React Flow graph and scripted transactions. V2: same view driven by ledger-derived edges, fan-in, fan-out, and pass-through features. No GNN.

Completed transfers cannot be retroactively held. For a completed loss, offer investigation/recovery review and review of future payments. Temporary hold is relevant only to a pending simulated transaction.

## Screen 4: Cases & Actions

Question answered: What should the operator do, and what has actually been done?

- Queue with status, owner, customer, priority, next follow-up, and intervention category.
- Case detail with evidence, contextual explanation, checklist, notes, and timestamped activity log.
- Create investigation; record customer-contact outcome; request beneficiary review; schedule follow-up; draft reminder; request manual repayment-support/restructuring review.
- Status progression: Open -> In review -> Awaiting customer -> Resolved, with operator-selected disposition.
- Contact result must distinguish customer initiated the payment from customer knowingly paid a legitimate party. A scam can involve an authorized payment.
- Recommendation is separate from approval and execution. Support requests do not automatically change contractual loan terms or erase repayment risk.
- V1 actions persist locally and survive refresh. Labels say “task created” or “review requested,” never “SMS sent” or “account frozen” unless that action actually occurred in the simulated system.

Comparison stories:

| Story | Context and action |
|---|---|
| Healthy | No unnecessary intervention |
| Organic deterioration | Income/cash-flow review and repayment-support assessment |
| Possible scam victim | Fraud investigation plus support review |
| Possible mule | Investigate rapid pass-through; no victim-support inference |
| Ambiguous large legitimate transfer | Verification/manual review; no automatic scam label |

Add negative controls during V2: scam without repayment distress (adequate buffer/recovery), pre-existing distress followed by unrelated fraud, legitimate large payment, and missing/conflicting evidence.

## What is reusable

| Resource | Reuse proposed | Evidence and limits |
|---|---|---|
| [shadcn dashboard-01](https://ui.shadcn.com/blocks#dashboard-01) | Sidebar, cards, table, dialogs, sheet panels | Copyable dashboard block. [MIT source license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md). Replace its layout emphasis and content with our customer story. |
| [shadcn line charts](https://ui.shadcn.com/charts/line) | Recharts foundation for risk curves and tooltips | Shared date cursor/event annotations remain our custom logic. |
| [Motion for React](https://motion.dev/docs/react) | Context-card transitions and SVG event reveal | Use free core; Motion+ examples/components can be paid. [Core repository](https://github.com/motiondivision/motion). |
| [Magic UI Number Ticker](https://magicui.design/docs/components/number-ticker) | Short animated score changes | Verify updates to an already mounted value during implementation. [MIT community repository](https://github.com/magicuidesign/magicui). |
| [Magic UI Animated Beam](https://magicui.design/docs/components/animated-beam) | Brief event-to-impact-to-action illustration | Optional; do not let a decorative animation dominate the timeline. |
| [React Flow animated SVG edge](https://reactflow.dev/ui/components/animated-svg-edge) | Money movement through a small network | Public component example. [Core repository](https://github.com/xyflow/xyflow); paid Pro examples are separate. |
| [LightGBM](https://github.com/lightgbm-org/LightGBM) / [XGBoost](https://xgboost.readthedocs.io/en/stable/python/python_intro.html) | Model-training and inference libraries | Libraries are reusable, but fitted weights must match our data and targets. Choose one family for both models. |
| [SHAP](https://github.com/shap/shap) | V2 model explanations | Compute actual contributions. Do not fabricate SHAP in V1 or label log-odds contributions as percentage points. |
| [Fraud Detection Handbook](https://github.com/Fraud-Detection-Handbook/fraud-detection-handbook) | Simulator, feature-engineering, validation, imbalanced-metric reference | Notebook code GPL-3.0; prose/images CC BY-SA 4.0. Study methodology; direct adaptation requires respecting those licenses. |
| [IBM AMLSim](https://github.com/IBM/AMLSim) | Reference for fan-in/fan-out and suspicious network patterns | Apache-2.0. Existing Java/Python dependency requirements make full integration unattractive for this deadline. It does not provide our salary/EMI distress story. |

Preserve applicable third-party notices in reused code. Proprietary product screenshots are visual research references, not components to paste into the product. The supplied two-page guidelines do not specify a full third-party-code/pretrained-model policy; do not infer such permission or prohibition from their silence.

Motion should communicate a state change: 200-350 ms transitions, a brief event pulse, progressive risk curves, and subtle flow edges. Provide pause/reset and reduced motion. Avoid continuous particle backgrounds, 3D globes, typing animations on critical explanations, and slow counters during narration.

## Comparable products and what they establish

These are findings from public first-party pages, not hands-on access to vendor accounts. Vendor effectiveness claims were not independently tested. This scan is not a novelty proof.

| Product | Observed capability | Design lesson |
|---|---|---|
| [SEON Customers](https://docs.seon.io/knowledge-base/user-manuals/customers) | Customer details, activity history, network investigation, comparison | Keep evidence and customer context one click apart. |
| [Unit21 Case Management](https://www.unit21.ai/products/case-management) | Investigation workflows, linked evidence, human decisions, audit trails | A recommendation needs a tracked case and next step. |
| [Unit21 case queue guide](https://support.unit21.ai/hc/en-us/articles/10515492211988-How-to-find-a-Case) | Filters, open/closed cases, assigned-case table | Useful queue reference. Screenshot is from older documentation, not proof of its latest UI. |
| [Feedzai RiskOps](https://www.feedzai.com/riskops/) | Connected transaction, behavioral, device, and network signals; investigations | Unified fraud context is already offered; do not claim it as an untouched category. |
| [Provenir Collections](https://www.provenir.com/solutions/collections/) | Early identification of at-risk accounts and tailored treatment | Personalized repayment treatment already exists; our demonstration must show the particular scam-shock sequence. |
| [Provenir Platform](https://www.provenir.com/platform/) | Credit, fraud, customer management decisioning in one platform | Do not pitch two scores in one dashboard as sufficient differentiation. |

Screenshot captures saved in `research/screenshots/`: SEON activity, SEON network, Unit21 case queue, shadcn dashboard starter. These are captures of public documentation/demos, with source URLs recorded above.

## Can pretrained models be reused?

Technically yes, when the artifact is available, licensed appropriately, and its preprocessing, feature schema, target, population, and time horizon fit. None reviewed was validated as a drop-in fit for this project. No third-party weights were downloaded or executed.

Specific candidates inspected:

1. [rajvivan/fraud-detection-system](https://huggingface.co/rajvivan/fraud-detection-system): model card describes XGBoost and an API expecting Time, Amount, and V1-V28 from a European card benchmark. These transformed inputs do not match our device/beneficiary/UPI features. It is an example pipeline, not our scoring engine.
2. [mitalidaduria/payment-fraud-xgboost](https://huggingface.co/mitalidaduria/payment-fraud-xgboost): card lists MIT, amount/velocity/device signals and self-reported metrics. Exact encoding/preprocessing and runnable artifact compatibility were not verified. Do not make the deadline depend on this candidate.
3. [BuildersLab/credit-risk-default-model](https://huggingface.co/BuildersLab/credit-risk-default-model): card describes MIT, origination-time LendingClub default prediction and unfinished metric fields. It targets a different decision from dynamic next-EMI monitoring.

Recommendation: reuse established libraries and implementation patterns; train two small models on our own generated trajectories. Do not feed made-up V1-V28 values into an unrelated downloaded model just to obtain an “AI” score.

## V1-to-V2 architecture

Proposed stack, not an existing repository constraint: React + TypeScript + Vite, shadcn/ui, Recharts, Motion; Python + FastAPI + SQLite in V2. Choose Vite for a simple operator SPA and keep the Python inference service separate. No cloud account is required for the local final demo.

```text
Customer/transaction/loan events
               |
       As-of financial state
               |
       Score provider interface
       /                      \
V1 scripted snapshots     V2 two ML models
       \                      /
        Context rules + evidence
               |
       Intervention recommendations
               |
       UI + persistent case actions
```

Define stable records from the start: customer, transaction, session, loan, repayment, financial snapshot, risk snapshot, context assessment, intervention, audit entry. Use timestamps and event IDs consistently. Keep hidden scenario labels and future outcomes away from scoring inputs.

Risk snapshot fields: customer_id, as_of, scam_score, repayment_score, score_source (simulated/model), model_version, evidence references, and separate explanations. If using an open-episode peak, include its aggregation window and event timestamp.

### Tomorrow's functional milestone

1. Seeded generator with a proposed initial scale of 1,000 customers over 180 days, adjusted after runtime checks. Include at least 90 days of history and enough follow-up for a repayment outcome.
2. Financial ledger, balances, credit draws, salary timing, essential outflows, EMI schedules, and repayments derive from consistent events.
3. Fraud model: transaction-level suspected scam involvement, with victim/participant context handled separately.
4. Repayment model: predict the next EMI due within 30 days remaining unpaid seven days after its due date. Document treatment of snapshots without a qualifying upcoming EMI. Exclude snapshots whose outcome follow-up has not elapsed.
5. Features use only information available at scoring time. Future default flags, archetype labels, future balance, and future investigation outcomes are excluded. Do not mechanically add Scam Risk to Repayment Risk; let financial changes drive the latter.
6. Split by customer and time; purge overlapping outcome windows at temporal boundaries. Fit preprocessing/calibration on training/validation only. Keep the video's hero customer outside training.
7. Context rules run against event order, liquidity change, repayment change, competing explanations, and evidence availability. Thresholds are prototype configuration, not universal banking policy.
8. Report measured precision/recall, PR-AUC, false alerts per 1,000, repayment calibration and warning lead time, plus contextual false links and scenario checks. Report held-out synthetic evaluation as such, not real-world banking performance.
9. Save/load model artifacts and show fresh inference responding to a changed event. A case action persists and appears in its audit trail. Run the full flow after restarting the app.

Bank payment execution, real collections changes, customer messaging delivery, model validity on real people, and production authentication/compliance are outside this hackathon milestone.

## Proposed 2:20 video

| Time | Visual and message |
|---|---|
| 0:00-0:15 | “A scam loss today can become an EMI problem later.” Show the short event/impact/risk chain. |
| 0:15-0:25 | Overview; open Arjun. Explain that both risks share one customer timeline. |
| 0:25-1:00 | Replay healthy baseline, device change, and two transfers; show ₹96,000 -> ₹18,000. |
| 1:00-1:25 | Advance toward EMI. Repayment Risk rises; expand context evidence. |
| 1:25-1:50 | Compare possible victim with possible mule/organic distress. Show different recommended actions. |
| 1:50-2:10 | Create an investigation and manual support-review task. Show the saved activity entry. |
| 2:10-2:20 | Restate value and disclose synthetic scenarios/simulated scores; model integration is next. |

If demonstrating a loss that settled before intervention, state this clearly. Do not say the system blocked the same payment and still show its full financial loss.

## Acceptance before recording

- Replay is deterministic, supports pause/reset, and does not reveal future evidence prematurely.
- Counts, balances, dates, explanations, and recommended actions agree across screens.
- Five scenarios load; the full video follows one primary story plus a brief comparison.
- Filters and event inspection work. Case creation/status/notes persist after refresh.
- Simulated scores are labeled; explanations are observable evidence, not pretend SHAP.
- No dead buttons on the recording path; no external network dependency during replay.
- Fixed 16:9 recording layout, readable chart labels, consistent risk colors and line styles, visible cursor, and no unnecessary scrolling.
- Target final export around 2:20; leave time to check audio, playback, and upload access.

## Proposed implementation order once agreed

Data contract and canonical scenario -> Customer 360 replay -> context and action rules -> case persistence -> overview -> transaction/network evidence -> recording polish -> trained models and evaluation.

The highest-value custom work is the timeline, event linking, cash-flow explanation, and intervention change. The dashboard scaffolding and animation primitives can be reused.
