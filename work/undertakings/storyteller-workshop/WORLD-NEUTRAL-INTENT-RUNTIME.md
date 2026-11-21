# World-neutral intent runtime | selected P3 implementation algorithm

**Decision record; not Cursor Ready.** 2026-11-21 source inspection from `undertaking/storyteller-workshop` after WR05P2. This narrows the [playability seam audit](PLAYABILITY-SEAM-AUDIT.md) into an implementable **one-kernel** strategy. Product authorities: [world neutrality](../../../docs/product/gameplay/rules.md), [earned time](../../../docs/product/foundations/vision.md#earned-life), [choices and commitments](../../../docs/product/gameplay/actions-and-commitments.md) and [control of narration](../../../docs/technical/storyteller/generation-and-publication.md). No tests run, no model funding authorized. Do not create a separate Change solely for this mechanism; it belongs to **P3 Living Writer**.

## Chosen option: extend the existing action execution slot, not create another clock

We evaluated three approaches:

- **Make every abstract world a fake Character. Rejected.** `@offscreen/game/immediate-actions.ts:validateImmediateActionProposal,immediateActionAvailable` require typed abilities, facts, quantities. `campaign/persistence.ts:requireCampaign` requires nonnull character AND content, intentionally refusing abstract stories. A fabricated empty humanoid sheet would violate selected world-neutral product semantics and make unrelated rules appear applicable.
- **Invent a second narrative timeline/worker. Rejected.** The same `campaign` record already has `gameSecond,clock,clockAnchorAt,clockPace,activeActionOperationId`. `campaign/clock.ts:projectCampaignClock` already grants clock advancement to exactly one `accepted-action` or `accepted-activity`, never model latency. A second clock/process owner would create drift and fork complexity.
- **Extend the *existing* finite action execution to an explicitly typed narrative plan. Selected.** A narrative-only offer authorizes a concrete **intention** and finite fictional duration, not an outcome. The engine records it as a variant in `gameOffer.plans` and `gameActionExecution.plan` with the same story-scoped operation identity and `campaign.activeActionOperationId`. It consumes the existing campaign clock eligibility, durable action wake and progress boundary. This is **one new capability variant in the existing action system**, not another monorepo package or service. Existing `gameActionExecution` SQL JSON columns can hold a discriminated versioned plan; new read/execute policies must explicitly parse it, never treat arbitrary JSON as an executable plan.

## Exact source anchors and existing invariants

- `packages/story-engine/src/campaign/settings.ts:initializeCampaign` supports `campaignStartSchema` with `mechanics:false`, no seed, and writes a clock-backed `campaign` with `character:null,content:null,gameSecond:0`. This is the required new-story substrate for world-neutral ongoing life.
- `packages/story-engine/src/campaign/persistence.ts:requireCampaign` currently *rejects* such a row; keep this guard for the **mechanical** path. A new branch in the existing campaign action authority operates on an owner-scoped raw `campaign` row with verified `character:null` and a validated narrative plan, not by weakening mechanical validation.
- `packages/game/src/immediate-actions.ts:immediateActionPlanSchema` is character-specific. Add an independent pure `narrativeIntentPlanSchema` in `packages/game` (or another currently applicable pure domain module), not overload a D&D-like plan. Distinct `kind:'narrative-intent.v1'`. Shape: stable `key` matching offered node ID, bounded human-visible label and attempted `intention`, risk disclosure, explicitly positive bounded `fictionalDurationSeconds`, `requiresStory` only for **already declared world-neutral typed facts** if a pure validator can prove them, and **no** awards/checks/resource/effect field. No silent default success or time. A plan cannot grant item creation, transfer or NPC agreement.
- `packages/game/src/offers.ts:offerSchema` already represents finite attempts without listing their mechanical plans. Its `nodes[].action.timing` can use the narrative plan's explicit finite duration. `gameOffer.plans` is a private server-side set of admissible authorizations; adapt `packages/story-engine/src/campaign/{persistence,actions}.ts` to parse a discriminated `ImmediateActionPlan | NarrativeIntentPlan` union. Preserve the existing immediate-action validator and storage format for legacy plans. Each displayed `choice.v1` ID must match exactly one stored plan/option, no dead buttons.
- `packages/story-engine/src/campaign/actions.ts:admitCampaignActionInTransaction` currently uses `requireCampaign`; introduce an **early explicit plan-type dispatch** inside the same authoritative story-lock transaction. Mechanical path remains unchanged; narrative path validates story owner, offer ID, option path, plan fingerprint, exact revision, active decision hold/consent and absence of competing execution. It stores an action execution whose plan is `narrative-intent.v1`, not a result, and owns the `activeActionOperationId` slot. Repeated same operation returns prior accepted receipt; altered request returns 409.
- `packages/story-engine/src/campaign/clock.ts:projectCampaignClock` already handles `accepted-action` when `state.activeActionOperationId===operationId`; no new clock algorithm. Extend existing finite-action advance/settle route to distinguish narrative plan and charge **only elapsed admitted fictional seconds** using the same pace/fraction, held boundaries, scheduler wake and read projection. Model latency itself never accrues time; idling with no accepted narrative plan remains frozen. On settle, no mechanical effect is written; it produces a frozen committed **narrative continuation source receipt**, reusing the current consequence wake/outbox identity discipline rather than inventing a model call per tick.
- `packages/story-engine/src/stories/scene-checkpoint-v2.ts:toV2FictionalState` already serializes `gameActionExecution` via versioned open payload and `campaign.activeActionOperationId`. Validate that the narrative plan payload is bounded and fork-safe. `stories/scene-after-state.ts:readSceneAfterState` can preserve the underlying row. Later WR06's mapper must learn the new typed variant explicitly; it must not accept arbitrary operations or copy parent provider custody. P3 owns that extension if WR06 has landed.
- `packages/story-engine/src/storyteller/admission.ts:prepareStorytellerResolution` currently requires legacy `storytellerKind` source output and cannot serve Writer v3; do **not** patch its validator to trust a Writer output as legacy `next.options`. Route new Writer-backed offers to a trustworthy typed stored-plan/selected-receipt path, then create a continuation Writer mission from the committed action.
- `packages/storyteller/src/tasks/writer-mission.ts:writerOpeningSceneProposalV2Schema` currently has `scene:{content,interaction}` but no stored plan. Keep v2 hash history intact. Add a new versioned Writer final with **presentation and corresponding `narrative-intent.v1` plans** as a single bounded candidate; require option IDs and plan keys to match, reject partial/dangling action, never infer `intention` from button label after generation. Result admitted only under full GA validation and source/usage policy.

## End-to-end flow (no second generation or shadow game)

```text
WR07B opens story → one committed story + Library-v2 + v2 scene 1
P3 Writer next-version scene candidate
     [prose + interaction + validated narrative-intent plans + chosen Workdesk changes]
  → GA validates root, effective creative/rule permissions and typed offered plans
  → GA publishes scene+offer+private gameOffer plans+v2 after-image atomically
  → Player chooses (operation UUID, expectedRevision, offerId, path)
  → campaign/actions, under owner lock:
       exact authored plan/eligibility; no character/mechanics coercion
       commit one gameActionExecution narrative variant + activeActionOperationId
       schedule existing finite action wake; hold incompatible work
  → campaign finite-action progress via same clock/pace
       no model per tick, no authored effect from plan alone
  → settled action receipt at exact gameSecond and frozen source state
       clear action slot, request one Writer continuation task if eligible
  → Writer investigates correct branch root and actual receipt
  → GA validates scene proposal+source changes against post-action world
  → publish scene 2 with new v2 checkpoint/choices; repeat
```

**If the setting uses typed mechanics:** do not accept a narrative-intent plan where a mechanical effect/check is needed. Author a valid typed `ImmediateActionPlan`/supported rule reference; use existing character-bound execution to produce a settled receipt. The same Writer mission can narrate the **committed** result. World neutral does not mean all actions succeed or risk disappears.

## SQL/model contract decisions

- Reuse `gameOffer`, `gameActionExecution`, `campaign.activeActionOperationId`, `storyResolution`/generation/Writer mission and existing outbox. **No new universal world-event store, no second campaign clock, no fake character or duplicated billing ledger.**
- Only add a schema migration if actual post-WR07B source requires a new discriminator/index. `gameActionExecution.plan` and `gameOffer.plans` are JSONB already. Versioned discriminant and strict pure parser supply the authority boundary; prove DB-side uniqueness/revision fences rather than relying on JSON checks.
- The source option selected for execution is frozen at publication with its exact plan/root/policy. On retry, the operationId points at the same typed plan and stable source scene; a later Writer proposal cannot rewrite the selected attempt.
- An unknown dispatched provider result stays uncertain, not rerun. A late Writer response cannot override already committed action time or another scene's new offer.
- Workdesk document changes remain candidate changes until explicitly adopted with their rooted passage/after-state. A private possibility is never made public by being cited as an observed fact.

## Acceptance proof that actually matters

1. A **nonhumanoid narrative-only** opening has `campaign.character=null`, a positive-clock finite option with a stored authored plan, no D&D/ability/quantity assumptions; selecting it commits one operation and advances exactly the accepted fictional time, not time spent reading or waiting for inference.
2. A second player click/worker wake doesn't create another action or model attempt. A stale option or mismatched underlying plan is rejected; no free narration plan can grant coins/HP/possessions.
3. An ordinary mechanical story still executes existing checks/effects and the Writer narrates the actual result without rerolling.
4. A quiet accepted routine advances with zero per-tick LLM calls; a noteworthy boundary yields a Writer scene with accurate state.
5. Fork of a scene with a supported narrative intent/offer retains active fictional commitment under new operation ID and does not import parent model attempt.
6. Story with two subsequent scenes follows authored intents and resolves their source citations, with no branch-private future leak. No dead button on Web.
7. Model output proposing a valid choice label but no underlying typed plan is held/rejected before publication.

**Execution ownership:** folded into the **single P3 Living Writer** macro Change, alongside real provider transport, source/adoption and optional child research. The fork mapper extension remains P3's responsibility after WR06 lands. **Readiness gate:** inspect current WR07B Writer mission/Worker interface, game-action source branch/advance function contracts, and WR06 mapped v2 action payload after those respective Changes integrate; then author precise T-IDs/negative fixture anchors. This is not an invitation for Cursor to decide action semantics.
