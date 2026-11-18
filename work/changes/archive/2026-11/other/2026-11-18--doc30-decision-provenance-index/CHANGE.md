# DOC30 | Recover selected architectural trade-off rationale without inventing historical ADR approvals

**State:** Done (2026-11-18).

## Cursor first-screen brief

**Why this is missing:** Only D-0001 and D-0002 are formal ADRs. Selected decisions about immutable documents, provider custody, clock/authority and staff boundaries are explained inside technical pages, but readers cannot easily ask why one alternative was rejected without a broad hunt.

**Start with actual current owners:**
- [docs/decisions/README.md](../../../../../../docs/decisions/README.md)
- [docs/decisions/D-0001--modular-engine.md](../../../../../../docs/decisions/D-0001--modular-engine.md)
- [docs/decisions/D-0002--react-next-client.md](../../../../../../docs/decisions/D-0002--react-next-client.md)
- [docs/technical/engine/selected-architecture.md](../../../../../../docs/technical/engine/selected-architecture.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Inspect at least six high-impact selected technical choices; identify exact existing 'why/trade-off' headings, dated evidence and whether a genuine owner decision exists.
2. Expand decisions README with a **locator table**, not pseudo-ADRs; link to governing selected heading and only create a new ADR if a recent explicit approved decision, alternatives and date are actually established.
3. Add negative question checks for 'why not LLM owns mechanics' and 'why not auto-retry unknown charged attempt', each routed to one authoritative rationale without version confusion.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because governance of chosen product rules is not changed by linking decision rationale | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because this is navigation to existing technical selected choices and evidence, not an alternative architecture rewrite | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no executable code or decision automation is needed | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: docs/decisions/README.md and targeted governing technical headings with exact rationale/alternative route; new ADR only for a documented newly accepted decision with real owner proof | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

**Execution resolution:** this pass is an existing-page edit. No Markdown file was created. No ADR file was created. The survey found no additional decision that already records an owner approval, rejected alternatives and a date beyond D-0001 and D-0002. Archive, commit and change-index selection stay outside this pass.

**Checks at SHA b3113814:** the plan guard returned ok with no findings before the final question retarget. After that retarget, the same plan command aborted: `shapePlanFindings is not defined` in `scripts/repo-tools/wiki-core/change-guard.mjs`. This packet did not edit that script. A local anchor walk of `docs/decisions/README.md` and `docs/decisions/D-0001--modular-engine.md` resolved every relative link and heading, including after the retarget. Close mode against the same base failed on undeclared files from other in-progress edits. Those files were not added to this ledger. Close is not a solo proof while that mixed diff remains. Linked headings were re-read in the worktree after neighboring edits. This packet did not edit them.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** Historical implementation is backfilled as an owner-ratified ADR merely because it is currently in code.

**Evidence:** Source decision/evidence trace for each locator and no duplicated normative paragraphs. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

Inspected documentation at `b3113814`. No executable source was edited.

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/decisions/README.md#locator | technical | changed: added a locator table and two question headings; copied no rule text from the owners | no source behavior changed; inspected SHA b3113814 | documentation inspection | A source file already in the tree was not entered as an owner-ratified ADR. | This index is the new route. |
| docs/decisions/D-0001--modular-engine.md#rejected-for-now | technical | changed: the rejected-chat sentence now links docs/technical/engine/selected-architecture.md#alternatives-that-lose-for-now; the rejection list is otherwise the same | no source behavior changed; inspected SHA b3113814 | documentation inspection | The link does not turn the architecture page's open items into a new approval. | Same heading as the LLM question route. |
| docs/technical/platform/data-and-persistence.md#selected-document-store | technical | unchanged: the ENG05 contract text stays the immutable-document rule | no source behavior changed; inspected SHA b3113814 | documentation inspection | The 2026-11-16 source note on that heading was not promoted into an ADR. | Locator row only. |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call and docs/decisions/README.md#why-not-auto-retry-an-unknown-charged-attempt | technical | unchanged: attempt custody stays the dispatch statement of an unknown call | no source behavior changed; inspected SHA b3113814 | documentation inspection | An uncertain charged dispatch was not given a new retry approval. | Locator row for who keeps the attempt. The auto-retry question uses the accounting heading. |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | unchanged: the chronology-versus-timer split stays the selected model written there | no source behavior changed; inspected SHA b3113814 | documentation inspection | The platform elapsed-time section was not treated as a second clock decision. | Locator row only. |
| docs/technical/admin/topology-and-authorization.md#7-dependency-and-trade-off-rationale | technical | unchanged: the staff trade-off text stays the rationale | no source behavior changed; inspected SHA b3113814 | documentation inspection | The 2026-11-14 selected-target date was not converted into an ADR, and the page's consistency review remains required. | Locator row only. |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities and docs/technical/platform/spending-and-entitlements.md#window-accounting-and-admission | technical | unchanged: the spending split and the unknown-metering stop stay on those headings | no source behavior changed; inspected SHA b3113814 | documentation inspection | The September 2026 recovery subsection was not read as blanket permission to retry an unknown charge. | Distinct-authorities locator row. Auto-retry question lands on window accounting. |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | unchanged: the cache boundary stays the Redis rule | no source behavior changed; inspected SHA b3113814 | documentation inspection | A fitted cache was not recorded as an owner-ratified ADR. | Locator row only. |
| docs/technical/engine/selected-architecture.md#alternatives-that-lose-for-now | technical | unchanged: the rejected LLM-led chat row stays the rationale | no source behavior changed; inspected SHA b3113814 | documentation inspection | Prompt responsibility was not used as a second mechanical-authority decision. | LLM question route and the D-0001 rejected-chat link. |
| docs/technical/README.md | technical | unchanged: the technical map already links the decisions index and was not edited | no source behavior changed; inspected SHA b3113814 | documentation inspection | A second decisions index was not added to the technical map. | Existing link to docs/decisions/README.md |
| docs/README.md and docs/decisions/README.md#why-not-let-an-llm-own-mechanics | guide | unchanged: the documentation map still offers the architecture page and D-0001 for the chat-writes-truth question, and this pass did not edit that map | no source behavior changed; inspected SHA b3113814 | documentation inspection | That map was not given a third rationale for the same question. | Question route is the decisions heading named in the affected column. |
| docs/product/gameplay/time-and-autonomy.md#pace | product | unchanged: product pace stays the product rule and this pass did not edit it | no source behavior changed; inspected SHA b3113814 | documentation inspection | The clock locator does not grant a new player time right. | No product map edit. |
| executable source and tests | code | unchanged: no executable file was edited | no source behavior changed; inspected SHA b3113814 | documentation inspection | An executable diff would show this documentation pass had changed behavior. | No source map edit. |
| no new ADR file | technical | unchanged: survey found no additional owner approval with alternatives and a date, so no ADR file was created | no source behavior changed; inspected SHA b3113814 | documentation inspection | Historical implementation was not backfilled as an owner-ratified ADR. | No new decisions file. |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
