# DO03 | story interface

**Status: Proposed / not commissioned. Kind: implementation. Profile: CONTRACT.** Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`. Integration target `undertaking/storyteller-workshop`. Prerequisite: DO02 Done and integrated; verify actual HEAD and source drift.

[Program](../../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [TASKS](TASKS.md) · [SOURCE-MAP](SOURCE-MAP.md) · [PROOF](PROOF.md).

## Cursor first-screen brief

> Current-source map: SOURCE-MAP.md; frozen snapshot. Governing technical owner: `docs/technical/platform/topology.md#code-organization` (must be reconciled by ChatGPT at promotion). Known trap: do not add an inverse dependency or old-package alias. Scope: exact source migration and tests, no behavior change. Route: TASKS.md, one T-ID at a time, parent joins.

## Outcome and exact scope

Coherent story/campaign player-interface leaf: seven tightly related modules and campaign-holds (server-side campaign state vocabulary shared with Admin; export distinct subpath and ban in browser production). Storyteller profile reference/summary is the player catalogue DTO, not provider implementation. Keep story/campaign validators independent of Story Engine and Storyteller. `campaign.ts` uses actual settled Documents model export for existing imported schema symbols; do not introduce dependency on document storage; planner refresh maps these exact imports before Ready. Preserve game imports. Split `stories.ts` as follows: move `startChamberSchema` to residual `packages/contracts/src/chamber.ts` immediately; adjust its existing import, tool controller import and chamber.test import; DO06 moves it with Chamber. Move `publicationBackdropSchema`, `publicationSceneDirectiveV1Schema`, `makeValidatedAppearanceForPublication`, `readOptionalSceneAppearance`, `projectStoredSceneAppearance` to `packages/story-interface/src/scene-publication.ts`, importing publicSceneAppearanceV1Schema and PublicSceneAppearanceV1 from `./stories`; export only existing public symbols, not private backdrop. Storyteller task-contracts and appearance test(s) import that subpath; browser runtime must not import it (test fixture exception). Move `STORY_VIEW_NOTIFY_CHANNEL` to `packages/story-engine/src/stories/view-notification.ts` and use it in persistence.ts and API story-update-hub.ts; storyUpdateHintSchema remains public. Split stories-update-hint.test.ts: public strict hint tests in story-interface; engine notification literal assertion in compiled `view-notification.test.ts`. No dependency from story-interface to engine. `game-authority.ts` residual imports respondToStorySchema from story-interface; `chamber.ts` residual imports stories/campaign/interactions from story-interface. All canonical resolution/launch JSON functions unchanged, including launch newline and resolution no newline. `campaign-holds` remains campaign-owned, no private hold body added to public campaignViewSchema. Update Web production closure test now to expect story-interface, not old package only after last Web consumer of old package moved (DO06).

## Execution rules (all stages)
- Integration target `undertaking/storyteller-workshop`; immutable inspected archive SHA `ed0837d0531be4050b40d9b2485b5759ef479fea`. Actual post-Documents HEAD has not been supplied. These are near-term open proposals, not Ready or commissioned. ChatGPT performs the pre-commission diff and canonical-doc alignment before dispatch. Do not make Cursor re-design or audit the repository. Owner commissions one stage at a time.
- Parent creates linked worktree and `change/<id>-<slug>` from verified integration HEAD; run `node scripts/repo-tools/change-branch-guard.mjs --change <ID> --target undertaking/storyteller-workshop`. Read current AGENTS/CHANGE/TASKS. Parent owns manifests, lockfile, docs, integration and archive. One child at a time, no branch per task. No automatic next Change.
- Exact relocation: preserve source tokens other than imports/exports and specifically named symbol splits. Keep strict Zod parsing, error shapes, canonical JSON, schema versions, constants, limits, hashes and privacy; no SQL migration, persisted data rewrite, route or deployment change, paid provider or live cluster. No compatibility re-exports from old package: migrate all consumers in same stage. Relative edges between moved modules stay relative; edges from remaining old files to moved modules become explicit new imports and manifest dependencies. Add direct workspace deps to all actual importers (test-only devDeps when appropriate); remove old dependency from each manifest once last reference gone. Never import an implementation solely for its types.
- New leaf workspace conventions: clone `packages/contracts/tsconfig.json` and build/test/typecheck scripts, private 0.0.0, preserve NodeNext module semantics, explicit named subpaths with types/default to `dist/src/<module>.{d.ts,js}`; use config/typescript/@types/node devDeps; Zod 4.6.5 only when needed; add only actual runtime workspace deps. No root barrel or wildcard for new public surfaces. Existing package tsconfig/output conventions remain unchanged. Parent runs `pnpm install --lockfile-only` then `pnpm install --frozen-lockfile` in own checkout; no hand-edit generated resolution data.
- Preserve tests, including negative cases and compile-time @ts-expect-error; move them with source. For existing src-root packages place relocated tests beside source (`*.test.ts`) and execute compiled file explicitly; Storyteller uses test/ and existing test script. Parent verifies test is actually emitted and executed. If an existing test needs another workspace, use direct dependency and keep test-only edges separate.
- Proof (root cwd): `pnpm repo:module-graph`, `pnpm repo:module-graph:test`, `pnpm exec turbo run build typecheck --filter=<changed workspace>...` for destinations and all reverse consumers (use explicit filters or full graph build at parent closure), focused compiled Node test paths listed in TASKS; changed-file quality/format check using repository commands. Record baseline failures, do not mask or broaden to fix unrelated issues. Compare pre/post package closure and actual import edges, no new cycles, missing exports or forbidden edges. Use no live DB/cluster to prove pure relocation. Existing tests that require live services remain separately labeled unrun unless authorized. Never claim full product acceptance from source-only proof.
- Parent reconcile README links, technical claims, planned-impact ledger and wiki guard plan/close; compare existing wiki failures against baseline rather than claiming zero. Close, archive, integrate, retire branch only after whole-stage acceptance. Exact unexpected owner/symbol/graph conflict returns to ChatGPT; no fallback aliases, permission relaxation or design guesses.


## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
|---|---|---|---|
| Product | unchanged because no player, staff, authorization or spending behavior changes | current product promises | byte-equivalent validators and existing negative tests |
| Technical | changed: `docs/technical/platform/topology.md#code-organization` ownership/realization, affected boundary heading(s) in SOURCE-MAP | existing code-architecture-health design and package READMEs | actual manifest DAG and preserved wire behavior |
| Code | changed: source destinations and exact callers/tests in SOURCE-MAP; negative: old moved subpath remains or forbidden dependency introduced | exports, manifests, lock, build and dev/release closure | focused tests and graph |
| Related | changed: affected package maps, active links, implementation status as observed | backlog/open/archive catalog and undertaking overview if actual milestone changes | reconciliation and link check |

## Acceptance

All assigned modules moved exactly once, old subpaths removed, every actual importer builds, same positive and negative tests pass, no new forbidden dependency. PROOF.md owns exact evidence; source-only evidence is not live acceptance.

## Handoff

After prerequisite, ChatGPT refreshes source map and clears the readiness gate; parent executes T01 then sequential tasks and joins. No next-stage authorization.

## Reconciliation ledger (required before Done)

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
|---|---|---|---|---|---|---|
| To fill at close for every impacted claim | technical/product | pending | pending | not executed | pending | pending |
