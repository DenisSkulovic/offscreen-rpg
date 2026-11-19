# Cursor model-budget policy | controlled cost experiment

**Decision:** 2026-11-19. **Status:** selected by owner for all new Offscreen RPG Cursor work, including parent orchestrators, built-in Explore, custom/automatic subagents and background delegation. This is a reversible *quality-versus-cost experiment*, not permission to degrade tests or silently upgrade. The model choice is an **operational execution policy**, not gameplay/product authority.

## Exclusive allowlist

| Route | Exact intended configuration | When |
| --- | --- | --- |
| C: cheap implementation/research | `composer-2.5[fast=false]` (**Standard only**) | Link repair, doc edits, direct source navigation, code search, mechanical refactors, single-file test/config edits, straightforward fixture updates, lint fixes and basic verification |
| L: bounded engineer | `grok-4.6[effort=low,fast=false]` (**Low, Standard**) | Narrow multi-file TypeScript changes where source/contract/tests are explicit, familiar component edits, focused unit tests, low-risk review or debugging |
| M: careful engineer / parent | `grok-4.6[effort=medium,fast=false]` (**Medium, Standard**) | Default parent orchestrator and substantive bounded Changes; PostgreSQL transactions, state reconciliation, concurrency, Temporal/Rabbit retries, funding/provider custody, security, migrations, sensitive context/permission rules, cross-service coordination, high-stakes negative review |

**Never use:** Grok 4.7 (any tier); Grok 4.6 High or XHigh; Fast of any model; Auto/Intelligence routing; any other model as a substitute; automatic effort escalation. The parent must not dispatch unknown or generic inherited subagents. No 'upgrade because hard'. If Medium fails or is not confident, **stop, report the specific evidence and request a narrower task or owner decision**. Escalation here means from Composer→Low→Medium only, with explicit reason and a new bounded attempt; never High/Fast/4.7.

**Cost vs correctness:** cheaper is not permission to skip test/permission/retry/source documentation obligations. Repeated failures, growing tool exploration or semantic drift are evidence the policy may be worse; record those failures rather than pretending savings. Prefer completing one properly bounded task without an unnecessary extra subagent.

## Task-depth versus model-cost routing

**First choose investigation depth, then model.** Cursor-only [execution-depth rule](../../.cursor/rules/execution-depth.mdc) defines `VERIFY`, `PATCH` and `INVESTIGATE`. The parent MUST pass `DEPTH=...` in every delegated task. **Risk is not depth:** a high-risk but fully specified suite run should use **Medium + VERIFY**, not Medium + repository exploration. An exploratory unknown can be `INVESTIGATE` with Composer for simple discovery; the parent reviews any consequential design decision.

| Known task shape | Depth | Lowest acceptable model | Expected source discovery |
| --- | --- | --- | --- |
| Run an already named test or exact CLI, record counts | VERIFY | Composer Standard for ordinary checks, Grok 4.6 Medium for money/persistence/security checks | Exact command, preconditions, diagnostic only if failed |
| Make trivial links/docs/test edit with exact anchors | PATCH | Composer Standard | Exact owners, focused checks |
| Make bounded safe multi-file patch with approved interface | PATCH | Grok 4.6 Low Standard | Route card, 2–5 anchors, one negative |
| Implement retry/transaction/permissions/canon migration | PATCH | Grok 4.6 Medium Standard | Specific authority + relevant source/tests, not whole wiki |
| Locate unknown implementation owner or assess competing designs | INVESTIGATE | Composer for narrow search; Grok 4.6 Medium if substantive correctness judgment | Explicit unknown/questions, evidence-led expansion only |

**Dispatch quality gate:** the parent must include task kind, depth, goal, exact command or edit, source anchors, negative case, preconditions and stop condition. Do not substitute three skills and a vague request for a route card. Avoid an exploratory subagent where the parent already knows the answer. If VERIFY fails, return NOT-RUN/FAIL and one concrete blocker rather than quietly undertaking an architecture audit. Do not spawn a second agent just to re-read the first agent's context.

**HK03 example:** the 32-case Storyteller integration suite task is **Grok 4.6 Medium Standard + VERIFY** because it has a named command and a sensitive database/Temporal safety boundary. The agent need only inspect status, ensure named disposable prerequisites, run the one test and record counts. It must not treat every repository README as prerequisite reading.

## Approved specialist roster (seven, not an unrestricted agent marketplace)

Cursor automatically discovers custom agents from `.cursor/agents/*.md`; its descriptions influence automatic routing. Prefer **zero subagents** for a short action the parent can perform directly, and never duplicate the same context in a second agent without a distinct verification question.

| Agent | Allowed model | Use exactly when | Do not confuse with |
| --- | --- | --- | --- |
| `economical-researcher` | Composer 2.5 Standard | A narrow source-navigation question or small general low-risk task | A full-repo audit |
| `economical-implementer` | Grok 4.6 Low Standard | Source/test PATCH, low-risk, named symbols and accepted contract | Security/money/state-concurrency work |
| `careful-engineer` | Grok 4.6 Medium Standard | Correctness-sensitive PATCH or authorized integration | The read-only independent reviewer |
| `evidence-runner` | Composer 2.5 Standard | VERIFY already specifies the exact test/command, side-effect safety and receipt | A debugger: return failing evidence rather than silently fixing |
| `documentation-integrator` | Composer 2.5 Standard | PATCH to ratified canonical docs, links or lifecycle facts with one editing owner | Gameplay design or arbitrary backlog processing |
| `failure-localizer` | Grok 4.6 Low Standard | INVESTIGATE one observed failing stack/command whose root cause is unknown | An implementer: return a patch proposal, no edits |
| `boundary-reviewer` | Grok 4.6 Medium Standard | Independent, **read-only** adversarial review of specified high-risk diff/commit | Another implementation pass or routine review of every task |

**Dispatch algorithm:** select **needed outcome → DEPTH → risk tier → role**, not role first. If the parent already knows the fix and can do it cheaply, don't spawn a failure-localizer. If a test runner can report PASS/FAIL directly, don't ask it to investigate. Don't launch a boundary-reviewer on every tiny edit; use one for real transaction/attempt/auth/replay/fork risks, ideally after the patch. For shared worktrees, use **one writer** for one file owner and serialize follow-on reviews. Reviewers/localizers are read-only.

**Output contract:** before launch provide `ROLE, DEPTH, ALLOWED MODEL, GOAL, AUTHORITY, ANCHORS, NEGATIVE, VERIFY, DO NOT, RETURN`; keep the route card concise, skip irrelevant fields for VERIFY. The parent records actual billed model and quality (tests, rework), not just the label it requested. **Do not create another specialist solely because the task domain has a new noun.** Add a role only after observing repeated source-grounded need that the seven cannot handle.

## Strict routing algorithm for the parent

1. **Is this a trivial task that can be done in the parent with no new context?** Do that; subagents have startup/context overhead.
2. **Search, narrow doc update, source inventory, simple test/fixture, mechanically described code?** Delegate to **C**.
3. **Precisely specified low-risk multi-file implementation with explicit source anchors and negative tests?** Delegate to **L**.
4. **Any money/permissions, schema migration, concurrency, game-state admission, Temporal workflow, broker delivery, durable storage, auth, stale-root, fork safety, unknown architectural contradiction or multi-service joining?** Use **M**. Parent remains **M**.
5. **Ambiguous complexity:** choose **M** if correctness-sensitive, otherwise C. If the task has no safe explicit scope, **do not delegate**, report the missing contract first.
6. Parent must name **the selected allowed model** and custom agent role in each Task dispatch when supported; do not use Auto/inherit/default. Each child must report its displayed model, effort, speed and task ID *as actually observed*, or `unverified`. The coordinator checks Cursor task cards and usage dashboard rather than trusting a prompt.

**Do not subdivide one cheap task into several cheap subagents to manufacture parallelism.** Shared file owners require one integrator.

## Model enforcement and limitations

- Custom profiles in [`.cursor/agents/`](../../.cursor/agents/) pin a model and variants. Grok aliases or frontend overrides vary across Cursor versions; preferred explicit syntax uses `effort=low|medium,fast=false`; alternative official-looking model aliases must be **verified in task card before use**. The base Grok 4.6 model defaults to High on some plans; never omit effort.
- The project [`subagentStart` hook](../../.cursor/hooks.json) calls [the local model guard](../../.cursor/hooks/model-budget-guard.cjs). It is intentionally **fail closed**: only explicit recognized model IDs/effort/speed are allowed; unknown/missing options or unsupported models are denied rather than silently falling back to a higher-cost model. This covers **subagent starts visible to Cursor hooks**, not the parent model, automatic internal calls that bypass hooks or billing behavior after launch. Confirm actual usage.
- If Cursor reports only `grok-4.6` or `composer-2.5` without effort/speed details to the hook, the guard rejects it. Do **not** disable the guard or loosen it blindly. Inspect Cursor version/task card; correct model selection or choose manual non-delegated execution and report the limitation.
- Cursor may fall back to a compatible model if an ID is unavailable and has had reports of custom subagent model pins not being honored. A task can pass a start-time hook yet be billed differently if a later provider choice/fallback happens; verify in the usage dashboard. The repository cannot enforce parent selector or all actual billing. Enterprise/team model access controls provide stronger prevention where available.
- Cursor **Plus / legacy Start** can fix Grok 4.6 at Medium Standard; Low may not be selectable. If so, use C or M, **do not request High**.
- The hook intentionally does not send network traffic, read private task content, use a paid API or log user narrative.

## Rollout / test gate

1. Before a multi-agent batch, have Cursor run the repository's local policy tests (`node --test .cursor/hooks/model-budget-guard.test.cjs`) and run 3 dry-run subagent launches: Composer Standard, Grok 4.6 Low Standard, Grok 4.6 Medium Standard. **Do not interpret test fixtures as actual Cursor model routing.**
2. Check the Task cards/usage dashboard for the **actual** variant. If any Fast, High, 4.7, Auto or unknown model is billed, stop launching the batch and investigate model override/fallback; record the discrepancy.
3. For first 5–10 bounded Changes, record per task: expected vs actual model/effort/speed, reported input/cached/output tokens and USD where available, wall time, unique source files, test outcome and rework. When fields are absent, leave `unknown`, not zero. The existing WIKI18/W2–W3 trace benchmark remains the evaluation owner.
4. Compare *cost per correctly completed Change*, code quality, regression/rework and time against the earlier baseline. Keep or revert the experiment based on actual evidence, not a synthetic benchmark victory.

## Human setup in Cursor

1. Select **Grok 4.6 Medium, Standard (Fast off)** for parent Chat/Agent sessions. Disable Auto, 4.7, High and Fast in model picker/available-model settings where supported. Repository rules alone do not switch that parent dropdown.
2. For **Settings → Agents → Subagents**, set the built-in Explore model to **Composer 2.5 Standard** where available. If Cursor provides no way to pin the built-in subagent's exact standard variant, project hook denies ambiguous starts; prefer explicit C/L/M custom subagents.
3. Inspect each subagent task card/usage row for actual billing model. If a configured subagent silently falls back, abort the cost experiment until fixed. Some plans and Cursor builds have different setting availability.
4. A blocked subagent is a policy success, not a reason to spawn an unapproved stronger fallback. Choose an allowed task shape/model or request permission to change the policy.

**References checked 2026-11-19:** https://cursor.com/docs/subagents, https://cursor.com/docs/hooks, https://cursor.com/help/models-and-usage/grok-4-6. Product/docs may change; revalidate IDs/hook payload when Cursor updates.
