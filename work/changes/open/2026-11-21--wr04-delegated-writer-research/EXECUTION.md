# WR04 | decided execution design (planner-owned)
**Starts only after WR03 source/API reconciliation.** A child means a separate provider conversation/attempt ledger, not a parent prompt pretending to be two agents.

## SQL and step engine reuse (selected before WR03 lands)
WR03 owns two new tables: `storyteller_writer_mission` and `storyteller_writer_step` keyed by `(missionId,contextId,ordinal)`; parent uses `contextId=missionId`. WR04 adds `storyteller_writer_child` keyed by `(parentMissionId,childId)` with unique `(parentMissionId,ordinal)` and captured root/tools/question and finite reservations. Children set `contextId=childId` in the **same WR03 step engine** and share the parent's existing `storytellerOperation` charging authority, so child creation NEVER refreshes owner spend. Parent/child budget reservation is serialized on the parent operation row; child per-context counters prevent one child from consuming the other's reserved slice. Independent provider context means a separate captured message/attempt sequence, not a separate money wallet. Schema must be reconciled against the actual WR03 implementation before WR04 T02 executes; any mismatch returns to ChatGPT, not Cursor design.

## Parent/child contract
`writer-child-task.v1` = {parentMissionId, childRequestId, ordinal, question, pinnedLibraryRoot, skillHashes, restrictedTools, maxRounds, maxTokens, maxMicrousd, requiredEvidence}. Parent reserves money/rounds **atomically before** dispatch and issues child permission = intersection(parent grants, requested grants, read-only tools). No child recursion, staging, scene submit, root change, canonical writes or external side effects. Parent gets a stable child ID and status pending/running/settled/held/uncertain/cancelled. The read-only child may query Library and skills only.

Each child has its **own model request sequence, attempt IDs, persisted decision/results, provider transport and budget account** under parent cap. Preserve unknown-dispatch state; parent cancellation prevents new child dispatch but never erases unsettled money obligations. Maximum simultaneous children is a captured finite policy (initial safe default 2) and max total child count finite. No free retries.

## Join
Join by captured request ordinal, not completion timing. For each response return {claims:[{text,rootHash,documentId,objectHash,section}], contradictions,gaps,spent}. Before parent can use cited material, revalidate hash/root membership and permissions using WR03 tool facade; optionally reread exact original passage. Invalid citation does not become fact. If required child held, parent holds or continues **only** if captured mission quality policy explicitly permits incomplete evidence. Parent can choose to ignore optional child, but must not mark missing research complete.

## Implementation sequence
1. Add child task/result Zod schemas and read-only capability intersection under WR03 contracts, pure unit tests.
2. Add atomic parent reservation and child custody schema using WR03 mission keys; tests for oversubscription and unknown delivery.
3. Add child executor using **WR03's existing writer step engine**, with separate model context and narrower tool registry; test denied write and sibling reads.
4. Add deterministic parent join and cited-evidence revalidation; test fabricated and sibling-root citations.
5. Script two isolated 200-scene research children, persisted separate transcripts and spend, restart between join steps, zero real-provider calls.

**Exact database/table/step integration points are intentionally withheld until WR03 lands:** they are not Cursor design freedom. If source doesn't match this contract, stop and request a new ChatGPT source map. Do not auto-select WR04 because WR03 finished.