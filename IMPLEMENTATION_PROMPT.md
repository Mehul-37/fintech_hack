# Build the complete V1 prototype

Work in `C:\Users\yadav\Documents\ChatGPT\fin_hackathon`.

I have approved the product direction developed in an earlier chat. Build the complete V1 application now, carry it through browser verification and fixes, and leave it ready for my review and video recording. Make routine implementation/design decisions yourself. Ask only if an essential requirement is genuinely blocked; do not stop after planning, scaffolding, or one completed screen.

## Read first

1. `PROTOTYPE_PLAN.md` in this folder: the detailed product specification, financial scenario, research links, reusable components, and acceptance criteria.
2. Images in `research/screenshots/`: inspect them as references for investigation workflows and reusable UI structure. They are not assets to insert into our application or a design to clone pixel for pixel.
3. Applicable repository instructions and any existing project files. Preserve unrelated work.

The plan contains both V1 and V2. This request authorizes **V1 only**. Do not train/download ML models, build the V2 Python backend, or start an additional research phase. Consult linked official component documentation only when needed to implement correctly. Preserve the existing research and plan.

## Product and scope

Build a polished desktop workspace for a financial-institution analyst. Its core is:

**Suspicious event -> financial shock -> financial-state change -> repayment-risk change -> contextual explanation -> appropriate intervention.**

This must be obvious from the actual interaction, not just marketing copy. Separate Scam Risk and Repayment Risk appear on one evolving customer timeline. Distinguish possible scam victims, possible mule accounts, organic distress, healthy customers, and uncertain cases. Use cautious association language; do not claim proven causation or unprecedented novelty.

Today we need an interactive prototype suitable for a 2–2.5 minute video. The submission deadline in the supplied guidelines is 4 October 2026 at 1:30 AM, with a final presentation at 10:30 AM. Scores may be scripted for this version. Keep **Synthetic scenario • Simulated risk scores** visible in a tasteful, readable badge. No fabricated ML accuracy, calibrated probabilities, SHAP contributions, delivered messages, or real banking actions.

## Build all four sections

### 1. Overview

Computed portfolio counts, customer search and filters, a Scam Risk versus Repayment Risk scatterplot, a prioritized review queue, and a clear way to launch the main customer story. Customer rows and plot points must navigate to the relevant record. Include a modest coherent portfolio, targeting 24 customers with five detailed scenarios.

### 2. Customer 360 — highest priority

Customer summary, both scores, financial state, loan/EMI tracking, and a large shared risk timeline. Provide play/pause, previous/next event, scrubber, and reset. Include event markers, inspectable evidence, before/after financial indicators, contextual explanation, and recommendations.

Replaying time must synchronously update the relevant events, financial state, scores, context, and recommendations. Do not reveal future evidence in an earlier as-of view. Use one coherent selected-customer/as-of state across relevant views.

Use Arjun's canonical timeline in the plan, including salary ₹85,000, monthly expenses ₹42,000, EMI ₹18,000, and the ₹47,000 + ₹31,000 transfers six minutes apart. The immediate balance changes from ₹96,000 to ₹18,000. Follow the plan's score sequence and EMI-before-next-salary reasoning. Distinguish the open scam episode's peak score from a new transaction score.

### 3. Transactions & Network

Filterable transactions across represented payment channels, a functional transaction detail panel, and a small interactive money-flow network. Show the difference between a victim's outgoing loss and a possible mule's fan-in/rapid onward transfers. Clicking nodes/edges should expose relevant synthetic evidence. Keep network complexity controlled.

### 4. Cases & Actions

Create investigation and repayment-review tasks from recommendations. Support case viewing, status changes, notes, follow-up dates, customer-contact outcomes, and a timestamped activity log. Persist changes locally across refresh. Prevent accidental duplicate case creation and provide sensible empty states/validation. Demo reset must be explicit about whether it resets playback or saved case data.

Represent recommendations and review requests accurately. A completed transfer cannot be held retroactively. Customer-authorized payment does not automatically mean a legitimate payment. Requesting support does not automatically forgive debt or reduce a risk score.

## Real logic behind simulated scores

- Use deterministic authored/seeded data, not new random values on each render.
- Derive financial balances and portfolio counts from underlying records.
- Implement transparent context and intervention functions using available events, timing, financial changes, and evidence. Do not just display a hidden scenario label as the context engine's result.
- Define configurable prototype thresholds and evidence references. Handle conflicting/insufficient evidence with manual review.
- Keep model explanations separate from contextual explanations. V1 explanations describe observed signals.
- Use a typed score-provider interface returning simulated scores, provenance, and as-of timestamps. Tomorrow we should be able to replace it with model inference without redesigning the UI.
- Separate data, selectors/financial calculations, scoring provider, context rules, intervention rules, persistence, and UI without excessive architecture.

## Design and reuse

Recommended stack: React + TypeScript + Vite, Tailwind/shadcn, Recharts, Motion, and React Flow where useful. Choose compatible maintained versions. If a working application already exists, adapt it rather than overwriting it blindly.

Use the plan's exact component links to reuse suitable dashboard primitives, charts, transitions, number animation, and network edges. Retain applicable license notices. Free components are sufficient; no purchased templates or subscriptions.

Make it look like a carefully designed financial investigation product. Give the timeline and explanation strong visual hierarchy. Choose a consistent restrained visual direction, clear typography, tabular numbers, accessible contrast, and distinct risk lines with labels. Use motion to communicate changes. Avoid decorative clutter and default-template filler. Choose a simple working name if none exists; do not block on branding.

Optimize the main recording path for a 16:9 desktop viewport and verify readability at 1440×900 and 1920×1080. Support reasonable smaller-window behavior without spending this round building a separate mobile experience. Include keyboard usability, visible focus, tooltips, and reduced-motion handling. Keep navigation and critical controls easy to discover.

The demo must run locally without API keys or external runtime services after setup. No authentication screen is necessary. Do not publicly deploy, submit a form, or record/upload a video in this task; leave the application ready for me to review and record.

## Implementation and verification

Build in this order: data contract and scenarios -> Customer 360 replay -> context/action logic -> persistent cases -> Overview -> transaction/network view -> visual polish.

Continue until all required sections are complete. Verify in a real browser, not just by compiling. Exercise all five scenarios, full replay and reset, backward scrubbing, customer switching, filters, transaction inspection, graph interactions, and creating/updating a case followed by a refresh.

Run type checking and a production build. Add focused tests for meaningful invariants: ledger arithmetic, as-of filtering, different context/intervention outcomes, stable replay, and persistence. Fix console errors, inconsistent data, clipping, unreadable charts, and dead controls. Capture useful screenshots after final verification. If something cannot be verified, report the exact limitation rather than claiming it passed.

## Deliverables

1. Complete working V1 source in this folder, with local setup/run instructions and clear simulation limitations in `README.md`.
2. `DEMO_SCRIPT.md`: a roughly 2:20 narration with exact click/replay steps, using the plan's story and an honest simulation disclosure.
3. `V2_HANDOFF.md`: actual data contracts, score-provider replacement points, persistence migration notes, tests, and remaining model work. Do not implement V2 yet.
4. Final verified screenshots, plus a concise report of what works, checks run, any genuine remaining issues, and the local preview URL.

Start implementing now. The next review is mine after the complete V1 is working.
