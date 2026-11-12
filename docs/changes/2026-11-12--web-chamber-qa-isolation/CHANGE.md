# Change W12: Historical Chamber/QA isolation, superseded by CH10–CH11

> **DO NOT EXECUTE W12.** Chamber has a newly selected [C01–C16 target](../../engineering/targets/chamber-laboratory.md) and [CH01–CH16 program](../../engineering/chamber-program.md). Valid Query/QA/boot-mode requirements transfer to [CH10](../2026-11-12--chamber-qa-bridge/CHANGE.md) and [CH11](../2026-11-12--chamber-workbench/CHANGE.md); the old UI is no longer the target.

> **Historical Cursor first look (current source ≠ selected target):** [Chamber/QA mode map](../../../apps/web/src/features/developer-tools/chamber/README.md) → the **one** owning symbol. **Primary contract:** [F13](../../engineering/targets/react-next.md#f13-developer-only-chamberqa-isolation).  
> **Pre-investigated trap:** Normal Nest startup already omits developer controllers; **preserve and test** that gate, don't invent hosted RBAC.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Superseded / historical, NOT an executable candidate.** Retained to preserve decisions. All technology, behavior and security decisions were governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** none for W12; CH10/CH11 supersede it.

**Depends on:** W01 W15 W03 W05; the existing developer-mode registration boundary is preserved and verified (not reinvented).  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F2 F3 F4 F6 F13**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G23 G33 G27**.

## Code outcome and owners

**Measurable code/test/config change:** TanStack Query Chamber/QA isolation and developer-mode boot-path tests.  
**Start at:** `apps/web/src/features/developer-tools/chamber/{use-chamber-play.ts,transport.ts,qa-workspace.tsx,view.tsx}`; `apps/web/app/chamber/page.tsx`; `apps/api/src/modules/stories/{chamber-tools-controller.ts,qa-journeys-controller.ts}`; auth config (narrow).

## Binding technical design

Move Chamber snapshot/inspector/QA server-state to viewer+story/run keyed **TanStack Query** and reuse W03 monotonic domain selector/W05 refresh policy, while keeping scenario and lab-only local control independent from Play. QA localStorage run ID is an **untrusted viewer-scoped hint**; clear it on identity change. **Source-corrected security decision:** `apps/api/src/app.ts:createApp` registers developer/QA controllers only under `options.developerTools === true`, and the ordinary API `main.ts` leaves it unset. `tools/chamber/src/main.ts` enables this only in its loopback/local fixture harness. **Retain this gate**; do not implement a new `DEVELOPER_USER_IDS` allowlist or RBAC. Add tests proving ordinary startup has no developer endpoints while the explicit local launcher still works. Keep existing owner-scoping and viewer-isolation checks. Never include inspector-private DTO in ordinary player Query/cache bundles.

## Bounded implementation steps

1. Add regression tests for the existing `developerTools` conditional controller registration (ordinary API missing endpoints, local harness enabled) and confirm owner-scope. Only add minimal config hardening if a test reveals an actual exposure path.
2. Migrate Chamber story/inspector/QA reads to Query and mutation transport while retaining lab-specific command semantics.
3. Partition and clear persisted run hint across login/logout, cancel stale inspector/query writes, and add boot-mode/owner/session tests without new hosted RBAC.

## Acceptance and verification

- **Normal outcome:** Explicit local Chamber fixture can load its authorized scenario/inspector/QA run; ordinary API registration has no Chamber endpoints and normal player experience is unchanged.
- **Discriminating negative case:** Ordinary API has no developer routes even when called by URL; local harness retains intended authenticated/local behavior; different owner run rejected and old viewer hint not shown after switch.
- **Safe proof and evidence:** RTL/MSW race tests and real Nest normal-vs-Chamber bootstrap/owner integration with disposable DB when authorized; no provider calls.
- **Must preserve / exclude:** No new game logic, public QA tool, multi-admin console, storage of private story content in browser persistent cache, unrelated auth rewrite.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
