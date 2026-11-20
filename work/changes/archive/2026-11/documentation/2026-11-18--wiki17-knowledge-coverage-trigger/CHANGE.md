# WIKI17 | Detect underowned knowledge when new features or source boundaries arrive

**State:** Done (2026-11-18).

## First-screen handoff for Cursor

**Why:** The existing maintenance graph watches known docs and linked sources. It cannot discover an entirely missing canonical or task-guide owner just because all existing 81 pages are reachable. New API endpoints, package manifests and operator workflows can enter code without a discoverable wiki-level answer.

**Exact primary owners:**
- [scripts/repo-tools/wiki-core/model.mjs](../../../../../../scripts/repo-tools/wiki-core/model.mjs)
- [scripts/repo-tools/maintenance-core.mjs](../../../../../../scripts/repo-tools/maintenance-core.mjs)
- [scripts/repo-tools/brief.mjs](../../../../../../scripts/repo-tools/brief.mjs)
- [.agents/rules/documentation.md](../../../../../../.agents/rules/documentation.md)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Reuse Git change facts/HK07 source inventory to flag bounded important boundaries (new public API route, new package exported contract, new persisted entity, new content package kind, new command authority). Emit review candidates only, with actual paths and why.
2. Have reviewers choose one of: already owned heading / add section / create authoritative owner / create proposed design / task guide / documented no-op; require exact source or admission reason.
3. Preserve source truth as evidence only; a newly discovered code path cannot change the product bible. Keep performance bounded and no blanket docs-generated-from-code.
4. Add test fixture for new endpoint without linked owner vs internal pure helper with existing owner and explicit reasoned no-op.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because discovery cannot automatically select product policy or invent a universal gameplay system | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because source/contract ownership remains with actual selected technical pages; no automatic code-to-spec rule generation | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: extend existing maintainer report with bounded source-to-knowledge coverage candidates, not a standalone crawler; negative: missing owner must be 'unknown review needed', never auto-created fake spec | scripts/repo-tools/wiki-core/model.mjs and nearest existing test/maintainer module only | Real focused fixtures, no provider/DB/deploy |
| Related | changed: .agents/rules/documentation.md and work/changes/README.md only for documented review trigger; examples of add section/create owner/propose design/guide/no-op | Exact reverse contract links and relevant index/README; archive only as history | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** Adding a new public command silently passes coverage as 'complete' because every older doc is reachable, or a private utility triggers a noisy demand for a new page.

**Checks and evidence:** Self-tests, bounded/full-report receipts with measured false positives and no external model. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Proof

`node --test scripts/repo-tools/maintenance-coverage.test.mjs scripts/repo-tools/maintenance.test.mjs` exited 0: 14 pass, 0 fail, at HEAD `b3113814` (worktree, not a new commit). The unowned fixture route `apps/api/src/modules/widgets/controller.ts` with `@Get('list')` returned coverage status `unknown review needed`, candidate code `unknown-review-needed`, and a why that names that path. `docs/product/README.md` was byte-for-byte unchanged and no spec page was created. `packages/engine/src/internal/add.ts` cited from STATUS.md, and the same route with `documented no-op` plus a `because` reason, produced no `unknown-review-needed` candidate. `node scripts/repo-tools/brief.mjs --self-test` passed. `pnpm wiki:change-guard --mode plan --change work/changes/archive/2026-11/other/2026-11-18--wiki17-knowledge-coverage-trigger/CHANGE.md` printed `wiki.change-guard.v1 plan ok` and `No findings.` No provider call. `pnpm wiki:change-guard --mode close` was not run: Current change stays none, and the dirty worktree contains other packets.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Knowledge boundary classification | development tooling | changed: classifyKnowledgeBoundary flags only a public API route, package export, persisted entity, content package kind, or command authority, with the path and why | scripts/repo-tools/wiki-core/model.mjs at b3113814 | fixture-tested | an internal pure helper, a test decorator, and a non-command schema are not candidates | N/A |
| Maintenance coverage candidate | development tooling | changed: the existing freshness inventory emits unknown review needed for an unowned boundary and does not create a page | scripts/repo-tools/maintenance-core.mjs and scripts/repo-tools/maintenance-coverage.test.mjs at b3113814 | fixture-tested | reachable older product pages do not make the new endpoint complete | coverage status on the maintenance report |
| Brief health line | development tooling | changed: healthSummary prints the unknown review needed status and path when the maintenance report has one | scripts/repo-tools/brief.mjs at b3113814 | fixture-tested | a report with no coverage status still prints only its previous top candidates | brief --health |
| Knowledge coverage review | development harness | changed: the documentation rule names the six dispositions, the exact-source or because-reason requirement, and the product-bible limit | .agents/rules/documentation.md at b3113814 | source-observed | the rule does not authorize a generated spec page | that bullet is the review trigger |
| Product bible | product | unchanged because a discovered code path is evidence only and this packet does not edit a product owner | docs/product/README.md at b3113814 | source-observed | the fixture product README stayed byte-for-byte the same | N/A |
| Technical contracts | technical | unchanged because no selected technical heading was rewritten and no code-derived spec was added | docs/technical/README.md at b3113814 | source-observed | a missing owner stays unknown review needed instead of becoming a new technical page | N/A |
| Change queue | development harness | unchanged because the parent owns selection and Current change stays none | work/changes/README.md at b3113814 | source-observed | this packet was not selected and the queue file was not edited | the queue remains the selection map |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
