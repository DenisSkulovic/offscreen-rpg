# GM05 | Public chronological committed events for return and Journal

**State:** Proposed, **not Ready**. **Approval:** no backend changes authorized. **Kind:** read-only public API/contract projection + auth/ordering tests. **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). **Dependency:** current source inventory of event tables, publication, activity receipts and public disclosure rules.

## Cursor first-screen brief

> **Current-source map:** [application story operations](../../../packages/application/src/stories/README.md) → §reads.ts§ / §packages/application/src/campaign/reads.ts§; inspect current §packages/contracts/src/stories.ts§, §campaign.ts§ and only the receipt/event sources needed.
> **UX target:** [source-backed return](../../experience/flows/return-and-memory.md#return-is-a-distinct-flow-not-a-permanent-modal), [three Journal depths](../../experience/flows/return-and-memory.md#journal-information-architecture), [truth](../../experience/patterns/state-and-attention.md).
> **Known trap:** not every mechanical check is meaningful to a player, not every narrative candidate is published canon, and private Storyteller plans/dice may leak if raw rows are sent to the browser.
> **Scope:** proposed only. Read-only public **committed** event feed with provenance, no LLM recap and no mutation on GET.

## One bounded outcome

Create an **authorized, chronological, cursor-paginated** public event projection that can describe actual changes between meaningful story positions:
- published passage identifiers/revisions and source link;
- committed activity start/stop/checkpoint/completion/interruption where player-permitted;
- supported quantity/item/fact change summaries when genuinely public;
- settled event metadata, fictional-time position and stable event order;
- no plan futures mistaken for accomplished events.

A **minimal first slice** may include only activity lifecycle events and published passage markers, with a small typed discriminated union. Do not attempt every future relationship/world graph in this Change.

## Why not generate a summary?

A language model may paraphrase recorded facts well, but if it is allowed to invent missing events, "return after absence" becomes a lie. The structured public event source supports a factual **Recent developments** presentation even when spending allowance is zero. A sourced literary summary can be a separate optional derived layer later.

The source needs real stable identity/order. Converting an array of arbitrary strings into a client-side guessed timeline is not enough.

## Authority and baseline

[Domain concepts: receipts, publication, reports](../../../docs/concepts.md#execution-and-storage-concepts), [activity history](../../../docs/game-rules.md#visible-rolls), [canonical provenance](../../../docs/technical/canonical-files.md#one-owner-per-kind-of-truth), [Play/read model architecture](../../../docs/engineering/targets/react-next.md#1-desired-data-and-rendering-topology).

Current §StoryHistory§ pages published passages with sequence; §CampaignView§ includes selected activity events/reports. A complete public event ledger is **not yet established** by source audit. Main 3be49cc, 2026-11-13; reinspect latest event storage/permission before Ready.

## Scope

New read-only DTO/API/application projection in existing story/campaign read path, tests, documented public visibility policy and cursor ordering. Keep viewer/story identity, no-store/SSR cache separation, version fence and existing Query hydration. No opening or gameplay mutations, no new inference, no event fanout service, no notifications, no client-spend logic.

## Acceptance and negative proof

**Normal:** harbor repair 0→3/9 (then failed 3/9), stranger interruption, one published scene, and later resumption produce correctly ordered **committed events** with source links. No unnecessary timer poll events. Journal can state “repair interrupted at 3/9” from facts.

**Negative:** future obligations/hidden encounters are not exposed; a rejected or pending candidate isn't a committed event; private DCs/rules not leaked; another viewer or story cannot fetch events; duplicate scheduler delivery doesn't duplicate event ID; event cursor paging doesn't reorder/duplicate; GET doesn't advance clock or schedule model; later optional report cannot backdate/change prior event; failed read is not “no events.”

**Evidence:** contract schema tests, ordering/pagination/secret-redaction tests and authorized Nest read integration only when explicitly permitted. Browser presentation remains UX07 responsibility.

## Ready gate

Owner reviews the smallest meaningful event taxonomy and privacy policy. Cursor maps exact storage rows, chooses one bounded read endpoint and proves ordering/identity. **Do not start by building an LLM summarizer or universal timeline search engine.**
