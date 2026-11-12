# Change W07 | Accessible Play loading, error and recovery engineering

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W02 + W03; W04 when covering uncertain commands; W01 for component checks.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F1 F2 F9**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G24**.  
**Desired single code/test/config outcome:** A keyboard user can tell loading/unauthorized/missing/transient failure and a current saved pending outcome apart and can recover without losing resource identity. This is reliability/accessibility, not an aesthetic redesign.

**Observed source owners:** `apps/web/app/play/[id]/page.tsx`, `apps/web/app/stories/error.tsx`, `apps/web/src/features/play/view.tsx`, `apps/web/app/style.css` (inspect), `docs/technical/client-and-identity.md` (read).

## Proposed design contract (not an invitation to redesign)

Use Next route `error.tsx`/`loading.tsx`/`not-found.tsx` only where an explicit boundary serves this screen; avoid catching `redirect` or `notFound` as generic errors. Expected validation/conflict stays in feature interaction, not framework throw. Give useful role/status, keyboard focus and retry affordance without announcing every poll. Retain page structure, classes and visual design unless one minimal accessibility fix needs them. Revalidate session on error recovery, never auto-resubmit paid/uncertain commands, and never reveal forbidden resource existence.

## Expected bounded implementation

1. Specify existing route states (auth 401, owner-scoped 404, upstream 503/timeout, malformed schema, loading, pending, uncertain) and which component owns each.
2. Introduce only the justified App Router fallback(s) and interaction-level status/focus corrections.
3. Add representative keyboard/focus/status component or browser checks, including delayed server response, unreachable upstream and expired session.

## Falsifiable acceptance and proof

- **Normal case:** A permitted player sees meaningful server HTML and can navigate/focus through a recoverable read failure using existing appearance.
- **Discriminating negative case:** 503 never claims 404/deleted; owner-mismatched story not disclosed; reauth does not auto-post an earlier choice; uncertain generation not silently restarted; focus not trapped in unmounted button.
- **Check and evidence:** Focused test plus real browser keyboard/focus check when authorized; note that a JSX role audit does not certify WCAG compliance.
- **Completion receipt:** Capture state matrix, representative browser evidence, remaining human accessibility review gaps.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No brand, layout, typography, visual system, animation, game UX policy or frontend framework replacement.
- **Principal risk:** Server and client error boundaries behave differently; catching Next navigation exceptions breaks routing. Avoid major visual changes.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F1 F2 F9**, audit **G24**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
