# Cursor model-budget policy | Composer-first execution, planner-first reasoning

**Owner direction:** 2026-11-19, supersedes the earlier default-Grok routing. **Scope:** Cursor parent, custom/built-in subagents, handoffs and test runners in Offscreen RPG. **Status:** selected operational policy, not product architecture. Measure quality and billing before claiming any savings. Maintain the strict allowed-model/speed guard described below.

## Economic contract

ChatGPT is the **planner, architect, source investigator, failure-model designer and packet author**. Before implementation, ChatGPT inspects source and contracts, decides ownership, traces state and call paths, names the exact edit and negative test, and writes complete source-grounded instructions. Cursor is a **fast code-writing/building/testing/committing executor**. Its parent routes tiny tasks, checks evidence and integrates disjoint patches. A Cursor child should not need to independently invent a design or conduct a broad investigation.

**Default for ALL Cursor actors, including parent: Composer 2.5 Standard, Fast off.** A well-prepared complex domain can still be implemented as several Composer microtasks; domain risk alone does not force Grok. Validate risky outcomes with actual constraints, failing tests, independent inspection and review by ChatGPT. If novel reasoning is unavoidable, stop and return it to ChatGPT for a stronger packet *before* paying Cursor for exploration. **No automatic upgrade.**

## Only permitted model variants

| Route | Explicit configured model | Decision |
| --- | --- | --- |
| **C DEFAULT** | composer-2.5[fast=false] | Parent coordinating edits; almost all PATCH/VERIFY; docs; scripts; focused multi-file feature slices; source-grounded SQL, Temporal, auth and state edits **when a complete preapproved algorithm/constraint/test is supplied** |
| **L EXCEPTION** | grok-4.6[effort=low,fast=false] | Owner explicitly authorizes one named bounded task **after** C failed for a documented reason or ChatGPT identified an irreducible, justified implementation uncertainty |
| **M EXCEPTION** | grok-4.6[effort=medium,fast=false] | Owner explicitly authorizes a specified correctness-sensitive novel diagnosis or independent adversarial review after planner investigation, or C/L demonstrably insufficient; never ordinary implementation default |

Never use Grok 4.7, Grok High/XHigh, Fast, Auto, Inherit, unlisted models, silent substitution or automatic effort escalation. **Grok remains allowed by the subagent guard because there are legitimate exceptions; the hook cannot confirm an owner approval from the fields it currently sees.** A successful guard invocation proves the model is on the allowlist, **not** that the policy justified it. A dispatch receipt must record the exception approval and actual model, or it is a policy violation.

**Parent model is selected manually in Cursor.** Repository files and the subagentStart hook cannot change the parent's model dropdown or constrain internal calls that do not invoke the hook. The parent must start as Composer Standard where Cursor supports it; if unavailable, report the limitation before launching an expensive session. Built-in Explore should also be explicitly pinned to Composer Standard or not used. Existing .cursor/agents with inherit metadata must not be auto-routed; never allow a fallback to an unknown profile.

## Preferred workflow: one tiny patch at a time

1. **Select one already authorized Change**, with baseline SHA and canonical technical/product owners. Use the [Composer-ready microtask contract](composer-first-execution.md). A selected large Change is **not** a single child assignment.
2. **Parent starts lean:** read CHANGE.md plus TASKS.md for the selected Change; open only one task's specified companion section. Do not preload agent skills, all source maps, architecture wiki or past transcripts. Fetch current git status and affected ownership. No automatic subagent swarm.
3. **One Composer implementer** receives one microtask card: 1 outcome, preferably 1–3 file owners, 2–5 exact source/test anchors, settled code recipe and refusal conditions, one targeted normal+negative proof. It may read more when a specific failing symbol requires it but must explain why.
4. **Composer evidence-runner only if useful**, not a second mandatory agent for every patch. The implementer can run its own tests and report; parent runs exact integration and required docs guards once at the packet join.
5. On mismatch, **stop**, return one concrete file/symbol/error and mark the microtask unverified. ChatGPT refreshes design/investigation; then dispatch a newly bounded Composer task. Do not pay Grok to rediscover a stale handoff.
6. Parent serially integrates shared SQL migrations, Game Authority route files, workflow code and one kind cluster; use multiple workers only for disjoint file/resource ownership. Commit accepted work and keep exact receipt. A built/tested patch is not automatically a working multi-Pod POC.

**Do not replace correctness with blind file editing.** The child still verifies current source, asks one focused question when code conflicts with a documented invariant, runs relevant tests, and refuses unsafe production/destructive work. Source reading is permitted; **open-ended design research** is not the default workload.

## Subagent roster (pin actual file metadata)

| Role | Normal model | Scope |
| --- | --- | --- |
| economical-implementer | **Composer Standard** | Default code patch, including small contract/SQL/worker slices with exact design and tests |
| economical-researcher | **Composer Standard** | Narrow lookup/diagnostic when an unresolved question really requires live workspace |
| evidence-runner | **Composer Standard** | Run exact authorized command and factual receipt; do not fix by default |
| documentation-integrator | **Composer Standard** | Update ratified docs/links/Change ledger with named owners |
| failure-localizer | **Composer Standard** | One failing stack/result, one root cause and proposed correction, no code |
| careful-engineer | Grok Medium **exception only** | A named authorized high-risk implementation/diagnostic when ChatGPT+Composer cannot safely handle it |
| boundary-reviewer | Grok Medium **exception only** | A named independent adversarial diff review, not mandatory per Change |

The existing custom agents design-challenger and test-strategist use inherit and are **not approved for automatic invocation**. Prefer ChatGPT for those responsibilities; do not use them until their model is explicitly pinned and the owner asks.

## Execution depth is not model price

- **VERIFY:** execute the exact named safe command/fixture, report pass/fail/NOT-RUN and side effects. Composer for normal **and** high-risk verification. An approved database and clean test environment, not Grok's vocabulary, make a command safe.
- **PATCH:** follow a selected executable microtask with settled behavior and an explicit test. Composer for low-risk and complicated domains alike, provided the task is actually tiny and precise. High-risk correctness is proved by constraints, negative tests and code review.
- **INVESTIGATE:** exceptionally used in Cursor, when the live environment alone can answer a narrow question ChatGPT cannot inspect. Composer preferred. If deeper architecture reasoning is needed, return to ChatGPT; do not use a hidden Grok investigator.

**Model selection is not a proxy for safety.** Do not ask a model to perform a SQL migration against important data just because it is Medium. Precondition gates, resource authority, test DB scopes and stop rules still apply to all models.

## Dispatch and receipt format

Parent task card:

```text
CHANGE / TASK: <ID> / T-xx | DEPTH=PATCH | MODEL=Composer 2.5 Standard
BASE: <verified SHA> | SELECTED: <yes/no> | WRITE OWNER: <paths>
OUTCOME: <one measurable code or test result>
READ FIRST: <2-5 source symbols/test files>
APPLY: <ordered exact edits, contracts, invariants; linked TASKS.md section>
REFUSE: <specific unsafe state/side effect/scope>
PROVE: <exact command/cwd + positive and discriminating negative>
RETURN: <diff, results, owner docs updated, observed actual model, unresolved error>
```

Keep this a compact pointer, **not a pasted 15,000-token source research dossier**. Default one child, no subchildren. If a microtask unexpectedly requires broad reasoning, it wasn't Composer-ready and needs ChatGPT repair.

Receipt after each accepted microtask: HEAD/commit, touched files, exact commands/exit/test count, one negative, doc heading impacted, actual model/speed or unverified, total observed Cursor tokens and charge **if actually available**, time spent/rework, and whether the next microtask's prerequisites still hold. Do not fabricate costs or a baseline.

## Guard, manual settings and experiment

- [Guard](../../.cursor/hooks/model-budget-guard.cjs) **defaults to Composer Standard only**; it permits Grok 4.6 Low/Medium Standard solely when a local hook process is explicitly configured with `OFFSCREEN_CURSOR_ALLOW_GROK=owner-approved`, after the owner approves a named exceptional task. This environment flag is an opt-in convenience, **not cryptographic approval**, and cannot prove what the parent model picker or billing system used. Never commit secrets or leave a blanket opt-in permanently enabled.\n- [Guard](../../.cursor/hooks/model-budget-guard.cjs) deliberately permits only explicit Composer Standard and Grok 4.6 Low/Medium Standard. It fails closed on ambiguous model/speed. [Guard tests](../../.cursor/hooks/model-budget-guard.test.cjs) validate input parsing, **not actual Cursor billing or fallback**.
- Parent select **Composer 2.5 Standard** manually, turn Fast/Auto off. Cursor built-in Explore should be Composer Standard or disabled if variant cannot be verified. The hook sees only subagentStart, not all in-product model usage. Inspect Task cards and the usage dashboard for actual billed variants.
- First perform one small Composer patch and one representative sensitive Composer patch with tests and record measured usage. Only then estimate cost per accepted task versus earlier Grok traces. WIKI18 owns the cost-and-rework experiment. A zero-tool stub, mock PASS, or unverified model selection is not evidence of savings.
- If cheap execution causes retries, extra context, missed tests or owner correction, report total spend **including rework**, not the attractive price of its first attempt.

**Owner command:** the planner spends reasoning tokens; Cursor spends editing/test tokens. The cheapest durable result is the one that is both correct and does not need to be written twice.
