# Persistent Library and fork acceptance vectors

**Status:** unexecuted test design, 2026-11-20. Links: [source audit](VERSIONED-LIBRARY-SOURCE-AUDIT.md), [persistent DAG design](PERSISTENT-LIBRARY-DAG-DESIGN.md), [launch fixture lab](fixtures/README.md). Tests must eventually distinguish source-level check, provider-free executable proof, and optional paid creative-quality proof. No provider dispatch authorized.

## A. Storage and scaling (provider-free)

1. **1,000 docs, one edit:** establish initial root `A` with 1,000 distinct IDs/paths/object hashes. Change one `.md` file; new root `B` must reuse the other 999 content hashes and almost all index nodes. Measure new CAS objects, bytes, hash computations, read/write requests and transaction duration. Fail if document bodies are bulk copied or tree index rewrites scale linearly with N.
2. **Large flat namespace:** repeat with 10,000 docs within one logical directory. A naive Git-style directory rewrite must fail the claimed bounded-update complexity test; a balanced tree may meet it. Test prefix listing/search efficiency, not only point lookup.
3. **1,000+ revisions:** perform more than 1,000 edits, with multiple sources citing old versions. Read the oldest still-retained version, edit again and inspect history. Fail if a fixed 256-manifest traversal cap or a chain-length-dependent full history scan blocks admission.
4. **No-op scenes:** commit 200 scenes whose Library documents do not change. All scene references should retain the same Library root. No new manifest tree nodes or duplicate documents solely because a scene was published.
5. **Batch edits:** a Storyteller proposes 5 changes against one root; they should produce one coherent new root, not five paid/multi-scene publication boundaries. One invalid change must not half-publish the other four.
6. **Rename and delete:** rename `characters/kara.md` to `people/kara.md` without losing stable ID; keep old scene's path valid. Delete from live root while retaining old citations. Assert current prefix-listing does not include removed file, historical reader still can retrieve its old exact object.
7. **Root equality and hash corruption:** identical proposed state yields deterministic root/hash; corrupt node/body fails closed; no automatic fallback to latest or a different branch.

## B. Fork and ancestry security (provider-free)

8. **Branch at scene 37 after parent scene 80:** fork only from scene-37 Library and checkpoint. Parent-only post-37 reveal, object, private possibility or changed Storyteller profile is absent. No copied 2,000-document content library.
9. **Divergent `documentId@2`:** branch A and B both inherit version 1 of the same logical document, then write different version 2. Resolve each from its authorized root and assert immutable hash differs. Cross-branch citation by merely `documentId + revision` must be rejected as ambiguous or fully qualified by source identity.
10. **Fork with rename:** parent renames a document after fork point. Child sees ancestor old path. Child may independently rename; neither branch's path index or search cache is globally rewritten.
11. **Private knowledge:** child may inherit Storyteller-private documents *present in its ancestor root*, but not newer parent secrets or sibling proposals. Public reader, private Storyteller and developer views have distinct permission filters even when hashes are globally deduplicated.
12. **Fork when state unsupported:** active holds/obligations, uncheckpointed mechanical facts and pending Temporal tasks must yield a precise unsupported status, not an invented quiescent state. Reviewability and forkability are separately reported.
13. **Fork idempotence:** same owner + fork operation identity yields same new story and rooted lineage; collision with changed source checkpoint/passage/root fails. Parent callbacks must not mutate the fork's history.

## C. Workdesk, profiles, and initialization

14. **Preset bundle sharing:** start package root with `START.md`, `STORY_PROMPT.md`, `STORYTELLER_PROFILE.md` and 20 lore pages. First-stage Workdesk uses immutable pinned sources without copying all their Markdown contents into campaign-owned documents. Its model task automatically receives bounded essential profile core.
15. **Versioned profile:** scene 7 uses PROFILE_A, scene 8 uses PROFILE_B. Reading or forking scene 7 preserves PROFILE_A, even if the same logical path now points to B. Neither profile may grant mechanics/spend/tool permissions.
16. **Workdesk staging crash:** stage private notes before first scene; stop after CAS bytes but before launch's staged-root selector. Resume from captured provider result/root; never publish or leak orphan work. Once published, scene 1 points to exact accepted root.
17. **BAH + galaxy:** one-word and nonhuman prompts do not force character/inventory/rule state documents. Canonical sources and state are correctly marked by authority. A narrative-only scene may be reviewable before the engine supports mechanical forking.
18. **Conflicting source edits:** one model result targets root A while another actor publishes root B. Reject or explicitly rebase through a new approved operation; no last-write-wins to "latest" and no silent extra paid call.

## D. Cross-service completeness and recovery

19. **Quiet state change between passages:** record a mechanical event at T that changes a world fact, before the next narrative passage. A historical scene snapshot must select appropriate state as of its actual committed boundary. Fork must not combine a scene-10 root with scene-20 inventory.
20. **Publish lost acknowledgement:** after object-store writes and a successful SQL scene transaction, drop the HTTP response. Retry returns the same passage, checkpoint and Library hash without re-running Storyteller or reapplying effects.
21. **Staged object missing or corrupt:** no SQL selector to a nonexistent root; fail held/invalid. Retained old scene cannot be silently reconstructed with a new LLM summary.
22. **GC retention:** parent deletes its current head after child fork; old scene and fork roots remain readable. Background index deletion has no effect. An authorized privacy erasure must follow explicit retention policy and not promise unavailable restoration.
23. **Checkpoint sizing:** measure full mechanical payload sizes for 100/1,000/10,000 live entities; if replay or size bounds fail, compare specialized persistent state structures or bounded snapshots + deltas without changing the narrative root API.

## Bench decision rubric

Select any persistent-tree implementation only if it beats the current v1 baseline on **bounded update and fork work**, preserves history under 1,000+ edits, and makes prefix/navigation and exact reads acceptably cheap. Record node count, bytes, object-store GET/PUT, memory, p50/p95 latency, failure recovery and actual total retained object bytes. A clever asymptotic claim without a working benchmark is insufficient.

**Do not** require `git clone`, binary Git storage, file-copy-on-scene, a mutable global `latest` pointer, or copy-all historical packages. An immutable root must be usable through both the read adapter and the future Writer's Library API.

## Test-level distinction

The current source review proves the existing flat-manifest logic, cap and fork metadata behavior. This document is a list of **required future executable assertions**, not a claim that all those assertions pass today. No database, cluster or provider run occurred in this round.
