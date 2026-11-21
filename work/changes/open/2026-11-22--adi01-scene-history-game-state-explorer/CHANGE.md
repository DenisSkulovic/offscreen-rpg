# ADI01 | Admin scene-by-scene game state explorer

**State: PROPOSED / NOT CURSOR-READY.** Date 2026-11-22, undertaking `storyteller-workshop`. Owner's [gym brainstorming minutes](../../../sessions/2026-11-22.md) are the rationale. This is one **read-only historical navigation experience**, not permission to mutate a campaign or browse unrestricted customer content.

## Outcome and why this is its own Change

A permitted staff member starts from Player 360 or a support case, opens a **story**, and navigates its chronological **scenes** (not chapters). Each scene has a clear “before / command / committed outcome / after” view including published text when authorized, fictional clock, scene/campaign state, choices and offers, relevant inventory/character/world consequences, operations, checkpoints and source root. It is easy to compare two scene boundaries or distinguish an unresolved transition between them. There is a stable cross-link to Writer execution (AI03), Library revision (ADI02), effective policy (ADI03) and case history.

**Important semantics:** scene, publication, command, operation, episode/mission, checkpoint and historical fork are **not interchangeable**. The operator sees which were committed versus pending, held, failed, repaired or unknown. If an opening or consequence has no model turn, show that truth; do not invent an AI action. An actual historical snapshot is not reconstructed from today's current mutable campaign state. Forks are separate branches with source/revision lineage; a forked future does not rewrite its parent.

## User experience and access

Proposed `/control` Gameplay & Worlds workspace, layered over existing Player 360/case deep links and scoped Admin read envelopes. Permit useful **metadata/operational summaries** to appropriately scoped Support; revealing private narrative text, character-private facts or document content is a separately authorized, purpose-bound, audited capability. An engineering case may have stronger access, but a job title or UI tab is never authorization. Multi-role staff see the union of actual grants, with UI hiding protected sections and API separately enforcing policy.

Show evidence badges/coverage: exact checkpoint vs derived projection, missing archive, stale observation, forbidden, unavailable. Bound result sizes and paginate scenes/branches; never prefetch an entire private campaign into SSR or browser cache. No generic SELECT* endpoint, cross-owner result leak or staff impersonation through player APIs. Read-only v1, no world edits, “repair”, retroactive reroll or action submission.

## Likely ownership, to verify later

Existing `docs/product/admin/{player-360-and-support,gameplay-and-liveops}.md` and `docs/technical/admin/{console-and-read-models,investigation-and-privacy}.md` already select the staff-control plane. Later implementation should use `@offscreen/admin` source-backed projections, existing Nest Admin controllers and `apps/web` staff shell. Reuse canonical Story Engine historical scene/checkpoint/fork readers, but **never import Story Engine private SQL directly into Next**.

## Acceptance and future planning gate

One case-bound operator follows story scene 1 → scene 7 → scene 4 on an authorized disposable fixture; receives consistent before/after state, source roots, receipt/offer lineage and branch changes. Unauthorized private text is not returned, even through source metadata, search, counters, export, SSR cache or deep links. Failed, absent and partial evidence display honestly. Source-check real scene/checkpoint read owners after HR01 and TURN03; choose specific permission/projected DTO boundaries before implementation. Existing AI03 owns model request/thread visualization; ADI01 does not duplicate it.

**No source edits, paid model calls, new staff grant or database mutation authorized by this Proposed packet.**
