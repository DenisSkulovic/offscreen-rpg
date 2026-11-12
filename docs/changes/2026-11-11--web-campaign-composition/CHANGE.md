# Change W06 | Campaign Play responsibility partition without visual redesign

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W01 + W04; W03 identity settled; avoid simultaneous edits to Play/campaign command owners.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F7 F14**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G21 (and G17 key lifecycle adjacency)**.  
**Desired single code/test/config outcome:** Campaign presentation becomes navigable and independently testable at genuine responsibility boundaries; story intent dispatch and derived world views have traceable single owners. Existing rendered controls/behavior remain unchanged.

**Observed source owners:** `apps/web/src/features/play/campaign-play.tsx`, `apps/web/src/features/play/use-campaign-command.ts`, `apps/web/src/features/stories/opening-preview.tsx` (pace import), `packages/contracts/src/campaign.ts` (read).

## Proposed design contract (not an invitation to redesign)

First map actual reasons-to-change: (a) pure campaign projection/formatting, (b) offer path and successor editing, (c) time/activity/action controls, (d) passive receipts/world/character panels. Extract a small number of coherent siblings only when they can be tested or reviewed independently; do **not** turn a 649-line file into 14 tightly coupled props layers. Keep action status and command identity in W04 controller; keep view-only pace/path/selection state scoped to the offer identity without remounting an uncertain command merely because an offer changed. Move `paceOptions` to a small client-safe neutral module so preview does not import a whole Play Client feature for a constant. Preserve exact server-derived terminology and action gating.

## Expected bounded implementation

1. Record existing section/state/dependency map; keep the largest cohesive panel intact if splitting adds indirection.
2. Extract shared pure pace definition and maybe targeted selectors/meaningful panels with verified caller ownership.
3. Make typed commands/derived view props explicit; add interaction tests for offer-path navigation, pending choice, holds, activity speed and receipt rendering.

## Falsifiable acceptance and proof

- **Normal case:** Existing character/activity/action screen and available controls render as before, with a smaller set of independently understandable owners.
- **Discriminating negative case:** Staged successor path, held clock, paused action, settings lock, disabled choice and pending receipt produce exactly their existing allowed action states, with no client-simulated mechanics. Changed offer does not destroy an uncertain intent.
- **Check and evidence:** Web component and pure-projection tests plus focused visual comparison of representative existing view. Never claim visual redesign.
- **Completion receipt:** Before/after reason-to-change map and two or three concrete tests that became easier, not a boast about fewer lines.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No new gameplay, shadcn/Tailwind switch, new art/layout, fantasy global state store or forced one-component-per-100-lines fragmentation.
- **Principal risk:** The current large component may be cohesive; extraction is justified only where coupling/testability demonstrably improves. Avoid moving business calculation from server to browser.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F7 F14**, audit **G21 (and G17 key lifecycle adjacency)**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
