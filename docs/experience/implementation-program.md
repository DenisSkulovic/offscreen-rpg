# Experience reset | implementation program and owner decision gates

**Status: DESIGN PROGRAM, NOT CODE AUTHORIZATION.** Last designed 2026-11-13. All code-bearing UX packets are **Proposed** until the owner explicitly selects and authorizes one. The active Change declaration in [docs/changes/README.md](../changes/README.md) remains **none**. Cursor must not infer work permission from a Git branch, a program, a green test or the presence of a Change file.

**First narrow handoff is prepared:** [UX01 executor handoff](handoff/first-cursor-wave.md) and [design-readiness review](evidence/design-readiness-review.md) define the source-grounded implementation boundary. The [selected Living Stage blueprint](spaces/living-stage-blueprint.md) is the default composition authority. **Only UX01 is recommended for the first implementation request**, with UX02 held until an actual render is critiqued. A Proposed dossier is **not** formally Ready or code-authorized without the owner's explicit instruction.

**Later frontend presentation capability:** the separate [PX01–PX04 presentation program](presentation-implementation-program.md) owns dynamic scene atmosphere, scoped option styling, art slots and visual-runtime fixtures. PX01–PX04 landed in `apps/web` on 2026-11-13. Live Play still passes no presentation document. PX work must not reinterpret actions, time or current authenticated data, and it does not authorize engine, contract, or image-provider integration.

## The target comes first

**Desired end-state:** a scene-first, persistent, arbitrary-world RPG that makes narrative presence, earned offscreen commitment and return to consequential history immediately comprehensible. The player experiences a fictional life, not a backend process interface. The experience can be quiet or dramatic without changing its grammar.

Authoritative design documents are indexed in [Experience README](README.md), notably the [experience thesis](foundations/experience-thesis.md), [design decisions](foundations/design-decisions.md), [Now specification](spaces/now.md), [interaction grammar](patterns/interaction-grammar.md), [time truth](patterns/time-and-truth.md), [creation](flows/creation-and-first-run.md), [return](flows/return-and-memory.md), [component system](system/component-strategy.md), [accessibility](system/accessibility-and-voice.md) and [validation](evidence/validation-plan.md).

**This target is not the present UI.** Existing components are only candidates for reuse after evaluating them against the target. Do not keep a layout, flow, field or control because it already exists. Conversely, do not rewrite the selected TanStack Query/SSR/command architecture merely because the UI is being replaced. Presentation and game authority are separate.

## Research → target → evidence → implementation

1. **Product meaning:** articulate the promised player experience and independent competing interface patterns. Done as Markdown design, not user-tested.
2. **Experience architecture:** define spaces, major modes, interaction grammar, time/authority, continuity and creation. Drafted; owner critique invited.
3. **State fixtures:** manufacture representative **deterministic** stories for each target state in Storybook/fixtures. Existing Chamber and source data can inform fixtures but must not be conflated with playable, connected proof.
4. **Bounded code Changes:** one Change implements one experiential outcome with normal **and** negative proofs. The engineering harness, not the UI designer, decides how to safely land exact diffs.
5. **Rendered critiques:** inspect actual wide/narrow browser screens and behavior with real text. Verify accessible focus, reduced-motion, uncertain command, stale offer and session identity. Revise design based on observed faults.
6. **User comprehension study:** run task-based observation on at least first-play, interruption, return and nonhuman cases; iterate before elaborate visual polish.

This program is not a “big bang redesign” and does not prescribe literal JSX tree names as product requirements. One piece can be implemented and validated at a time.

## Proposed code-bearing queue

| Packet | Outcome | Dependencies | Milestone |
| --- | --- | --- | --- |
| [UX01 shell and primitives](../changes/2026-11-13--ux-story-shell/CHANGE.md) | Original scene-first responsive frame, sparse navigation, tokens + accessible base controls | Current selected React baseline, finished UX target review | **Foundation** |
| [UX02 narrative stage](../changes/2026-11-13--ux-narrative-stage/CHANGE.md) | Beautiful, readable, truthful current scene and meaningful transitions | UX01 | **Presence** |
| [UX03 intention interactions](../changes/2026-11-13--ux-intention-actions/CHANGE.md) | Contextual offered actions, menu navigation and safe commit/preview semantics | UX02 | **Agency** |
| [UX04 commitment + holds](../changes/2026-11-13--ux-commitment-truth/CHANGE.md) | Truthful work/time/interruption/unknown-ack/no-activity presentation | UX02, UX03 | **Earned time** |
| [UX12 finite offscreen planner](../changes/2026-11-13--ux-offscreen-planner/CHANGE.md) | Replace raw successor-path and fictional-second planning controls with an intelligible bounded **Plan ahead** flow | UX03, UX04 | **Offscreen handoff** |
| [UX05 story library](../changes/2026-11-13--ux-story-library/CHANGE.md) | Human-centered list of stories/drafts with authentic attention state | UX01 | **Re-entry gateway** |
| [UX06 guided creation](../changes/2026-11-13--ux-guided-creation/CHANGE.md) | Foundation → role → direction → review → Start as an inviting flow | UX01 | **First-run creation** |
| [UX07 return and journal](../changes/2026-11-13--ux-return-journal/CHANGE.md) | Source-linked history and honest recent changes, meaningful return path | UX02, UX04; public read model verified | **Continuity** |
| [UX08 adaptive details](../changes/2026-11-13--ux-adaptive-context/CHANGE.md) | Conditional World/You/context shelf without generic fantasy assumptions | UX02, UX07 | **Depth on demand** |
| [UX09 public demo](../changes/2026-11-13--ux-public-demo/CHANGE.md) | Short polished, *explicitly scripted* sample demonstrating the fantasy | UX02/03 interaction grammar, independent public route | **Portfolio doorway** |
| [UX10 motion and feedback](../changes/2026-11-13--ux-motion-feedback/CHANGE.md) | Meaningful, reduced-motion-safe state transitions, saved-roll presentation | UX02, UX03, UX04 | **Game feel** |
| [UX11 UX evidence](../changes/2026-11-13--ux-visual-evidence/CHANGE.md) | Deterministic Storybook states, browser/a11y/visual evidence for shipped surfaces | The relevant UX packets under review | **Proof, not polish** |

**No mandatory numerical sequence beyond dependencies.** UX05/UX06 and UX09 may proceed alongside UX03/04 when source owners do not conflict. One active Change at a time by default. Split cross-cutting data-projection requirements into a *separate* contract Change if a frontend packet would otherwise pretend the browser has authoritative fields it does not have.

### Future product/engine studies, deliberately NOT in the implementation queue

- [Hybrid free-form intentions](patterns/free-intent-future.md): interpretation, preview, authority and cost; **not** “add a textarea.”
- [Autonomy and absence](patterns/autonomy-and-absence.md): permission, safe defaults, horizon, interruption and shared-world authority; not “autoplay true.”
- [Mechanics reassessment](foundations/mechanics-reassessment.md) and [temporal alternatives](foundations/temporal-philosophy.md): bounded standing life vs current strict commitment time, social investment, job repetition, form-dependent abilities and meaningful offscreen presence.
- Maps, multiplayer, imagery, elaborate sound, and stronger generative autonomy require new decision packets before code.

Do not let UX01–UX12 mutate these mechanics as an unrequested side effect. UX12 replaces the **presentation of existing accepted finite plans**; it does not implement [GM03 bounded standing life](../changes/2026-11-13--gm-standing-life/CHANGE.md).

## Updated validation infrastructure (2026-11-13)

Main has since recorded React W01–W22 and Chamber CH01–CH16 as **Done**. This describes their source/change-record status, **not** every Chamber scenario's availability. The [Chamber ↔ UX map](evidence/chamber-ux-validation-bridge.md) lists available, planned and blocked scenario lanes and separates Bench/Sandbox/Connected proof from Storybook/browser/human evidence. For UX01–UX12, prefer existing provider-free Storybook and source-backed game fixtures; do not begin a second Chamber modernization.

The [public projection map](evidence/public-projection-capability-map.md) identifies desired player claims the current DTO cannot prove. If a surface needs one, either narrow its copy or propose a separate read-model/game Change. The [future mechanics program](mechanics-evolution-program.md) contains rule changes that cannot be smuggled into visual refactors.

## Source ownership at the planning snapshot

Read only the selected Change plus **one** source-adjacent map when starting implementation:
- Global Next routes/layout: [App Router map](../../apps/web/app/README.md) and `apps/web/app/style.css`.
- Play: [Play map](../../apps/web/src/features/play/README.md), especially `view.tsx`, `ui/campaign-offer.tsx`, `ui/campaign-activity.tsx`, `ui/campaign-status.tsx`, `history.tsx`.
- Story/draft creation, preview/list: [Stories map](../../apps/web/src/features/stories/README.md).
- Baseline stack/authority: [selected React/Next contract](../engineering/targets/react-next.md), [current game vocabulary](../concepts.md), [time](../time-and-autonomy.md).
- Developer Chamber is **not** a player-facing UI template. Its [separate program](../engineering/chamber-program.md) remains independent.

**Baseline evidence:** original UX planning source GitHub `main` at `8c91618aa44ac6a5aa800cf6b986c2bf596a9a0d`; later [source-grounded critique](evidence/current-ui-source-audit.md) inspected main `3be49cc2c571dcd86585c56106905a87c789a19e` on 2026-11-13. The W-series work was still moving. These are path-level inspection and contract review, **not** a live browser assessment or a guarantee the files will stay unchanged. Cursor must re-read actual source and git status at authorization time. Keep app/SSR identity, TanStack ownership, frozen intents, receipt recovery and backend authority.

## Implementation milestones and exit gates

### Milestone M0 | Target accepted

Review the experience thesis, the four key stages and alternatives. Decide explicitly whether the hybrid custom-intent destination is directionally correct, without authorizing its engine code. A design dissent case should be recorded, not suppressed.

### Milestone M1 | An authentic Now

UX01–UX04 render a scene, contextual choice and long commitment without generic dashboard chrome, preserve actual state and handle interruption/holds. This is the **core portfolio showcase**, not a generic landing page.

**Exit:** rendered desktop+mobile examples of J2–J4; a player can tell whether an action was proposed, accepted, settled, running or interrupted without learning internal API terminology.

### Milestone M2 | A coherent life

UX05–UX08 and UX12 add guided entry, finite offscreen planning, stories and digestible memory. A full absence scenario is truthful about progress, and a nonhuman story doesn't display fake human economy or inventory.

**Exit:** J5–J8 tested in browser and with genuine verified/read-model states; deep linking doesn't resurrect stale choices.

### Milestone M3 | Delight + recruiter's path

UX09–UX10 give a short honest public demo and carefully chosen atmosphere/motion. UI is unmistakably a *game* and still usable with no imagery/motion.

**Exit:** unfamiliar visitor can reach a meaningful interaction quickly; demo doesn't falsely claim durable live progress; loading and accessibility remain solid.

### Milestone M4 | Independent proof

UX11 consolidates normal/negative state fixtures and a real keyboard/browser suite. Human-reviewed visual verdicts, relevant screenshots and rejected alternatives are retained. Never use CI green as the sole UX signoff.

**Exit:** representative tasks and real-browser evidence support the target. Anything unproved is labelled, not waved away.

## Owner decisions needed before production coding

The owner must accept the **scene-first design direction** and authorize each bounded implementation packet. A developer may challenge exact layout, tokens or primitive choice with measured evidence, but may not silently change product meaning, backdoor free text, enable paid generation, invent autonomy or override currently selected engine correctness.

Explicit unresolved mechanics: arbitrary-intent grammar/admission, full absence defaults, multi-player hold/pause policy, rich sourced return summaries, flexible risk and travel models. These are **future proposals**, not blockers to an honest initial scene or demo.

## Cut-line and anti-scope-creep policy

The compelling first vertical slice is **one situation, two distinct choices, one real earned commitment, an interruption and a return**. This beats twenty beautiful pages with no unified game loop. UI quality is measured on that slice first. Do not defer everything until the entire game engine is rewritten; but also do not fake missing engine truths to make the interface pretty.

**Explicit exclusions:** permanent admin panel, “universal character stats dashboard,” map-driven routing, forced chapters, unbounded Storyteller conversation, new database models for every screen, or unspecified animations just because they look cool.

## Handoff when a packet becomes Ready

1. Owner explicitly authorizes one packet and any side-effectful verification.
2. Cursor re-inspects branch/worktree and the 2–5 named symbols; identifies deviations from the inspected snapshot.
3. Cursor narrows scope and ensures normal+negative proof are feasible. Any new domain behavior gets a separate contract first.
4. Cursor implements source/test changes in its own authorized working branch, with available provider-free checks and browser demonstration.
5. Architect reviews the result **against player intent and rendered evidence**, not against whether JSX resembles old code.
6. Close/retire the Change and update source maps/target only for real boundary changes.

**Current selection remains none.** The user may choose to spend multiple sessions reviewing this design; producing 11 packets is not a request that Cursor write 11 code diffs immediately.
