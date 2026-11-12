# Coding-agent workflow evaluation

**Status:** Evaluation protocol; **no measured Cursor token/time improvement has yet been established**. The owner's selected 2026-11-12 default is **ChatGPT source investigation/design/review + inexpensive Cursor implementation**. Claude Code/subagents remain optional, not a required third subscription. This evaluates coding agents, not the game's inference runtime or narrative token bill.

## Measure outcomes, not agent enthusiasm

Observe a task through: initial comprehension, design/source investigation, canonical spec decisions, implementation, verification, independent review and rework. A "fast" change with two silent regressions is expensive. A very thorough review that consumes more human attention than the defect it prevents may also be wasteful.

Use a small ledger with:

| Dimension | Record |
| --- | --- |
| Task | Fixed objective, scope, approved spec heading, source revision, expected negative case |
| Tool use | Which agent/model, role, number of sessions, context resets, read/tool calls, and exact prompt/output tokens **only if actually exposed** |
| Cost | Known subscription marginal charge or reported metering; otherwise *not measurable* (do not invent per-token prices for subscriptions) |
| Human attention | Number of clarifications, copied artifacts, rejected designs, manual interventions and what they achieved |
| Correctness | First-pass compile/targeted test, meaningful review findings, defects later caught, runtime/human acceptance separately |
| Knowledge | Whether the agent found the right owner quickly; irrelevant docs loaded; repeated sources or mistaken stale instructions |
| Completion | Is the outcome correct, maintainable, documented and easy to resume from a fresh context? |

**Evaluation tasks** (do not run them automatically or change application behavior just to benchmark):

1. **Docs reconciliation:** a purposely stale but bounded product/technical/code statement. Test finding owner, preserving truth, repairing one route and avoiding context flooding.
2. **Frontend change:** a concrete React/Next.js screen state such as pending/failed/retry, evaluated for spec fidelity, state ownership, keyboard and focus behavior, stale data handling and visual acceptance.
3. **Cross-service design:** a finite action or provider accounting failure path, evaluated first as a *read-only architecture task* for concurrency, transaction authority, restart and double effects. No real provider calls.

For a comparable baseline, hold goal/acceptance and repository revision as close as feasible; distinguish improvements from task familiarity, model-version changes or warmed caches. It is okay to compare *qualitatively* before paid tools are connected, but don't claim a cost saving from imagination.

## First harness activation tests

- Confirm Cursor loads root `AGENTS.md` and doesn't automatically inject the harness-only `.cursor/rules/project.mdc` on an unrelated coding task.
- Inspect Cursor's available `.agents/skills/` and compatible `.claude/skills/` for duplicate skill names/advertisements.
- When Claude Code is connected, check `/context all`, `/skills` and `/usage`; run `/doctor prompt-audit` where supported. Verify that the root import appears, conditional skills are callable and the cost model matches the installed plan.
- Ask one read-only source question and record whether the agent found the correct product/technical owner without pre-reading unrelated docs. **Don't change game code just to validate harness discovery.**

See [harness architecture](../../.agents/HARNESS.md) and [context reference](../../.agents/references/context-economics.md). Real-client discovery remains **unverified** until these checks are actually performed.

## Cheap smoke test before buying another subscription

1. Start a fresh coding-agent context at repository root; confirm it sees only minimal rules, can find product and technical owners, and does not ingest all `docs/`.
2. Ask the agent a **read-only** question: report the active Change **or correctly identify that none is selected**, distinguish the parked S3a packet, and locate authority/source only for a genuinely selected task. Require a compact, source-anchored answer with uncertainty clearly marked.
3. Invoke `/independent-design-review` (or point directly to its skill) on a draft. Check whether it raises a real competing design and failure case instead of praising or inventing requirements.
4. For Cursor, provide the `cursor-handoff` packet to a narrow **approved** change. Require smallest safe verification, no unapproved provider spend, and a factual diff report.
5. Record human time, unnecessary reads, budget/tool usage if exposed, errors caught and what the next agent needed. Revisit the system only in response to concrete recurring friction.

A skills menu rendering successfully is **discoverability**, not proof of coding quality. "All tests pass" is verification evidence for a declared scope, not proof of playability, design quality or lower development cost.

## Documentation retrieval smoke cases

Use these **read-only** questions in a fresh coding-agent context; assess whether the agent finds the correct owner/heading without a whole-codebase investigation. Record files read, wrong detours, actual reported tokens (if available), answer accuracy and human intervention.

| Fresh-agent question | Expected documentation route |
| --- | --- |
| When is fictional time allowed to advance after an action is accepted? | [Time and autonomy](../time-and-autonomy.md) → [committed time](../technical/committed-time.md#permission-to-advance); inspect code only to verify current implementation |
| What makes an NPC/relationship detail canonical and recallable? | [Continuity](../continuity-and-consequences.md) → [canonical ownership](../technical/canonical-files.md#one-owner-per-kind-of-truth); retrieval research only when the question concerns discovery |
| What happens if a provider times out after dispatch? | [Temporal/execution recovery](../technical/execution.md#retry-boundaries-and-uncertain-side-effects) → [usage holds](../technical/usage-policy.md#hold-and-recovery-semantics) |
| Who owns a form's server state, and what should the player see? | [Player experience](../player-experience.md) → [client/identity](../technical/client-and-identity.md) → [code map](code-navigation.md) |
| Was a saved clue note actually recalled after leaving a scene? | [Connected evidence](connected-poc-proof.md#memory-reinspection--2026-10-23) → exact proposed/published/selected/packed evidence, **not** a guessed success from a note patch |

The current repository has **no measured token reduction or retrieval success rate** for these cases. A passing file-link check is only a structural sanity check.

## Native role discovery and permissions

After installation, check that Claude sees exactly the two relevant `.claude/agents/` specialists and that Cursor resolves the same names from `.cursor/agents/` without creating confusing duplicates. Invoke one on a **read-only question** with exact authority references; verify its output is a critical design/test receipt rather than edits or an extra agent team. Inspect actual client-reported subagent model/usage; the wrappers intentionally use `inherit`, not a claimed cheap price. This test remains **not performed** in the real clients.

## Role-orchestration smoke test

For a representative UI feature, request a `role-orchestration` plan **without coding**. The response should identify product/technical authorities, a minimal role sequence, 1–2 valuable independent judgments, explicit write/test permissions, handoff receipts, a negative acceptance case and how to return contradictions upstream. Compare with a plain one-agent plan. Record *actual* role drift, irrelevant reads, human corrections, extra agent calls and quality findings when the workflow is used.

Do not confuse creation of role Markdown or native subagent files with proof they improve productivity. A multi-agent plan that costs more and offers no new evidence should lose to one well-briefed agent.

## Knowledge-activation evaluation

A controlled read-only trial should ask the same model to recommend an architecture for a realistic task, once with the plain request and once with **the relevant professional knowledge manual**. Use comparable source revision/context where possible and avoid contaminating the second run with the first answer. Judge *selection quality*, not verbosity:

- Does it identify 2–3 actually plausible alternatives, including doing less?
- Does it name the constraints and domain interactions that change their ranking?
- Does it recognize key lifecycle/evolution/operations costs, not just race bugs?
- Does it express a reasoned preferred choice and which new fact would reverse it?
- Does it identify correct authority and evidence, without inventing product requirements?
- How many extra tokens/reads and human corrections did this deeper judgment cost?

Use [scenario lab](../../.agents/knowledge/scenario-lab.md) as an adversarial source; it is **not** a benchmark result. No measured uplift in coding-agent design quality or usage efficiency is claimed yet.

## Security, API, test and observability knowledge trials

To evaluate whether the new professional manuals improve **first-pass design judgment**, use the read-only [decision lab](../../.agents/knowledge/scenario-lab.md) scenarios G–J. For each, give a fresh agent a fixed brief *without* a manual, and an independent fresh context the same brief with its appropriate manual. Avoid letting the first answer leak into the second trial. Compare **quality per total context cost** rather than number of buzzwords.

| Trial | Initial-design signal worth measuring | Weak response it should defeat |
| --- | --- | --- |
| G, privileged debug endpoint | Distinguishes authentication, object/property/function authorization, provider-spend authority and environment isolation | "Just add auth middleware and hide the route" |
| H, paginated history API | Compares pagination/consistency, caching/privacy, client compatibility and HTTP status semantics | "GET all rows and return 200" |
| I, green test suite | Chooses tests at the correct boundary and challenges mock/shared-state assumptions | "Coverage is high, ship" |
| J, slow request | Compares latency/queue hypotheses and selects the least costly discriminating telemetry | "Add more logging and increase timeout" |

Record actual file/section reads, model usage if visible, extra investigation, counterexamples discovered, constraints that reverse the choice, answer quality and human corrections. **These are proposed experiments, not evidence that knowledge packs already improve outcomes.**

## Data, caching and release knowledge trials

The [scenario lab](../../.agents/knowledge/scenario-lab.md) now has K–M for three new specialties. A knowledge-assisted **read-only** design answer should identify alternatives and criteria that materially alter its initial recommendation:

| Scenario | Knowledge that should change a strong first recommendation | Bad first answer |
| --- | --- | --- |
| K, required stored field | Empty versus live DB, lock/scan/backfill, old/new writers, versioned source and rollback | "Just make it NOT NULL" |
| L, slow page and Redis | SQL/React critical path, cache identity/freshness, stampede and outage economics | "Install Redis and set a TTL" |
| M, worker rollout | Artifact/runtime identity, mixed worker/schema/API versions, queued side effects and user-observed completion | "Roll back the Docker image" |

Test with comparable independent contexts, with/without relevant manual, holding scenario constant and measuring first-pass decision quality, manual reads, actual token usage if shown, human corrections and false-positive complexity. These are **proposed trials**, not observed wins.

## Current status

- Existing small entrypoint, conditional skills, feature workflow and checkpoint-size audit: **implemented as repository documents**.
- Multi-tool workflow efficiency: **not benchmarked**; no Claude Code/Cursor side-by-side experiment in this record.
- Subject-specific engineering knowledge: **first curated version only**; requires trial on real coding tasks.
- Next measurement: one source-grounded **ChatGPT-prepared Change brief/source map** and one narrow **Cursor implementation**, with actual loaded files, token usage if exposed, wall time, acceptance and rework; compare against an otherwise similar unfocused search before claiming savings.


## 2026-11-12 retrieval-economics smoke tests (not yet performed)

**Why these exist:** 240 Markdown/rule files and ~2.1 MB of docs are useful only if small-context Cursor retrieves a few relevant paragraphs/symbols without reading everything. The [L0–L4 standard](../../.agents/references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents) and [source-adjacent maps](../../apps/web/README.md) are **documents**, not proof of reduced token usage. Compare the same question/revision in fresh Cursor Ask/read-only contexts with and without an exact map route.

| Probe | Correct minimal route | Must conclude without broad search |
| --- | --- | --- |
| **P1, Start retry:** “Can the same Start story UUID be retried safely if pace changes after timeout?” | W09 first screen → `apps/web/src/features/stories/README.md` → `opening-preview.tsx:startStory` | UUID preserved; body currently rebuilt; freeze full payload and GET story before replay. W19 is for resolutions, not Start |
| **P2, charged resolution:** “Where would read-only GET receipt fit and what must it never do?” | W19 → `packages/application/src/stories/README.md` → `resolution.ts:admit` and `reads.ts` | Owner-scoped persisted read, same ID/payload comparison; GET never enqueues/generates; 202 admission ≠ publication |
| **P3, SSE after commit:** “If we emit version hints only from Nest controller, what breaks?” | W16 → `packages/application/src/stories/README.md` → viewVersion writers | Worker/other campaign transitions can commit without HTTP handler; use a transactionally committed hint and audit writer sites |
| **P4, Chamber security:** “Do we need a new hosted developer-role system?” | W12 → `apps/web/src/features/developer-tools/chamber/README.md` → `apps/api/src/app.ts:createApp` | **No:** ordinary API omits dev controllers unless `developerTools:true`; test boot modes and per-owner scope |
| **P5, tooling:** “Why is a simple Vitest test so slow?” | W20 → `turbo.json` + `apps/web/package.json` | Current Turbo `test` depends on same-package `build`; separate `test:fast` lane, measure warm/cold, do not blindly rewrite legacy dist suites |
| **P6, unrelated control:** “Who actually advances fictional time if the browser is closed?” | `packages/application/README.md` → `docs/technical/committed-time.md` exact relevant heading → campaign/clock/worker symbol only if needed | Browser/React timers are not authority; accepted durable time/deadline work belongs to application/DB/worker. A frontend atlas should **not** be needed for this unrelated domain |

**Pass criteria for a truly useful route:** correct named owner and invariant, one plausible negative case, no invented source/feature, no unnecessary whole-file dump of 30-KB manuals, and no more than the immediately relevant map + 2–5 source/contract files in the straightforward case. This is a **review trigger**, not a hard read ceiling; expanding for a real mismatch is allowed.

**Record:** fresh context/model, prompt variant, files/sections/tool reads, actual tokens or usage **if Cursor reports them**, wall time, correct/wrong claims, owner corrections, rework. Static Markdown bytes can illustrate exposure but **cannot** establish model token cost or 20% savings. The unconnected local Cursor UI cannot be inspected from this GitHub documentation session.
