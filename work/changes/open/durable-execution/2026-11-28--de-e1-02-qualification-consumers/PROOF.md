# DE-E1-02 | source construction gate

From root after tasks: `pnpm install --lockfile-only` then `pnpm install --frozen-lockfile`; preserve pinned SDK and old importers except Agent Core new dev dependency. Run:

```bash
pnpm --filter @offscreen/temporal-runtime build
pnpm --filter @offscreen/temporal-runtime typecheck
pnpm --filter @offscreen/temporal-runtime exec tsc -p tsconfig.test.json
pnpm --filter @offscreen/temporal-runtime test
pnpm --filter @offscreen/agent-core build
pnpm --filter @offscreen/agent-core typecheck
pnpm --filter @offscreen/agent-core exec tsc -p tsconfig.test.json
pnpm --filter @offscreen/agent-core test
node --test infra/verification/smoke/temporal/qualify.test.mjs
node --test infra/platform/temporal/tests/namespaces.test.mjs
git diff --check
```

All offline via injected seams, no opt-in environment or native connection. Verify fixture TypeScript compilation, host root export only, Agent Core public and Workflow-safe closure unchanged (`src` and mission Workflow exact diff empty, no import from host/test in bundle); verify both `qualify` scripts use common owner route and raw direct invocation refuses before host/command. Assert malformed/forged admission never reaches create Worker, exact endpoint namespace identity check, no generic exporter override, bounded lifecycle race; wrong checkpoint/attempt/run proofs fail; M01 counts and M02 incomplete path discriminating negatives; preserve existing admission/registry/limits/fixtures/recovery tests. Test actual trace constructor, match and query oracle with fakes (incl exporter error leaves result intact); no live trace submission. Record exact test results, warnings, failures. New source gate is not native qualification. 03 owns actual four-app build/typecheck, graph closure, actual native histories, trace queries and E2 dashboard, native custody. Archive only after own gates pass, transfer all remaining obligations to Design.
