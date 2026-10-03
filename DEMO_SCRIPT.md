# Meridian demo — approximately 2:20

Updated for V2.1 trained models. Target about 140 seconds; rehearse against the clicks. Introduce the data and evaluation as synthetic. Do not imply recovered funds, real messages or changed loan terms.

## Before recording

1. Run the app at http://127.0.0.1:5173/; use a 1920 × 1080 viewport at 100% zoom. Start at Overview / 24 September.
2. If earlier practice created cases, use **Cases & Actions → Reset saved cases → Delete all saved cases**. This deletes browser-local cases, not customer histories. Return to Overview.
3. Introduce the synthetic scenario and trained-model captions. All clicks below are in the app; no external links or submissions are needed.

| Time | Exact interaction | Narration |
|---|---|---|
| 0:00–0:15 | Start on Overview. Point to the risk map and attention queue. | “A scam loss today can become an EMI problem later. Meridian connects the observed sequence. We trained two separate models on 2,000 synthetic customers; this is an evaluated simulation, with real-world validity still unverified.” |
| 0:15–0:25 | Click **Replay customer story**. Arjun opens at day 1. | “Here are 24 monitored customers. We separate Scam Risk from Repayment Risk and follow both on one customer timeline. Let’s open Arjun.” |
| 0:25–0:40 | Point to salary/loan state. Click **Next event** once, reaching day 12. | “Arjun earns eighty-five thousand rupees, with a forty-two-thousand expense budget and an eighteen-thousand EMI. His history is stable. Then an unfamiliar device appears. That signal alone does not establish a scam.” |
| 0:40–1:00 | Click **Next event** to day 13. Click the evidence row **Two transfers · six minutes apart**. Read its detail; click **Close detail**. | “Two completed payments of forty-seven and thirty-one thousand rupees reach a new beneficiary, six minutes apart. Cash falls from ninety-six thousand to eighteen thousand. The model flags the transfers; the account shows the observed episode peak. Customer confirmation is still pending.” |
| 1:00–1:25 | Click **Next event** three times: days 17, 20, 24. Point to the repayment line, financial state, salary date and context. | “Only six thousand rupees remains for an eighteen-thousand EMI: twelve thousand short at the due date. Yet the seven-day delinquency estimate is about 4.6, because salary is expected before that cutoff. We distinguish cash pressure from persistent overdue payment. The possible connection still needs confirmation.” |
| 1:25–1:40 | In **Demo customer**, choose **Rohan Kapoor**. Click **Transactions & Network**, then **Money-flow network**. If needed click **Fit View**. | “Compare Rohan: three senders pay in, then most funds move rapidly onward. That is a possible mule pattern, requiring source-of-funds investigation. It does not support a victim-support inference.” |
| 1:40–1:50 | Click sidebar **Customer 360**; choose **Neha Rao**, then **Arjun Mehta**. The as-of day stays 24. | “Neha’s pressure follows an income interruption, with no suspicious-outflow chain. Different evidence calls for a different response.” |
| 1:50–2:02 | For Arjun click **Create fraud investigation**. Change **Status** to **In review**. Use sidebar **Customer 360** and click **Request repayment-support review**. | “For Arjun, we create an investigation and a separate manual repayment-support review. These are saved review tasks; the settled loss cannot be blocked retroactively.” |
| 2:02–2:10 | In the support case add note **Assess EMI timing; terms and scores unchanged.** and click **Add note**. Point to its saved note and activity entry. | “Notes and decisions persist with a timestamped trail. A support request does not forgive debt or change the score.” |
| 2:10–2:20 | Click sidebar **Customer 360**, showing Arjun’s complete timeline and the synthetic-training captions. | “The value is the event-to-impact-to-review workflow. Both models run locally, and the evidence distinguishes scam suspicion, cash pressure and the predicted repayment outcome.” |

## Replay option

For a rehearsal, **Play story** automatically advances between observations approximately every 1.9 seconds. **Pause** stops it; the day scrubber, previous/next controls and event stops permit exact pacing. Use manual Next event clicks during narration so the screen stays aligned with the words.

Do not describe the episode peak as a fresh transaction score, model accuracy or account-level probability. No video has been recorded, uploaded or submitted as part of this build.
