# Short-term implementation roadmap | playable kind first, then one-command development

**Decision date:** 2026-11-20. **Source baseline:** clean ZIP/main 64f3de7 plus remote main 9fa937c (TURN02 T03 web-origin guard; DXK01 T01 preflight). **Goal:** working, provider-free distributed Harbor-watch campaign in real kind, then \`pnpm dev\` + Tilt + Headlamp + **zero active Docker Compose**. **This file alone owns short-term PRIORITY/ORDER**, not selected work or product requirements. **work/QUEUE.md remains the single Current work selector.** Status comes from Change receipts and real tests; do not quote this schedule as runtime evidence.

## FIRST SCREEN | Cursor parent: what to do next

**The selected Change is TURN02. Do not switch it silently.** DXK01's T01 preflight work is useful but its packet's "Selected" heading contradicts QUEUE: it is **in progress but not selected for the next active task** until a handover.

1. **NOW: TURN02 T03 → T04.** T03 has source/unit proof but **Next image build is NOT RUN**. Prove actual image closure/Pod-interface behavior; finish the single real image-pinned application release overlay T04 (migrations, S3 import, Nest, Next, private GA, control/executor queues). No synthetic workload can count as the game. One operator, no destructive cluster step without exact ownership/permission. At T04 checkpoint: commit, reconcile source tests, and report app Pods ready/unready plainly. If T04 exposes a specific missing cross-service contract, do a bounded fix with its named owner rather than widening TURN02.
2. **NEXT: BOOT03 T04 closure review, then FORK01 T01.** BOOT03 recorded 16/16 local two-process starts incl two-GA race and proxied S3 failure, bad rule pin, checkpoint v1 quiescent success; do not spend another day reimplementing it. Reconcile actual canonical docs and closure guard; archive **only if its original Goal is truly satisfied**. Cluster S3 is TURN03/TURN02, **mechanical checkpoint v2 not BOOT03**. FORK01 then verifies Harbor-watch scene1 forked after parent scene2 and gives it the missing private-GA write boundary.
3. **THEN: finish only the critical local ownership gaps** (FORK01 T02–T04, STORY02/STORY03/DATA04/DATA06/DIST03) before calling cold-kind TURN03 PASS. Existing STORY03 T07/T08 and local causal T09 **5/5** are already source- and process-proved at a lower tier; verify rather than rebuild. No RabbitMQ hop in the Storyteller wake.

**Batch discipline:** normally one selected Change, 2–5 T-IDs or one risky cluster/auth integration, then positive + diagnostic negative, commit, exact receipt and stop/report. If task changes collide, serialize owners. Do not jump to optional Changes merely because they are marked Ready. Use the existing Composer Standard cost policy, task-specific file routes and no broad paid rediscovery.

## Release train with objective exit gates

| Gate | Change(s) and next tasks | Plain-language exit condition |
| --- | --- | --- |
| **R0 Real release skeleton (CURRENT)** | TURN02 T03 actual Next build, T04 app release overlay | Real Next/Nest/GA/control/executor Pods & their SQL/S3/Temporal deps, explicit image/pin/migration checks. A list of healthy synthetic Pods is not PASS |
| **R1 Narrow correctness closure** | BOOT03 T04 review; FORK01 T01–T04; TURN03 T01/T02 already partly landed; STORY02/STORY03/DIST03/DATA04/DATA06 only targeted unfinished checks | Pinned quiescent Harbor-watch starts, reaches scene2, forks its exact scene1 via **private GA**; retry, wrong owner, stale root, GA-down fail closed. Local-process proof is not cold kind |
| **R2 Usable kind/browser vertical** | DXK01 T01/T02 (T01 preflight already underway); DXK03 T01/T02; TURN02 T05/T06; K8S11 T03; TURN03 T03/T04; DXK03 T03 | Real signed-in browser → Nest → GA → outbox → Temporal → executor → GA publication → scene2 SSE/GET → historical fork; staff /control works. Dev-only auth avoids mandatory GitHub OAuth for clean clone; zero provider calls. Stop on missing real actor or broken pin |
| **R3 One-command GUI experience** | DXK02 T01–T03, DXK01 T03 | \`pnpm dev\` safely reconciles kind and presents working game/staff/Tilt URLs; Headlamp selects Pod, shows logs/events/terminal where supported, app Pod deletion is replaced and game survives. Real warm run retains SQL/S3 |
| **R4 Retire old operating model** | DXK04 T01–T03; DXK05 T01–T03; DXK06 T01–T03 | Root scripts scoped, CI and lab cold-clone guards Kubernetes-first, no active \`compose.yaml\`, Docker Compose runner, \`GAME_AUTHORITY_MODE=compose\`, named-volume dependencies or current boot docs. Docker **engine** remains needed for kind. Do not destroy old user data |
| **R5 Cold-clone final** | DXK07 T01–T03; [DXK-FINAL](tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md) | Exact clean Windows/WSL checkout proves one command, browser play, roles, Tilt/Headlamp, Pod recovery, negative failures, first/warm durations/memory/image digests and zero provider spend. Only then mark initiative complete |

**R0/R2 dependency nuance:** TURN02 T05 needs a valid authenticated browser. If no authorized public OAuth credentials exist, complete local-only DXK03 real Better Auth profile first. This is not permission to fake cookies or allow anonymous admin. TURN03 T03 is a *single cold kind continuous proof*, not an aggregation of unrelated local fixture suites.

## The uncovered fork dependency: FORK01

Current \`apps/api/src/modules/stories/controller.ts:fork\` invokes \`this.stories.fork\` locally; \`StorySeam\` and private GA have **read/start/resolution but no fork**. Therefore an ordinary successful Nest fork is not the requested **single-owner** distributed historical fork. [FORK01](changes/open/2026-11-20--fork01-private-game-authority-historical-fork/CHANGE.md) owns this exact missing transport boundary, while DATA04 keeps the checkpoint reconstruction algorithm and TURN03 keeps real kind/browser proof. It uses the already quiescent Harbor-watch fixture; \`microbe.v3\` executable obligations and checkpoint v2 stay out of scope.

## All open work is visible, not all work is NOW

| Lane | Changes | Scheduling policy |
| --- | --- | --- |
| Critical engine / fork | BOOT03, FORK01, STORY02, STORY03, DATA04, DATA06, DIST03, TURN03 | Complete exact needed contracts, archive genuinely achieved Goals, retain honest negative gaps |
| Real deployment and usable UX | TURN02, K8S11, DXK01, DXK02, DXK03, DXK04, DXK05, DXK06, DXK07 | Follow R0 then R2–R5; one kind operator, no duplicate release owner |
| Present but not critical now | ENG03, GM07, OBS04, HK01, DIST02, DIST04, K8S10, WIKI18 | Remain discoverable in Changes. Select later for a real measured defect/owner request, not queue anxiety. Optional Rabbit fact projection and chaos do not gate playable script |
| Paid/explicit separate approval | OBS00, TURN04 | No live provider send, billing or new dispatch authority in zero-provider sprint |

**Do not confuse checkpoint v1 with the long-term any-scene promise:** this POC's first fork is quiescent scene1 only. Real mechanical world obligations, active offers and general historical v2 reconstruction need later ratified design, not tweaks to make the fixture green.

## Prevent self-management drift

- **One priority source:** this page. **One active selector:** [QUEUE](QUEUE.md). **One implementation truth per Change:** its \`CHANGE.md\` and \`TASKS.md\`. **Observed truth:** [STATUS](../STATUS.md) and actual tests. Historical [first-campaign execution guide](designs/open/first-campaign-readiness-2026-11-20/CURSOR-EXECUTION.md), [DXK Cursor handoff](designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md) and [Composer open backlog menu](changes/CURSOR-OPEN-BACKLOG-HANDOFF-2026-11-20.md) remain design evidence, **not competing schedules**.
- When closing/handing over a Change, reconcile QUEUE and this page **only when its next gate changes**. No redundant status tables updated on every test. If selection and headings disagree, **QUEUE wins**; correct stale packet wording during the next receipt.
- A small failing guard, wiki link, or documentation warning gets a narrow fix if required for the selected Change, not a three-hour tangential documentation campaign.
- Parent reports **first in human terms**: what can a developer/player do now, what still fails and why? Then source SHA, selected T-ID, actual positive/negative tests/evidence tier, next recommended task. No unexplained alphabet soup.
- Stop and request specific architecture/permission input if the next step would broaden to checkpoint v2, unapproved live AI spend, destructive/unowned Kubernetes data changes, new feature/UI redesign, Rabbit redesign or general-purpose long-lock refactoring.
