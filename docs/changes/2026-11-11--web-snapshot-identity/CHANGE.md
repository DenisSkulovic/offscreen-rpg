# Change W03 | Resource-scoped and monotonic story snapshot authority

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** W01; precedes W04, W05, W10 and W12 when using story identity.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F3 F4 F10**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G13 G17**.  
**Desired single code/test/config outcome:** One explicit owner of *which authenticated story* is displayed accepts only matching resource snapshots and non-regressive same-resource versions, including initial render, refresh and command responses.

**Observed source owners:** `apps/web/src/lib/story-transport.ts`, `apps/web/src/features/play/view.tsx`, `apps/web/app/play/[id]/page.tsx`, `apps/web/src/features/play/history.tsx` (boundary only), `packages/contracts/src/stories.ts` (read).

## Proposed design contract (not an invitation to redesign)

Use a **resource key** (viewer/session scope plus story ID at the owning boundary), separate deliberate resource selection/reset from incoming snapshot reconciliation, and ensure no A content renders while B is loading. A pure function compares server `viewVersion` for the *same story* and applies an explicit `resolution.version` tie policy only when contract evidence supports it. Never use an unrelated story's higher version to justify replacement. Key appropriate outer route/controller identity deliberately; complement it with request-key/abort/ignore guards because keys alone do not make resolved callbacks safe. Do not introduce Redux, a global canonical story cache, or a new concurrent-fetch scheduler.

## Expected bounded implementation

1. Introduce resource-aware pure reconciliation with explicit outcome for wrong-resource, older-version and equal-version payload; document how null resolution and optional version are treated (verify the server invariant first).
2. Refactor `PlayScene` to expose a single snapshot dispatcher and a deliberate identity boundary for initial props/route navigation; command and refresh feed it.
3. Guard stale A in-flight callbacks and child history state on resource/viewer change; update current imports/call sites without duplicating policy.

## Falsifiable acceptance and proof

- **Normal case:** Authorized story mounts with its SSR snapshot; higher `viewVersion` and legitimate equal-version resolution update become visible once.
- **Discriminating negative case:** A→B before B loads never shows A as B; B then delayed A cannot win even with enormous A version; v14 then v13 cannot regress; stale user/session data is not accepted.
- **Check and evidence:** Pure tests for comparator cases, component tests with deferred A/B responses and a controlled browser soft-nav experiment. Tests must inspect the transition *before* B resolves, not only final DOM.
- **Completion receipt:** The owner can explain resource key, reset policy, every update path, tie-break and a negative A/B browser test. Keep source API stable for later Change packets.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No new backend version numbers, no speculative gameplay state, no global query cache, no automatic SSE, no route/visual redesign.
- **Principal risk:** Do not infer full session isolation from story UUID alone; avoid resetting valid pending UI on same-resource revalidation. If equal-version semantics are genuinely undefined by backend, stop that subcase and report contract dependency.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F3 F4 F10**, audit **G13 G17**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
