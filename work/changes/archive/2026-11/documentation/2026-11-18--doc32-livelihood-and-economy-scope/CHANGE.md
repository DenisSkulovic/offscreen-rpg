# DOC32 | Map the earned-livelihood and exchange domain without universalizing money

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Reader job now insufficiently supported:** The premise makes work, possessions, travel costs and meaningful life earned across real time. Product rules currently treat money/wages as examples, not a universal mechanic; no single maintained domain decision map distinguishes trade, earned labor, ownership, value, scarcity and world-neutral alternatives.

**Governing present owners to read:**
- [docs/product/foundations/vision.md](../../../../../../docs/product/foundations/vision.md)
- [docs/product/gameplay/rules.md](../../../../../../docs/product/gameplay/rules.md)
- [docs/product/gameplay/continuity.md](../../../../../../docs/product/gameplay/continuity.md)
- [docs/product/gameplay/actions-and-commitments.md](../../../../../../docs/product/gameplay/actions-and-commitments.md)

**Proposed newly created/relocated owner:** `work/designs/open/livelihood-economy/README.md`. This is a hypothesis to validate, not a required arbitrary addition. Content with unratified decisions belongs under `work/designs/open/`, not silently selected `docs/product/`.

## Planned editorial change

1. Create a proposed domain model with two contrasting worlds: wage/barter/village employment versus a world where money/work do not apply. Identify universal accepted causality (no unearned transfer, durable ownership/receipt) versus ruleset-specific work, rates, crafting, markets, resource scarcity and tax/economic simulation.
2. Inspect existing item.create/item.transfer, contribution and time contracts. State which economic invariants are already selected and which are open choices: economic units, pricing, NPC inventory, employer authority, exploitation/abuse, simulation scale and whether labor can finish while absent.
3. Keep current technical game effects the only executable boundary. If genuinely distinct accepted player promises are ratified later, propose an owner docs/product/gameplay/livelihood-and-exchange.md; this packet does not itself ratify that page.

Before editing, compare actual source tree, the selected meaning of exact headings, all incoming links and current dirty state. If the reader question is already answered at one precise stable owner, **record reviewed no-op** and improve the route instead of adding a redundant document.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: one Proposed link on docs/product/gameplay/continuity.md#possessions-and-exchanges so the open livelihood map is findable. The selected possession sentences stay. | docs/product/foundations/vision.md, docs/product/gameplay/rules.md, and docs/product/gameplay/actions-and-commitments.md were reread and received no second pointer | Human ratification required before any new game, permission or legal rule |
| Technical | unchanged because this Change authors an unratified gameplay proposal, not a new selected runtime guarantee | docs/technical/engine/mechanics-and-capabilities.md remains the effect contract and was not edited | Source proof was read and was not invented |
| Code | unchanged because this is a documentation-only Change: no application source, tests, schema, migrations, or executable tool modification is allowed | Source files are read-only evidence | Negative: any executable diff blocks Done |
| Related | changed: CREATE work/designs/open/livelihood-economy/README.md as an unratified proposal, with one inbound link from docs/product/gameplay/continuity.md#possessions-and-exchanges | work/designs/open/gameplay-domain-coverage/README.md was inspected and left unedited. docs/README.md was not edited | WIKI16 declared CREATE; the new page is not ratified |

**CREATE declaration:** CREATE `work/designs/open/livelihood-economy/README.md`. The path did not exist at design time. This Change created that file. A misspelled existing path is not a valid CREATE. The owner authorized this CREATE and Ready for close. WIKI16's declared-creation check was read in `scripts/repo-tools/wiki-core/change-guard.mjs`. Ready for close is not Done. No heading moved, so there is no migration receipt. `docs/product/gameplay/livelihood-and-exchange.md` was not created.

## Acceptance and adversarial proof

**Normal:** a fresh agent answers the intended reader question from the correct owner with selected, proposed, and implemented states separated, and the new page reduces the detour. **Negative:** A microbe must earn universal coins to advance, every farm needs a resident economic agent, or prose about wages grants money without a committed effect.

**Owner gate:** No currency, pricing, reward frequency, AI economy, or progress rule may be promoted without owner acceptance.

**Verification:** exact before/after claim ledger, source-revision status where factual, link/anchor checks, and a falsifying counterexample. Commands that actually ran are recorded below. No provider call was made.

## Document shape | shape-ops.v1

| Operation | Path | Heading migration | Unique conservation |
| --- | --- | --- | --- |
| CREATE | work/designs/open/livelihood-economy/README.md | new owner; no old heading moved | A wage example stays an example. The page is not ratified as a currency, wage, profession, or tax rule. |

## Reconciliation ledger | fill at execution

CREATE `work/designs/open/livelihood-economy/README.md`

Inspected source SHA: `b3113814` (`git rev-parse --short HEAD`). Code unchanged. No provider call.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| work/designs/open/livelihood-economy/README.md#two-worlds | unratified design | changed: CREATE the proposal with a village that admits wages and barter, and a world where money and work do not apply. Status stays Proposed and not selected. | no source behavior changed; packages/contracts/src/stories.ts, packages/application/src/stories/persistence.ts, packages/game/src/effects.ts, packages/game/src/state.ts, packages/game/src/activities.ts, and packages/application/src/campaign/activities.ts read at b3113814 | source-inspected; Proposed, not a selected rule | A wage example must not become a universal currency table. A microbe must not need coins or an employer to advance. | one Proposed link from docs/product/gameplay/continuity.md#possessions-and-exchanges |
| work/designs/open/livelihood-economy/README.md#selected-causality | unratified design | changed: the page repeats already selected limits: no unearned transfer, durable ownership, completion before reward, and admitted work reaching a boundary while the player is away. | no source behavior changed; the same source paths at b3113814 | source-inspected; selected limits copied, not enlarged | Prose about wages must not grant money without a committed effect. | cites the existing product headings; no selected sentence was rewritten |
| work/designs/open/livelihood-economy/README.md#open-choices | unratified design | changed: units, pricing, NPC inventory, employer authority, exploitation, simulation scale, and wage-while-absent stay unchosen. | no source behavior changed; b3113814 | source-inspected; open rows are not rules | Every farm must not receive a resident economic agent so a wage table has a row. | catalogue open question left unanswered; catalogue file not edited |
| work/designs/open/livelihood-economy/README.md#inspected-contracts | unratified design | changed: item.create.v1, item.transfer.v1, quantity.change.v1, contribution.v1, and absent settlement are described as the executable boundary. No new effect is proposed. | no source behavior changed; packages/game/src/activities.ts, packages/game/src/immediate-actions.ts, and packages/application/src/stories/persistence.ts read at b3113814 | source-inspected; tests were not re-run | A contribution point must not be read as a universal wage unit. | technical pages were not edited |
| docs/product/gameplay/continuity.md#possessions-and-exchanges | product | changed: one Proposed sentence links the unratified map. The remainder, contextual price, gift, and merchant-inventory sentences stay. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | The new sentence must not be read as a currency, wage, or profession rule. | outbound link to work/designs/open/livelihood-economy/README.md |
| docs/product/foundations/vision.md#earned-life | product | unchanged because the shift, coins, and completion pictures already withhold one universal economy, profession system, or biological simulation. A second pointer would repeat that close. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | Those coins stay an illustration of earned time. They must not become a currency every abstract character carries. | page not edited by this Change |
| docs/product/foundations/vision.md#first-playable-target | product | unchanged because dedicated trade systems and a simulated population already sit outside that target. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | The first playable target must not be read as a market simulation. | page not edited by this Change |
| docs/product/gameplay/rules.md#world-independent-foundation | product | unchanged because wages are already example content and a microbe story already need not have money or employment. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | A microorganism must not be assigned an employer so a wage table has a row. | page not edited by this Change; an existing uncommitted Owns-line edit was left in place |
| docs/product/gameplay/rules.md#authority-split | product | unchanged because item.create.v1 and item.transfer.v1 are already the possession vocabulary, and prose already cannot create or transfer possessions. | no source behavior changed; packages/contracts/src/stories.ts and packages/application/src/stories/persistence.ts read at b3113814 | source-inspected; selected effect vocabulary preserved | Narration that a colony was paid must not create a treasury. | page not edited by this Change |
| docs/product/gameplay/rules.md#first-rules-subset-poc | product | unchanged because the subset already has no mandatory currency, wage, or profession, and contribution already needs a captured target, cadence, and check. | no source behavior changed; packages/game/src/activities.ts read at b3113814 | source-inspected; selected subset preserved | A missing profession row for a bodiless mind must not be filed as a hole in the subset. | page not edited by this Change |
| docs/product/gameplay/actions-and-commitments.md#stable-meanings | product | unchanged because a sentence that says the character was paid already does not grant the coins or move the clock. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | Prose about wages must not grant money without a committed effect. | page not edited by this Change; an existing uncommitted Owns-line edit was left in place |
| docs/product/gameplay/actions-and-commitments.md#judgment-chance-and-possessions | product | unchanged because contextual bargains already need consistent recording and already are not a universal price system. | no source behavior changed; heading reread at b3113814 | source-inspected; selected wording preserved | A contextual price must not become a price list for every world. | page not edited by this Change |
| docs/product/gameplay/time-and-autonomy.md#pace | product | unchanged because accepted work can already continue through a quiet interval, and an estimate already cannot manufacture a reward. This Change does not edit the time page. | no source behavior changed; heading reread at b3113814 | source-inspected; selected time rule preserved | An offer that was not accepted must not finish as paid labor while the player is away. | page not edited |
| docs/technical/engine/mechanics-and-capabilities.md#admitted-action-and-time | technical | unchanged because contribution settlement, completion effects, and the separation of story items from quantities already live here. This Change does not edit that contract. | no source behavior changed; heading reread at b3113814 | source-inspected; technical contract preserved | Elapsed time alone must not be described as completing contribution or paying a wage. | page not edited |
| docs/technical/engine/mechanics-and-capabilities.md#opportunity-boundary | technical | unchanged because authored examples may already omit quantities and currency without a second engine. | no source behavior changed; heading reread at b3113814 | source-inspected; technical contract preserved | Omitting currency in one example must not delete it from a ruleset that declared a quantity. | page not edited |
| work/designs/open/gameplay-domain-coverage/README.md#economy | unratified catalogue | unchanged because the catalogue already classifies economy and leaves the shared resource name unanswered. This Change was forbidden to edit it. | no source behavior changed; catalogue reread at b3113814 | source-inspected; catalogue wording preserved | The catalogue must not be read as selecting this proposal or a universal wage table. | no link added on the catalogue |
| Executable game, API, and test files | code | unchanged because no executable behavior is authorized and no executable file was modified. | no source behavior changed; packages/game/src/effects.ts and packages/game/src/activities.ts inspected at b3113814 | source-inspected read-only. This Change has no executable diff. | An executable diff, or a report of a test that was not run, blocks close. | no code edit |

**Execution record:** `git rev-parse --short HEAD` returned `b3113814`. `python` import of `scripts/check_docs.py` `check_file` on the proposal, `docs/product/gameplay/continuity.md`, and this CHANGE.md returned clean. Scoped `guardChange` plan returned ok. Scoped close, limited to the proposal and `docs/product/gameplay/continuity.md`, returned ok with citation warnings. Nine existing pages cite continuity. This Change leaves those pages alone, including `docs/product/README.md`, `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/worlds-and-characters.md`, and `docs/technical/storyteller/context-and-memory.md`. Full-tree close was not used as proof. The worktree contains concurrent edits outside this packet. No provider call was made. Tests were read in source and were not re-run. `docs/product/gameplay/rules.md` and `docs/product/gameplay/actions-and-commitments.md` already had uncommitted Owns-line edits. This Change left those edits in place and added no livelihood sentence there.

**Stop:** proposed new gameplay, privacy, security, or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and a complete ledger. This packet does not archive itself.
