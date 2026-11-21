# MA10 | source-directed structural closure procedure

## 1. Migrate old tests without throwing away proof

Move `packages/application/test/*.mjs` into `packages/story-engine/test/` preserving names and relative test file scope. Core domain `../dist/{stories,campaign,storyteller,generations}` resolves against Story Engine dist unchanged; `../dist/drafts` resolves to MA08 owner. Replace obsolete `../dist/developer-tools` deep imports by `@offscreen/lab-support` root barrel where exported or exact narrow subpath exports needed for genuine fixture functions; no relative package-directory escapes at runtime. Replace test `@offscreen/application` specifiers with real owner; only `ma06a-story-engine-compatibility.test.mjs` deliberately changes its expected condition to no facade. Preserve every other test's assertions, SQL fixture, negative scenario, timeout and skip conditions.

Correct `packages/story-engine/package.json` test script and dependencies for direct lab fixture imports, **but check package direction**: if adding lab-support as Story Engine *runtime* dependency would create `lab-support → Story Engine → lab-support` cycle, never do that. **Chosen solution:** dedicated test-only import resolution (e.g. direct test workspace dependency with package manager's top-level root devDependency) OR put lab-using engine tests under `tools/api-integration/test` while maintaining their 1:1 test names/coverage, because tests must not force `story-engine` production package to depend on lab. Prefer test relocation to the existing `tools/api-integration` for lab-dependent tests, keeping engine-only tests in Story Engine; map 112 test files bijectively and verify count. No new circular production edge permitted.

## 2. Remove all executable facade references

Use AST source scanner and explicit package manifests/scripts to locate old literal specifiers. Convert every `@offscreen/application/*` in production/tool/test to the migrated owner. Convert scripts importing `packages/application/dist/... ` to exact new built dist paths or the stable package subpath. Update three chamber benchmark scripts, `focused-integration.mjs` workspace list, and module graph tests to retain only synthetic fixtures explicitly labeled as historical. Delete `packages/application/src`, `test`, `package.json`, `tsconfig.json` and README only after all test destinations and CI scripts exist. Root lockfile regenerated once; `pnpm -r list --depth -1` has no Application package; graph has no undeclared dependency.

## 3. Correct substantive remaining runtime SCCs

- Generation/Writer: move the orchestration import initiating the cycle to outer composition at `generations/index.ts` or Writer orchestration entrypoint as appropriate, with typed, injected execution callback. `generations/scripted-openings.ts` continues to offer existing scenario output and provider-free fixture; no permission/state/clock change.
- Writer custody: isolate types and common `resolveWriterStepContext` / custody helpers in a neutral internal helper **without** recursive runtime imports, or inject explicitly needed callback at the owner composition. Do not change expected hashes, paid policy, reservation, possible-send boundaries, CAS response object custody or settlement. If the cycle is type-only, change no runtime code and mark type graph separately.
- Action settlement: move `recordActionExecutionEvent` (currently imported into `campaign/narrative-intent-settlement.ts` from `campaign/action-executions.ts`) to a small authority-owned `campaign/action-execution-events.ts`, consumed by both; preserve transaction input and `gameActionExecutionEvent` row semantics.

**Stop** if an SCC cannot be removed without changing WR09 settled liability or writer capture algorithm. A build passing despite altered money/clock behavior is not acceptance.

## 4. Narrow public API from actual imports

After every caller/test moved, AST-scan external imports of Story Engine: keep four root subpaths and each **concretely used** deep path as one explicit export. Use actual built file existence/NodeNext resolution check to avoid exports to folders without compiled `index.js` or two-depth `fixtures`. Add regression to `module-graph` that public imports map to declared file exports, private unlisted paths fail, and no new wildcard is introduced. Prefer a short set of narrow barrels for clusters of closely related public symbols; never generate hundreds of convenience exports merely from prior Application forwarders. Host composition should use stable functions, not reach into SQL helpers; if a host legitimately needs a private helper, expose a narrow internal-for-host subpath with explicit docs.

## 5. Enforced graph and closure

Extend existing graph scanner with scoped Story Engine module-domain predicates and runtime-vs-type tests; reject lab import into authority, authority direct Writer runtime modules, and runtime SCC across authority/Writer while allowing pure grammar/Contracts. Declare ownership and exception rationale in selected technical docs. Execute scoped graph tests, production builds, all migrated nonlive tests, representative disposable SQL negatives (action permissions, fork root, writer cost/retry). Update work ledgers and archive MA10. Do not claim the larger undertaking Done, merge main or send paid calls under this packet.
