# V1 verification — 3 October 2026 (IST)

Complete source and local preview: **http://127.0.0.1:5173/**. The review server remains running on loopback. No public deployment, submission, message delivery, recording or upload was performed.

## Checks completed

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | 18 tests passed |
| `npm run build` | Passed; compiled app, charts, network, Motion and vendor chunks |
| Dependency audit at final install | 0 reported vulnerabilities; test dependency upgraded to the patched version |
| Production artifact smoke test | Overview, Arjun baseline/final state, both transfer edges, network and empty cases rendered correctly on temporary loopback port 4173; server stopped afterward |
| Final browser console | No errors or warnings during the final fresh-page checks, including the production smoke test |

Tests exercise all 24 ledgers across all 24 replay days; exact transfer arithmetic and timestamps; credit liability accounting; EMI shortfall and non-overdue status; as-of evidence and scoring; no future settled commitments; stable scripted replay; distinct scenario/action outcomes; hidden-label independence; competing income / pre-existing distress; distinct-sender requirements; unique chronological evidence highlights; case storage round-trip; duplicate prevention and invalid storage handling.

## Real-browser exercises

- **Replay:** checked all six canonical stops: 8/17, 23/17, 91/22, 91/31, 91/46, 91/68. Play reached day 24; pause stopped progression; previous/next, reset and backward scrub worked. Home/End on the day slider changed the as-of day. Future transfer records, episode score and evidence disappeared when returning before day 13.
- **Financial story:** day 12 cash ₹96,000; day 13 cash ₹18,000; day 24 cash ₹12,000. Known essentials ₹6,000; EMI funds ₹6,000; forecast shortfall ₹12,000. Due date 27 September precedes expected salary 1 October; no overdue or missed label appears.
- **Five stories:** Arjun = possible scam-linked distress; Priya = healthy with no intervention; Neha = organic distress with income/support review; Rohan = possible mule with investigation and no victim-support inference; Dev = uncertain/manual verification.
- **Overview:** search and no-match state; context filter; high risk band (three records at day 24); wallet channel filter (seven records); open review filter (one customer with the two sample tasks); row navigation and scatterplot click navigation.
- **Transactions:** UPI filter showed three observed records for Arjun; incoming + UPI produced the empty state. A-T1 inspection showed ₹96,000 → ₹49,000, 13.4× usual transfer, new beneficiary, unusual device, Unknown subtype and completed-transfer limitations.
- **Network:** both ₹47,000 / 14:02 and ₹31,000 / 14:08 edges independently visible. Edge inspection opened transaction evidence; recipient node showed both linked transfers. Rohan’s three inbound edges and ₹75,000 onward edge rendered; Fit View worked. Keyboard-accessible transfer buttons provide the same evidence without requiring graph dragging.
- **Cases:** created fraud investigation and manual support-review tasks. Duplicate creation opened CASE-001 and kept the count at one until the distinct support task was created. Status, owner, checklist, analyst note, customer-initiated/legitimacy-unconfirmed contact result and 4 October follow-up survived refresh. Empty notes and missing resolution disposition were rejected. A valid disposition allowed resolution; changing status and case filters produced correct queue counts and empty states. Case creation/updates left the scores unchanged.
- **Reset clarity:** replay reset retained saved cases. Saved-case reset displayed the explicit deletion scope; cancelling retained both tasks. The destructive deletion was not executed in the review browser, so its captured sample audit trails remain available.

Browser testing found and fixed an input-event issue in follow-up date saving, duplicate highlighted evidence at the day-17 transition, and overlapping parallel transfer edges. Transient hot-reload warnings during source edits are excluded from the final fresh-load console check; they do not recur in the completed app.

## Layout and accessibility

- 1440 × 900: the complete primary story, replay controls, primary recommendations and financial/loan cards fit together. Final financial panel bottom measured approximately 899.7 px.
- 1920 × 1080: primary story and financial state fit; final financial panel bottom measured approximately 1077.8 px.
- 1024 × 768: no page-wide horizontal overflow; all playback controls remain present; dense panels scroll vertically. Tables use contained horizontal scrolling.
- Keyboard range controls were exercised. Native controls, labels, semantic buttons, visible focus styling, chart tooltips, dialog focus management and graph evidence alternatives are implemented. The browser bridge could not exercise Enter on the SVG scatterpoint; its key handler was source-reviewed, and click/table navigation was verified.
- Reduced-motion CSS and Motion’s `useReducedMotion` guard are implemented. The operating system’s reduced-motion preference was not changed during this session; that preference’s visual behavior was not separately browser-emulated.

No blocking issue remains in the verified recording journey. V1’s intentional limits are simulated scores, synthetic evidence and browser-local case storage. The demo narration is approximately 285 words across the prescribed 2:20 click sequence; no recording was made to measure an actual delivery time.

## Final screenshots

Screenshots are captures of the working local app. Case screenshots include the full saved trail and therefore extend vertically beyond their viewport height.

| File | View |
|---|---|
| [01-overview-1440.jpg](screenshots/01-overview-1440.jpg) | Computed portfolio, context map, story entry and queue |
| [02-customer-360-1440.jpg](screenshots/02-customer-360-1440.jpg) | Arjun at day 24; both risks, financial state and recommendations |
| [03-transaction-evidence-1440.jpg](screenshots/03-transaction-evidence-1440.jpg) | UPI-filtered ledger with A-T1 evidence sheet |
| [04-victim-network-1440.jpg](screenshots/04-victim-network-1440.jpg) | Separate outgoing transfers and selected recipient evidence |
| [05-mule-network-1440.jpg](screenshots/05-mule-network-1440.jpg) | Three senders and rapid onward transfer |
| [06-cases-persistence-1440.jpg](screenshots/06-cases-persistence-1440.jpg) | Saved investigation, outcome, follow-up, notes and audit |
| [07-customer-360-1920.jpg](screenshots/07-customer-360-1920.jpg) | Full recording-size customer story |
| [08-cases-persistence-1920.jpg](screenshots/08-cases-persistence-1920.jpg) | Full recording-size case detail and activity trail |

Two clearly synthetic verification tasks remain in the review browser’s storage on port 5173. A new browser/profile/origin starts with no cases. Use the documented explicit saved-case reset before a clean recording if desired.
