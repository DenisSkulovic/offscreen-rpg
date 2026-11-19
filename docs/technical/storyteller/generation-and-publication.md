# Generation and publication

**Owns:** when a Storyteller operation may become a published passage, a historical report, or a held state, and what must stay unpublished.  
**Selected target:** the publication step of the [bounded controller](operation-and-controller.md#two-loops).  
**Landed prototype:** opening, continuation, mechanical consequence and historical-report tasks on the existing generation row, described in [current prototype runtime](operation-and-controller.md#current-prototype-runtime).  
**Not a claim** that the adaptive multi-round controller or a narrative director is running.

## What publication is allowed to do

A short authoritative publication fence may write a current passage, a fresh valid offer, source-linked descriptive notes, or a historical report attached to its original event. It checks that the scene, canonical root and current offer are still the ones the task captured. If they are stale, the operation holds or redoes only under the captured policy. It never overwrites newer canon.

Historical report attaches to the original history. It cannot supersede Now. An opening candidate never starts fictional time. Speculative or early prepared consequences stay private until exact settlement. A validator must not treat a predicted success as true.

## What publication must refuse

- A model-written item transfer, dice result, or clock advance that admission did not commit.
- A second publication of the same accepted action identity.
- A failed or uncertain provider attempt that would advance fictional time or release a decision hold.
- A repair that rewrites a settled receipt.
- Direct story writes from an evidence-investigation subphase. That subphase may return a private evidence packet only.

If generation is unavailable or the captured budget is exhausted, publication uses only still-valid prepared content or a supported fallback. Otherwise it preserves the last published situation and explains the interruption. It does not invent progress.

A failed or stale case keeps that committed situation. The scene, root, or offer no longer matches the capture, so the operation holds. Narrator text does not transfer an item, roll a die, or move the clock. A second publication of the same accepted action identity is refused. See [Step status](operation-and-controller.md#step-status).

## Scene publication fence

**Selected target, not current behavior.** The records being bound are the [committed pair](canonical-documents-and-packages.md#the-committed-pair): one game-state checkpoint and the canon root committed with it. The engine's publication transaction is the consistency boundary for that pair. A Storyteller process returns bounded descriptive proposals and evidence dependencies. It does not commit the checkpoint or the canon root.

One fence admits the source passage, the accepted descriptive changes, the mechanical effects the engine has already admitted, and the new canon root paired with the resulting checkpoint. It admits all of those, or none of them. A model proposal is not a direct write. Markdown and JSON projections of an accepted passage are application output, not a second model rendering.

- A lost acknowledgement is recovered from the saved operation and root. The effects are not applied again.
- A stale root, including a late provider task whose captured pair is no longer current, holds or rebuilds against an explicit fresh base. It cannot publish over a newer root.
- Concurrent publishers conflict on the expected root. One commit wins. A retry of the loser uses the new base. It does not merge by last write.
- A proposal that contradicts a committed mechanical receipt loses. The receipt stands. Prose, a rumor, or a summary cannot transfer an item, choose a die face, move the clock, or mark a living character dead.
- A second publication of the same accepted action identity is refused. Speculative consequences stay private until exact settlement.

Search indexes, Cognee, and vector stores are not part of this fence. This Change does not install them. A lagging index does not mean the commit failed, and it is not a reason to publish again.

## Generation identity

The durable generation row is the operation receipt for one admitted task, not a permanent agent thread. Provider request bytes are disposed with the operation. The game keeps the canonical life and the operation receipt: cost, outcomes, evidence-use and redacted evaluation. A new event creates a new task from canonical source. Previous provider round messages are not blindly appended.

**Negative:** schema-valid JSON is not publication. A queued generation is not a completed repair. `202 accepted` is not `published`. See [provider boundary](provider-boundary.md) for reserve, wire equality and uncertain charge.
