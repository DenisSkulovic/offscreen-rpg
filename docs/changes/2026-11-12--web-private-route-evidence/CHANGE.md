# Change W14 | Provider-free authenticated Next routing, cache and performance evidence

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W02; after W03/W07 for final cross-route state/focus proof.

## Outcome and authority

**Code-bearing outcome:** A repeatable provider-free browser/proxy check and safe measurements establish what a private SSR/soft-navigation deployment actually renders/caches, how it behaves across sessions, and baseline cost before performance optimizations.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F1 F2 F9 F10 F15**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G14 G24 G25**.

**Relevant source owners:** `tools/api-integration/test/stories-browser.integration.ts`, `tools/api-integration/test/drafts.browser.ts`, `tools/api-integration/test/helpers/browser-session.ts`, `apps/web/next.config.ts`, `apps/web/app/play/[id]/page.tsx`; optional new tiny local metrics/verification script.

## Proposed engineering contract

Extend existing *real* Next + Nest browser integration, not duplicate it with mocks, with explicitly authorized disposable test DB and no provider. At minimum instrument anonymous/owner/other-owner HTML and RSC/soft-nav read, logout/back/refresh, 401/404/503 route failure, initial HTML value before hydration, and response caching headers. Record request counts and route waterfall plus build JS chunk sizes in controlled environment; compare same trace before/after only when comparable. Use safe redacted timings and URL patterns; never log cookies, raw story prose or provider secrets. A script/code test plus a short Markdown evidence receipt is a legitimate Change. No universal numeric 'performance budget' invented without baseline. Existing CI already includes code, DB and identity jobs; don't add a separate expensive provider/deployment workflow.

## Intended bounded code/test delta

1. Add browser test helpers/scenarios that validate request/session isolation and history behavior, with clear environment prerequisites and cleanup.
2. Add minimal reproducible timings/request tracing and production-build/bundle notes, capturing actual environment and initial baseline.
3. Record false positives (Next HMR cache vs production Router Cache), compare measured costs and leave optimization only where data warrants it.

## Acceptance and meaningful rejection

- **Normal:** Owner sees private SSR story before hydration and correct later navigation; test report shows page/network/JS baseline and correct no-store paths.
- **Adversarial negative:** Other-owner/anonymous direct URL, prefetch, browser back after logout or stale client route cannot surface owner content; timeout/503 is not an authoritative 404; no private payload in traces.
- **Cheapest truthful verification:** Provider-free real browser and HTTP/proxy tests only with explicit test DB reset and local service authorization. Track actual `pnpm` commands and stats; if unrun, report 'test added, not executed'.
- **Result evidence:** Version/environment, scenario outcomes, cache headers, request metrics and precise unproved limits. No “optimized” adjective without comparison.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No live deployments, remote telemetry platform, arbitrary SLO claims, screenshot/branding optimization, paid Storyteller calls or new GitHub Actions bills.
- **Main risk:** The existing integration runner rebuilds services and destroys only the named disposable `offscreen_auth_test` DB, so inspect safety gate before execution. React/Next dev HMR caching is not representative of production.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
