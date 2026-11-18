# REAL02 inspection | gift, canon, and recall

**Date:** 2026-11-18. **Baseline:** `c1d1aab9f9e9b711252a955c4f3d11c7377a7d06`. **Node:** v24.19.0. **Environment:** local temp document store. No database, no model call.

The compass settlement and the Mira Vale favor are separate fixtures. This inspection joins them only as a provider-free classification. It is not a live story and not a played recall.

| Row | Tier | What the run showed |
| --- | --- | --- |
| R0 | tested at the staging seam | A successful compass check returns one `item.transfer.v1`. Staging that result with the named-gift change stores one relationship, sourced to the new passage. `publishStorytellerResult` was not run. |
| R1 | tested | An empty `documentChanges` list stores the passage and no relationship. The stager does not invent the missing favor. |
| R2 | tested, not enforced | The descriptive helper rejects a favor after a failed transfer. `stageStoryPublicationDocuments` still stores that favor when the caller passes it. Publication does not consult the helper or the transfer receipt. |
| R3 | tested | The beacon rumor is stored as attributed lore and says it is not settled world fact. A passing-crowd omit adds no identity. |
| R4 | partial | After nine later identities, the favor remains a catalogue entry and its body is not in the loaded documents. Passing its id loads the body. A mechanical transfer plan does not carry that id. Restart through story admission was not run. |
| R5 | mixed | A stale revision is refused by the existing publication test. A second create of the same path throws `document_path`. A `storyteller-private` possibility is still placed in the loaded documents. |
| R6 | blocked | No budget or provider path was exercised. |

Commands: `node --test test/story-publication-documents.test.mjs` (6 passed) and `node --test test/item-transfer-transition.test.mjs` (4 passed), from `packages/application`, after `tsc`.

**Recommendation:** keep the gap visible. Do not add a noun extractor. A later change can refuse a canonical favor that has no admitted transfer, and can keep private text out of loaded knowledge. This inspection does not make that change.
