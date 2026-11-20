# Short-term implementation roadmap | playable kind first, then one-command development

**Decision date:** 2026-11-20. **Source baseline:** clean ZIP/main 64f3de7 plus remote main 09f8d08 (TURN02 T03 actual Next image build receipt; DXK01 T01 preflight). **Goal:** working, provider-free distributed Harbor-watch campaign in real kind, then `pnpm dev` + Tilt + Headlamp + **zero active Docker Compose**. **This file alone owns short-term PRIORITY/ORDER**, not selected work or product requirements. **work/QUEUE.md remains the single Current work selector.** Status comes from Change receipts and real tests; do not quote this schedule as runtime evidence.

**BOOT03 (Done, 2026-11-20):** [Private start admission](changes/archive/2026-11/other/2026-11-19--boot03-game-authority-start-admission/CHANGE.md) is archived. Nest forwards a start to private Game Authority; compose keeps the local seam. Rerun on `88ac6c9a`: distributed **16/16**, compose imported-start **4/4**. Cross-pod object storage stays TURN03. Checkpoint v2 is not this packet. QUEUE is none after TURN02 closed.

**STORY02 (Done, 2026-11-20):** [Private custody](changes/archive/2026-11/other/2026-11-19--story02-private-task-and-result-custody/CHANGE.md) refuses provider-mode tasks and non-scripted attempts at the Game Authority seam (`unsupported-execution`) and keeps scripted claim/save idempotence. **27/27** provider-free tests. Cross-Pod publication stays STORY03/TURN03. Paid custody stays TURN04. No auto-selection. QUEUE is none after TURN02 closed.

**K8S10 parallel-safe progress (2026-11-20):** [Real-release preflight code fix](changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md#2026-11-20-real-release-source-and-test-correction-t02b) was tested locally **43/43** without a cluster: exact ReplicaSet ownership, real template/Pod opt-in and pod image digest. Once TURN02's operator-approved kind release exists, K8S10 T04a can run **read-only plan** and record an exact release ref; this does not require a full TURN03 game. Actual T04b Pod deletion remains separately gated on healthy provider-free TURN03 baseline, sole cluster operator and explicit authorization. K8S10 stays OPEN/unselected and does not block the playable POC.

## FIRST SCREEN | Cursor parent: what to do next

**No Change is selected.** TURN02 is Done. DXK01 T01 preflight work is recorded, but DXK01 is **not selected** until a separate handover; QUEUE is authoritative.

1. **NOW: TURN02 is Done.** A fresh `kind-offscreen-lab` after teardown installed the application release: one migration, a matching content pin, and Ready Next, Nest, Game Authority, control, executor, and relay. The public gateway hides Game Authority. `POC_OPEN_ACCESS=0` returns 401 and `1` returns the local player. The earlier Seyda Neen story was not replayed. This is not the hosted release.
2. **FORK01 is Done.** The local Harbor-watch scene1 fork after scene2 goes through private Game Authority. Cold kind and the browser stay TURN03. Do not select another Change from this list.
3. **THEN: finish only the critical local ownership gaps** (STORY03/DIST03) before calling cold-kind TURN03 PASS. DATA04 and DATA06 are archived. STORY02's scripted-custody guard is archived. Existing STORY03 T07/T08 and local causal T09 **5/5** are already source- and process-proved at a lower tier; verify rather than rebuild. No RabbitMQ hop in the Storyteller wake.

**Batch discipline:** normally one selected Change, 2–5 T-IDs or one risky cluster/auth integration, then positive + diagnostic negative, commit, exact receipt and stop/report. If task changes collide, serialize owners. Do not jump to optional Changes merely because they are marked Ready. Use the existing Composer Standard cost policy, task-specific file routes and no broad paid rediscovery.

## Release train with objective exit gates

| Gate | Change(s) and next tasks | Plain-language exit condition |
| --- | --- | --- |
| **R0 Real release skeleton (Done 2026-11-20)** | TURN02 archived | Fresh kind: one migration, pinned import, Ready Next/Nest/GA/control/executor/relay. A list of healthy synthetic Pods is not this result |
| **R1 Narrow correctness closure** | FORK01 local private-GA fork is Done; TURN03 T01/T02 already partly landed; BOOT03, STORY02, TURN02, DATA04, and DATA06 are archived; STORY03/DIST03 only targeted unfinished checks | Pinned quiescent Harbor-watch scene1 fork via private GA is proved locally, including retry, wrong owner, and GA-down. DATA06 proved the local executor evidence read. Cold kind is not this result |
| **R2 Usable kind/browser vertical** | DXK01 T01/T02 (T01 preflight already underway); DXK03 T01/T02; TURN02 T05/T06; K8S11 T03; TURN03 T03/T04; DXK03 T03 | Real signed-in browser → Nest → GA → outbox → Temporal → executor → GA publication → scene2 SSE/GET → historical fork; staff /control works. Dev-only auth avoids mandatory GitHub OAuth for clean clone; zero provider calls. Stop on missing real actor or broken pin |
| **R3 One-command GUI experience** | DXK02 T01–T03, DXK01 T03 | `pnpm dev` safely reconciles kind and presents working game/staff/Tilt URLs; Headlamp selects Pod, shows logs/events/terminal where supported, app Pod deletion is replaced and game survives. Real warm run retains SQL/S3 |
| **R4 Retire old operating model** | DXK04 T01–T03; DXK05 T01–T03; DXK06 T01–T03 | Root scripts scoped, CI and lab cold-clone guards Kubernetes-first, no active `compose.yaml`, Docker Compose runner, `GAME_AUTHORITY_MODE=compose`, named-volume dependencies or current boot docs. Docker **engine** remains needed for kind. Do not destroy old user data |
| **R5 Cold-clone final** | DXK07 T01–T03; [DXK-FINAL](tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md) | Exact clean Windows/WSL checkout proves one command, browser play, roles, Tilt/Headlamp, Pod recovery, negative failures, first/warm durations/memory/image digests and zero provider spend. Only then mark initiative complete |

**R0/R2 dependency nuance:** TURN02 T05 needs a valid authenticated browser. If no authorized public OAuth credentials exist, complete local-only DXK03 real Better Auth profile first. This is not permission to fake cookies or allow anonymous admin. TURN03 T03 is a *single cold kind continuous proof*, not an aggregation of unrelated local fixture suites.

## FORK01 local private fork (Done, 2026-11-20)

[FORK01](changes/archive/2026-11/other/2026-11-20--fork01-private-game-authority-historical-fork/CHANGE.md) is archived. Public fork calls StorySeam. Distributed mode calls private Game Authority, which calls the existing `stories.fork` once. The local two-process Harbor-watch scene1 fork after scene2 passed, including a different checkpoint hash, a foreign owner, a bad token, and Game Authority down. DATA04 keeps the checkpoint reconstruction algorithm. TURN03 keeps the cold-kind and browser fork. `microbe.v3` and checkpoint v2 stay out of scope.

## All open work is visible, not all work is NOW

| Lane | Changes | Scheduling policy |
| --- | --- | --- |
| Critical engine / fork | STORY03, DIST03, TURN03. BOOT03, STORY02, TURN02, FORK01, DATA04, and DATA06 are archived | Complete exact needed contracts, archive genuinely achieved Goals, retain honest negative gaps |
| Real deployment and usable UX | K8S11, DXK01, DXK02, DXK03, DXK04, DXK05, DXK06, DXK07. TURN02 is archived | Follow R2–R5; one kind operator, no duplicate release owner |
| Present but not critical now | ENG03 (real under-lock I/O, prepared finite T02–T07, unselected), OBS04 (source-event witness T02–T06 planned), HK01, K8S10 | Remain discoverable in Changes. Select later for a real measured defect/owner request, not queue anxiety. Optional Rabbit fact projection and chaos do not gate playable script. GM07's one consented withdrawal is archived; a general timed fallback stays Proposed |
| Paid/explicit separate approval | OBS00 (provider-free B grant/dispatch code is plan-ready; activation separately gated), TURN04 | No live provider send, grant seeding, billing or paid distributed execution in zero-provider sprint |

**Do not confuse checkpoint v1 with the long-term any-scene promise:** this POC's first fork is quiescent scene1 only. Real mechanical world obligations, active offers and general historical v2 reconstruction need later ratified design, not tweaks to make the fixture green.

**Backlog cleanup (continued):** [DIST04 Cancelled / not Done](changes/archive/2026-11/other/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md) after confirming there is no independent broker consumer. No Rabbit application publisher, consumer, or read-model project is authorized; the isolated K8S03 learning lab remains.

**Backlog cleanup:** DIST02 was [Cancelled, not Done](changes/archive/2026-11/other/2026-11-19--dist02-versioned-dispatch-bridge-contracts/CHANGE.md) on 2026-11-20 because no consumer exists. No implementation task or Rabbit wake route remains; no replacement ticket is authorized without a real client.

**Experimental work lifecycle:** WIKI18 was [Cancelled/partially delivered](changes/archive/2026-11/other/2026-11-19--wiki18-agent-execution-context-budget-and-navigation/CHANGE.md): retain the implemented economical Cursor tooling, but the optional paired cost-effectiveness benchmark is not a standing open Change or a proven savings result. No new ticket is required to record metrics opportunistically in actual task receipts.

**ENG03 is Done and merged to local main.** [Packet](changes/archive/2026-11/eng/2026-11-13--eng-short-lock-context/CHANGE.md). Do not start it again from the old open folder. TURN02 remains the selected work.

**OBS04 backlog resolution (Nov 20):** [Typed terminal-event witness decision](changes/open/2026-11-15--obs04-finite-action-transition-evidence/DECISION-2026-11-20.md) removes the earlier unspecified-missing-datum blocker: existing receipt/event lacks the exact typed interrupt cause and pre/post clock/holds/affected-item state. One nullable witness on existing terminal event, no new ledger, is planned. OBS04 remains **unselected and unimplemented**; do not make it a prerequisite for TURN02 gameplay unless a concrete forensic test depends on it.

**OBS00 closeout (2026-11-20):** [OBS00 live-provider custody](changes/archive/2026-11/observability/2026-11-15--obs00-live-provider-custody/CHANGE.md) is **Done** for provider-free A/B/C security. SQL grant store and atomic dispatch recheck are implemented; no production grant, no live paid send, distributed executor still `ProviderModeRefused` until a separate TURN04 design and spending approval. OBS00-C remains in its own archived packet. No auto-selection of TURN04.

## Prevent self-management drift

- **One priority source:** this page. **One active selector:** [QUEUE](QUEUE.md). **One implementation truth per Change:** its `CHANGE.md` and `TASKS.md`. **Observed truth:** [STATUS](../STATUS.md) and actual tests. Historical [first-campaign execution guide](designs/open/first-campaign-readiness-2026-11-20/CURSOR-EXECUTION.md), [DXK Cursor handoff](designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md) and [Composer open backlog menu](changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md) remain design evidence, **not competing schedules**.
- When closing/handing over a Change, reconcile QUEUE and this page **only when its next gate changes**. No redundant status tables updated on every test. If selection and headings disagree, **QUEUE wins**; correct stale packet wording during the next receipt.
- A small failing guard, wiki link, or documentation warning gets a narrow fix if required for the selected Change, not a three-hour tangential documentation campaign.
- Parent reports **first in human terms**: what can a developer/player do now, what still fails and why? Then source SHA, selected T-ID, actual positive/negative tests/evidence tier, next recommended task. No unexplained alphabet soup.
- Stop and request specific architecture/permission input if the next step would broaden to checkpoint v2, unapproved live AI spend, destructive/unowned Kubernetes data changes, new feature/UI redesign, Rabbit redesign or general-purpose long-lock refactoring.
