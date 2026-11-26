# Preliminary monorepo package map | R1

All names below are provisional. **Direction** means an owner-stated separation; **candidate** means a planner hypothesis, not approved package creation. A row may represent a module rather than a separate workspace after review. No implied dependency edges.

| Area | Candidate package | Status | Owns | Excludes |
|---|---|---|---|---|
| Agent runtime | agent-core | Direction | Generic mission execution, context, tool lifecycle, loop, delegation, bounded execution semantics | Story fiction, storage adapters, billing, concrete provider wire protocols |
| Documents | document-versioning | Direction | Structured JSON content, revision identities, reconstruction, change operations, Markdown serialization/rendering | Library membership, campaign history, authorization, storage selection |
| Knowledge | library | Candidate strongly supported by owner | Governed collections, paths, roots, visibility, mounts, document revision references | Generic revision algorithms, game authority |
| AI | model-routing | Direction to separate concern; name provisional | Catalog, model/route capability, eligibility and selection for text/image/video etc. | Agent loop, provider request dispatch, granting money |
| AI | ai-providers | Candidate | Provider protocol adapters, request encoding, normalization, streaming and error semantics | Mission policy, subscription decisions |
| Commerce | entitlements | Candidate | Account feature/model eligibility | Actual spending custody |
| Commerce | usage-policy | Candidate | Limits, funding grants, reservation and settlement authority; ledger ownership to refine | Payment processing, creative settings |
| Commerce | usage-metering | Candidate | Attributed usage facts, normalized units and reconciliation inputs | Authorizing spend, commercial charges |
| Commerce | billing | Candidate | Plans, invoices, subscriptions, payments and commercial settlement | Agent execution or provider retry policy |
| Platform | observability | Candidate | Shared tracing/metrics/log conventions, correlation and redaction | Authoritative execution or financial ledger |
| Product | storyteller | Candidate | Creative behavior, domain prompts, skills, mission definitions, domain tools | Generic loop, authoritative world mutation |
| Product | game | Candidate | Deterministic game rules and mechanics | Inference, account billing |
| Product | story-engine / story-authority | Candidate, boundary open | Campaign lifecycle, scene/clock/history/fork/publication authority | Generic AI execution |
| Platform | identity/access | Candidate family | Principals, tenancy, membership, access policies | Creative profile or provider selection |
| Platform | persistence / db | Candidate family | Connection/migration infrastructure; domain schema ownership remains open | Domain business decisions |
| Platform | object-storage | Candidate | Storage adapter and integrity/error contract | Library semantics |
| Platform | cache | Outside core | Reusable cache infrastructure | Authoritative agent state or policy |
| Platform | workflows | Candidate | Durable orchestration integration; Temporal boundary open | Duplicate execution truth |
| Product | content-packages | Candidate | Authored world/rule content import and provenance | Generic revision engine |
| Product | admin | Candidate | Staff workflows and explicitly scoped administration | Implicit omnipotent access |
| Product | notifications | Discovery candidate | User-facing event delivery and preferences | Agent authority |
| Platform | search/retrieval | Discovery candidate | Generic indexing, query and ranking mechanisms if warranted | Library visibility policy, canonical facts |

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
After owner review, create README-only proposed package directories for clear new boundaries through the proper scoped Change. Each README: purpose, owns, excludes, example consumers, candidate dependency direction, unresolved decisions, status (placeholder only). Existing names are not overwritten; compare historical package and target responsibilities, then decide reuse/rename/retire later. No package.json, exports, source stubs, dependency installs or build changes merely to mark a candidate. Keep tentative discovery rows in this map until they justify a package. The map is intentionally incomplete and grows with product/platform investigation.

## Prior authority to reconcile
docs/technical/storyteller/canonical-documents-and-packages.md already separates document representation and Library membership; historical roots, source rights, and immutable publication must survive any replacement. docs/technical/platform/spending-and-entitlements.md distinguishes capability entitlement, funding allowance, task recipe and usage windows; fail-closed dispatch and uncertain-attempt custody remain required. Existing code-architecture-health design must be reconciled before promotion, not silently replaced.
