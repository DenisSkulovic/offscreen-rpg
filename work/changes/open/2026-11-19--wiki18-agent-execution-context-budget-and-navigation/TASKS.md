# WIKI18 | Composer tasks: measure total cost per accepted patch

**Planner investigation:** [SOURCE-MAP.md](SOURCE-MAP.md) establishes actual source-state and forbidden shortcuts at baseline `584b594`. Cursor reads this only for the selected symbol/contradiction, not as compulsory full-context preload.

**Baseline:** 584b594 plus newer Composer-first policy and task families committed after it. **Verify SHA:** `ec73a535` (2026-11-20). **State:** Implementing; **T01 VERIFY PASS**; **T04 VERIFY PASS**; trace parser/route card already landed, no actual paired paid trace; **T02 awaits owner-selected task**; **not Done**. **Default model:** Composer Standard. Source: `.agents/references/{cursor-model-budget-policy,composer-first-execution,change-packet-profiles}.md`, `.cursor/hooks/{model-budget-guard.cjs,model-budget-guard.test.cjs}`, `scripts/repo-tools/` trace parser, task receipts. Keep one true cost owner.

## T01 | Enforce default Composer and test guard | VERIFY PASS (`ec73a535`)
Read actual `.cursor/agents/{implementer,model-budget-guard}.md` if present, `.cursor/agents/implementer.md`, `.cursor/hooks/model-budget-guard.cjs` and tests. Run `node --test .cursor/hooks/model-budget-guard.test.cjs` on approved checkout. **Positive:** default explicit Composer Standard allowed; Grok Low/Medium rejected without explicit local opt-in; high/fast/auto/unknown variants fail closed. **Negative:** owner_approved payload cannot bypass local opt-in. **Limit:** hook cannot select parent model, enforce actual billing or context-window size.

**Result (2026-11-20):**

| Check | Outcome |
| --- | --- |
| `node --test .cursor/hooks/model-budget-guard.test.cjs` | **4/4 PASS** (~45ms) |

**Positive cases exercised (synthetic hook payload):** default `composer-2.5` with `fast=false` allowed; pinned Grok low/medium allowed only with explicit local opt-in; high/fast/auto/unknown variants fail closed.

**Negative:** `owner_approved` in payload does **not** bypass `grokApproved: false` (opt-in not inherited via payload).

**Proven at this receipt:** subagentStart guard behavior encoded in tests matches the stated default-deny Grok policy for the exercised matrix.

**NOT proven / out of scope for T01:** actual Cursor parent model dropdown selection, live subagent routing in the IDE, or real billing enforcement—synthetic tests only.

## T02 | Small real receipt without buying a new benchmark | PLANNER-READY ONLY WITH OWNER-SELECTED TASK
Use a natural upcoming bounded task (e.g. one BOOT03 Composer T-ID), record planned/actual model, context/read count, tool invocations, test cases, billed tokens/charge from Cursor usage if available, rework and correct outcome. No fresh expensive Grok run merely to create control data; compare with already-available historical Grok traces by comparable scope and label non-equivalence. **Negative:** absent usage stays null, not 0; failed task/rework counted.

## T03 | Update routing policy only from evidence | GATED
If Composer repeatedly fails a fully specified microtask, show exact missing contract or model limitation. Fix planner material first; only then consider one explicitly approved Low/Medium exception. Collect cost per **correct accepted** result, not cost per first response. Update WIKI18 ledger and canonical agent policy; no blanket “we saved 80%” from token-price arithmetic. **No Grok default.**


## T04 | Detect orphaned open folders with no CHANGE.md | VERIFY PASS (`ec73a535`)

**DEPTH=PATCH | MODEL=Composer Standard.** **Source inspection:** `scripts/repo-tools/maintenance-core.mjs:scanMaintenance` currently iterates **only** `/^work\/changes\/open\/[^/]+\/CHANGE\.md$/` when checking queue routes. Thus a tracked `work/changes/open/old/PLAN.md` without CHANGE.md escapes the open packet inventory. This happened to BOOK01 and was repaired by moving its plan to archive on 2026-11-20. Preserve the current valid rule: tiny Changes do **not** require TASKS.md.

**Write:** `scripts/repo-tools/maintenance-core.mjs` and `scripts/repo-tools/maintenance.test.mjs` only. **Read:** `scanMaintenance` beginning and its existing open-Change route scan, `maintenance.test.mjs:fixture/baseFiles/scan`, `maintenance-coverage.test.mjs` only if its fixture covers this case. **Algorithm:** from the already-supplied tracked `files` array (not a directory crawl), collect every unique first-level `work/changes/open/<leaf>/` prefix. If a prefix has any tracked file but lacks `<prefix>/CHANGE.md`, emit a deterministic severity **error** `orphan-open-folder` at `<prefix>` with instruction to restore the real Change front door or move completed artifacts beside their archived Change. Do not delete, move, fabricate a new Change or auto-archive. Sorting must be stable. Other valid packet directories remain unchanged.

**Positive:** existing indexed `leaf/CHANGE.md` fixture is green; `leaf/CHANGE.md` plus optional TASKS/SOURCE-MAP remains green. **Negative:** adding only `work/changes/open/orphan/PLAN.md` triggers exactly one `orphan-open-folder:work/changes/open/orphan` finding even if the queue does not link it. Add nested-only `orphan/notes/PLAN.md` as a second case; adding `orphan/CHANGE.md` removes the orphan error but may legitimately trigger a `missing-route` until the queue is updated. Run `node --test scripts/repo-tools/maintenance.test.mjs` using an approved compatible Node environment; then relevant full maintenance guard. **Stop:** if the scanner's file inventory deliberately excludes that tracked path, report exact filtering origin to ChatGPT rather than adding filesystem enumeration that ignores git/lean checkout semantics. **Receipt:** test names/counts and no false positives. **No Grok or cluster/provider needed.**

**Result (2026-11-20):**

| Check | Outcome |
| --- | --- |
| `node --test scripts/repo-tools/maintenance.test.mjs` | **14/14 PASS** (~301ms) |

**Positive cases exercised:** indexed open leaf with `CHANGE.md` stays green; optional TASKS/SOURCE-MAP beside indexed `CHANGE.md` stays green.

**Negative:** tracked `work/changes/open/orphan/PLAN.md` alone yields exactly one `orphan-open-folder:work/changes/open/orphan`; nested-only `orphan/notes/PLAN.md` yields the same single orphan at the leaf prefix; adding `orphan/CHANGE.md` clears the orphan error (a `missing-route` may legitimately remain until the queue is updated).

**Proven at this receipt:** orphan-open-folder detection from the tracked `files` inventory matches the stated positive/negative matrix in this file's maintenance tests.

**NOT proven / out of scope for T04:** full repo maintenance guard beyond `maintenance.test.mjs` — **NOT-RUN**.
