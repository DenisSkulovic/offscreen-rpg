# Change W12: TanStack Query Chamber/QA isolation and enforced developer-only backend gate

**State: Specified / Proposed.** All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** Cursor, one selected packet at a time.

**Depends on:** W01 W15 W03 W05; security gate implemented in this explicit cross-layer Change.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F2 F3 F4 F6 F13**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G23 G33 G27**.

## Code outcome and owners

**Measurable code/test/config change:** TanStack Query Chamber/QA isolation and enforced developer-only backend gate.  
**Start at:** `apps/web/src/features/developer-tools/chamber/{use-chamber-play.ts,transport.ts,qa-workspace.tsx,view.tsx}`; `apps/web/app/chamber/page.tsx`; `apps/api/src/modules/stories/{chamber-tools-controller.ts,qa-journeys-controller.ts}`; auth config (narrow).

## Binding technical design

Move Chamber snapshot/inspector/QA server-state to viewer+story/run keyed **TanStack Query** and reuse W03 monotonic domain selector/W05 refresh policy, while keeping scenario and lab-only local control independent from Play. QA localStorage run ID is an **untrusted viewer-scoped hint**; clear it on identity change. **Security decision resolved:** the lab is developer-only, **disabled in hosted configs by default**, and enabled only for authenticated developer principal allowlist/role; Nest guards every `chamber-tools`/QA/Chamber command endpoint and returns nonleaking 404 or 403 consistently, not merely hiding Next route. Same-origin dev mode can explicitly opt in; no unauthenticated bypass. Keep actual owner checks for individual story/run objects in addition to role gate. Never include inspector-private DTO in ordinary player Query/cache bundles.

## Bounded implementation steps

1. Add narrow backend developer-policy guard and config with opt-in local mode; validate all lab route families.
2. Migrate Chamber story/inspector/QA reads to Query and mutation transport while retaining lab-specific command semantics.
3. Partition and clear persisted run hint across login/logout, cancel stale inspector/query writes, and add owner vs other owner vs ordinary user vs developer tests.

## Acceptance and verification

- **Normal outcome:** Explicitly configured developer can load authorized Chamber scenario/inspector/own QA run and refresh state; normal player experience unchanged.
- **Discriminating negative case:** Ordinary authenticated viewer cannot reach developer endpoints even with URL; different owner run rejected; old user run hint and late inspector GET never expose data after switch.
- **Safe proof and evidence:** RTL/MSW race tests and real Nest auth/owner/role integration with disposable DB when authorized; no provider calls.
- **Must preserve / exclude:** No new game logic, public QA tool, multi-admin console, storage of private story content in browser persistent cache, unrelated auth rewrite.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
