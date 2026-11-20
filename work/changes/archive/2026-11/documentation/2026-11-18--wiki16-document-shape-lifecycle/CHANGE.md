# WIKI16 | Make create, split, merge, relocate and retire operations explicitly checkable

**State:** Done (2026-11-18).

## First-screen handoff for Cursor

**Why:** DOC05–24 packets mostly instructed edits to existing files. The template supports 'changed' planes and link repair, but it does not reliably force an author to consider CREATE, SPLIT, MERGE, MOVE, RETIRE, or justify keeping one owner unchanged.

**Exact primary owners:**
- [.agents/references/change-work-unit-standard.md](../../../../../../.agents/references/change-work-unit-standard.md)
- [.agents/skills/change-workflow/assets/CHANGE.md](../../../../../../.agents/skills/change-workflow/assets/CHANGE.md)
- [.agents/skills/documentation-reconciliation/SKILL.md](../../../../../../.agents/skills/documentation-reconciliation/SKILL.md)
- [scripts/check_docs.py](../../../../../../scripts/check_docs.py)
- [scripts/repo-tools/wiki-core/change-guard.mjs](../../../../../../scripts/repo-tools/wiki-core/change-guard.mjs)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Extend the prospective impact plan for documentation-kind Changes to declare intended structural file operations and exact path#heading migration, alongside meaning/ratification. No new giant schema for implementation-kind packets.
2. Add an optional migration receipt of old owner+heading -> successor/retired with unique-claim conservation and inbound references checked against actual diff. Reuse current link checker and wiki graph; no second crawler.
3. Add fixtures: **planned CREATE of a new Markdown owner whose path does not exist yet must pass plan mode with an explicit creation declaration**, while a misspelled path lacking that declaration still fails; split one page into two preserving links, move with broken inbound anchor, merge duplicate with unique negative constraint retained, retired proposed page without ratifying its content, untouched valid page/no-op. At close, created paths and incoming references must actually exist. New-page editorial packets depend on this compatibility.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the process change does not ratify any new player behavior | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because no game/API/data runtime contract changes; this Change changes maintenance tooling/skill expectations only | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: scripts/repo-tools/wiki-core/change-guard.mjs accepts a declared Markdown creation and split, merge, move, and retire mappings; negative: a split with an unrepaired inbound link is not complete | scripts/repo-tools/wiki-core/change-guard-self-test.mjs | Real focused fixtures, no provider/DB/deploy |
| Related | changed: .agents/skills/change-workflow/assets/CHANGE.md and .agents/skills/documentation-reconciliation/SKILL.md record the file-operation dispositions; do not duplicate standards in a new authority file | .agents/references/change-work-unit-standard.md | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** A page is split and all old references become broken or a unique negative security condition disappears while ordinary link health remains green.

**Checks and evidence:** Self-tests of existing guard/checker, positive/no-op and negative migration fixtures on a full checkout. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Execution evidence

`node scripts/repo-tools/wiki-core/change-guard-self-test.mjs` exited 0 at inspected `b3113814`. `node scripts/repo-tools/wiki-change-guard.mjs --mode plan --change work/changes/archive/2026-11/other/2026-11-18--wiki16-document-shape-lifecycle` printed `wiki.change-guard.v1 plan ok` and `No findings.` The run includes the prior guard fixtures and the new document-shape fixtures: a declared creation of a missing Markdown path passes plan mode; a misspelled path with no creation declaration fails `missing-path`; a declared split passes plan before the successors exist; a finished split keeps both claims and resolving links; a move with a broken inbound anchor fails `broken-inbound-anchor`; a merge that keeps its unique negative passes; a merge that drops that sentence fails `unique-claim-lost` with no broken anchor; retiring a proposed page passes; copying that sentence into a selected product page fails `retirement-ratifies`; an untouched `NO-OP` page passes; a creation that is still absent at close fails `create-missing-at-close`. No provider call and no database. `scripts/check_docs.py` was not modified. Parent close on the full checkout is still to be run.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | product | unchanged because this tooling change ratifies no player promise and edits no product page | no source behavior changed | fixture-tested | copying a retired proposed sentence into a selected product page fails retirement-ratifies | N/A |
| no product/technical behavior impacted | technical | unchanged because no engine, API, or data contract is in this diff | no source behavior changed | fixture-tested | a move that leaves a broken inbound anchor fails broken-inbound-anchor | N/A |
| .agents/references/change-work-unit-standard.md#structural-document-operations | development harness | changed: documentation changes can declare creation, split, merge, move, retire, and no-op with a heading migration | .agents/references/change-work-unit-standard.md @ b3113814 | fixture-tested | a misspelled path with no creation declaration fails plan mode | N/A |
| .agents/skills/change-workflow/assets/CHANGE.md#document-shape | development harness | changed: the packet template explains when to add the shape and receipt sections. It does not contain sample rows, because a copied sample path would be a real declaration and would fail close. | .agents/skills/change-workflow/assets/CHANGE.md @ b3113814 | fixture-tested | implementation packets are told to omit the section; a sample path left in the template is not a declaration | N/A |
| .agents/skills/documentation-reconciliation/SKILL.md#structural-migration | development harness | changed: reconciliation now requires unique-claim survival and refuses ratification by retirement | .agents/skills/documentation-reconciliation/SKILL.md @ b3113814 | fixture-tested | a dropped unique negative fails while ordinary links stay green | N/A |
| scripts/repo-tools/wiki-core/change-guard.mjs | development harness | changed: plan mode accepts an explicit creation of a missing Markdown path and close checks the receipt against the wiki graph | scripts/repo-tools/wiki-core/change-guard.mjs and scripts/repo-tools/wiki-core/change-guard-self-test.mjs @ b3113814 | fixture-tested | self-test exited 0; the broken-anchor and dropped-negative fixtures failed closed | N/A |
| scripts/check_docs.py | development harness | unchanged because the guard reuses wiki-graph broken-anchor results and does not add a second crawler | scripts/check_docs.py @ b3113814 | fixture-tested | a misspelled path still fails missing-path, so the existing checker was not weakened | N/A |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
