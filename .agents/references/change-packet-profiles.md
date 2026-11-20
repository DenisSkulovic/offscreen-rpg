# Change packet profiles | planner-grade research, executor-grade route cards

**Status:** agent-process standard, 2026-11-19. Applies to future authoring and incremental upgrades of **open** high-risk Changes; does not rewrite archived history. Complements [Change work-unit standard](change-work-unit-standard.md), [planner investigation](planner-investigation-standard.md), [Cursor budgeting](cursor-model-budget-policy.md) and [Cursor handoff](../skills/cursor-handoff/SKILL.md). It does **not** ratify gameplay, schema, provider spend, or deployment.

## Principle

The expensive model (ChatGPT planning role) performs wide source reading, investigates hidden couplings, chooses boundaries, evaluates alternatives, and leaves **durable, verified, compressed execution knowledge**. The cheaper executor (Cursor) checks the live tree, performs the selected diff, runs relevant proof, and escalates contradictions. **Do not turn 30 KB of research into a mandatory 30 KB Cursor preload.**

The value metric is accepted correct work per total spend, including rework and human inspection, not raw model token count. WIKI18 owns any empirical cost claim. Never invent savings.

## Two axes; do not invent a third Change kind

**Authority/delta kind** (existing): `documentation` or `implementation`. A pure audit/evaluation/research exercise is **not** an implementation Change. Its observations belong in a design/evidence owner until converted into a bounded diff.

**Packet profile** describes *what evidence is necessary*, not a new lifecycle or automatic permissions:

| Profile | Use when | Typical extra files | Executor primary role |
| --- | --- | --- | --- |
| `PATCH` | One narrow correction; known owner and tests; low fanout | none | `PATCH` |
| `CONTRACT` | Cross-package wire, trust, schema or API ownership | `SOURCE-MAP.md`, optionally `EXECUTION.md` | `PATCH` plus one bounded reviewer at join |
| `STATE` | Persistence, idempotency, workflow, replay, fork, payment/provider custody | `SOURCE-MAP.md`, `EXECUTION.md`, `PROOF.md` if complex | `PATCH`, `VERIFY` after |
| `RELEASE` | Multi-image orchestration, secrets, migration, network, cluster lifecycle | `SOURCE-MAP.md`, `EXECUTION.md`, `PROOF.md` | One `INTEGRATE` coordinator; cluster serial |
| `PROOF` | Executable test/harness delta for a falsifiable acceptance outcome | `PROOF.md` (test matrix); `SOURCE-MAP.md` only if source fanout large | `VERIFY` or narrow `PATCH` |
| `DOC` | Material change to canonical spec or agent system without executable delta | `EXECUTION.md` only if a nontrivial editorial migration | Documentation editor |

`INTEGRATE` here is a **coordination duty**, not a new Cursor agent or a model class. Existing `DEPTH=VERIFY|PATCH|INVESTIGATE`, role catalog, model policies and hard permission rules remain the actual routing contract. A declared `RELEASE` does not grant K8s writes, migration resets or subagent launches.

### The executor's real unit is a microtask

For a multi-file implementation Change, the planner should additionally prepare [Composer-first microtasks](composer-first-execution.md) in an optional `TASKS.md`. This file is a **short dispatch queue**, *not* another Change, approval or canon. T01–Txx contain exact symbols and ownership, settled algorithm, normal/negative tests, stop and receipt, preferably one small diff each. A large STATE/RELEASE Change should not be assigned wholesale to a Grok child just because the architecture is complicated; the planner splits it into Composer-sized tasks. `CHANGE.md` still owns lifecycle/selection; TASKS never mark Proposed work automatically Ready.

The current source-backed examples are BOOT03, STORY02, STORY03, TURN02 and K8S10. Each task's source baseline is 584b594 and must be revalidated against a newer checkout before execution. Composer should be the parent model as well as the usual child model; the agent config and hook cannot change Cursor's parent UI.

## Files and ownership

`CHANGE.md` is **always the sole mandatory front door**, ideally one screen of live route data before historical detail. Use the existing standardized template. Include:

- ID, state, kind, profile, baseline SHA, execution permission/selector, explicitly verified source/owner anchors.
- One testable outcome; what code/spec *will* and *will not* change.
- Exact accepted decision/invariant, prerequisites and expected failure behavior.
- Cheapest **positive and diagnostic negative** proof, command and cwd.
- Links to deep notes **by purpose**. State whether a file is source evidence, future implementation design, or a test plan. Link, don't paste the whole file.
- Short stop/escalation condition, coordinator/shared-resource ownership, and reconciliation ledger.

Optional companions (each should justify its own cost):

| File | Written by | Contents, not content to repeat elsewhere | When Cursor reads it |
| --- | --- | --- | --- |
| `SOURCE-MAP.md` | **ChatGPT planner** from verified SHA and real source/test files | Call chain, symbol→responsibility, exact state/identity fields, already-landed behavior, known code gaps, specific grep/commands and assumptions. Every claim names file+symbol or is marked unresolved. | If selected owner/entrypoint is unclear or a fresh source contradiction appears; coordinator may consult once before delegating |
| `EXECUTION.md` | **ChatGPT planner** after design decisions | Dependency-ordered edit steps, request/result contracts, transaction/timeout/retry sequence, ownership and exclusions, exact files to add/change, transition/rollout strategy. Not a transcript of brainstorming. | Selected `PATCH` role when steps cannot fit safely in CHANGE; request exact section, not all research |
| `PROOF.md` | **ChatGPT planner** (then executor records actual results in receipt/ledger) | Matrix of normal, duplicate/stale/crash/security cases and exact feasible test route; which checks are pure, Compose or genuinely cross-Pod; safe command and stop rule | `VERIFY` role or implementation author before final targeted tests |
| `PLAN.md` | coordinator during execution | Only current checkpoint and remaining dependency steps. May cite other files. **Never** a second entire source map or diary. | Resuming a staged Change |
| `COORDINATION.md` | ChatGPT/coordinator, rarely | Shared path locks, migration/image/cluster ownership, dependency join and branch merge order, only when table in queue cannot express it. | Parent coordinator, never all children by default |

Don't create blank files to fill a template. Do not repeat source maps in every sibling packet; link canonical investigation where useful and retain *packet-specific* facts locally. If a `SOURCE-MAP` is stale after commits, **refresh or mark stale**; never silently pretend old line numbers still match.

## Role division and stop rules

**Planner / investigator (ChatGPT):** exhaustive where warranted, source-backed and decision-making. It may inspect 20–50 files for a complex seam, then compress to five entry anchors. It checks latest SHA, canonical owners, source/tests, caller→callee, writer, IDs, failure transitions, trust/spend boundaries and overlap with other open Changes. It decides actual file owners and writes all design/negative proof before marking Ready. A missing answer is a named **PLANNER BLOCKER**, not an excuse to send an open-ended ticket to Cursor. If a single hard experiment is unavoidable, isolate it and keep the remainder unselected.

**Parent coordinator (Cursor):** reads `CHANGE.md` and selection table; verifies baseline, branch, dirty status and permissions; assigns **one narrow task at a time** or disjoint Ready tasks with isolated worktrees. It does not first read every companion file, run an autonomous architecture audit, or summon a generic review swarm. It owns shared migrations, docs join, cluster, integration and final evidence. For a mismatch, report exact file+symbol and proposed narrow escalation rather than rebuilding planner research.

**Executor (Cursor PATCH):** follows accepted decisions, checks 2–5 direct source anchors, edits assigned paths, runs one focused positive and negative proof, returns a compact result. No product reinterpretation, costly broad search or unapproved extra agents. If owner/workflow is inconsistent, **stop before mutations**.

**Verifier (Cursor VERIFY):** challenge an actual implementation on the specified negative cases and inspect the diff. Do not reproduce the implementation author's entire discovery. Only if a real failure is found does investigation widen.

**Reviewer (ChatGPT or independent role):** inspect *new evidence and the actual diff*, not repeat speculative design. Reopen a decision only when the code/test falsifies it. Documentation/reconciliation owner fixes canonical claims as part of the same authorized Change.

## Route card format (pasteable; adapt, don't pad)

```text
CHANGE <ID> | <state/kind/profile> | DEPTH=PATCH
HEAD: <verified SHA> ; selector: <active Change/batch> ; resource owner: <one name>
Goal: <one verifiable observable result>
Authority: <one or two canonical headings>
Start: <2–5 source/test files and symbols>
Do: <ordered 2–4 steps; link EXECUTION.md#exact-section if complex>
Must not: <writer, paid provider, secrets, cluster, unrelated code constraints>
Proof: <positive + negative and exact filtered command/cwd>
Stop: <source contradiction/unsafe mutation; report 1 precise blocker>
Receipt: <files + tests run/skipped + statuses + doc reconciliation>
```

This is a *route*, not an instruction to paste all companions into the Cursor chat. A root ChatGPT plan may be long; a child task should not be.

## Read budget, escalation, and quality loop

1. Executor reads the route + **2–5 direct anchors**; link traversal only for concrete unresolved symbols. The parent does not preload every skill. Treat the quoted count as a default efficiency guard, **not** a ban on source investigation required for correctness.
2. Check branch HEAD against planner SHA. If changed, compare only affected symbols and test routes. If materially different, coordinator requests refreshed planner evidence; do not silently implement against obsolete code.
3. Planned concurrency is *per owned path/heading/resource*: one SQL migration, one active kind context, one app release writer, no overlapping workflow code in parallel branches. Parallel research and implementation may differ.
4. Run focused checks first, then required integration/negative proof; record exactly what ran. Neither success on mocks nor a Pod Ready result proves a full POC.
5. Return short receipt: changed paths, actual tests/counts, unresolved risks, canonical doc updates, token/cost traces **only if measured**. Wrong turns and rework are first-class WIKI18 data.
6. Do not promote to Done while the reconciliation ledger, negative proof, or permanent owner is stale. A partially merged slice stays in progress or needs explicit revised acceptance.

## Example: distributed Storyteller

The [current-head POC audit](../../work/designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md) finds: `storytellerV1` is a single execution+publication Activity; Game Authority has only snapshot/resolution seam; Kubernetes skeleton workloads are placeholders. For [STORY03](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/storyteller/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md), a `STATE` profile is justified: use a saved `SOURCE-MAP.md` for the actual custody path, `EXECUTION.md` for versioned workflow/authority/replay decisions and `PROOF.md` for restart/stale-root/no-resend negatives. For a two-line typo fix, use only CHANGE or a direct minor edit: no packet family needed.

**A packet family is a context index, not a second bureaucracy.** The larger the architectural change, the more thinking ChatGPT should finish; the less blind document reading Cursor should do.
