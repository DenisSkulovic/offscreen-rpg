# REAL02 forensic map | When a gift becomes a remembered promise

**This is an investigation fixture, not an assertion of V0 gameplay functionality.** Baseline: `43d5ddfc`. Exact source symbols below must be rechecked at execution.

## Three separate "truths" that must agree

1. **Committed mechanic:** item `brass-clasp` changes holder from player to `mira-vale` only on an eligible, accepted item.transfer.v1 outcome. Source: packages/game/src/effects.ts and immediate-actions.ts. A failed transfer does not grant a gift.
2. **Narrative evidence:** published original passage records what was actually said and observed, bounded by generated task/source authority. A narrated future offer ("I can shelter you") is not automatically a deterministic obligation or scheduled activity.
3. **Semantic document:** optional proposed relationship (canon or attributed as appropriate) captures **who, what, when, source and epistemic strength**, with revision fencing and reader visibility. Source: packages/storyteller/src/tasks/document-changes.ts and packages/application/src/storyteller/publication.ts.

Do not conflate (2) and (3). The passage may survive while future tasks fail to find it; the relationship document may be proposed but rejected; an actual inventory transfer may succeed while the social promise remains merely dialogue.

## Four reproducible branches

| Branch | Declared evidence | Required classification | Forbidden conclusion |
| --- | --- | --- | --- |
| Named gift succeeds | Player and Mira identities pinned; offered and accepted transfer; Mira says she'll offer shelter later | Item holder changed exactly once; passage source preserved; eligible optional relationship record | "The relationship is recalled" solely because staging created a Markdown document |
| Gift fails | Wrong holder, blocked action or failing check | No possession change; reject any claimed successful gift; no invented favor from alleged success | AI dialogue is transaction authority |
| Rumor | Mira reports beacon is abandoned, without independent proof | Attributed claimant/source remains separate from factual world state | The beacon is canonically abandoned |
| Crowd | Anonymous dockworker appears in passing with no interaction or future significance | May remain passage only | Mandatory identity creation for every mention |

SA09 source fixture at packages/storyteller/src/tasks/descriptive-materialization-fixtures.ts covers these categories at a **pure helper** level. It is not wired into the live publication seam and does not prove full runtime filtering.

## Forensic questions to answer with evidence

- Where does each ID originate? Item, holder, character, NPC and passage cannot silently derive from prose spelling.
- Which exact attempt/receipt and generation ID authorize the produced narration? Can retry/reload duplicate a social effect?
- What code validates created/revised document IDs, kind, authority, visibility, revision and source pointers?
- Does published active scene include a recall cue? How long does it survive and what subsequent choices transport it?
- Does a mechanical choice carry a required document reference through selected work? Current S3 text explicitly says **not yet**.
- Which canon lookup returns a current source versus only a search lead or stale index?
- What does the model actually receive after 15 unrelated interactions/restart? Cite request bodies or inspectable, sanitized evidence, not inference.
- What is the observable failure classification when the document was never proposed, publication failed, or retrieval was skipped?
- What were input/output tokens, actual cost, latency, failed attempts and retries if/when a paid run is separately authorized?

## Minimum acceptable report format

For each branch: declared pre-state → offered intention → selected command → accepted/blocked effect and receipt → model result (fixture vs live) → proposed document → staged/published/omitted → captured next context → final response or hold → exact checks/negative. Mark every arrow as **tested**, **source-only**, **design-only** or **blocked**. Reference the exact test invocation and commit. A single green `createDescriptiveMaterializationFixtures` call is not a full-chain pass.
