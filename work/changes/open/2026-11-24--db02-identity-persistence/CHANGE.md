# DB02 | Identity declaration and credential-store ownership

**Status: Ready / owner-commissioned source implementation. Kind: implementation. Profile: CONTRACT.** Baseline 2fb3f056; target undertaking/storyteller-workshop. DB01 joined. Executable now; no further promotion. Live SQL separately gated.

[Selected architecture](../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move declarations: Move exact declarations to packages/identity-persistence/src/auth.ts and terminal-auth.ts; leaf dependencies drizzle-orm only, exports ./auth and ./terminal-auth. Use existing package config convention. Replace relative auth imports in remaining DB schema files with @offscreen/identity-persistence/auth, temporary DB manifest edge only until DB04. Update all old schema/terminal-auth-schema consumers and registry auth module; no old alias. Preserve Better Auth schema namespace and all relation definitions.
- Move terminal SQL operations: Move entire store to apps/api/src/modules/terminal-auth/store.ts, import DB type from root, identity tables from new leaf; update service relative import and story-player-identity relative import, no behavior change. Delete old DB exports/files; preserve constant-time comparison, token expiry, locked one-time exchange and revoke predicates.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB02 --target undertaking/storyteller-workshop`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Actual semantic or safety contradiction stops; missing live fixture only gates live proof. **Readiness:** Ready, dependencies joined. See selected implementation details below. Only actual semantic/safety contradictions stop. Record exact accepted proof and baseline limitations.

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
| Identity declaration and credential-store ownership | database-infrastructure | pending | NOT RUN | TASKS | pending |

Read [SOURCE-MAP.md](SOURCE-MAP.md) before dispatch. No further planner approval.
