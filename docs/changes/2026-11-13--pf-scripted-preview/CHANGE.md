# PF02 | The no-cost preview demonstrates intention, earned time and return

**State: Done (2026-11-13).** Greywake scripted `/demo` with immediate decision, notice-gated memory option, simulated jump/return digest, and provider-free proofs. Parent: [entry program](../../experience/platform-entry-implementation-program.md).

## Cursor first-screen brief

> **Goal:** make /demo an original, coherent, no-account scripted showcase where the first meaningful decision is available immediately, earlier choices affect subsequent facts/options, simulated waiting is explicitly marked and the final return digest points to real story creation or source.
>
> **Authority:** [preview-to-play](../../experience/flows/preview-to-play.md), [original Greywake editorial script](../../experience/prototypes/public-demo-script.md), [choice UX](../../experience/patterns/choice-surface-decision-rules.md), [portfolio first contact](../../experience/flows/portfolio-first-contact.md).
>
> **Start:** `apps/web/app/demo/story-demo.tsx`, `scene-view.tsx`, `script.ts`, `content/script.json`, existing StoryFrame and closest scripted-demo tests. No Nest, no direct paid provider.
>
> **Keep:** public route and zero provider requests; scripted facts are visibly simulated, not authenticated canon; generic UI doesn't know Greywake/hardcoded lore.

## Why the old first frame fails

The currently authored wizard/goblin script begins at `road` with `phase:'waiting'`, zero options, and requires pressing “Advance demo time” just to reach the first choice. It demonstrates charming branching fiction, but the target product differentiation requires an immediate intention and later authentic-looking continuity. Do not blindly keep this current content because code already exists.

## Intended code delta

1. Rework the authored content/script using the existing Greywake original 90-second candidate as editorial authority, after a compact continuity review. Place-specific names and prose live under demo content, **never in shared React components or generic asset resolvers**.
2. Keep the deterministic locally authored state model small: known notice read/not read, repair accepted/not accepted, fixed scripted earned 3/9 only on work path, interruption/visitor, and truthful simulated return digest. Do not build a second generalized rule engine or fake dice source.
3. Opening offers *Read the notice* versus *Begin repair*, immediately. An explicit “Preview next moment” button can advance the locally scripted time when work is underway; it must not imply any persistent backend clock or fake paid generation.
4. Demonstrate one consequential later option/response conditional on earlier known fact. Distinguish interrupted saved work from never-started work; a digest should reflect actual local branch.
5. Keep a compact persistent “Scripted preview · simulated time · resets on refresh” context label and no real AI claim. At natural endpoint provide Create persistent story, Replay preview and View source/proof; if live creation access is restricted, label next step truthfully.
6. Use stable native focus, no forced scroll stealing the reader, mobile no-art parity, testable local state transitions and branch checks. Preserve existing StoryFrame semantics and avoid a separate production state store.

## Explicit exclusions

No engine/game rule change, backend API, live generation, persistence, anonymous credit, auth provider change, notifications, actual unattended jobs, new model spend, save/migrate demo to real account. The demo never pretends to persist after refresh and cannot convert a scripted choice into a real submitted action.

## Acceptance / negative proof

**Normal:** anonymous visitor sees a decision without “Advance time” first; notice-first and repair-first yield different supported later scene/option and return summary; work interruption retains local 3/9 but no reward; replay resets; exit CTAs lead to working public/creation routes.

**Negative:** no repair chosen → no invented progress; notice never read → no notice-based option; progress never increases merely from browser elapsed time; refresh resets as disclosed; paused preview blocks its local actions but not navigation; no Storyteller/provider/network charge; duplicate click doesn't append duplicate visited moment; preview remains usable while Nest is down.

**Proof:** scripted state-machine unit tests, RTL/user-event branch walkthroughs, 320/375/1440 browser captures, focus/scroll inspection, no-image and reduced-motion variants. Test destination links and disclaimers. Require a human to explain what fact their choice changed without reading a tutorial.

**Handoff:** only after owner selects this packet, implement/verify authored preview and present actual branch screenshots, not just the final summary. If Greywake content needs editorial correction, resolve within the script rather than inventing new game authority.

## Landed (2026-11-13)

- Replaced wizard/goblin `script.json` with Greywake harbor-lantern graph under `apps/web/app/demo/content/`.
- Added compact `demo-state.ts` facts (notice/repair/3-of-9/show-order) + filtered `requiresNoticeRead` choices; removed forced `scrollIntoView`.
- Waiting control copy: “Jump to next moment in this preview” / “Preview returning later”; ended exit: Replay, Create persistent story, How earned time works, View source.
- Proof: `pnpm --filter @offscreen/web exec vitest run src/features/public-demo` (9 passed). Browser: D0 immediate choice, visitor with memory option, return digest; 375 mobile D0. No provider spend.
