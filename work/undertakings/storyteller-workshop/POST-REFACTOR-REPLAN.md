# Storyteller Workshop | post-refactor execution reset

**Status:** planning decision proposal, **not a Cursor execution packet**. Integration remains `undertaking/storyteller-workshop`; this document is authored on the independent `planning/ma05h-capture-boundary` branch, with MA05G running on the undertaking. Source/product baseline: GitHub undertaking inspected 2026-11-21, WR program, WR04–08 CHANGE front doors, technical scene/lifecycle/provider contracts, and source inventory from the current MA06A planning effort. **No code or tests were run for this note.** After MA06A implementation, refresh source paths and API symbols before generating successor task packets.

## Owner intent and operating judgment

Prioritize fast delivery of the **evolved Storyteller experience**, not purity of transient code under `application`. The accepted product/technical contracts are durable; the current WR04–WR08 Composer T-IDs, source maps, and patch instructions are **not** durable authority and must not be treated as executable after the reshuffle. Preserve original WR labels and their goal history for traceability, but **replace stale execution routes once** against post-extraction engine source. Do not line-edit obsolete 20-file task lists now and then repeat after MA06A.

### Source/authority classification

- **Keep authoritative:** `docs/product/**` and `docs/technical/**` selected contracts for rooted Library/Workdesk, Game Authority single publisher, exact scene-boundary post-state, safe active-state fork, one-prompt Play, cost/attempt custody and owner/privacy. `WR01` and `WRD02–04` established these decisions; `WR02/WR03` implemented Library and Writer mission foundations.
- **Keep historical intent, not execution route:** WR04 child-research, WR05 atomic scene and post-state, WR06 active fork, WR07 Play backend, WR08 UI/acceptance goals, examples and negative cases.
- **Discard/recreate:** references to `packages/application/src/{stories,campaign,storyteller,generations}` as canonical owners after MA06A; stale line numbers, `dist` paths, old DI/composition, old migration/read-write maps, T-ID write sets, frozen dependency/collision assumptions and unrun proof claims.
- **Do NOT discard:** schema/version contracts, durable operation identity, owner-scoped authorization, foreign-branch privacy, stable historical roots and coherent SQL/CAS commit, uncertain provider handling and spend ceilings.

> **WRA design route:** [Bounded v2 post-state checkpoint and transaction algorithm](WRA-SCENE-V2-DESIGN.md). This is a proposed mechanism with a source writer census, **not** yet a Cursor-ready code packet. The remaining planner job is to close the story-lock and scene-specific projector coverage after MA06A, rather than repeatedly redesigning the schema.

## Accelerated implementation sequence (after MA05G/MA06A)

| Cohort | Existing goal(s) | End-to-end deliverable and owned surface | Prerequisite |
| --- | --- | --- | --- |
| **WRA | Scene boundary v2** | WR05: versioned immutable state frontier, post-state projector, atomic commit/publication adoption, exact historical reader, v1-compatible reads. Large but cohesive engine+DB+documents Change, no temporary half-v2 writer. | MA06A package; WR02/03 foundations |
| **WRB | Direct Play vertical slice** | WR07 backend **plus minimal actual Play UI** extracted from WR08, with authenticated idempotent Launch, durable status, captured prompt/preset roots, Writer → authority first-scene publication and playable first scene. Avoid separate backend-only then inert-card UI passes if one coherent vertical Change is feasible. | WRA stable scene v2 contract |
| **WRC | Active historical fork** | WR06 + WR08 historical fork viewer/action (can be a single integrated cohort if source dependency is manageable). Deterministic branch ID/semantic commitment rehome and playable inherited choice; no provider attempts/parent future copied. | WRA; independent of child research |
| **WRD | Optional bounded child research** | WR04 isolated child contexts, root-scoped read-only tools and SQL attempt/budget custody; weave into existing WR03 Writer mission after parent writing loop works. This **must not block basic Play or fork UI**; it is an optional quality/cost optimization. | WR03; can plan while WRA runs but avoid shared provider files during active runtime migration |
| **WRE | Full experience acceptance + cleanup** | Remaining WR08: end-to-end scripted no-spend journey, 200-scene continuity + optional child research, three world-neutral prompts, final wizard retirement and UX finish. | WRB + WRC; WRD required only for acceptance explicitly claiming real child-research capability |

**WR04 is not a dependency of basic gameplay, first-scene Play, or active fork.** The old WR08 had a single dependency gate `WR04 + WR06 + WR07` because it mixed core UX with advanced evaluation. Split this logical acceptance: basic launch UI in WRB and historical UI in WRC, while child-research integration arrives in WRE. This is a scheduling improvement, not removal of agreed eventual feature.

**WRA priority:** highest; scene v2 defines the immutable post-world-state and safe fork/first-publication contract. Do not let Cursor implement WRA until ChatGPT resolves its one genuine substantial design gap: versioned semantic state representation, bounds, SQL selector, after-state projector and notes transaction order. Once chosen, plan WRA as one meaningful Change or two only if schema/state substrate and publication adoption cannot be safely tested together; avoid one Change per schema/helper.

### Cohort deliverables and discriminating failure proof

1. **WRA:** `publishScene(candidate)` admits complete post-state after authorizing expected root + state frontier; under owner story lock selects all references/SQL projections atomically, with immutable staged CAS objects inert if SQL fails. Negative: concurrent action or notes mutation rejects publication, missing/corrupt state root never yields published scene, old v1 history remains readable without invented state.
2. **WRB:** `Play(intent,preset?,operationId)` creates one durable launch identity, captured original prompt/preset/library root and spend authority; same-ID HTTP retries expose same status and same first committed scene. Negative: missing owner, changed payload, blocked/uncertain model dispatch, lost HTTP response, accidental time jump. UI must display held/uncertain honestly and allow safe status resume, no forced wizard or mandatory human avatar.
3. **WRC:** `Fork(sceneId,idempotencyKey)` selects exactly one historical boundary and remaps active semantic IDs, due-game-second obligations, offer/choices/clock into child; parent present state, provider jobs and spending not imported. Negative: scene-80 fact into scene-37 child, unresolved choice bound to parent operation, two children under duplicate fork key, unseen sibling Library object leak.
4. **WRD:** parent mission issues read-only, root-pinned finite-cost child tasks, each with own provider attempt custody, evidence hashes, independent context identity and deterministic join; no nested ungranted children. Negative: unauthorized tools/private facts, child returns different root citation, stale adoption, uncertain charged attempt second dispatch.
5. **WRE:** scripted functional full path, comprehensive failure simulations, visible character-free worlds and long-story recall; separately mark subjective paid creative evaluation. No claim that a deterministic fixture proves actual model creative quality.

## Package-ownership and transaction rules for rewrite

- Once MA06A lands, canonical app-domain implementation is `packages/story-engine/src/{stories,campaign,storyteller,generations}`, **not** the forwarding files in `application`. Actor/controller composition stays in API/Game Authority; `@offscreen/storyteller` remains the pure task/provider/context package. Refresh from actual extracted tree, do not mechanically replace old paths in WR packets.
- **One physical package does not imply one domain authority.** `stories`/campaign SQL capture and commit own durable truth; Storyteller writer and runtime provide proposals and dispatch behind guarded authority. No provider calls inside SQL transaction; no model-proposed direct world mutation.
- Avoid new internal ports/factories purely to satisfy a style diagram while gameplay machinery is about to change. Add an interface only where it enforces a real boundary, stabilizes an external contract or breaks an actual dependency cycle.
- **Quick and dirty allowed:** move coherent files with one deterministic script, preserve compatibility aliases, reuse existing schemas/helpers, prefer 3–5 Composer implementation tasks per large outcome, run focused tests per task and one acceptance battery at closure, amend docs once per accepted outcome. Do not force full-suite and wiki rewrite per relocated helper.
- **Not negotiable:** actor ownership, branch/root isolation, SQL atomicity, replay/idempotency, data migration safety, provider uncertain/spend custody and meaningful negative tests. These are the places where “temporary” shortcuts become durable bugs.

## Packet retirement and regeneration policy (avoid stale open-folder archaeology)

1. **Now:** leave WR04–WR08 statuses `PLANNER-BLOCKED` and existing folders intact; add one clear program-level note that these T-IDs are historical, **never dispatch**. Do not edit five TASKS/SOURCE-MAP files now while MA05G and package extraction are in flight.
2. **At MA06A acceptance:** ChatGPT reopens the current source and canonical docs, then drafts the *first* runnable post-refactor WRA packet. Existing WR05 packet is either replaced **in place** under original WR05 Change ID or superseded with a compact ledger link, not duplicated as two current Changes. Same rule for downstream goals as dependencies land.
3. **At each cohort commission:** one source→destination map, 3–5 bounded executor tasks with chosen algorithms and proof; no paid Cursor architecture survey. Executor handles ordinary compiler/import fallout locally and closes the whole Change.
4. **After WRE:** archive/supersede retired packet shells, reconcile current program table and wiki; Undertaking landing only after evidence and branch integration, not after documentation alone.

## Hard questions to settle once, near execution

- WRA's bounded semantic frontier: an immutable state-root envelope that references deterministic versioned state records, with explicit historical as-of selection and size limits; avoid an unbounded JSON dump and avoid reconstructing the past from live SQL.
- WRA's after-state projection and notes: calculate and stage prospective complete state first, validate against expected original root/frontier, then select the new root/notes and SQL effects under the same owner lock. Never record a checkpoint before notes with a mismatch.
- WRB's command surface: pin authenticated DTO and idempotency uniqueness against *current* Nest/Game Authority host route, not legacy draft controller. Do not choose the URL until that code is inspected post-MA06A.
- WRC's child remap: stable business keys and immutable source objects remain shared, story-scoped operational IDs regenerated; define exact FK/order only after final WRA schema exists.
- WRD's cost/custody: no assistant call until both parent allowance and child-specific dispatch authority are durably valid. Writer research is optional, not an excuse to stall Play.

## Practical next step

**Complete MA05G → finalize/execute MA06A → WRA scene-v2 algorithm/packet → WRB launch vertical slice → WRC fork → WRD optional research → WRE full acceptance.** WRA design can start now using immutable product contracts, but *source-specific Composer write paths and test commands should only be minted after the package migration*. This keeps expensive planning at ChatGPT, while not paying for plans bound to disappearing directories.

This plan is an execution *reset*, not a change to the accepted Writer product vision. The full WR04–WR08 outcome stays in scope.