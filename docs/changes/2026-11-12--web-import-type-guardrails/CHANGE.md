# Change W13 | Enforceable client/server and feature module boundaries

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W02 for server-only reader; W06 for neutral pace dependency; W01 if test script added.

## Outcome and authority

**Code-bearing outcome:** The codebase's most security/maintenance-critical module boundaries are enforced by cheap static and build checks instead of relying on agent memory or file naming.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F1 F7 F14**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G26 G21**.

**Relevant source owners:** `apps/web/src/lib/viewer.ts`, `apps/web/src/features/stories/opening-preview.tsx`, `apps/web/src/features/play/campaign-play.tsx`, `eslint.config.mjs`, `eslint.quality.config.mjs`, `apps/web/package.json`, existing `.github/workflows/code.yml`.

## Proposed engineering contract

Protect server readers with Next-supported `server-only` import protection and TypeScript/ESLint import policy; prevent Client import graphs from pulling server modules, circular feature-to-feature imports used merely for constants, and hidden Node-only dependencies. Add a small set of rule patterns after inspecting actual aliases and dependency export surfaces; permit legitimate type-only imports/shared contract packages. Use existing strict TypeScript, root lint/build/CI rather than installing an architecture linter or enabling hundreds of new stylistic warnings. The existing `@offscreen/game` calendar projection helpers may be safe browser imports; inspect before banning the package. Architectural checks must reject a *deliberately wrong* import without causing unrelated lint churn.

## Intended bounded code/test delta

1. Document current allowed import directions: `app` server routes -> server readers/feature islands; `features` -> shared contracts/pure client utilities; server-only never -> client.
2. Add minimal static guard and/or dedicated negative fixture/test for accidental import, and relocate shared pace constant to neutral module per W06.
3. Confirm targeted typecheck, lint, build, and current CI command interaction; do not broaden global style rules.

## Acceptance and meaningful rejection

- **Normal:** Web typecheck/lint/build continue with existing legal imports; TypeScript soundness and Zod runtime boundary remain intact.
- **Adversarial negative:** A Client module importing server cookie reader or another Client screen merely to access a constant is rejected by defined guard; no false ban on pure `@offscreen/game/calendar` if browser-safe.
- **Cheapest truthful verification:** Static negative import case with explicit error, `pnpm lint` / `pnpm --filter @offscreen/web typecheck` / build when authorized, no provider calls.
- **Result evidence:** Show written dependency graph, rejected-bad-import example and concrete check result.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No monorepo-wide architecture overhaul, new shared package without multiple owners, wholesale prettier churn, automatic adoption of new CSS/React compiler libraries.
- **Main risk:** Over-broad import globs create more maintenance cost than value; ensure actual production build catches both dynamic and static import boundaries.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
