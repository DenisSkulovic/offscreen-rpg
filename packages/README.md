# Monorepo package organization

**Standing:** selected E1 organizational convention, not implementation evidence. R10 candidate `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe` was independently DEFENDED. [Agent Core technical contract and outstanding proof](../docs/technical/platform/agent-core.md). No existing package relocation, split, rename, production consumer or activation is authorized by this map.

## Organization and E1 migration boundary

Use `packages/<family>/<leaf>/` with one family level and short globally unique `@offscreen/<name>` workspace identities; family directories are navigation, not workspaces, dependency permissions or deployment boundaries. The five families are domain (product behavior), ai (reusable inference and agents), commerce (entitlement/spend/settlement), platform (shared application services), foundation (lower-level technical mechanisms). Apps and tools remain their own root families.

Retain `packages/*` and add the five explicit `packages/<family>/*` workspace globs. Activate only `packages/ai/agent-core`; all existing flat paths and package identities remain. AC03 source created those globs, the `@offscreen/agent-core` manifest, and the five README leaves. AC08 compiled `@offscreen/agent-core` and ran its offline package tests. Joint proof and live qualification remain NOT RUN. The five new README-only candidates are `ai/inference`, `ai/model-routing`, `ai/ai-providers`, `domain/library`, `foundation/document-versioning`; no manifests, source, exports or dependencies for placeholders. A family itself must not have a package manifest. No duplicate workspace names. Physical relocation requires later path/build/migration/rollback audit. Existing app runtime/build closures must not change in E1; dev image copy/install of all packages is not equivalent to a production closure.

## Existing flat packages and possible placement

The inventory below is the 23 flat workspaces observed at the reviewed baseline, not a move order. Verify source before any relocation.

| Family | Existing flat packages |
| --- | --- |
| domain | admin, admin-interface, content-packages, game, game-authority-protocol, story-engine, story-interface, story-persistence, storyteller |
| ai | none yet; Agent Core new |
| commerce | usage-policy |
| platform | identity-interface, identity-persistence, lab-interface, lab-support, outbox, runtime-logging, workflows |
| foundation | cache, cache-port, config, db, documents, object-storage |

## Longer-term responsibility candidates

Only the E1 activation is selected. Candidate names and splits are hypotheses, not implementation assignments. Existing `documents`, Storyteller, usage-policy and other owners remain authoritative until separately accepted migrations.

| Family | Candidate package | Status | Owns | Excludes |
|---|---|---|---|---|
| domain | admin | Candidate | Staff workflows and explicitly scoped administration | Implicit omnipotent access |
| domain | content-packages | Candidate | Authored world/rule content import and provenance | Generic revision engine |
| domain | game | Candidate | Deterministic game rules and mechanics | Inference, account billing |
| domain | library | Candidate strongly supported by owner | Governed collections, paths, roots, visibility, mounts, document revision references | Generic revision algorithms, game authority |
| domain | story-engine / story-authority | Candidate, boundary open | Campaign lifecycle, scene/clock/history/fork/publication authority | Generic AI execution |
| domain | storyteller | Candidate | Creative behavior, domain prompts, skills, mission definitions, domain tools | Generic loop, authoritative world mutation |
| ai | agent-core | Direction | Generic mission execution, context, tool lifecycle, loop, delegation, bounded execution semantics | Story fiction, storage adapters, billing, concrete provider wire protocols |
| ai | ai-providers | Candidate | Provider protocol adapters, request encoding, normalization, streaming and error semantics | Mission policy, subscription decisions |
| ai | inference | New R3 candidate | Reusable guarded inference execution, attempt custody coordination, result normalization orchestration for agent and direct calls | Agent loop, route catalog, provider protocols, commercial ledger authority |
| ai | model-routing | Direction to separate concern; name provisional | Catalog, model/route capability, eligibility and selection for text/image/video etc. | Agent loop, provider request dispatch, granting money |
| commerce | billing | Candidate | Plans, invoices, subscriptions, payments and commercial settlement | Agent execution or provider retry policy |
| commerce | entitlements | Candidate | Account feature/model eligibility | Actual spending custody |
| commerce | usage-metering | Candidate | Attributed usage facts, normalized units and reconciliation inputs | Authorizing spend, commercial charges |
| commerce | usage-policy | Candidate | Limits, funding grants, reservation and settlement authority; ledger ownership to refine | Payment processing, creative settings |
| platform | identity/access | Candidate family | Principals, tenancy, membership, access policies | Creative profile or provider selection |
| platform | notifications | Discovery candidate | User-facing event delivery and preferences | Agent authority |
| platform | observability | Candidate | Shared tracing/metrics/log conventions, correlation and redaction | Authoritative execution or financial ledger |
| platform | search/retrieval | Discovery candidate | Generic indexing, query and ranking mechanisms if warranted | Library visibility policy, canonical facts |
| platform | workflows | Candidate | Durable orchestration integration; Temporal boundary open | Duplicate execution truth |
| foundation | cache | Outside core | Reusable cache infrastructure | Authoritative agent state or policy |
| foundation | document-versioning | Direction | Structured JSON content, revision identities, reconstruction, change operations, Markdown serialization/rendering | Library membership, campaign history, authorization, storage selection |
| foundation | object-storage | Candidate | Storage adapter and integrity/error contract | Library semantics |
| foundation | persistence / db | Candidate family | Connection/migration infrastructure; domain schema ownership remains open | Domain business decisions |

## Known limitations and next triggers

Mixed flat/grouped discovery must work in pnpm/Turbo, image closure, dev sync and repository source/knowledge checks. See [repo tooling findings](../scripts/repo-tools/README.md); proof remains NOT RUN until maintained E1 qualification. Existing fixed database and domain paths are intentionally preserved. Future package moves require source-grounded compatibility and ownership audit. No speculative split, global rename or second active workspace for an existing identity. Preserve [existing execution](../docs/technical/platform/execution-and-delivery.md), [canonical documents](../docs/technical/storyteller/canonical-documents-and-packages.md), and [spending](../docs/technical/platform/spending-and-entitlements.md) authority.

**E1-IR-M01 (Medium; focused classifier proof observed, joint qualification NOT RUN):** `requiresFullImageRebuild` now treats a flat leaf manifest and `packages/(domain|ai|commerce|platform|foundation)/<leaf>/package.json` as a full-image rebuild, including a deleted path, and rejects grouped source, a README-only placeholder, an unrelated deeper manifest and an unknown family. AC01 focused tests cover that classifier together with grouped image closure and dev sync. Real application closure comparison and source-based release guards remain with AC08. No grouped production package is activated by this record.
