# Open Change reconciliation | 19 packets at 3992437

**Count methodology:** 19 `work/changes/open/*/CHANGE.md` files in the 2026-11-20 lean snapshot. Archive omitted by export, so this is an *open-folder audit*, not a count of all historical changes. Existing `COMPOSER-QUEUE-AUDIT-2026-11-20.md` says 24 at an earlier point; archived packets and time changes explain why its heading must not be treated as today's open count.

**Root problem:** many packet Goals name multi-service outcomes (a program) while each T-ID yields only a partial deliverable. Even genuine completed work cannot satisfy the too-large original Goal, so a half-finished-looking folder persists. Source/test reports are sometimes newer than the front-door `State: Proposed`, adding contradictory metadata. A few blocks are real trust/spend permissions; others are missing source-backed planner decisions or genuinely unrun joins. Treat each category differently. Never suppress open inventory by moving it to a postponed directory.

| Open packet | Actual situation observed on source/packet | Disposition, next check |
| --- | --- | --- |
| ENG03 short lock | C1/C2 solved narrow cases; all-purpose lock work is much larger | NOT on playable critical path. Measured contention before extra refactor; decide bounded new outcome or explicitly retire unneeded all-purpose ambition |
| GM07 delegated decision | Pure reducer and expiry behavior, durable consent/fence still incomplete | NOT POC gate; user-selected follow-on contract, not phantom blocker |
| OBS00 live custody | Provider-off fail-closed safety recorded, durable current paid dispatch authority absent | EXPLICIT gate: no paid work, do not fake Done |
| OBS04 transition evidence | Existing event evidence tests; full E0 witness is a different outcome | NOT POC gate unless first run identifies a missing event; scope to smallest demonstrated absent field |
| HK01 repair CLI | Guarded settle function tested, last operator path still CLI | Follow-on operational safety change, not first-campaign gate; cannot delete last supported recovery procedure |
| BOOT03 private start | Remote start route and two-process tests in source/receipts, final end-to-end source+checkpoint proof not recorded | CORE. Finish final remote startup negative and archive only after actual Goal/ledger verified |
| DATA04 historical read/fork | SQL selector, historical read and local fork exist; cross-service/real object and negatives remain | CORE to forkable M2; initial M1 can proceed without fork |
| DATA06 branch memory | Local root/lexical isolation tested; remote actor/visibility resolver not established | CORE to *memory-safe branch continuation* in M2; do not introduce Cognee |
| DIST02 bridge contracts | Rabbit postcommit projection optional and unselected | OPTIONAL. No Rabbit dependency in first turn |
| DIST03 GA private boundary | Read/resolution/start seams exist, many Nest story routes still local | CORE to credible one-writer distributed claim; audit only selected POC writes |
| DIST04 Rabbit projection | Ratified as optional postcommit consumer, not broker→Temporal wake | OPTIONAL; don't build solely to close a folder |
| K8S10 fault/load | Synthetic fault tests, not real application chaos | AFTER M2; preserve one bounded optional experiment and stop claiming real game resilience |
| K8S11 real Next/Nest edge | Rewrite/client tests passed, authenticated real Gateway NOT-RUN | CORE to M2, not necessary for first process-level smoke |
| STORY02 custody | GA private role/claim/save path exists, two-client PG test reported, no end-to-end live worker guarantee | CORE. Prove independent boundary then reconcile packet |
| STORY03 workflow split | Two-stage workflow and remote executor present, but control worker still local DB writer; topic paths inconsistent | **FIRST CORE REPAIRS** T07/T08, followed by T09 connected proof |
| TURN02 kind app release | API/GA/Next image scripts source present; real app overlay and cluster proof missing | CORE to M2 only; stage after local slice |
| TURN03 distributed full turn | Existing golden fixture in-process, not a full real-process turn | CORE acceptance; prove M1 then M2 using same fixture and machine ledger |
| TURN04 real model | Executor scripted-only, current paid authority unresolved, opt-in not granted | EXPLICIT gate; no automatic payment or partial-fake celebration |
| WIKI18 agent budget | Rule/parser tests, no actual comparative Cursor traces | OPTIONAL operational experiment; do not delay gameplay or buy a benchmark |

**Classification for planning only:** 9 core technical packets (BOOT03, DATA04, DATA06, DIST03, K8S11, STORY02, STORY03, TURN02, TURN03); 8 important but not first-campaign critical (ENG03, GM07, OBS04, HK01, DIST02, DIST04, K8S10, WIKI18); 2 explicit provider gates (OBS00, TURN04). An open packet is not necessarily a wrong or unimportant packet. It becomes a process defect when its Goal contains multiple independently finishable contracts and its status cannot distinguish them.

## Structural changes to future planning

1. An initiative can be broad. An *executable Change* must finish with a test or document contract that does not require an unrelated second deployment, optional design or later paid permission. If it cannot, split before Ready, with a bounded resulting Change and dependencies held in the initiative.
2. A T-ID's PASS is evidence, not packet Done. Its owner must reconcile the packet Goal promptly; if this reveals a Goal that was overbroad, transparently scope-correct/split the remaining outcome rather than leave ancient 'Proposed' and 'Implementing' headers contradicted by green T-IDs.
3. "Blocked" requires a reproducible missing permission, external dependency, or an exact unresolved architectural invariant. If the planner can resolve it by source inspection, it is a **planner defect to fix now**, not an excuse for endless blocked folders.
4. Scheduled, not selected, means no executor task; not a technical blocker. Don't promote optional queues to gameplay dependencies just to make folder counts smaller.
5. Make a one-page program scorecard with clearly separated tiers: pure, integration, two-process, live browser, cold kind and explicitly permitted model. A pass never automatically upgrades a higher tier.

**Recommended clean-up trigger:** after M1, review all 19 again against this table and reconcile original Goals with proven evidence. Some can be archived legitimately; others need deliberately smaller replacement outcomes or an explicit owner decision to cancel a future ambition. No bulk lifecycle mutation was performed in this planning commit.