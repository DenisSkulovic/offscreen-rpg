# Preliminary monorepo package map | R2

All names below are provisional. **Direction** means an owner-stated separation; **candidate** means a planner hypothesis, not approved package creation. A row may represent a module rather than a separate workspace after review. No implied dependency edges.

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

## Organization convention R2

Owner-selected for this workshop on 2026-11-27. Prefer grouping directories to flat alphabetic packages or family-prefixed names. The hierarchy is `packages/<family>/<package>/` with exactly one organizational family level; grouping directories are not workspaces. Use a single npm scope and short, globally unique names, e.g. `@offscreen/agent-core`, regardless of physical location. No numeric ordering, family prefixes, additional npm scopes, or package-inside-package structure. A family directory is a navigation aid, not a dependency permission or deployment unit. Dependency constraints must later be explicit and independently verified.

Illustrative target tree (package existence/names remain provisional):

```text
packages/
  domain/
    admin/
    content-packages/
    game/
    library/
    story-engine/        # story-authority naming/boundary open
    storyteller/
  ai/
    agent-core/
    ai-providers/
    model-routing/
  commerce/
    billing/
    entitlements/
    usage-metering/
    usage-policy/
  platform/
    identity/            # access boundary open
    notifications/
    observability/
    search/              # retrieval boundary open
    workflows/
  foundation/
    cache/
    db/                  # persistence boundary open
    document-versioning/
    object-storage/
    config/              # provisional existing cross-cutting foundation
```

Family meanings: domain = product behavior and authoritative domain capabilities; ai = reusable inference/agent machinery; commerce = entitlement, spending and commercial settlement; platform = shared application-level services; foundation = lower-level technical mechanisms. Classifications are revisable as responsibilities become clearer; do not create an empty family merely for symmetry. Apps and tools remain separate root families.

Illustrative future pnpm workspace configuration, NOT applied:

```yaml
packages:
  - apps/*
  - packages/domain/*
  - packages/ai/*
  - packages/commerce/*
  - packages/platform/*
  - packages/foundation/*
  - tools/*
```

Current main `1bf121b488b798f57d1f9f0d738d0f6ba0ce4f11` still has `packages/*` in pnpm-workspace.yaml. No migration is commissioned. Before moving existing packages, inspect workspace discovery, Turbo task graph, TypeScript project references and exports, lockfile, Docker/build contexts, verification and repo-maintenance scripts, CI, documentation links and any fixed paths. Preserve package identities and behavior unless a separately reviewed change selects a rename or retirement. README-only placeholders should use the intended grouped paths, with no manifests until actual workspace activation is authorized. If a flat historical workspace has the same prospective identity, do not create a second active package. Official reference points for later tooling verification: [Turborepo repository structure](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository), [pnpm workspace configuration](https://pnpm.io/pnpm-workspace_yaml), [npm scopes](https://docs.npmjs.com/cli/using-npm/scope). No migration/build proof claimed.

## Apps are composition roots, not package boundaries
Existing api, web, worker, game-authority app manifests are factual baseline only. Candidate host responsibilities: HTTP/session boundary, UI, computation/orchestration, authoritative game operations. A package does not require its own Pod or network service.

## Dependency hypotheses
- Library can consume generic document versioning; inverse dependency forbidden by purpose.
- Storyteller composes generic agent execution and domain-specific tools/knowledge; Agent Core must not import Storyteller or game rules.
- Direct AI requests and agents can use the same model matching/provider mechanisms, potentially through a higher-level composition root. Avoid prematurely universalizing modality request types.
- Entitlement, routing, budgeting, metering, billing have different meanings; final package count and transaction ownership open.
- Telemetry semantics emitted by domains, exporter lifecycle owned by host; usage ledger is not telemetry.
- Persistence/Redis/S3/Temporal remain outside generic execution semantics; no database or queue selection implied.

## Placeholder plan (not executed)
After owner review, create README-only proposed package directories under the selected `packages/<family>/<package>/` convention for clear new boundaries through the proper scoped Change. Each README: purpose, owns, excludes, example consumers, candidate dependency direction, unresolved decisions, status (placeholder only). Existing names are not overwritten; compare historical package and target responsibilities, then decide reuse/rename/retire later. No package.json, exports, source stubs, dependency installs or build changes merely to mark a candidate. Keep tentative discovery rows in this map until they justify a package. The map is intentionally incomplete and grows with product/platform investigation.

## Prior authority to reconcile
docs/technical/storyteller/canonical-documents-and-packages.md already separates document representation and Library membership; historical roots, source rights, and immutable publication must survive any replacement. docs/technical/platform/spending-and-entitlements.md distinguishes capability entitlement, funding allowance, task recipe and usage windows; fail-closed dispatch and uncertain-attempt custody remain required. Existing code-architecture-health design must be reconciled before promotion, not silently replaced.
