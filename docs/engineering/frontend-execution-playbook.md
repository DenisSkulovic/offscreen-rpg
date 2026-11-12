# React/Next execution playbook | cheap Cursor, fast workstation, correct engineering

**State:** Owner direction + architect decisions, 2026-11-12. **Purpose:** convert the [selected F1–F15 React/Next architecture](targets/react-next.md) and [W01–W21 code Changes](../changes/README.md) into a predictable, economical implementation process. **Not:** a second architecture spec, a generic rule to preload, permission to execute code, or permission to reset databases/spend/deploy. This document owns *execution economics and source investigation*. Selected Change `CHANGE.md` owns its code scope and negative acceptance.

## Quick route for an executor (do not load this entire document by habit)

- **Am I supposed to code?** [Change index](../changes/README.md) must show a selected, authorized Change, or the owner has explicitly supplied a scoped task. A prepared folder alone means nothing.
- **What do I implement?** Read only the selected Change's first-screen brief and its [nearest source README](../../apps/web/README.md); read its full acceptance/target heading only if the quick map is insufficient. The [source atlas](#6-source-atlas-for-w01w21) now routes to **short owner maps**, not duplicated code archaeology. Do not load all 21 packets, the audit or this entire playbook.
- **What command now?** [Verification ladder](#verification-ladder-stop-checking-every-keystroke), then [commands](#command-and-cache-cookbook).
- **What if the spec clashes with source?** Return a terse evidence packet to ChatGPT/owner; don't bill Cursor tokens designing a replacement.
- **What should I report?** [Receipt](#receipt-and-measurement); one clear result, not a transcript.

## 1. The optimization function: three scarce resources

1. **Cursor allowance:** The owner uses low-cost/fast Cursor models on a limited subscription. The expensive conceptual design, cross-system review, choice of libraries, failure protocols, source archaeology and adversarial scenarios belong to ChatGPT planning and this repository's permanent spec. Cursor implements small, pre-decided deltas.
2. **Wall-clock:** A fast local computer is an advantage, *not* permission for repetitive full installs, rebuilds, 10 Docker services, E2E orchestration, unnecessary tests or redundant startup. Measure cached vs uncached tasks and avoid repeatedly starting toolchains.
3. **Human attention:** Minimize unexpected questions and stale decisions, keep the process observable, make 2–3 meaningful checkpoints rather than asking the owner for approval after every line. Correctness failures discovered late are costly too.

**Trade-off decision:** reduce *total cost per accepted Change*, not raw prompt length or number of test runs. A 2-minute relevant negative test after a risky protocol change can prevent hours of expensive agent rework; running an entire DB+browser suite after a pure selector extraction is the opposite of discipline.

## 2. Roles, budget and no-detour protocol

**ChatGPT (planning/review, not quota-limited like Cursor in this workflow):** research official framework behavior, analyze exact repo APIs, resolve state/data/auth/SSR/recovery/security choices, design tests that discriminate plausible wrong implementations, create/change Markdown packets, review ambiguous diffs when necessary. A ChatGPT session may read broadly **once** and leave a reusable source route. It must not invent live execution evidence or assume access to the user's local unpushed files.

**Cursor fast implementer:** read task-specific packet + 2–5 sources, edit a coherent slice, inspect changed diff, run appropriate *staged* checks, return a short receipt. It may choose local names/implementation details, not architecture, libraries, persistence policy, backend authority or game rules. Avoid autonomous subagents, broad code reviews, self-devised PRD/spec rewrites, library research, duplicate parallel plans, asking an expensive model to rate every function or “cleaning up” random files.

**Owner:** selects a Change for coding and approves any protected action (paid provider, external deployment, non-disposable DB operation). If a genuine architecture/contract mismatch appears, hand that **specific** decision to ChatGPT with 3–8 source/symbol anchors, the exact conflict and a falsifying case. Do not spend a dozen Cursor tool calls debating it.

**Default cheap-model loop:**

1. In fresh Cursor chat, supply the *one active packet path* and brief instruction; root `AGENTS.md` and matching file-scoped Cursor rule do the small reusable work.
2. Cursor first checks `git status --short` and 2–5 anchors; does **not** run repo-wide discovery, `pnpm repo:brief` on every message, or load all historical minutes.
3. If sources match: implement the specified bounded diff with a short in-head plan. When a source was already provided, don't reread it through three different commands.
4. After one logical sub-slice, inspect `git diff --check` and nearest diff; do not execute the whole verification pipeline.
5. At the Change's completion boundary, run a **relevant** cheap check/negative test; at a meaningful integration gate do broader verification once.
6. Return concise receipt. Start a fresh Cursor context for the next unrelated packet to avoid old investigation/history tokens being sent repeatedly.

Do **not** impose an arbitrary token/read cutoff that blocks a safety-relevant investigation. Stop expanding once the owner, input, output, mutation/commit and one failure case are identified. Minimize rework rather than suppressing evidence.

## 3. Local toolchain facts already investigated (source inspected only)

| Repo anchor | Current fact | Consequence |
| --- | --- | --- |
| `package.json`, `.node-version`, `.npmrc` | Node `24.19.0`, pnpm `11.19.0`, `save-exact`/`engine-strict` | Use pinned pnpm/Node. Never mix npm/yarn lockfiles or globally upgrade tool versions during a Change |
| `pnpm-workspace.yaml` | Workspaces `apps/*` `packages/*` `tools/*`; build postinstall allowlist already exists | Use `pnpm --filter`; preserve approved native build scripts |
| `turbo.json` `build` | `dependsOn:["^build"]`, outputs `dist/**` and `.next/**` excluding `.next/cache/**` | Correct dependency build order; local Turbo caching exists, but verify hit rates; avoid caching `.next/dev/**` as a production output |
| `turbo.json` `test` | `dependsOn:["build"]` (same-package production build) | **W01/W20:** new fast React tests must have an independent path. Never require full `next build` to execute one Vitest state test |
| `packages/{game,application,documents}/package.json` | `test` *also calls `pnpm run build`* | Merely changing Turbo `test` to `^build` doesn't remove all duplicate builds. Preserve existing dist-based suite semantics until a measured, safe optimization |
| `apps/web/package.json` | `dev: next dev`, `build: next build`, `typecheck: next typegen && tsc --noEmit`; no web test yet | Next 16 uses Turbopack by default; add Vitest `test` and `test:watch` under W01; `next typegen` does **not** require production build |
| `apps/web/tsconfig.json` | `incremental:true`, Next plugin and path alias; strict shared base | Keep `*.tsbuildinfo` and warm editor TS service. No full build to verify every typed component change |
| `.github/workflows/code.yml` | On **every push/PR**; code, infra, DB, identity jobs including Chromium + Temporal | Docs-only pushes can trigger costly checks, and every code push can run broad DB/browser. **W21** will use path-/event-aware gates |
| `.github/workflows/docs.yml` | Also on every push/PR | Keep doc checking, but avoid redundant runs for unrelated code-only commits once workflow filters are correct |
| `scripts/repo-tools/focused-integration.mjs` | Builds entire API integration dependency graph, then destroys/recreates **offscreen_auth_test** before a named suite | **Not** a fast inner-loop check; run deliberately at a protocol checkpoint; never invoke to “see if it works” |
| `scripts/repo-tools/reset-test-db.mjs` | Hard-coded guarded local database and `DROP DATABASE ... WITH (FORCE)` | Explicit owner authorization/safe environment required; never run on personal or production data |
| `compose.yaml` | PostgreSQL, Temporal, optional Redis | No Docker needed for pure React/Vitest/Storybook tests; start only services required for the current integration proof |
| `.gitignore` | Preserves local generated `.next/`, `dist/`, `.turbo/`, TS build infos and pnpm stores | Warm caches should survive normal iterations. Never reflexively delete these or reinstall dependencies |
| `docs/engineering/code-quality.md` | Historical line called checks “laptop-aware” and defaulted to none | Superseded by this document + [verification rule](../../.agents/rules/verification.md); hardware is not the reason to skip useful proofs |

**Framework facts from official sources:** Next 16 defaults to Turbopack and persistent development filesystem caching; do not add `--turbopack` flags or duplicate experimental cache configuration without confirming the installed minor. [Next 16 dev](https://nextjs.org/docs/app/guides/local-development), [Next 16.1 caching](https://nextjs.org/blog/next-16-1). Turborepo `dependsOn:["build"]` explicitly runs the same package build, while `["^build"]` runs dependency builds; [task config](https://turborepo.dev/docs/reference/configuration), [caching](https://turborepo.dev/docs/crafting-your-repository/caching). GitHub path filters can skip docs-only code CI, but required checks may remain pending if skipped; [GitHub workflow paths](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax). Official [pnpm filtering](https://pnpm.io/filtering) is the preferred selective execution interface.

## 4. Verification ladder: stop checking every keystroke

| Level | Trigger | What to do | What **not** to do |
| --- | --- | --- | --- |
| **V0, hot edit** | Ordinary file edit, extraction, prop rename, layout-preserving composition | Editor TS diagnostics; inspect diff occasionally; keep single warm dev/test-watch process if already needed | No automated full typecheck, lint, build or E2E after each save |
| **V1, sub-slice boundary** | One coherent function/hook/component transition or test added | Run **one targeted pure/RTL test** or changed-file ESLint if it can expose the likely defect; `git diff --check` | No complete repo test or Next production build |
| **V2, Change closure** | Packet has substantial implementation ready for review | Targeted web typecheck and **selected** focused tests, one normal and one meaningful negative case; run targeted lint/format on changed files | Don't repeat already green broad checks merely because another small line was edited |
| **V3, integration seam** | After **architecture clusters**: W02+W15 SSR, W03+W19+W04 commands, W08/W09 forms, W16+W17 SSE, security/identity boundary | One filtered production build / safe provider-free real API-browser integration **appropriate to the changed contract**; record known baseline and failures | Don't wait until all 21 packets to discover that Next SSR or auth is broken; don't run full stack after every small packet |
| **V4, campaign/PR milestone** | A coherent batch is stable, owner requests broader confidence, or before final portfolio acceptance | Full lint/typecheck/unit/build, selected integration, accessible browser/human smoke and cache/perf evidence once | Don't use this as inner-loop gating or claim production readiness from one run |

**Correctness exception:** authentication, CSRF/ownership, idempotent paid commands, durable operation receipts, serialization and migration/transaction changes get their **own relevant negative proof at the boundary** before another dependent change relies on them. Delay full-regression suites, not the invariant that could double-charge or leak data.

**Skip policy:** If a sub-slice is only a pure rename or safe extraction and relevant TS/IDE diagnostics are clean, V0 may be sufficient until V2. If no runnable test exists, record the gap and continue with source/diff inspection; don't fabricate an alternative. If a test fails before the change, capture baseline/repro and avoid attempting unrelated fixes. Never remove assertions or silently skip failing tests just to maintain green output.

**Cadence:** batch iterations inside a single Change. Do not turn a Change into one monolithic unchecked multi-file rewrite; divide it into small coherent code slices, verify once at boundary and keep rollback straightforward. Broad verification occurs at *real integration milestones*, not a calendar or arbitrary N-file count.

## 5. Command and cache cookbook

### Cold setup (one-time or only after manifest/lock changes)

- Verify `node --version` and `pnpm --version` only at first session or after environment change.
- `pnpm install --frozen-lockfile` once for the checked-in lockfile; use `pnpm --filter @offscreen/web add -D <package> --save-exact` only when the selected Change installs a dependency, then commit the lockfile. Use project-approved `allowBuilds` for newly required native postinstall steps.
- Reuse pnpm's shared content-addressable store, `node_modules`, `.turbo`, `dist`, `.next/dev`, and TypeScript incremental files. **No** `pnpm store prune`, wiping `node_modules`/`.next` or reinstalling all packages unless a reproduced cache/install corruption points there.
- Local Windows checkout belongs on a native filesystem (not a slow Docker bind mount, remote network drive or WSL-mounted Windows directory through Docker). Run Node/Next on host, Docker only for PostgreSQL/Temporal when required. Existing Docker Desktop workaround is documented in [development](../development.md); do not proactively run `infra:repair`.

### Cheap local React checks (after W01; exact scripts finalized there)

```bash
# single test file, no Next production build
pnpm --filter @offscreen/web exec vitest run src/features/play/model/snapshot.test.ts

# one warm process when repeatedly editing the same feature
pnpm --filter @offscreen/web test:watch

# only current web workspace; Next typegen is not next build
pnpm --filter @offscreen/web typecheck

# lint or format ONLY affected files
pnpm exec eslint apps/web/src/features/play/view.tsx
pnpm exec prettier --check apps/web/src/features/play/view.tsx
pnpm exec prettier --write apps/web/src/features/play/view.tsx

# cheap local diff hygiene
git diff --check
git status --short
```

The test path above is an **illustrative future file**. Cursor must use the actual test file created by W01/W03; do not assume it already exists. The `test:watch` script is also a W01 deliverable, not present at this audited revision. Windows PowerShell may require quoting paths/globs; prefer repository scripts over Unix-only `rm`/`grep` or ad hoc shell pipelines.

### Focused package/build checks (after meaningful integration only)

```bash
# build only affected web and required dependency graph
pnpm exec turbo run build --filter=@offscreen/web

# affected package and required dependency builds; do not use for every JSX edit
pnpm exec turbo run typecheck --filter=@offscreen/web

# if a static/Next route integration requires actual compiled services:
pnpm test:focus -- stories-browser
```

**WARNING:** `pnpm test:focus` rebuilds and **drops/recreates `offscreen_auth_test`**. It requires local PostgreSQL/Temporal/browser setup and explicitly safe testing permission. The ordinary browser uses server on localhost ports; don't run conflicting dev instances simultaneously. Do not treat the full test runner as a pure cache lookup.

### Fast inspection before doing anything expensive

```bash
# selected task plan / side-effect-free tooling inspection
pnpm exec turbo run build --filter=@offscreen/web --dry=json

# source searches by symbol / exact file
rg -n "preferNewerSnapshot|useCampaignCommand" apps/web/src
```

Dry-run output can be large: inspect only selected tasks/dependencies, not the entire JSON in model context. When Windows shell glob behavior is uncertain, give literal paths or use `pnpm --filter`. A broad `rg` query should be run **only** when the source atlas does not already identify the owning symbol.

### Keep processes warm, not noisy

- While actively editing a React feature: one web dev server, one test watcher when useful, editor TS service. Avoid repeatedly restarting them; fast refresh and watch mode do the incremental work.
- Only start API/PostgreSQL/Temporal for a contract/browser checkpoint. Redis remains optional; don't start it for React state tests.
- Prefer Next 16 default Turbopack and its working filesystem cache; do **not** toggle experimental flags without a benchmark and observed need. Next `dev` and `build` differ; a Vite/Vitest test is not an excuse to run Next production compilation.
- ESLint cache is a later candidate if measured lint cost justifies it; never assume that `--cache` or Turbo caching is reliable without checking invalidation. Keep caches local/private; remote caching is optional, not a new paid service.
- Set concurrency only **after** measuring CPU/RAM saturation. On a capable desktop, arbitrarily reducing workers can be slower; over-parallelizing PostgreSQL/Temporal/browser suites creates contention and port collisions. Do not globally set huge worker counts merely because the machine has more cores.

## 6. Source atlas for W01–W21

**This heading is retained for existing links; W22 is included.** The authoritative **source facts** moved to short adjacent READMEs, which have explicit “current vs target” labels and code-tested paths. This table is a *route selector*, not a second maintained explanation. Open **one** map, not this whole playbook.

| Selected Change family | First map; current source facts | Don't read unless needed |
| --- | --- | --- |
| W01/W20/W21/W22: test/CLI/CI/docs checks | [test harness](../../tools/api-integration/test/README.md) or [web overview](../../apps/web/README.md), then [toolchain facts above](#3-local-toolchain-facts-already-investigated-source-inspected-only) | Entire runtime, provider docs, historical QA |
| W02/W15/W07: Next SSR, auth, Query hydration/errors | [App Router](../../apps/web/app/README.md) → [web transport](../../apps/web/src/lib/README.md) | Full target, all pages |
| W03/W04/W05/W06/W11/W17: Play, snapshots, commands, forms, refresh | [Play source map](../../apps/web/src/features/play/README.md) | Whole campaign module if only comparator/response status matters |
| W08/W09/W10: drafts/preview/Start/list paging | [Stories/creation map](../../apps/web/src/features/stories/README.md) → [draft/opening HTTP](../../apps/api/src/modules/drafts/README.md) only for API questions | Other campaigns, Storyteller task runtime |
| W12: Chamber/QA | [Chamber map](../../apps/web/src/features/developer-tools/chamber/README.md) | Hosted RBAC design that existing conditional registration already avoids |
| W19: resolution receipt | [Nest stories endpoints](../../apps/api/src/modules/stories/README.md) → [application story/DB map](../../packages/application/src/stories/README.md) | All DB models, other story generation tasks |
| W16: server SSE after commit | [application story/version writers](../../packages/application/src/stories/README.md) → [Nest controller map](../../apps/api/src/modules/stories/README.md) | Other event-bus/queue architectures |
| W13: source import guardrails | [web transport/runtime boundary](../../apps/web/src/lib/README.md) + exact `eslint.config.mjs` | Generic lint handbook |
| W14: real private HTML/DB/browser/performance proof | [test entry map](../../tools/api-integration/test/README.md) + [App Router map](../../apps/web/app/README.md) | All CI/test source suites simultaneously |
| W18: Storybook states | [Play](../../apps/web/src/features/play/README.md) or [Stories](../../apps/web/src/features/stories/README.md); W18 packet owns new files | New design system or frontend art direction |

### Two critical source facts already memoized

- **Resolution receipt W19:** existing Nest `PUT 202` → `createStoryApplication.admitResolution` → `createStoryResolution.admit` checks owner, UUID and replayed payload under DB transaction. The proposed `GET receipt` must only read persisted result, never enqueue/infer a new paid operation. Details and exact modules: [application story map](../../packages/application/src/stories/README.md).
- **SSE W16:** commit/version writes occur in worker and campaign paths, not only Nest HTTP handlers. Add a transactionally committed hint across authoritative `viewVersion` writers; code-site references are in the [application story map](../../packages/application/src/stories/README.md).
- **Chamber W12:** actual `createApp({developerTools})` controls developer-controller registration, and ordinary API startup leaves it disabled. Preserve/test that gate rather than adding redundant hosted RBAC. See [Chamber map](../../apps/web/src/features/developer-tools/chamber/README.md).

**Reading command:** `Get-Content <source-map> -TotalCount 20` for the orientation; locate only the relevant source/map heading via `rg -n`. The selected `CHANGE.md` remains the exact scope/acceptance authority. Source maps are maintained in source-owning Changes, not by copying code into this central table.

## 7. How we measure whether the workflow is actually better

After 2–3 representative implementation Changes, record actual evidence, not imaginary “20% savings”:

| Dimension | Collect from client/workstation | Compare |
| --- | --- | --- |
| Cursor allowance | Model selected, reported calls/tokens/usage if available, number of fresh chats/tool searches | W01 or W15 versus similar previously unscoped work; do not invent subscription per-token prices |
| Developer time | Actual elapsed change time, active waiting for builds, debugging and failed suite reruns | More accepted code per hour with same correctness |
| Cache | Turbo hit/miss summaries, cold/warm test/build times, Next route cold/warm compile, install frequency | Optimize only repeated confirmed misses or slow critical path |
| Human effort | Number of architecture clarifications, review interventions and scope corrections | Reduced uncertainty without pushing complexity into obscure abstractions |
| Correctness | Negative case detection, build/typecheck pass after milestone, later rework | Efficiency that causes subtle data/security regressions is a loss |

Do not pollute Cursor context with timing tables on every change. One concise batch receipt after real milestones is sufficient. No claim of an achieved percentage until measurements exist.

## 8. Receipt and measurement (short, factual)

```text
CHANGE: Wxx | commit/diff scope
IMPLEMENTED: exact source/test/config paths and outcome
CHECKS: commands actually run + passed/failed/skipped (reason)
EVIDENCE: normal case + one discriminating negative; real vs mocked boundary
COST: Cursor tool/context cost if exposed; expensive wall time/cold build observed
KNOWN LIMIT: only material unresolved issue, not generic risk list
NEXT: dependency-ready packet or source/contract blocker for ChatGPT
PAID PROVIDERS: no calls unless explicit authorization and logged evidence
```

One useful return packet is better than a multi-page self-review. The plan already owns design; the code/diff/test result is the new information. A failed scope or contract gate returns to the owner with concrete evidence. Start a fresh Cursor context at the next unrelated packet, with this receipt and the next exact Change only.
