# Change W14: Production-like private SSR, route/cache/SSE and performance verification

**State: Specified / Proposed.** All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** Cursor, one selected packet at a time.

**Depends on:** W02 W15 W03 W04 W07 W17; W18 state workbench optional evidence input.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F1 F2 F9 F10 F15**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G14 G25 G27 G30**.

## Code outcome and owners

**Measurable code/test/config change:** Production-like private SSR, route/cache/SSE and performance verification.  
**Start at:** `tools/api-integration/test/stories-browser.integration.ts`, auth/stories test files and browser helpers, `apps/web/next.config.ts`/route group/provider, existing `.github/workflows/code.yml`, optional tiny safe metric script.

## Binding technical design

Extend **real provider-free Next 16 production-build + Nest + disposable DB + browser** checks; tests should prove authenticated initial HTML and correct client hydration, Router Cache/soft navigation/prefetch, 401/404/503 classification, owner/other-owner, logout/back/cross-tab, Query cache partition, no accidental private HTTP/proxy cache, SSE missed event resync, command POST count under lost ACK, keyboard recovery and measured network waterfalls. Capture bundle/route JS, first meaningful HTML, hydration warnings, request counts and SSE/poll fallback timing in a reproducible environment. No invented SLO or 'X% faster' claim without before/after control. Log only redacted route class, operation/status, timing and error taxonomies; never private story text/cookies/provider prompts. Existing CI is asset; do not create extra billed workflows.

## Bounded implementation steps

1. Implement precise browser/HTTP/proxy production-like test harness with known disposable DB and provider-free conditions.
2. Verify private SSR + Query hydration vs soft-navigation/Router Cache, other-owner and logout/back, SSE loss/fallback; capture actual traces and baseline metrics.
3. Add scoped safe structured diagnostics/metrics where lacking and publish concise evidence receipt with revision/environment/sample, not marketing adjectives.

## Acceptance and verification

- **Normal outcome:** Authorized owner receives meaningful SSR data without redundant hydration GET; current state survives a browser navigation and after SSE invalidation; measurable request/bundle trace available.
- **Discriminating negative case:** Anonymous/other-owner, cached Router back after logout, stale SSR hydration, delayed command/SSE and upstream failure never disclose private data or duplicate business effect; no paid provider traffic.
- **Safe proof and evidence:** Real Playwright/Nest/DB integration only with explicit permission for disposable DB reset and service start, production build plus measured report, CI smoke as selected.
- **Must preserve / exclude:** No live deploy, production user data, provider budget, new visual UX, gratuitous observability platform.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
