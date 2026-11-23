# SEM01 | Repository-wide semantic debt and architectural comprehensibility inventory

**State: PROPOSED BACKLOG / PLANNER-HELD. NOT Cursor-ready.** **Owner:** ChatGPT architecture investigation with human decisions. **2026-11-23 trigger:** human source review identified historical packet IDs and ambiguous `lab` ownership leaking into permanent software paths. **Baseline checked:** `undertaking/storyteller-workshop@36cbdda5`; this records the desired audit, **not a completed repo-wide finding**. **Do not interrupt the active TURN03 R2A/R2B code or mutate the user's dirty checkout.**

## Why this is a distinct issue

The repository has been built rapidly through many AI-produced Changes. Passing tests, narrow source owners and readable classes do **not** prove that the long-lived software vocabulary, package boundaries and runtime complexity make sense to a new engineer. Names tied to temporary Change IDs or conversational history may be acceptable in **archived Change packets and bounded test evidence**, but not necessarily in reusable production modules, interfaces or developer entrypoints. Ambiguous terms (`lab`, `application`, `service`, `manager`, `adapter`, `runtime`) require source-based definitions, not blanket search-and-replace. Some are legitimate architectural concepts; others may be historical residue.

**Related but not duplicate:** [existing code architecture health investigation](../../../../designs/open/code-architecture-health/README.md), [monorepo ownership design](../../../../designs/open/code-architecture-health/MONOREPO-MODULE-OWNERSHIP.md), and [INF01–INF05 platform restructuring proposals](../platform-operations/INFRA-RESTRUCTURE-PLAN.md). SEM01 owns the *whole-repository semantic/architectural comprehensibility inventory and prioritization*, not implementation of their specific already-owned source restructuring. Link/de-duplicate findings instead of creating parallel competing standards.

## Inventory required (actual source, not prose-only opinions)

| Dimension | Questions and initial concrete candidates |
| --- | --- |
| Historical identifiers leaking into software | Identify all `TURNxx`, `DXKxx`, `WRxx`, `HRxx`, `MAxx`, and similar Change-code names in production code, CLI, test harnesses, config, API types and package names. Distinguish **temporary evidence that should retain a historical ID** from reusable assets that should speak in domain terms. Current candidate: `infra/kubernetes/lab/app-release/turn03/{trace-route,fixture-pins,live-http}.mjs`; may be appropriate as a one-off acceptance fixture but requires an explicit lifetime/retirement rule |
| Vocabulary and naming ownership | Define precisely what `lab`, `application`, `storyteller`, `game authority`, `workshop`, `worker`, `executor`, `controller`, `runtime`, `engine` mean, where they are allowed, and where they mislead. Inspect definitions, importers and runtime behavior before classifying |
| Package/domain graph | Compare real import graph and runtime assembly to declared ownership, identify ambiguous packages, cyclic/cross-domain leaks, unnecessary layering and misleading directory organization. Reuse `pnpm repo:module-graph` and existing modular-monolith design; don't substitute naming opinion for graph evidence |
| Abstraction inflation | Search for redundant facades, pass-through utilities, duplicate schema wrappers, unnecessary adapters/interfaces, unneeded registries or multiple owners for the same lifecycle. For each suspected duplicate, trace actual callers and failure/permission/transaction invariants before recommending removal |
| Code readability and maintainability | Inspect semantic phase boundaries, comments, nesting, opaque control flow, huge files, generated boilerplate and mixed responsibilities. New scan-first narration rule should improve *touched* algorithms; it is not a substitute for code structure |
| Infrastructure proportionality and environment boundaries | Trace real distinction between disposable verification cluster, developer environment, release overlay and production deployment. Identify overlapping startup paths, duplicated manifests/secrets/image workflows and names that hide which environment owns data. Cross-reference INF01–INF05 and DXK10-B/C |
| Historical/dead residue | Find obsolete scaffolding and compatibility paths, stale docs that still describe completed Changes as open, unused exports, zombie test-only entrypoints and old integration knobs. Check live/import/CI use before proposing deletion |

## Required report and triage contract

1. **Prepare a dated, source-grounded inventory**, with actual integration SHA, paths/symbols, callers, dependents, tests, operational environment and exact reason each item is confusing or harmful. Use at least one independent check where a proposed "dead" path may have runtime/CLI consumers. No blanket regex rename.
2. Each finding gets **classification** (`semantic misnomer`, `ownership defect`, `redundant abstraction`, `dead residue`, `legitimate intentional complexity`, `not yet established`); **impact** on comprehension, correctness and paid-agent investigation; **risk** to auth, money, tenancy, persistence or lifecycle; **recommended owner** and smallest safe correction; **disconfirming evidence**.
3. Produce a **human-first map** of the *real current monorepo*: package dependency graph, main player/write flows, runtime environment topology and the historical-versus-permanent code nomenclature. A new developer should be able to find the owner and consequences of a feature without reading archived Change IDs.
4. Rank at most **five** corrections as candidate follow-up Changes using severity, affected surface, risk, frequency and expected reduction in future agent/human confusion. Distinguish renaming-only work from architectural moves with interface/migration effects. Deduplicate against CQ/MA/INF/DXK work.
5. **No implementation by SEM01's initial audit.** Ratify canonical vocabulary / ownership definitions in one permanent technical/architecture home only after evidence and human review. Then authorize small, source-mapped implementation Changes serially or on disjoint branches with before/after import/API/runtime proofs. Don't create dozens of speculative Cursor packets.
6. **Stop conditions:** Source access incomplete; dirty/unmerged implementation makes an inferred path untrustworthy; evidence of a security/transaction boundary would be disturbed. Record uncertainty and defer, never improvise a rename over a live workflow.

## Acceptance for the audit itself (not executed yet)

- 100% of current top-level app/package/tool/infra domains inventoried by their **actual path and owner**; representative bounded review of critical implementation interfaces, not literal inspection of every source line.
- Exact categories and source-backed examples for naming pollution, package topology, abstraction debt, doc drift and infrastructure meaning. At least one candidate **rejected as legitimate** to avoid a negative-only audit.
- Separate inventory of packet-ID-bearing names in **ephemeral proof artifacts** versus **durable implementation**, with explicit retention strategy. If `turn03` is intentionally a one-off acceptance fixture, preserve or retire with that proof rather than reflexively rename.
- One scored, prioritized shortlist and no duplicate ownership with existing code-health and INF proposals.
- Reproducible read-only scan commands and source SHA; results labeled measured / inferred / not inspected. No claims that today's audit was run.
- Human-readable diagrams and navigation map. No unauthorized production refactors, migrations, blanket formatting, test deletion or live cluster actions.

**Scheduling:** after current TURN03 source-only adapters land and the selected distributed product-proof milestone is stable enough for honest source attribution. The human may select an earlier read-only inventory; not permission for Cursor to refactor today. **Retirement:** archive SEM01 only after findings have been reconciled into one maintained canonical architecture vocabulary/ownership owner and specific changes are queued or explicitly rejected.
