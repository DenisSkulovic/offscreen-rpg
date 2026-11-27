# PD07 | Product integration and semantic acceptance

**State:** Done — source joined to `implementation/product-documentation-renewal` after the technical renewal reached main `d8c1913d98b7dbfb328a0a4a3d4bf60a73641353`; product joint semantic acceptance recorded in the Design implementation record. **Kind:** DOC. **Base:** `4b621ec9708361a2304efdcff4d34bb7da2b6c88` main; E1 DEFENDED at `c7058958ec3f43fd37ec680d05757561d628926b`, owner accepted 2026-11-27. **Target:** `implementation/product-documentation-renewal`. [Accepted Design](../../../../../designs/archive/product-documentation-renewal/README.md) · [Group](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md).

**Release:** [group readiness and dispatch](../../../../../designs/archive/product-documentation-renewal/implementation-record/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

Final product join; technical successor facts must be present on actual main before transfer cleanup. 4 bounded editorial tasks. Parent reads [TASKS](TASKS.md) and [PROOF](PROOF.md); child receives one card and named anchors. [SOURCE-MAP](SOURCE-MAP.md) is planner evidence. PD01–PD06 archived on product target AND accepted technical renewal joined to actual main at a verified SHA; merge/reconcile actual main into product target without overwriting unrelated work before transfer cleanup. No other Change may write these paths after the predecessor receipts. Downstream: Design-level final integration and owner acceptance; no constituent merge directly to main. No paid, cluster, DB, provider, runtime, fixture or configuration operations.

## Target and exact write set

- `docs/product/README.md`
- `docs/product/foundations/concepts.md`
- `docs/product/gameplay/rules.md`
- `docs/product/gameplay/time-and-autonomy.md`
- `docs/product/gameplay/continuity.md`
- `docs/product/storyteller/profiles-and-settings.md`
- `docs/product/experience/entry-and-onboarding.md`
- `docs/product/experience/principles.md`
- `docs/product/experience/return-and-journal.md`

Retain existing path and headings; substantive authority-first rewriting, not label-only. Preserve selected/proposed distinctions, conditions, negative guarantees, unique realization facts and exact proof provenance. No new product/architecture decisions. Only these paths and own closure records may change. Protected AC/OBS/native normative owners excluded. Any active overlap gates only the affected task.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected change / no-op | Related owner | Proof |
| --- | --- | --- | --- |
| Product | Listed owners: editorial restructure only, no new semantic authority | exact task anchors and transfer table | meaning-preserving diff and negatives |
| Technical | Unchanged authority; no new commitments | listed read-only canonical anchors | preserve selected constraints |
| Code | Unchanged because DOC only; no executable source/config/test edit | inspected source anchors | actual diff |
| Related | Product index and named transfer source paragraphs only | Design-level final integration and owner acceptance; no constituent merge directly to main | navigation and preservation proof |

## Closure

Once separately Ready and commissioned, branch from verified `implementation/product-documentation-renewal` using `change/pd07-product-integration`. Run `node scripts/repo-tools/change-branch-guard.mjs --change PD07 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits; recheck branch, dirty state, ownership and prerequisites. Parent owns staging, lock, reconciliation, gate and archive. [PROOF](PROOF.md) before join. Archive own packet on implementation target before reporting completion; verify archive present/open absent, report exact SHA. No automatic successor, no independent main merge, no runtime acceptance claim.

## Reconciliation ledger (complete before Done)

| Affected heading | Authority | Target delta / unchanged reason | Source delta and SHA | Evidence tier | Negative proof | Route update |
| --- | --- | --- | --- | --- | --- | --- |
| T01 `docs/product/README.md` | product | changed one stale link (gameplay-domain-coverage catalogue now at its archived Design path); maturity, player-loop and routes were already authority-first from PD01–PD06; no delivered game or MVP asserted | closure commit on `d8c1913d9` | source-inspected; `check_docs` | reader cannot conclude arbitrary worlds or player replay are delivered: the opening paragraphs, loop caption and Current maturity line say target not delivered, and STATUS owns maturity | link repaired |
| T02 `foundations/concepts.md` (Execution and storage concepts), `gameplay/rules.md` (Authority split; Implemented entry and honest limits; Executable library shape; Resumption, hidden rolls and private fact transitions), `gameplay/time-and-autonomy.md` (Existing narrative rehearsal adapter) | product | removed duplicate legacy-realization prose; each now keeps its product-facing consequence and links the successor | successor on main `d8c1913d9`: operation-and-controller `Execution and storage concepts: dated realization of the vocabulary`; mechanics-and-capabilities `Supported mechanisms and the future kernel` and `Persistence and known limits`; prompts-and-tools `Selected compilation and tool contract`; ticks-and-tags `Existing narrative rehearsal adapter` and `Fixed real-second scheduling and fictional time` | source-inspected diff; destination terms verified by extraction | 20-second adapter stays an isolated adapter, not a universal clock; fixture worlds, exclusions, `clock-wait.v1`, item/fact vocabulary all survive in the technical successor | links added |
| T03 `gameplay/continuity.md` (candidate scene-frame; Context and cost), `storyteller/profiles-and-settings.md` (Current implementation boundary) | product | removed duplicate realization detail; retained product-facing `not yet exposed` canon-invention blocker; `scene-frame.v1` candidate information retained as product-level text | successor: mechanics-and-capabilities `Opportunity boundary`; context-selection-and-recall `Storyteller-facing memory tools`; versioned-settings `Current adapters` | as above | parent future cannot leak (selected fork scope untouched); invention controls stay recorded as missing; settings do not change mechanical plans | links added |
| T04 `experience/entry-and-onboarding.md` (Current POC honesty), `experience/principles.md` (Demo vs live), `experience/return-and-journal.md` (Scene checkpoints, review and forks) | product | removed route/symbol list, demo mechanics and the query-key detail; kept selected player guarantees and user-facing limits | successor: interaction-contracts `Drafts and forms`; presentation-runtime `Source-grounded baseline`; living-book-poc `Data and command invariants` | as above | scripted observe is stated as not live model evaluation; demo reset and manual time are linked and `refreshing starts over` kept; journal still never reuses live snapshot or makes a historic offer commandable | links added |
| Retained, not removed (unique or product-owned) | product | `rules.md` First rules subset (POC) and Authority split product rights; PD03 GM07 scope paragraph; PD06 Status sections (staff narrow facts are mirrored in TD07/TD08 with provenance, product-facing restrictions stay) | n/a | n/a | no unmatched unique fact deleted | none |
