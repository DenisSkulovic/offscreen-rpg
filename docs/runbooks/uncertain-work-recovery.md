# Uncertain work recovery

**Reader question:** When a Storyteller attempt or a workflow operation looks unfinished, which records do I read, and when do I hold, record unknown, or escalate?

**Normative status:** task guide. This page does not change player guarantees or the technical custody contracts. Admission, spending, publication, and workflow delivery stay in the owners linked below.

**Owner:** this page, for the first response. It does not own a repair, a delete, or a charge.

**Explore by question:** [environment](#separate-the-environment) · [records](#name-the-records) · [truth](#who-owns-the-truth) · [tree](#decision-tree) · [ambiguous send](#ambiguous-provider-send) · [saved receipt](#saved-mechanical-receipt) · [pending delivery](#pending-notice-or-temporal-gap) · [restored SQL](#restored-sql-without-temporal-history) · [short lock](#short-lock-publication) · [local evidence](#already-uncertain-local-attempt) · [disagreement](#disagreeing-records) · [hold](#hold-unknown-or-escalate) · [commands](#commands) · [negative cases](#negative-cases).

The first response names the story, the operation, the generation, and the attempt, then reads the current row, the saved receipt, the outbox notice, and the question of provider usage. Each branch ends in hold, a recorded unknown, or an escalation. Querying a live database, opening Temporal, and running a settlement tool were not done for this page. Those steps are untested.

## Separate the environment

Local disposable investigation and a hosted environment are different jobs.

| Environment | What it is | First response |
| --- | --- | --- |
| Local story mode | The persistent database `offscreen_story_local` described in [Local live Story mode](local-development.md#local-live-story-mode-without-oauth) | Read the rows below. Stay on that local database. A provider send is still not repeated from this page. |
| Local Chamber | The disposable database `offscreen_chamber` in the same local-development guide | Read the rows below. Chamber reset, scenario arming, and worker start are separate launcher actions. They are not this identification. |
| Production or staging | Any hosted database, hosted Temporal namespace, or shared account | Hold and escalate. This page has no hosted repair. [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) records hosted recovery administration as future work. |

A local database name is not permission to run the same steps against another database. The local maintenance command below allows only `offscreen_story_local` or disposable `offscreen_hk01_repair_test`. It is not a staging tool and not a production tool.

## Name the records

Stop until these four identities are written down. If one is missing, or two rows could be the same work, use [Disagreeing records](#disagreeing-records).

| Identity | Where the current source stores it |
| --- | --- |
| Story | `storyteller_attempt.story_id`, and `game_action_receipt.story_id` or `game_action_execution.story_id` when the work is a played action |
| Operation | `storyteller_operation.generation_id` for a Storyteller operation. `game_action_execution.operation_id` or `game_action_receipt.operation_id` for a played action. `outbox.operation_id` for a delivery notice |
| Generation | `generation.id` and `generation.state` in [generations.ts](../../packages/db/src/schema/generations.ts) |
| Attempt | `generation.attempt_id` and `storyteller_attempt.id` in [storyteller.ts](../../packages/db/src/schema/storyteller.ts) |

Generation states are `pending`, `running`, `succeeded`, `failed`, and `uncertain`. A `pending` generation has no attempt id and no output. A `running` or `uncertain` generation has an attempt id and no output. A `succeeded` generation has an output. A `failed` generation has a failure code and no output. Read `generation.state`. The nulls do not distinguish `running` from `uncertain`.

Attempt states are `reserved`, `dispatched`, `settled`, `uncertain`, and `unsent`. The attempt's `reconciliation` is a separate word: `pending`, `matched`, `different`, `unavailable`, or `unknown`. An `uncertain` attempt is stored only with reconciliation `unknown`, a dispatch timestamp, no calculated charge, and no settlement timestamp. That shape is the check `storyteller_attempt_reconciliation` in the same schema file. This page did not query a live row. The check is the source, and a live reading is untested.

The Storyteller operation row is `storyteller_operation`, keyed by the generation id. Its states are `open`, `complete`, `uncertain`, and `exhausted`.

## Who owns the truth

Read the owner for the fact you are about to decide. A second copy of the fact on this page would be a second contract.

| Fact | Owner |
| --- | --- |
| Accepted command, committed story content, and spending rows | PostgreSQL. [Responsibility at the database boundary](../technical/platform/execution-and-delivery.md#responsibility-at-the-database-boundary) and [Commands and durable delivery](../technical/platform/execution-and-delivery.md#commands-and-durable-delivery) |
| Waiting, waking, and Activity retry | Temporal history. [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) |
| Notice handed from PostgreSQL to Temporal | The `outbox` row in [outbox.ts](../../packages/db/src/schema/outbox.ts). Delivery is not the game effect. [Worker exact-once note](../../apps/worker/README.md#exact-once-business-effects-vs-repeatable-delivery) |
| Mechanical outcome of a played offer | `game_action_receipt` in [campaign.ts](../../packages/db/src/schema/campaign.ts). One receipt for a story and offer |
| Provider usage for one attempt | `storyteller_attempt`, including `reconciliation`. [Attempt custody and an unknown call](../technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call) and [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission) |
| Short-lock capture and publication | [Before, during, and after the lock](../technical/engine/concurrency-and-recovery.md#before-during-and-after-the-lock) |

A player-visible recovery hint names the existing operation. It does not allocate a new one. Custody of an unknown call stays on the attempt row.

Workflow identity, when a notice exists, is the function in [contracts.ts](../../packages/workflows/src/contracts.ts) applied to that notice's operation id. The prefixes are `scripted-opening/`, `scripted-continuation/`, `controlled-interval/`, `story-decision/`, `storyteller/`, `campaign-activity/`, `campaign-action/`, and `campaign-consequence/`. [Implemented fixed interval](../technical/platform/execution-and-delivery.md#implemented-fixed-interval) uses the passage id for `controlled-interval/`. [Implemented solo response deadline](../technical/platform/execution-and-delivery.md#implemented-solo-response-deadline) uses the passage id for `story-decision/`. These prefixes identify an execution. They are not a start instruction. No Temporal read was run for this page.

Known notice topics in [dispatch.ts](../../apps/worker/src/outbox/dispatch.ts) are `campaign.action.v1`, `campaign.activity.v1`, `campaign.consequence.v1`, `storyteller.profiled.v1`, `opening.playable.scripted.v1`, `continuation.playable.scripted.v1`, `story.interval.v1`, `story.interval.wake.v1`, and `story.decision.v1`. A topic outside that map stays for a compatible dispatcher. [Implemented opening flow](../technical/platform/execution-and-delivery.md#implemented-opening-flow) leaves unknown topics untouched.

## Decision tree

Walk in this order.

1. [Separate the environment](#separate-the-environment). Production and staging stop at [Hold, unknown, or escalate](#hold-unknown-or-escalate).
2. [Name the records](#name-the-records). A missing or doubled id stops at [Disagreeing records](#disagreeing-records).
3. If `game_action_receipt` has a row for that story and offer, use [Saved mechanical receipt](#saved-mechanical-receipt) before judging narration.
4. Read `generation.state`, `storyteller_attempt.state`, and `storyteller_attempt.reconciliation` together. An unknown send uses [Ambiguous provider send](#ambiguous-provider-send).
5. Read `outbox.delivered_at` and whether Temporal history for that workflow id can be named. A gap uses [Pending notice or Temporal gap](#pending-notice-or-temporal-gap).
6. If the PostgreSQL copy was restored and Temporal history is gone, use [Restored SQL without Temporal history](#restored-sql-without-temporal-history).
7. A provisional capture or an interrupted action uses [Short-lock publication](#short-lock-publication).
8. An attempt that is already `uncertain` on `offscreen_story_local` uses [Already-uncertain local attempt](#already-uncertain-local-attempt) only to record the operator maintenance command. The first response still does not settle it.

### Ambiguous provider send

Use this branch when a provider request may have left the process and the usage of that request is not a stored match.

The executor in [execution.ts](../../packages/application/src/storyteller/execution.ts) marks the attempt dispatched before the provider call. A thrown provider result becomes an uncertain outcome. [budget.ts](../../packages/application/src/storyteller/budget.ts) then classifies a still-dispatched attempt as `uncertain` with reconciliation `unknown`, marks the operation `uncertain`, and stops that funding account. The generation update that follows stores `uncertain` only while the generation is `running` or already `uncertain`, and it stores no failure code for that state. When the budget call finds no dispatched attempt, it returns without a write. The generation update can still run. Read both rows.

Hold when any of these is the stored shape:

- `storyteller_attempt.state` is `dispatched` and `reconciliation` is `pending`. The send was recorded and the usage was not classified.
- `storyteller_attempt.state` is `uncertain` and `reconciliation` is `unknown`.
- `generation.state` is `uncertain`.
- The process died somewhere in that sequence and the two rows disagree. That disagreement is [Disagreeing records](#disagreeing-records).

Record provider usage as `unknown` when the attempt reconciliation is `unknown`, and when a dispatched attempt is still `pending` after a send that did not return a settled usage. [Durable breakpoint lifecycle](../technical/storyteller/provider-boundary.md#durable-breakpoint-lifecycle) says an account-credit total cannot settle that individual attempt, and a timeout before response headers can leave no provider generation id. This page does not call a provider lookup.

[Retry boundaries and uncertain side effects](../technical/platform/execution-and-delivery.md#retry-boundaries-and-uncertain-side-effects) says a retry inspects the attempt record and does not automatically issue a new paid request. [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission) keeps the conservative allocation and stops further paid admission until the attempt is reconciled. Escalation is required before any later send. This page does not authorize that send.

**Reading example, not a live trace.** Generation `running`, attempt `dispatched`, reconciliation `pending`, dispatch timestamp set, no stored usage. That is an ambiguous send. Hold. Record usage unknown. Leave the attempt id in place.

A stored `unsent` attempt, reconciliation `unavailable`, with no dispatch timestamp, is a known-unsent release in the schema check. Record that state. It is not an uncertain charge, and it is not a new send from this page.

A stored `settled` attempt keeps its reconciliation (`matched`, `different`, or `unavailable`). Record that word. Leave the attempt settled.

### Saved mechanical receipt

Use this branch when `game_action_receipt` has a row for the story and the offer. The receipt stores the outcome, the roll, the effects, and the generation id. The unique key is one receipt for that story and offer.

Keep the receipt. [Before, during, and after the lock](../technical/engine/concurrency-and-recovery.md#before-during-and-after-the-lock) says an uncertain retry reconciles that generation and that receipt. The same generation stays. A second success receipt is the case [Negatives that are already enforced](../technical/engine/concurrency-and-recovery.md#negatives-that-are-already-enforced-in-those-slices) already rejects for the interrupted-action slice.

Narration can still be `uncertain` while the receipt is present. The receipt remains the mechanical outcome. Publish or retry work, if it is ever authorized, has to reconcile that receipt. This page does not publish it and does not roll it again.

**Reading example, not a live trace.** A `game_action_receipt` row exists for the offer, and the linked generation is `uncertain`. Keep the receipt and the roll. Hold the generation. Record the attempt reconciliation as stored. Do not open a second receipt for the same offer.

### Pending notice or Temporal gap

Use this branch when the command or generation is stored and Temporal completion is not established.

`outbox.delivered_at` null means the notice is not in the delivered shape. A `lease_id` without `delivered_at` is a claim. The delivered check in [outbox.ts](../../packages/db/src/schema/outbox.ts) allows a delivery timestamp only when the lease is clear. Delivery means Temporal accepted the notice or the command was already processed, as [Commands and durable delivery](../technical/platform/execution-and-delivery.md#commands-and-durable-delivery) defines it. Delivery does not mean the fictional consequence committed. An accepted HTTP receipt means the command was durably received. It does not mean the consequence finished.

Hold when the notice is undelivered, when the workflow id cannot be confirmed from history, or when the worker was down. Worker downtime can delay publication. [Implemented solo response deadline](../technical/platform/execution-and-delivery.md#implemented-solo-response-deadline) says that delay does not extend answer eligibility. This page does not delete the notice, does not acknowledge it, and does not start the workflow.

If Temporal history cannot be read, record the workflow status as unknown. PostgreSQL remains the owner of the committed rows. Temporal remains the owner of the unfinished control flow. Guessing the workflow from the rows is the next branch when the history is actually lost.

### Restored SQL without Temporal history

Use this branch when a PostgreSQL copy was restored and the Temporal history for the affected stories is gone.

[Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) says workflow state is recovered through Temporal history. Restored PostgreSQL alone is insufficient. The same section names quarantine and a controlled restart from a known committed boundary. This guide does not define that procedure, a quarantine API, or a restart command. Those steps are untested here.

Hold the affected stories. Record Temporal status as unknown. Escalate. Leave the outbox notices in place. Starting a workflow id from the restored rows would be a new execution, not the lost one.

**Reading example, not a live trace.** A restored database shows a committed passage and an `outbox` row for `story.interval.v1`. Temporal history for `controlled-interval/` plus that notice's operation id is gone. The SQL copy is the committed passage and the notice. It is not the interval workflow. Hold and escalate.

### Short-lock publication

Use this branch for a provisional context capture or an interrupted played action. [Engine concurrency and recovery](../technical/engine/concurrency-and-recovery.md) owns the landed C1 and C2 slices. Full short-lock work is not finished.

Read the capture state and the execution state. `game_action_execution.state` is `running`, `paused`, `interrupted`, or `settled`. An interrupted execution can have a factual companion passage and no success receipt. That shape is the C2 result in [What C1 and C2 actually proved](../technical/engine/concurrency-and-recovery.md#what-c1-and-c2-actually-proved). Keep the generation id. Do not publish that generation under a new id.

A provisional capture is not a player retry button. The same page says there is no Admin UI for the application-private rearm. This guide does not call that rearm. [What is still not done](../technical/engine/concurrency-and-recovery.md#what-is-still-not-done) says a local Chamber race is not production support authority.

Hold if the next idea is a new roll, a new generation id, or a provider send to finish the passage. [Recovery the player can see](../technical/engine/concurrency-and-recovery.md#recovery-the-player-can-see) keeps settlement and narration on different fences.

### Already-uncertain local attempt

Use this branch only after the generation and the attempt are both already `uncertain`, and only on local story mode.

[HK01](../../work/changes/archive/2026-11/other/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md) retired the old settlement CLI. [The housekeeping audit](../../work/designs/open/repository-housekeeping/AUDIT-2026-11-17.md) records the replacement. `node scripts/repo-tools/plan-storyteller-saved-repair.mjs` is the supported operator maintenance command for saved-evidence preview and guarded apply. This page does not run it.

The command was read and was not run. Its gate, from that source, is all of the following:

- `--plan` is read-only preview; `--apply` mutates and requires `--plan-fingerprint`, `--operator`, `--reason`, `--local-disposable`, and an explicit `--database-url`.
- The database pathname must be `offscreen_story_local` or disposable `offscreen_hk01_repair_test`. Production and staging URLs are refused.
- Evidence is a JSON file under a caller-supplied `--evidence-root`; symlinks and paths that escape the root are refused.
- Named generation and attempt ids bind to stored rows, dispatch review, and saved provider bytes.
- A saved response that validates as ordinary model output is refused when invalid-output repair does not apply.
- `--apply` runs budget settlement inside the guarded recovery fence and appends one immutable operator audit row.

`--apply` is a mutation. Identifying the rows does not authorize it. This page cites `--plan` only as read-only identification context and does not execute either mode.

### Disagreeing records

Use this branch when the named rows do not describe one attempt.

Examples read from the schema and the executor order, not from a reproduced incident:

- Generation `uncertain`, attempt still `dispatched` or `reserved`.
- Attempt `uncertain`, generation still `running` or `succeeded`.
- A receipt for the offer, and a proposal to store a second roll.
- An outbox notice whose operation id matches none of the named generation, passage, or action ids.
- Two attempt ids for one generation story.

Record every state you actually read, and record `unknown` for every fact you could not read. Hold. Escalate before any send, settlement, delete, or new id. The friendly row is not the one to keep by guesswork.

## Hold, unknown, or escalate

| Situation | What to do |
| --- | --- |
| Production or staging | Hold and escalate. No hosted procedure is on this page. |
| Provider usage not stored as a match | Record `unknown`. Hold the existing attempt id. |
| Attempt or generation `uncertain` | Hold. The existing attempt stays the attempt. |
| Notice undelivered, or Temporal history unread | Record workflow status `unknown`. Hold. Leave the notice. |
| Temporal history lost after a SQL restore | Hold and escalate. The SQL copy stays a SQL copy. |
| Receipt present | Hold the receipt. Keep its roll and effects. |
| Rows disagree | Record each stored state. Record `unknown` for the rest. Escalate. |
| Local uncertain attempt with saved evidence | Record the HK01 maintenance command. This page does not run `--plan` or `--apply`. |

[Hold and recovery semantics](../technical/platform/spending-and-entitlements.md#hold-and-recovery-semantics) distinguishes `usage_uncertain` from an exhausted window or a revoked route. A usage hold stays a usage hold. This page does not resume the story and does not clear a stopped funding account.

## Commands

No command is cited as the identification step. A command is cited here only when its body was read and the body neither writes durable state nor calls a provider. Every candidate below failed that test, or it does not read the six facts this tree needs. None of them was executed. A live SQL session and a Temporal CLI session are untested, and this page does not supply either command.

| Candidate | What the source does | Disposition |
| --- | --- | --- |
| `node scripts/repo-tools/plan-storyteller-saved-repair.mjs --plan` | Read-only preview of the named generation, attempt, review, and saved evidence on an allowed local or disposable database | Refused as this page's identification step. It does not read the outbox or Temporal. It was not run. |
| `node scripts/repo-tools/plan-storyteller-saved-repair.mjs --apply` | Opens an allowed local/disposable database and calls guarded budget settlement | Refused. Mutation. It was not run. |
| `pnpm story:play show`, `history`, and `wait` | [story-play.mjs](../../scripts/repo-tools/story-play.mjs) appends a JSONL file under `data/story-agent` | Refused. Local file write. Not run. |
| `pnpm story:play new`, `retry-opening`, `choose`, `activity`, and `retry` | HTTP mutations. Several refuse to continue without `--confirm-live` because they can dispatch paid work | Refused. Not run. |
| `pnpm story:play list`, `profiles`, `starts`, and `server` | HTTP GET, or a status-file read plus GET. No JSONL append on these four | Refused as identification. They do not read generation, attempt, outbox, or Temporal. The handlers were not executed. |
| `pnpm story:local`, `pnpm story:server`, `pnpm chamber`, worker `start`, worker `dev` | Start local processes. Story mode reads provider credentials | Refused. Not run. |
| `pnpm chamber:reset` | Drops and recreates `offscreen_chamber` | Refused. Destructive. Not run. |
| Provider generation lookup, Temporal signal or start, SQL `UPDATE` or `DELETE` | Outside this guide | Refused. Not run. A lookup is also the wrong settlement for a missing provider generation id, per [Durable breakpoint lifecycle](../technical/storyteller/provider-boundary.md#durable-breakpoint-lifecycle). |

`pnpm story:play` with `help` only prints usage. It does not identify an attempt. It is not an identification command.

## Negative cases

These outcomes stay false.

**An ambiguous provider send is not blindly retried.** A dispatched attempt with reconciliation `pending`, an `uncertain` attempt with reconciliation `unknown`, or a generation left `uncertain` keeps its attempt id. [Attempt custody and an unknown call](../technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call) forbids a second paid call for that unknown charge. This guide does not add a retry.

**A saved mechanical receipt is not rerolled.** The `game_action_receipt` row for that story and offer remains the mechanical outcome. An uncertain generation linked from the receipt is reconciled to that receipt. It does not become a new roll, a new offer receipt, or a new generation id.

**Restored SQL alone is not a reconstruction of lost Temporal work.** A restored passage, receipt, or outbox notice is not the missing Temporal history. [Outages and recovery](../technical/platform/execution-and-delivery.md#outages-and-recovery) is the delivery contract. This guide does not start a workflow to fill the gap.

**This page does not run the local maintenance command.** HK01 replaced the old settlement CLI with `plan-storyteller-saved-repair.mjs`. Absence of a package script is not permission to run `--apply`.

## Where the contract lives

| Question | Owner |
| --- | --- |
| Who commits the story, and who owns Temporal delivery? | [Story execution with Temporal](../technical/platform/execution-and-delivery.md#outages-and-recovery) |
| Who owns an unknown provider call? | [Attempt custody and an unknown call](../technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call) |
| Who keeps an uncertain allocation from becoming another send? | [Window accounting and admission](../technical/platform/spending-and-entitlements.md#window-accounting-and-admission) |
| Who owns the short-lock capture race? | [Engine concurrency and recovery](../technical/engine/concurrency-and-recovery.md#before-during-and-after-the-lock) |
| Which process delivers a notice? | [Worker](../../apps/worker/README.md) |
| Where does local story mode refuse an uncertain attempt? | [Local live Story mode](local-development.md#local-live-story-mode-without-oauth) |
| Which Change recorded the local maintenance command? | [HK01](../../work/changes/archive/2026-11/other/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md) |
