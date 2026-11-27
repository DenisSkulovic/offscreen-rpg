# Post-MA06A modular-monolith architecture audit and selected direction proposal

**Status:** Open design / architectural planning, **not** implementation authority or a Cursor-ready Change. **Source baseline:** uploaded source snapshot `e122d080677263aa6f38961f8734713664827c55` on `undertaking/storyteller-workshop`; GitHub planning-only commits subsequently advanced the integration branch. **Owner:** ChatGPT planner and undertaking supervisor. **Next review:** after MA07 direct-host migration and WR09 provider runtime decisions, before commissioning architectural seam refactors. No tests/builds run as part of this static audit.

**Authority:** [Existing ownership Design](MONOREPO-MODULE-OWNERSHIP.md) (proposed options) · [selected engine target](../../../../docs/technical/engine/selected-architecture.md) · [modular-monolith undertaking](../../../undertakings/modular-monolith/UNDERTAKING.md) · [combined completion ledger](../../../undertakings/storyteller-workshop/UNDERTAKING.md). This audit does not silently ratify alternative package names.

## Summary / assessment

MA01–MA06A were genuine structural progress: cache port inversion, Admin extraction, Story Authority transaction relocation, outbox lowering, and a coherent move of 134 live implementation modules out of Application. **They did not finish modular-monolith design.** The MA06A compromise placed mutually coupled Stories, Campaign, Generation and Writer runtime in one `@offscreen/story-engine` workspace with compatibility exports. A green package-level acyclic graph alone cannot establish an internally layered engine.

After MA06A, `@offscreen/application` is **not** the large implementation dumping ground it had been. It is mostly a misleading facade with developer tooling. The principal architecture debt has migrated into `story-engine`, especially Writer capture/publication and authority-to-Writer callbacks. We must not confuse a renamed collection with a finished bounded-context architecture.

## Measured source inventory

| Workspace | TS modules | Sum of TS source bytes (KiB, rounded) | Primary content |
| --- | ---: | ---: | --- |
| `@offscreen/story-engine` | 160 | 1,533 | Stories 415; Campaign 240; Storyteller 854; Generations 24 |
| `@offscreen/application` | 179 | 393 | Developer tools ~376; compatibility + drafts + outbox relay + logging ~17 |
| `@offscreen/storyteller` | 40 | 383 | Prompt, task, provider and response contracts |
| `@offscreen/contracts` | 24 | 171 | Shared DTOs and validation |
| `@offscreen/documents` | 16 | 119 | Immutable-document model and stores |
| `@offscreen/admin` | 13 | 100 | Staff domain |

Application has 136 source files consisting of a single `export * from ...` (34 campaign, 30 stories, 63 storyteller, 7 generations, plus admin/cache). Developer tools contain 39 nonforwarding modules and ~95% of Application source bytes. The old API shape remains misleading and has real import consumers, so merely deleting forwarders is unsafe.

**Method limitations:** sizes/counts use the uploaded source files, excluding generated output; module edges below were extracted from relative import/export specifiers with path resolution, including potential type-only edges. This is a useful static diagnosis, **not** an AST-classified runtime graph/test pass. Before enforcement, run the repository's AST `pnpm repo:module-graph` from an actual Git checkout with dependencies, inspect type-only versus runtime cycles and verify export consumers.

## Actual internal source coupling

A first-pass resolved-relative-file graph of the 160 Story Engine TS modules contains 381 edges and three nontrivial strongly-connected components:

1. **5 modules crossing Generations and Storyteller:** `generations/{index,scripted-openings}.ts`, `storyteller/{dispatch-review,openings,records}.ts`. Resolve semantic ownership of generation service vs Writer review and remove the cross-domain cycle when doing the subsequent seam change.
2. **3 Writer custody modules:** `storyteller/{writer-child-custody,writer-mission-custody,writer-mission-store}.ts`. Investigate with WR09 because arbitrary reshuffling can break shared funding/attempt locks.
3. **2 campaign execution modules:** `campaign/{action-executions,narrative-intent-settlement}.ts`. This is an internal authority-level cycle; review with the authority refactor, not a fresh package split.

More architecturally significant than those SCC counts are direction violations:

- `stories/resolution.ts` directly imports `storyteller/admission.ts:prepareStorytellerResolution`; the existing `createStoryResolutionCore` already accepts preparation as injected collaboration. **Candidate correction:** move this final wiring to a single outer composition root, so authority core never imports Writer preparation.
- `campaign/narration.ts` imports `storyteller/context-capture.ts` and `storyteller/capture-materialization.ts`. `campaign/reports.ts` calls `captureHistoricalReport`. These are writer-capture dependencies initiated within authoritative campaign flows. **Candidate correction:** freeze authority-owned durable facts/notice during the existing transaction; have the Writer adapter create/materialize context outside the lock through existing identity and notice fences. Do not replace them with post-commit untracked work or lose exactly-once reports.
- Conversely, `storyteller/{publication,writer-continuation-publication,launch-publication}.ts` uses Story Authority publication/persistence APIs. This may be correct if write attempts pass through the existing authoritative, fenced transaction. Moving files because of these imports would add no integrity.
- `stories/index.ts:createStories` is a broad factory composing Stories, Campaign, Storyteller retry, narration and policy. A broad outer composition root is legitimate, but it should not mask an authority module importing Writer internals.
- The large Writer modules `storyteller/context-capture.ts` (3,078 lines), `capture-materialization.ts` (~1,597), `writer-research.ts` (~1,311), `execution.ts` (~1,163), `publication.ts` (~1,009), `writer-mission-custody.ts` (~1,006) and `budget.ts` (~988) require responsibility-based review. File size is a hotspot signal, **not** evidence to slice them mechanically.

## External consumers of Application (baseline before MA07)

Source-specifier scan across `apps`, `packages`, `tools`, `scripts` found the old Application domains used by production API / Game Authority / Worker and integration/chamber tools. MA07 owns bulk production-domain import migration and targeted import guard, **not** forwarder deletion.

Other Application consumers, needing distinct owners: `developer-tools` is imported by API developer/QA/chamber controllers and test tools; `drafts` by API and integration tests; `outbox` by Worker relay/runtime and integration tests; `runtime-logging` by service bootstraps; `cache` by API; `admin` by test/integration tooling. Deleting `application` before moving these actual owners would break the repo.

## Target architecture recommendation, subject to owner ratification

**Keep one coherent Story Engine modular monolith unless a proven cross-package boundary adds real value.** Avoid re-creating the original proposed `story-authority` + `storyteller-runtime` packages merely as a visualization. Enforce strong *internal* ownership first:

1. **Story Authority module (one transactional domain):** stories, campaign, world clock, action execution, holds, accepted plans, authoritative documents, scene snapshots, history, forks and versioned publication. Transaction/lock/CAS and permissions belong here. Stories/Campaign may coordinate directly within authority.
2. **Writer Runtime module:** generation/Writer capture, model steps, context materialization, private Workdesk, research children, source-verified proposals, provider custody and recovery. It reads authority via bounded read/capture ports, and invokes explicit authoritative commands for publication. It does not directly mutate story/campaign state through arbitrary SQL.
3. **Pure low layers:** `@offscreen/game` deterministic mechanic policy; `@offscreen/contracts` DTOs and stable neutral ports; `@offscreen/storyteller` versioned model/task/proposal/tool grammar and provider adapter; `@offscreen/documents` immutable objects/Library; `@offscreen/db` schema, transaction and outbox primitives. Do not make Contracts import Writer runtime or allow provider adapters to write game state.
4. **Outermost hosts:** API, Game Authority and Worker create and inject collaborators, authorize actors, wire durable workflows and carry transport/secret configuration. Authenticated player commands never bypass Game Authority. A provider round never obtains an alternate game clock.
5. **Developer tooling outermost:** Chamber, forensic rigs, QA harnesses, sandbox DB and scripted fixtures may import engine APIs; production authority may not import them. The API's explicitly gated developer endpoints are a composition capability, not a dependency from Story Engine into a lab.

**Package end state:** `@offscreen/application` should no longer be a production package/facade when all actual callers are retired; new package count is deliberately **not decided**. Prefer existing owners for small functions (`@offscreen/db` for outbox leasing, engine or API ownership for drafts, host-neutral existing runtime home for logging) after inspecting exact reverse dependencies. `developer-tools` may merit a dedicated lab-support workspace because it is large and genuinely one-way; prove API gating and dependency direction first. Do not manufacture an `@offscreen/platform` junk drawer.

**API end state:** explicit, narrow subpath exports/entrypoints for stable ports and host composition, not an unbounded wildcard surface that exposes storage internals, test-only helpers, or every internal file. Keep an internal module allowed to import private helpers without forcing all helpers public. Don't remove a public path until all known consumers/tests are migrated.

## Prioritized execution program, substantial outcomes

| Stage | Outcome | Proposed Change size | Precondition / shared owner |
| --- | --- | --- | --- |
| **MA07** | Direct `apps/{api,game-authority,worker}` production-domain imports to Story Engine, add ratchet | **One bulk Change, already READY** | In progress independently; only MA07 parent writes its files |
| **MA08: retire Application facade and isolate lab support** | Migrate remaining tools/tests and legitimate non-domain facilities to decided owners; prune 136 forwarders and remove obsolete package exports/dependencies only after exact reverse-consumer graph is empty; Developer tooling cannot leak into authority | **One or two coherent bulk Changes, NOT YET READY** | MA07 landed; freeze host/test consumer map; avoid concurrent `package.json`/lockfile owners with WR09 |
| **MA09: invert authority-to-Writer edges** | Resolve `stories/resolution.ts` composition and campaign narration/report → Writer capture coupling with exact SQL/notice/replay contracts and at least one real negative fault test per seam | **One substantial behavioral architecture Change, NOT YET READY** | WR09 contract integrated or frozen; map original transactions and caller test fixtures first |
| **MA10: Story Engine public boundaries and graph enforcement** | Narrow exports, enforce module-level import law and allowed dependency directions, resolve material runtime SCCs; source-health for large classes by responsibility only | **One coherent enforcement/cleanup Change, NOT YET READY** | MA08/MA09 landed; check actual AST runtime/type edges |
| **Undertaking closure** | Integrated scripted and approved live-provider proof; full product/financial/permission/long-form negatives; docs/STATUS/overview truthful; clean `main` landing | **One joint release gate** | No outstanding critical blockers and explicit owner authorization for any paid tests/privileged operations |

**Parallelism:** after MA07, Writer development and lab-support migration may be separable at source level, but both can edit manifests/lockfile and integration documents. One integration custodian serializes these files; never announce blind parallel safety.

**Reason to sequence this way:** runtime behavior still moves under WR09. Inverting campaign Writer-capture seams concurrently risks changing the very transaction/attempt recovery protocol being finalized. First stabilize executable functionality, then perform architectural enforcement in cohesive batches rather than tiny mechanical purity patches.

## Architectural acceptance, not just package movement

- Authoritative mutations stay behind Game Authority, story locks, version/expected-root, permission and idempotency checks. Writer and providers cannot create a second write path.
- No production authority or pure package imports developer fixtures/harness. Host composition is the only bridge.
- No production host or tool relies on obsolete Application forwarders when Application retirement is claimed; actual reverse-dependency scan and build prove deletion.
- Stable module direction is checked by source-level AST including runtime/type-only distinctions, explicit relative-path escapes and deep package exports. Zero **forbidden** cycles; don't treat every intra-Authority collaboration as a violation.
- Worker, API, GA, story-engine and integration tests cover old consumers and negative actor, stale root, transaction rollback, research isolation, provider uncertain and no-double-spend paths.
- Public package exports are deliberately owned, not `./*` forever; generated declarations and NodeNext runtime imports checked.
- Only after joined product proof, final architecture report and docs reconciliation may the undertaking land in `main`.

## Current readiness judgment

**MA07 ready; MA08–MA10 design candidates, NOT Cursor-ready.** This is not ceremonial caution: MA08 needs a verified complete consumer/export manifest, MA09 needs the exact SQL and outbox design of authority/Writer inversion, and MA10 depends on those selected boundaries. The architecture decision itself should be ratified in the relevant permanent technical owner before the first behavior-changing MA09 commission. Planner must produce exact SOURCE-MAP / EXECUTION / PROOF / bounded TASKS and independent G0–G7 for each selected Change, not ask Cursor to discover those choices.
