# DOC39 | Turn the oversized local-development page into task-specific safe operating routes

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Reader job now insufficiently supported:** docs/runbooks/local-development.md is about 5,178 words covering startup, front-end workflow, DB suite, auth, live Story and profiled Storyteller rehearsals. There are only three runbooks in the topic hub, so a newcomer risks reading unsafe live-provider instructions during an ordinary no-spend check.

**Governing present owners to read:**
- [docs/runbooks/local-development.md](../../../../../../docs/runbooks/local-development.md)
- [docs/runbooks/README.md](../../../../../../docs/runbooks/README.md)
- [apps/api/README.md](../../../../../../apps/api/README.md)
- [packages/application/src/developer-tools/README.md](../../../../../../packages/application/src/developer-tools/README.md)

**Proposed newly created/relocated owner:** `docs/runbooks/local-storyteller-rehearsal.md and docs/runbooks/local-integration-tests.md (conditional)`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Group by human job and side-effect level: safe initial dev boot, provider-free fixture/integration checks, local authenticated Story demo, explicitly authorized paid rehearsal. Keep current local-development.md as a slim task router if split is justified.
2. Move exact tested commands and warnings as units; source-check against package.json/scripts, auth and local test DB safety before claiming runnable. Preserve 'no provider by default' and non-disposable DB restrictions.
3. Add entrypoint decision tree showing 'what will this command touch?', a normal provider-free path and a negative path for live model/remote DB without permission.
4. Update docs/runbooks/README.md, source-adjacent READMEs and all relevant inbound links. Cancel proposed split if readability worsens.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because this technical/runbook editorial Change preserves current player promises and authorization boundaries | Selected product owners above; exact Proposed/Blocked boundary | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because the move/split preserves selected technical contracts; references are reviewed, not rewritten | docs/technical/README.md; preserve selected vs realized status | Source/fixture/contract proof never invented |
| Code | unchanged because this is a documentation-only Change: **no application source, tests, schema, migrations or executable tool modification** is allowed | Source files are read-only evidence; runbooks may cite commands only after safety review | Negative: any executable diff blocks Done |
| Related | changed: CREATE docs/runbooks/local-integration-tests.md and CREATE docs/runbooks/local-storyteller-rehearsal.md. SPLIT docs/runbooks/local-development.md#postgresql-component -> docs/runbooks/local-integration-tests.md#postgresql-component; docs/runbooks/local-development.md#local-live-story-mode-without-oauth -> docs/runbooks/local-storyteller-rehearsal.md#local-live-story-mode-without-oauth | docs/runbooks/README.md gains those two routes and keeps the DOC28 and DOC29 routes. Old headings remain routers | WIKI16 declared CREATE. Paid commands leave the ordinary boot page |

**Planned CREATE/RELOCATE gating:** the destination path may not exist at design time. Do not mark Ready until WIKI16's create/move plan compatibility is checked or the packet is explicitly revised to an existing-owner edit. Require an actual migration of every important inbound fragment before Done; no automatic "page count improved" acceptance.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected/proposed/implemented states separated, and the new page genuinely reduces detours or ambiguity. **Negative:** A developer following a basic frontend/test route accidentally starts a paid model call or mutates a nondisposable database.

**Owner gate:** No scripts/tests/source changes; an unverified command is marked inspection-needed, not 'safe'.

**Verification:** exact before/after claim ledger, source-revision status where factual, full-link/anchor and reverse dependency checks, reader task trace, and independently reviewed falsifying counterexample. All actual commands/results must be recorded, not guessed. A page can be *good but not needed*: closing with a proved no-op or cancelling the proposed split is legitimate.

## Document shape | shape-ops.v1

| File | Operation | Migration | Conservation |
| --- | --- | --- | --- |
| docs/runbooks/local-integration-tests.md | CREATE | unchanged | Provider-free checks may recreate only offscreen_db_test or offscreen_auth_test, and they must not reset a non-disposable database or call a provider. |
| docs/runbooks/local-storyteller-rehearsal.md | CREATE | unchanged | Chamber stays provider-free, and a paid command stays behind an explicit authorization warning. |
| docs/runbooks/local-development.md | SPLIT | docs/runbooks/local-development.md#postgresql-component -> docs/runbooks/local-integration-tests.md#postgresql-component; docs/runbooks/local-development.md#identity-checks -> docs/runbooks/local-integration-tests.md#identity-checks; docs/runbooks/local-development.md#local-live-story-mode-without-oauth -> docs/runbooks/local-storyteller-rehearsal.md#local-live-story-mode-without-oauth; docs/runbooks/local-development.md#headless-play-and-agent-operation -> docs/runbooks/local-storyteller-rehearsal.md#headless-play-and-agent-operation; docs/runbooks/local-development.md#profiled-storyteller-rehearsal -> docs/runbooks/local-storyteller-rehearsal.md#profiled-storyteller-rehearsal; docs/runbooks/local-development.md#mechanical-rehearsal -> docs/runbooks/local-storyteller-rehearsal.md#mechanical-rehearsal | Ordinary boot stays on this page. Local boot is not a restore rehearsal, and a no-spend check is not given a live-provider command. |

## Migration receipt | shape-receipt.v1

| Old owner | Successor | Unique claim |
| --- | --- | --- |
| docs/runbooks/local-development.md#postgresql-component | docs/runbooks/local-integration-tests.md#postgresql-component | It creates/removes fixture tables and the Drizzle migration journal, so this database must be disposable and runs must not share it concurrently. |
| docs/runbooks/local-development.md#identity-checks | docs/runbooks/local-integration-tests.md#identity-checks | They do not complete a real GitHub token exchange. |
| docs/runbooks/local-development.md#local-live-story-mode-without-oauth | docs/runbooks/local-storyteller-rehearsal.md#local-live-story-mode-without-oauth | an uncertain provider delivery stops further admission |
| docs/runbooks/local-development.md#headless-play-and-agent-operation | docs/runbooks/local-storyteller-rehearsal.md#provider-free-chamber | The command does not read `.env.openrouter`, never constructs the live provider adapter and makes no model calls. |
| docs/runbooks/local-development.md#headless-play-and-agent-operation | docs/runbooks/local-storyteller-rehearsal.md#headless-play-and-agent-operation | Read-only commands never dispatch inference. |
| docs/runbooks/local-development.md#headless-play-and-agent-operation | docs/runbooks/local-storyteller-rehearsal.md#live-memory-evaluation | This command is for deliberate local evaluation only, never tests, startup or unattended loops. |
| docs/runbooks/local-development.md#profiled-storyteller-rehearsal | docs/runbooks/local-storyteller-rehearsal.md#profiled-storyteller-rehearsal | It creates no live funding allowance and does not enable provider execution. |
| docs/runbooks/local-development.md#mechanical-rehearsal | docs/runbooks/local-storyteller-rehearsal.md#mechanical-rehearsal | No live key or provider call is needed. |

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/local-development.md#requirements-and-startup | runbook | changed: startup keeps install, infra:up, db:migrate, and pnpm dev, and the status commands repo:brief and infra ps. Disposable resets and paid commands left this section | no source behavior changed; git SHA b3113814; package.json scripts dev, infra:up, db:migrate, repo:brief, infra | documentation-only; command names read from package.json; startup was not executed | No model credentials or paid calls are involved in that startup block. A reader of this heading does not receive pnpm story:local | Decision table on this page. The old combined shortcut block was split by side effect |
| docs/runbooks/local-development.md#local-dependencies | runbook | unchanged: the local boot instructions stay, including the sentence that local boot is not a restore rehearsal | no source behavior changed; git SHA b3113814; docs/runbooks/local-development.md#local-dependencies | documentation-only; the DOC29 sentence was kept | Local boot, including pnpm infra:up and pnpm dev, is not a restore rehearsal | release-restore-readiness.md still links this heading. That page was not rewritten |
| docs/runbooks/local-development.md#checks-and-boundaries | runbook | changed: the ordinary format, lint, typecheck, test, and build list stays, and one sentence sends disposable database suites to the integration page | no source behavior changed; git SHA b3113814; package.json scripts format:check, lint, typecheck, test, build | documentation-only; those scripts were not executed | Ordinary checks must keep live inference disabled. pnpm test is not a live model call and is not a reset of offscreen | release-restore-readiness.md still links this heading |
| docs/runbooks/local-development.md#postgresql-component | runbook | changed: the heading remains a router. The disposable offscreen_db_test procedure moved once | no source behavior changed; git SHA b3113814 | documentation-only; selected safety sentence kept on the router | checkConnection does not check schema compatibility, and a non-disposable database must not be reset from this route | Router links to local-integration-tests.md#postgresql-component |
| docs/runbooks/local-integration-tests.md#disposable-database-checks | runbook | changed: db:reset:test and test:focus moved here with the provider-free and offscreen_auth_test limit | no source behavior changed; git SHA b3113814; scripts/repo-tools/reset-test-db.mjs; scripts/repo-tools/focused-integration.mjs; scripts/repo-tools/process.mjs | source-inspected scripts; pnpm test:focus -- --help printed usage and was the only invocation; the reset was not executed | The reset script drops only offscreen_auth_test. It does not accept a database URL. A frontend test:fast route does not run this command | New runbook route in docs/runbooks/README.md |
| docs/runbooks/local-integration-tests.md#postgresql-component | runbook | changed: the database suite, pool notes, and migration runner moved here once. pnpm db:baseline is described from baseline.mjs as a migration-file rewrite, not a database reset | no source behavior changed; git SHA b3113814; package.json script db:baseline; scripts/repo-tools/baseline.mjs; package.json script test:db | documentation-only; db:baseline and test:db were not executed | The test URL must name offscreen_db_test. The command refuses a different database name. This is not a restore rehearsal | Successor of the old PostgreSQL heading. The old heading still answers the schema-compatibility question |
| docs/runbooks/local-integration-tests.md#identity-checks | runbook | changed: the provider-free auth and story integration procedure moved here. The Playwright install that named @offscreen/api is marked inspection-needed | no source behavior changed; git SHA b3113814; apps/api/package.json has no playwright dependency; tools/api-integration/package.json depends on playwright; .github/workflows/code.yml | documentation-only; the browser install was not executed | No paid calls occur. Tests do not complete a real GitHub token exchange. DATABASE_TEST_URL must not name offscreen or a remote database | Router remains on local-development.md#identity-checks |
| docs/runbooks/local-integration-tests.md#storyteller-integration-suite | runbook | changed: the test:storyteller paragraph moved here with its fake-provider warning, away from the interactive Chamber rehearsal | no source behavior changed; git SHA b3113814; tools/api-integration/package.json script test:storyteller | documentation-only; the suite was not executed | No saved provider credentials are read. The suite targets offscreen_auth_test | Profiled rehearsal links here and does not repeat the suite command as a paid step |
| docs/runbooks/local-development.md#local-live-story-mode-without-oauth | runbook | changed: the heading remains and names offscreen_story_local, and it no longer contains a live command | no source behavior changed; git SHA b3113814 | documentation-only; no provider call was made | An uncertain provider delivery stops further admission. This heading does not repeat a provider send | uncertain-work-recovery.md still links this heading and was not rewritten |
| docs/runbooks/local-storyteller-rehearsal.md#provider-free-chamber | runbook | changed: pnpm chamber, chamber:reset, and chamber --smoke moved here as the local authenticated demo with no provider | no source behavior changed; git SHA b3113814; package.json scripts chamber and chamber:reset; tools/chamber/src/modes/cli-flags.ts flags --smoke and --reset-database | documentation-only; Chamber was not launched | The command does not read .env.openrouter and makes no model calls. chamber:reset drops only offscreen_chamber | docs/runbooks/README.md row leads with the provider-free demo |
| docs/runbooks/local-storyteller-rehearsal.md#explicitly-authorized-paid-rehearsal | runbook | changed: story:local, story:server, story:play, the stronger-model launcher, and chamber:memory-evaluation-run sit behind this authorization warning | no source behavior changed; git SHA b3113814; package.json scripts story:local, story:server, story:play, chamber:memory-evaluation-run; tools/chamber/src/modes/cli-flags.ts | documentation-only; paid commands were not executed | A billable story:play action fails closed without --confirm-live. The memory evaluation run is never a test, startup, or unattended loop | Ordinary boot links this heading as closed during a no-spend check. The command blocks are not on local-development.md |
| docs/runbooks/local-storyteller-rehearsal.md#profiled-storyteller-rehearsal | runbook | changed: the offline Chamber rehearsal moved here and still creates no live funding allowance | no source behavior changed; git SHA b3113814 | documentation-only; the rehearsal was not run | It does not enable provider execution. The integration suite is a separate provider-free check | Old heading on local-development.md routes here |
| docs/runbooks/local-storyteller-rehearsal.md#mechanical-rehearsal | runbook | changed: the offline mechanical steps moved here unchanged, including the note that migration 0015 was not applied in the implementation turn | no source behavior changed; git SHA b3113814 | documentation-only; the rehearsal was not run | No live key or provider call is needed | Old heading remains a router |
| docs/runbooks/README.md#runbooks | runbook map | changed: two routes were added. The local-development question is now the no-spend boot question. Content package, uncertain work, and release-restore rows stay | no source behavior changed; git SHA b3113814 | documentation-only | The hub question for ordinary startup does not send the reader to the paid heading first | Existing DOC28 and DOC29 rows kept |
| docs/product and docs/technical/README.md | product and technical | unchanged: this Change does not edit player promises, authorization boundaries, or the technical index | no source behavior changed; git SHA b3113814 | documentation-only; those pages were not rewritten | A runbook split does not create a new game, permission, or legal rule | Product pages and docs/technical/README.md were left untouched |
| apps/api/README.md and packages/application/src/developer-tools/README.md | source map | unchanged: no moved command was owned only by these files, so no pointer was added | no source behavior changed; git SHA b3113814 | documentation-only; both files were read and this packet did not edit them | The API route inventory does not become a live-provider rehearsal, and the developer-tools table does not gain a paid command | Left as they stood, including the other in-progress API sentence |
| Code | code | unchanged: documentation-only. No application source, test, schema, migration, or executable tool was modified | no source behavior changed; git SHA b3113814 | documentation-only | An executable diff is not part of this Change. Paid provider calls were not executed | N/A for source maps beyond the unchanged READMEs above |

## Unrepaired inbound links

These files were outside this Change's file list. Each link still resolves, because the old headings remain on `docs/runbooks/local-development.md`. They were not retargeted.

- `docs/runbooks/uncertain-work-recovery.md` still links `#local-live-story-mode-without-oauth`. That heading still names `offscreen_story_local` and does not repeat a provider send.
- `docs/runbooks/release-restore-readiness.md` still links `#checks-and-boundaries`, `#postgresql-component`, `#requirements-and-startup`, and `#local-dependencies`. The restore sentence in local dependencies was kept.
- `docs/runbooks/content-package-authoring.md` still links `#requirements-and-startup` for `OFFSCREEN_DEFAULT_RULE_SOURCE`.
- `docs/README.md`, `README.md`, `docs/technical/platform/identities-and-access.md`, and `docs/technical/platform/topology.md` still link `docs/runbooks/local-development.md` without a paid-command fragment.

## Commands checked

Root `package.json` contains `dev`, `infra:up`, `infra:down`, `infra:repair`, `db:migrate`, `db:baseline`, `db:reset:test`, `test`, `test:fast`, `test:db`, `test:auth`, `test:stories`, `test:focus`, `format:check`, `lint`, `typecheck`, `build`, `repo:brief`, `chamber`, `chamber:reset`, `chamber:packet`, `chamber:memory-packet`, `chamber:memory-comparison-packets`, `chamber:memory-evaluation-packet`, `chamber:memory-evaluation-run`, `chamber:evaluation-packet`, `story:local`, `story:server`, `story:play`, and `storyteller:packet-audit`. `apps/web/package.json` contains `dev`, `typecheck`, `test:watch`, and `test:fast`. `apps/worker/package.json` contains `start`. `apps/api/package.json` contains `schema:generate` and does not depend on Playwright. `packages/db/package.json` contains `generate`, `migrate`, and `test:integration`. `tools/api-integration/package.json` contains `test:auth`, `test:stories`, `test:stories:core`, `test:stories:http`, `test:stories:browser`, `test:storyteller`, and `playwright`. `tools/chamber/package.json` contains `start`. Launcher flags used by the moved commands are in `tools/chamber/src/modes/cli-flags.ts`. `scripts/repo-tools/story-play.mjs` requires `--confirm-live` for billable actions.

`pnpm test:focus -- --help` printed usage and exited 0. It listed the suites and stated that the command recreates only `offscreen_auth_test`. No suite, database reset, infra command, browser install, or paid command was executed. `pnpm chamber:evaluation-run` exists in `package.json` and was not added, because this page did not previously document it.

## Checks

`git rev-parse --short HEAD` returned `b3113814`. No executable file was modified. Code is unchanged. WIKI16 create and split recognition is the shape-ops parser in `scripts/repo-tools/wiki-core/change-guard.mjs`. Scoped plan and close were run for this packet only, because the worktree contains other packets' edits.

No automatic next packet. Stop at any new product policy, staff permission, legal retention rule, provider spend or incompatible source owner that requires an independent decision.
