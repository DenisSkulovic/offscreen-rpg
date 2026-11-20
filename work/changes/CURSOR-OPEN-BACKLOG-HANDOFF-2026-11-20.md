# Cursor parent | open Change backlog, Composer-first dispatch

**Later terminal update (2026-11-20):** [WIKI18 retired/cancelled as partially delivered](archive/2026-11/other/2026-11-19--wiki18-agent-execution-context-budget-and-navigation/CHANGE.md). Its trace parser, model policy, guard and route cards stay installed; T02/T03 live cost comparison was never authorized or completed, so do not dispatch from the old T01 menu row below. Only QUEUE selects current work.

**2026-11-20 terminal correction:** DIST02 and DIST04 were both Cancelled, not Done. No speculative RabbitMQ publisher/consumer work remains in the executable backlog; only the educational K8S03 lab exists. [DIST04 disposition](archive/2026-11/other/2026-11-19--dist04-rabbitmq-temporal-live-handoff/CHANGE.md).

**Priority supersession:** [work/IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md) is the current now/next/later schedule. This older menu is for task discovery, not autonomous selection. QUEUE remains the sole current selector.

**Priority override for morning 2026-11-20:** [first real campaign source audit](../designs/open/first-campaign-readiness-2026-11-20/README.md) supersedes this older menu for immediate game readiness. At snapshot `3992437` there are **19** open folders, not 24. Start with **STORY03 T07** GA-only control publication, then **T08** original-topic persistence, then **T09** actual HTTP→outbox→Temporal→GA integrated campaign. They are new cards in [STORY03 TASKS.md](open/2026-11-19--story03-separate-temporal-executor-and-publication/TASKS.md). Each is one bounded task with a negative test. No automatic all-folder delegation, provider send or destructive kind work.


**Inspected baseline:** 584b594, 2026-11-19, with newer planning commits through 2026-11-20. **Current work selection now lives at [work/QUEUE.md](../QUEUE.md);** `none` is valid. This is a **navigation/selection aid**, not authorization to run all tasks. [Full 24-packet forensic table](COMPOSER-QUEUE-AUDIT-2026-11-20.md); [model budget](../../.agents/references/cursor-model-budget-policy.md); [microtask contract](../../.agents/references/composer-first-execution.md).

## First [work/QUEUE.md](../QUEUE.md); then, **if a Change is selected**, this guide, that CHANGE.md and one selected T-ID

**Cursor parent:** set **Composer 2.5 Standard manually**. Do not start in Grok Medium on habit. **Child:** `economical-implementer` Composer Standard (or parent itself for a tiny edit). Read the chosen `TASKS.md#T-ID`, 2–5 named anchors; request exact SOURCE-MAP/EXECUTION section only when a given symbol conflicts with HEAD. Don't preload all skills and 24 folders. One child, one write owner, one outcome, focused normal+negative tests, short receipt. No automatic investigation subagent. If a task is PLANNER-BLOCKED, return the concrete missing invariant to **ChatGPT**, not to a Grok child.

## Task selection menu

| Goal owner selects | Next candidate task | Why now / stop gate |
| --- | --- | --- |
| Re-establish trusted tests | [HK03](archive/2026-11/other/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md) | Done. Isolated `test:storyteller` is the acceptance suite |
| Confirm saved-response safety | [HK01 T01](archive/2026-11/other/2026-11-17--hk01-retire-local-repair-helper/TASKS.md#t01--existing-minimal-guard--pass-at-ec73a535) | **Done.** Legacy CLI removed; use `plan-storyteller-saved-repair.mjs` |
| Prove S3 package pins | [BOOT02 T01](archive/2026-11/other/2026-11-19--boot02-published-fixture-package-s3-job/TASKS.md#t01--repeat-safe-no-cluster-proof--planner-ready) | Second-Pod proof already recorded; don't respin cluster unless source changed |
| Reconcile GA single seam | [DIST03 T01](open/2026-11-19--dist03-game-authority-private-boundary/TASKS.md#t01--run-the-exact-one-seam-proof--planner-ready) | Test read/resolution locally before expanding |
| Confirm checkpoint fork | [DATA04 T01](archive/2026-11/other/2026-11-19--data04-historical-read-and-fork-from-checkpoint/TASKS.md#t01--current-source-and-negative-proof-reconciliation--planner-ready-verify) | Historical local fork already implemented; don't invent second schema |
| Move critical story start | [BOOT03 T01](archive/2026-11/other/2026-11-19--boot03-game-authority-start-admission/TASKS.md#t01--contract-and-remote-client-shape--planner-ready) | Select BOOT03, coordinate GA contract writer; no live provider |
| Establish executor custody | [STORY02 T01](archive/2026-11/other/2026-11-19--story02-private-task-and-result-custody/TASKS.md#t01--private-wire-schemas-only--planner-ready) | Select STORY02, separate token/contract owner |
| Prepare distributed workflow | [STORY03 T01](open/2026-11-19--story03-separate-temporal-executor-and-publication/TASKS.md#t01--versioned-workflow-contract-declarations-no-runtime--planner-ready) | Only after STORY02 DTO path settled; preserve old workflow histories |
| Fix real Pod startup | [TURN02 T01](archive/2026-11/other/2026-11-19--turn02-compose-real-kubernetes-application-release/TASKS.md#t01--api-pinned-rule-manifest-load-no-source-dir--planner-ready) | Small source patch, no cluster or paid model |
| Prepare reproducible full-turn fixture | [TURN03 T01](open/2026-11-19--turn03-full-distributed-forkable-turn-proof/TASKS.md#t01--one-immutable-zero-spend-golden-fixture--planner-ready-early-pure-work) | Pure/scripted only before actual full kind join |
| Prepare controlled chaos | [K8S10 T01](open/2026-11-19--k8s10-distributed-fault-and-load-harness/TASKS.md#t01--pure-target-selector-and-refusal-reasons--planner-ready-early) | No cluster mutation; game chaos after TURN03 |
| Measure actual budget | [WIKI18 T01](archive/2026-11/other/2026-11-19--wiki18-agent-execution-context-budget-and-navigation/TASKS.md#t01--enforce-default-composer-and-test-guard--planner-ready-verify) | Historical focused guard verification; WIKI18 terminal, no further executor assignment |

**The headings after `#` above are navigation conveniences, not authority.** If a heading changed in a new commit, open the same packet's TASKS.md and select its current T-ID. An index link is not a detached task card.

## Deliberately not in the first execution batch

- **Optional/noncritical**: DIST04 Cancelled alongside DIST02 (no consumer); no Rabbit business-fact work selected, DIR03 live aesthetics, GM03 standing-life expansion, OBS04 richer evidence, ENG03 broad lock refactor. GM07's one consented withdrawal is archived; a general timed fallback stays Proposed. They are still visible in [audit](COMPOSER-QUEUE-AUDIT-2026-11-20.md), not moved to a hidden postponed bin. Their source/negative tasks can be selected when they answer a real current problem.
- **Paid permission boundary**: OBS00/TURN04 live dispatch remains denied until explicit authorization and a source-backed uncertain-provider accounting policy.
- **Real-cluster join**: TURN02/K8S11/TURN03 and K8S10 Pod injection require single cluster operator, real image/source pins, authenticated source and disposable environment. No child may reset/create/delete shared resources by inference.
- **Shared files**: BOOT03/STORY02/STORY03 all touch GA server/app/auth contracts. Serialize route and credential merges. STORY03 and TURN02 share worker queues and images. DATA04/DATA06 share fork/canon source. One coordinator owns migration, canonical tech headings and cluster.

## Parent dispatch script (copy-ready)

```text
Selected Change: <ID and source HEAD>; selected T-ID: <one>
Parent model: Composer 2.5 Standard (manually checked)
Child model: Composer 2.5 Standard, Fast off
Write owner: <exact paths>, conflicts checked
Read first: <2–5 file:symbol anchors from TASKS.md>
Implement: <the task's settled ordered algorithm, not a whole Change>
Test: <one precise positive and one diagnostic negative, disposable prerequisites>
Stop: <one explicit mismatch or unsafe permission, return to ChatGPT planner>
Return: <diff, commands/cwd/status/counts, docs affected, model/cost if observed>
```

**What not to do:** “Review all these 24 changes and implement any you can”, “use Grok for scary files”, “investigate whether we should use Kafka”, or “mark everything Ready”. The whole point of the planner pass is that the Cursor parent needs **one selection decision and one tiny route at a time**. Planned tasks are not merged code. Actual quality/cost improvement must be measured with WIKI18 accepted-outcome receipts.
