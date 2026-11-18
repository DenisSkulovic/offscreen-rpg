# WIKI16 | Make create, split, merge, relocate and retire operations explicitly checkable

**State:** Proposed (unselected). **Kind:** implementation. **Sequence:** after WIKI12; before large DOC37/DOC38 relocations. **Baseline:** clean snapshot `781c2fc`, source audit [navigation](../../../designs/open/wiki-discovery-coverage/NAVIGATION-AUDIT.md), [coverage](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md). Inspect current HEAD, dirty paths and active Cursor Change before selection. **Current change stays none.**

## First-screen handoff for Cursor

**Why:** DOC05–24 packets mostly instructed edits to existing files. The template supports 'changed' planes and link repair, but it does not reliably force an author to consider CREATE, SPLIT, MERGE, MOVE, RETIRE, or justify keeping one owner unchanged.

**Exact primary owners:**
- [.agents/references/change-work-unit-standard.md](../../../../.agents/references/change-work-unit-standard.md)
- [.agents/skills/change-workflow/assets/CHANGE.md](../../../../.agents/skills/change-workflow/assets/CHANGE.md)
- [.agents/skills/documentation-reconciliation/SKILL.md](../../../../.agents/skills/documentation-reconciliation/SKILL.md)
- [scripts/check_docs.py](../../../../scripts/check_docs.py)
- [scripts/repo-tools/wiki-core/change-guard.mjs](../../../../scripts/repo-tools/wiki-core/change-guard.mjs)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Extend the prospective impact plan for documentation-kind Changes to declare intended structural file operations and exact path#heading migration, alongside meaning/ratification. No new giant schema for implementation-kind packets.
2. Add an optional migration receipt of old owner+heading -> successor/retired with unique-claim conservation and inbound references checked against actual diff. Reuse current link checker and wiki graph; no second crawler.
3. Add fixtures: split one page into two preserving links, move with broken inbound anchor, merge duplicate with unique negative constraint retained, retired proposed page without ratifying its content, untouched valid page/no-op.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the process change does not ratify any new player behavior | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because no game/API/data runtime contract changes; this Change changes maintenance tooling/skill expectations only | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: existing wiki change guard or docs checker, adding a small fixture for changed/moved Markdown anchors and declared migration mapping; negative: a split with unrepaired inbound link is not complete | .agents/references/change-work-unit-standard.md and nearest existing test/maintainer module only | Real focused fixtures, no provider/DB/deploy |
| Related | changed: existing Change template and documentation reconciliation skill with required file-operation dispositions and unique-claim preservation checks; do not duplicate standards in a new authority file | Exact reverse contract links and relevant index/README; archive only as history | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** A page is split and all old references become broken or a unique negative security condition disappears while ordinary link health remains green.

**Checks and evidence:** Self-tests of existing guard/checker, positive/no-op and negative migration fixtures on a full checkout. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `.agents/references/change-work-unit-standard.md` exact heading/symbol to verify | development tooling / technical documentation | pending reviewed actual delta | inspected `781c2fc` baseline only; execution SHA pending | not run: Proposed | A page is split and all old references become broken or a unique negative security condition disappears while ordinary link health remains green. | pending impacted routes |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
