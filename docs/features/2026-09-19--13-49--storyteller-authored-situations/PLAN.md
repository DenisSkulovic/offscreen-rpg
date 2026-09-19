# Implementation plan

Feature: [Storyteller-authored situations and reusable choices](FEATURE.md).
Execution scope: implementation is active one bounded slice at a time. Product direction is explicit; no new approval ritual is needed for each routine phase. Live inference stays disabled.
Implementation owner: the coding model in this thread; do not dispatch another agent or alter model settings automatically.

## Dependencies and responsibility

Start after activity foundation A1 (identity/clock). S1 can use the existing contribution rule. Activity A2 adds a real wait. S2 and autonomy U2a form one coherent quiet-choice slice: this feature owns permission/projection; autonomy owns choosing no narrative follow-up. U2b supplies reports/scenes; S3 broadens supported preparation output; U2c supplies queues. The [feature index](../README.md) is the authoritative execution order.

Avoid a dependency cycle: persist authored definitions/authorization first, using offline task content, without requiring a queue or a general world generator. Never ship an engine-generated fallback menu as a temporary substitute for authored permission.

## S1 — Current situation authority and scene-only pacing

Status: implemented in September 2026. The first bounded representation selects exact process/resume action keys from the current immutable offer; durable reusable definitions, scope/repeat terms and quiet reprojection remain S2/S3 work.

Outcome: an opening and three consequence scenes explicitly control routine access, with stale selections fenced. No new rule family or quiet completion required yet.

Read these owners, not the whole repository:

- `packages/game/src/immediate-actions.ts` and `opportunities.ts`: private plan validation versus current projection. Preserve supported-effect and capability checks.
- `packages/storyteller/src/tasks/index.ts`, `context/index.ts`, `fixtures/mechanical.ts`: captured request/result, source fixtures and context bounding.
- `packages/application/src/storyteller/{openings,start,publication}.ts`: exact reviewed Start and atomic scene publication.
- `packages/application/src/campaign/{actions,persistence,reads,narration}.ts`: command/offer fence, current choices, context and saved consequences.
- `packages/db/src/schema/campaign.ts`, affected baseline migration, `packages/contracts/src/campaign.ts`, web campaign play projection.

Bounded edits:

1. Define strict versioned situation authorization: explicit no-routine-access or a bounded list of exact prepared opportunity references plus validity/handoff terms. Scene intentions remain explicit private plans. Use the limits in the integration contract; no arbitrary predicates or inventory-to-action synthesizer.
2. Separate reusable prepared definitions from the current public offer. Initially capture a small authored package with current supported targets/rules. Add exact retained-instance/revision references from A1; do not fall back to definition-name matching.
3. Extend the mechanical opening/consequence task capture and output contracts with this explicit authorization. Include only relevant bounded definitions/work state. Result validation requires the field; absent does not mean carry current activities. Delete disposable prototype formats rather than add legacy decoders.
4. Preview/Start preserve the exact reviewed package and authorization. Publication validates references and current permission, then commits passage, private/public choices and replacement authorization together. Do not expose half of a new situation.
5. Enforce authorization at every direct start/resume path before new effects. No direct endpoint should bypass the offer/authorization merely because an activity ID is known. Mechanical condition filtering cannot add choices outside the authored selection.
6. Project current immediate choices and authorized activities without leaking private plans. Keep existing controls subject to their independent permissions. Add minimal scene-only versus quiet availability display, not a UI redesign.

Targeted optional evidence: H1→H2→H3 with an apple present, no routine menu at any step; old H0 selection rejected; explicit H4 carry/references accepted; malformed/missing authorization rejected; duplicate publication leaves one history; manual pause preserved. Use scripted tasks and normal application operations, no SQL offer restoration.

Exit: authored interactive authority is persisted and observable; every scene says what happens to routine access. Update checkpoint and commit/push before proceeding. This alone does not establish dormant reuse or general AI preparation.

## S2 — Dormant reuse and revalidation

Dependencies: S1, activity A2, autonomy U2a. Implement this and U2a together under one owner/commit-sized slice because quiet settlement and the next available authored offer must agree.

Status: in progress. Versioned authorization now retains private process/resume plans, consumes one-shot selections, keeps explicitly repeatable definitions, atomically rebinds an exact resume when switching work, and reprojects mechanically eligible remnants after quiet completion. The integration proves two repeat cycles create distinct instances without rolls/effects. Finite findings/occurrence scope and broader continuous invalidation remain in this phase.

- Persist reference/repeat/scope semantics and distinguish new instance from exact resume. Reproject after quiet receipts under the existing authorization, with fresh offer identity/state fencing and no generation task.
- Recheck start conditions and current authorization under the same lock used for due settlement/admission. Continuous invalidation belongs to the activity boundary; removing a button alone is insufficient.
- Consume finite findings/rewards and occurrence history at their declared scope, not the transient offer. Repeat cannot replay old rewards, reset exposure or clear a blocked situation.
- When a new interactive scene supersedes authorization, old starts/resumes fail. An understood idle selection is distinct from missing preparation or a controlling hold.
- Acceptance: LO-02/03 quiet path, GS-05 B completion then explicit A selection, a nonhuman contrast, and an authored no-activity scene. Independently choose/repeat, not just hardwired auto-next.

Exit: dormant player-directed local play works under the same author/rule authority as rapid scenes.

## S3 — Bounded preparation and explicit handoff

Dependencies: S2 and autonomy U2b's scene/report separation. This phase extends prepared content through task proposals; it does not enable paid inference.

- Allow bounded new/revised supported definitions and explicit selected references in opening/scene proposals; validate against declared state, supported effect/target vocabulary and exact rule versions. Unsupported world declarations hold rather than becoming prose-only mechanics.
- Extend context with active/retained progress, current authorization, relevant definitions, trigger receipts and pending handoff. Reuse the existing context cap and evidence provenance; no hidden full-world dump.
- Keep generated/report-only contracts disjoint. A historical report cannot carry any selection or world mutation. Scene-only output may deliberately keep activity access closed across multiple turns.
- Publish an explicit return-to-work/chain handoff only when the resulting authorization and accepted player permission allow it. Clearing a hazard is not the handoff itself.
- Scripted preparation exercises the same path as a future provider; demonstrate two differently selected situations using the same inventory/capabilities and a nonhuman reference package. Reject changed-source/unsupported output with no rewards or current menu mutation.

Exit: the gold session's authored scene/routine changes use task outputs and normal validation, not application branches keyed to scenario names. Live quality remains unverified and separately authorized.

## Current checkpoint

- Current phase / next action: S1 and A2 are implemented; S2/U2a now has quiet handoff and repeatable independent selection. Finish scoped occurrence/consumption semantics before U2b.
- Implemented boundary: every mechanical opening/consequence result explicitly says `none` or selects all process/resume action keys. Start and publication persist that authorization beside the exact offer; selection checks both under the story lock. Offer consumption clears it, and mechanical settlement publishes no inferred fallback menu.
- Verification: affected packages build (including production web); 21/21 game and 29/29 Storyteller tests pass. After recreating `offscreen_auth_test` from the new baseline, the focused Storyteller integration passed 10/10 through PostgreSQL, Temporal and browser creation, covering explicit opening access, scene replacement and exact resume authority. This does not prove dormant repeat/reprojection, arbitrary-world preparation or human narrative quality.
- Remaining gates: S2 still owns repeat/scope/consumption semantics and broader revalidation; S3 owns broader bounded preparation. The optional H1→H4 gold trace remains connected acceptance work rather than a claim of this infrastructure slice.
- Spend: $0 provider calls; cumulative OpenRouter usage unverified.
