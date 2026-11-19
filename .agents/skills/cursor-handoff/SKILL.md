---
name: cursor-handoff
description: Translate one approved documentation or implementation Change/PLAN into an economical Cursor execution instruction with exact authority, files, negative proof and no implicit product policy decisions. No implementation.
---

# Cheap executor handoff: approved specification to Cursor

**Trigger:** A bounded documentation or implementation Change is selected and its product/technical authority and scope are settled. For editorial work, the intended new reader inference and claim-preservation boundary must be explicit. This skill prepares the **handoff only**; it does not implement, redefine or automatically dispatch it.

## Source of truth

Use the approved product contract, owning technical section, selected CHANGE.md/PLAN checkpoint (if any) and the small relevant source map. If these conflict, **stop and identify the contradiction**. Do not make Cursor choose product policy by improvising.

Have ChatGPT do the expensive design and broad source investigation before handing work to Cursor. For documentation Changes, the source is the canonical text, inbound references and the evidence that distinguishes target from realization. For frontend use [frontend engineering](../frontend-engineering/SKILL.md) to provide 2–5 real paths, named symbols, known API contract and discriminating negative case. The [2026-11 execution playbook](../../../research/legacy-engineering/frontend-execution-playbook.md) is dated evidence, not the current executor. Cursor rechecks those anchors locally, widening only for a concrete contradiction. Reuse the selected Change packet. A legacy initiative's FEATURE/PLAN is context, **not** an executable spec by itself. Do not generate a second plan for every small slice.

**Model-budget handoff gate (owner-selected):** Before dispatch, follow [Cursor model routing](../../references/cursor-model-budget-policy.md). Use `economical-researcher` (Composer 2.5 Standard) for doc/search/mechanical work; `economical-implementer` (Grok 4.6 Low Standard) for low-risk bounded code; `careful-engineer` (Grok 4.6 Medium Standard) for persistence, payments, permissions, retries, forks and integration. Specify the pinned profile and require observed actual model/effort/speed in the receipt. **No Auto, Fast, High/XHigh, Grok 4.7 or different-model fallback**, even if the execution is blocked. The parent must be set manually to Grok 4.6 Medium Standard. A model guard cannot itself change Cursor's parent selector.

**Cursor specialist selection:** [Seven-role roster and routing](../../references/cursor-model-budget-policy.md#approved-specialist-roster-seven-not-an-unrestricted-agent-marketplace). For exact test evidence use `evidence-runner` (Composer Standard, VERIFY); for canonical docs/links use `documentation-integrator` (Composer Standard, PATCH); for one unknown stack trace use read-only `failure-localizer` (Grok 4.6 Low, INVESTIGATE); for one high-risk diff's failure/replay correctness use read-only `boundary-reviewer` (Grok 4.6 Medium, INVESTIGATE). Retain the original `economical-researcher`, `economical-implementer` and `careful-engineer` for their established general tasks. **No role is mandatory if the parent can finish the work directly.** Never duplicate a Change's writer across agents. A failing test does not entitle the evidence runner to start refactoring; hand the exact failure to the parent for a new scoped task.

## Deliver this bounded packet

```text
ROLE: Cursor executor. Execute exactly one selected Change, documentation or implementation kind. No independent product redesign.
DEPTH: VERIFY | PATCH | INVESTIGATE; decide before spawning. VERIFY = exact command/evidence only, PATCH = already designed edit, INVESTIGATE = explicit unresolved question.
KIND: [documentation | implementation]
GOAL: [exact corrected reader inference or changed executable behavior]
AUTHORITY: [permanent product file + heading]; [technical file + heading]; [PLAN/checkpoint if applicable]
BASELINE: [actual existing behavior / known source revision]; verify changed files before editing
START HERE: [2-5 canonical headings / source files; inspect nearest dependent claims as necessary]
EDIT: [for docs: exact headings, sentences/split and inbound links; for code: essential behavior, failure/retry, tests]
KEEP: [existing behaviors/exports that must remain unchanged]
DO NOT: [specific excluded work, no extra modules or wholesale formatting, no paid providers / destructive actions]
VERIFY STAGE: [V0 local editing; V1 sub-slice; V2 Change closure; V3 integration; no global build per save]
PROVE: [docs: before/after claim preservation + broken-link/heading health + adversarial interpretation; code: focused test + negative case; explicit side effects]
RETURN: [diff/files, impacted claims/links, actual checks and failures, authority conflicts, unresolved owner decisions, exact next step]
```

```text
ROUTE CARD:
CHANGE: [packet path and its first screen only]
AUTHORITY: [one permanent heading]
ANCHORS: [2-5 source or test paths]
NEGATIVE: [one case that must fail closed]
VERIFY: [the focused command, then the named closure guard]
DO NOT READ: AGENTS.md, the change-workflow skill, or guard source, unless a printed guard failure names that file.
```

For a VERIFY handoff, strip irrelevant implementation sections and include only: workspace/branch, preconditions, exact command, safety boundary, permitted one-step recovery, stop condition, output receipt. Do not force the executor to read source/technical docs unless a failed prerequisite specifically requires them. PATCH uses named anchors; INVESTIGATE is a separately scoped research task. [Cursor execution-depth policy](../../../.cursor/rules/execution-depth.mdc) is applicable to parent and children.

The executor prompt contains the route card and does not also say "read AGENTS.md and the change-workflow skill." A small slice does not preload the full reconciliation skill. That skill stays available when the slice changes a permanent heading or the guard fails.

**Documentation-mode first-screen condition:** the selected packet must state **Code unchanged because ...** and an exact Markdown-only scope. Do not silently edit application source, run provider calls or mark a proposed policy as accepted merely to make prose coherent. If a current source fact cannot be verified, retain an explicit blocker or unknown rather than inventing a status.

**Economics:** Don't paste hundreds of lines of unchanged specs or code into Cursor. Link the exact headings and source symbols. Don't require a global repository scan, all tests, multi-agent reviews, new architecture, or extra documentation artifacts without a reason. Avoid parallel implementation agents editing the same owner. If a slice needs too much context, **split by accepted outcome**, not arbitrary file/line count.

**Authority:** Cursor may decide local wording and implementation details **only within already-selected meaning**; it must stop if a rewrite or code edit would change user experience, player permission, technical ownership, data semantics, model spend, security, privacy or verification authorization. Preserve existing worktree changes. It must not silently commit/push unless the actual task explicitly delegates Git writes.

**Receipt:** Report changed files, preserved and altered claims, dependent links, check commands/results and remaining uncertainty. Green tests do not certify aesthetics or full gameplay. After review, reconcile permanent documentation and rewrite the temporary checkpoint instead of accumulating an activity diary.

For substantial design work **before** this handoff, invoke `independent-design-review`; for implementation Cursor follows `implementation-slice`; for documentary changes follow [documentation-reconciliation](../documentation-reconciliation/SKILL.md) and the selected editorial Change. No executable delta is implied.
