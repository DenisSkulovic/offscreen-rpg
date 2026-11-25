# DB03 | Story Engine-owned durable schema leaf

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Baseline 7322b6f1a6df6f5ae612763b9786563dca2989eb; target main. Prerequisite: DB02 and CACHE04/CACHE06B joins; no concurrent Story Engine/GA/worker consumers. Owner-selected near-term planning, not execution permission.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Extract story roots and generations: Create packages/story-persistence with exports ./drafts ./generations ./stories ./launch ./campaign ./storyteller; only Drizzle and identity-persistence dependencies. Move exact four files; update identity import, preserve relative internal references; stage remaining campaign/writer in same branch before build. No aliases, no table redefinition.
- Move campaign and Writer custody: Move campaign and all six Writer barrel/lifecycle files verbatim, relative same layout; policy/campaign use identity leaf. Existing 20-table fingerprint remains unchanged. No pure Storyteller dependency on SQL. No funding lock or money type changes.
- Migrate every consumer and registry: Replace six old DB subpaths exactly per map; add direct dependency for actual importers; update legacy dist import paths if any, registry story module and migration proof. Delete old exports and declarations. Only import tokens/manifests; no logic changes. Consumer file inventory pinned by planner before dispatch. Preserve snapshot CACHE04 and lexical CACHE06B source.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB03 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Missing fixture, unresolved interface, new dependency cycle or semantic mismatch is planner stop, not executor investigation. **Readiness:** G0 target confirmed, remaining G1–G7 need current-source audit and exact fixture/consumer mapping at promotion; no Ready claim. Follow DB-PARALLEL review gates. Record exact accepted proof and baseline limitations.

## planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | No changed player behavior, authorization or financial authority |
| Technical | Implement selected database-infrastructure contract; update realization only as proven |
| Source | Named tasks and ownership; no neighboring refactor |
| Proof | Focused tests; no unrun PASS |
| Related | Package READMEs, graph, migration registry and catalog reconciled at closure |

## Reconciliation ledger

| Affected claim | Authority | Source delta / SHA | Evidence tier | Negative | Links |
| --- | --- | --- | --- | --- | --- |
| Story Engine-owned durable schema leaf | database-infrastructure | pending | NOT RUN | TASKS | pending |
