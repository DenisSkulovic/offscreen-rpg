# AI-assisted development operating system

**Design target:** [independent coding-agent standard](coding-agent-target-standard.md). **Expert sources:** [coding-agent knowledge](coding-agent-knowledge.md). **Measurement:** [evaluation protocol](coding-agent-evaluation.md). All three address tools developing the game, not the in-game model.

**Status:** Engineering method, revised 2026-11-11. This document guides *development agents*; Storyteller inference and gameplay spending have separate contracts. Root `AGENTS.md` is the small agent entrypoint. Product and technical specifications remain the authority for game behavior.

## The ideal: intention, implementation, evidence

Build a coherent system that can be improved without rereading or regenerating the whole repo. Each significant change should move through these layers:

| Layer | Question | Canonical owner | Failure to avoid |
| --- | --- | --- | --- |
| Product | What should the player experience, and why? | `docs/vision.md`, `docs/concepts.md`, relevant product topic | Building the first clever implementation without an agreed experience |
| Technical | Which component owns data, transitions, side effects, failures and limits? | The affected `docs/technical/` contract | Duplicating state authority or solving one bug with extra infrastructure |
| Executable | What actually runs? | `apps/`, `packages/`, `tools/` | Code that silently reinterprets intent or hides complexity |
| Evidence | Did this implementation fulfill the intended result? | Focused tests, traces, `docs/progress.md`, dated QA evidence and human play | Documentation and code mutually agreeing while gameplay fails |

**Docs-first is a change-order rule, not a denial of implementation evidence.** To build new behavior, settle product intent first, technical ownership second, code third, evidence fourth. To fix a bug against an already correct contract, investigate code first, repair it and add evidence; update documentation only where it drifted. A generated solution never wins merely because it exists.

**Target-first renewal:** for a significant code-quality, architecture or UI-modernization campaign, first establish a coherent desired end state independent of the current implementation. The target is the basis for a source-grounded gap audit, then small sequential implementation Changes that converge on it. The [target-first rule](../../.agents/rules/target-driven-renewal.md) and area target documents govern that path. Do not substitute random local cleanups for a destination.

## Task sizes and process

**Small code task (fix, copy, local refactor).** Agent reads the supplied task and narrow owner/source, edits one coherent slice, runs the cheapest useful check, inspects diff, reports. No Change dossier, architecture meeting, or mandatory full handbook read.

**Significant code-bearing Change or cross-package rework.** Choose an owner-prioritized engineering or product outcome → inspect actual source and alternatives → settle the relevant product/technical boundary → write one bounded `CHANGE.md` with a planned source/test/config delta and discriminating negative proof → authorize and implement in small slices → review actual evidence → reconcile permanent docs and retire the packet. The `change-workflow` skill owns this route. `docs/changes/README.md` may intentionally select **none**. Historical `docs/features/` dossiers are never an implicit coding queue; a portfolio refactor need not add gameplay functionality.

**Bug investigation.** Reproduce/identify the observation → compare competing causes against the full relevant source/trace → find an experiment that distinguishes them → fix the owning layer → regression check → update permanent owner if assumptions changed. Do not start by designing new systems.

## Roles before tools

A coding agent is a *general execution surface*, not a complete engineering team. For a significant task use [role orchestration](../../.agents/roles/README.md), the [specialist role catalog](../../.agents/roles/catalog.md) and [handoff contract](../../.agents/roles/assignments.md). A product strategist, visual critic, backend architect, test strategist and implementation verifier may all be needed at different **stages**; the selected ChatGPT/Claude/Cursor tool is secondary. A role is not automatically a new agent or simultaneous model request. For a feature, choose a minimal dependency graph with approval gates and optional independent critics, not a mandatory sequence of all possible roles.

## Tool roles, not a mandatory model procession

| Role | Best-fit tool | Deliverable | Boundary |
| --- | --- | --- | --- |
| Creative product architect | ChatGPT conversation | Product decisions, alternatives, player acceptance, important authored Markdown | Doesn't certify unfamiliar implementation from imagination |
| Source-grounded investigator | **ChatGPT with the connected GitHub repository** (current default) | Small evidence packet, source-adjacent maps, key architecture/race risks | Read-only source review before Cursor; preserve implementation evidence limits |
| Implementation executor | Cursor fast coding model | One bounded diff and factual check receipt | May choose local implementation details, not rewrite user goals |
| Independent review | **ChatGPT** by default; independent alternative only when it adds evidence | Contract violations and discriminating tests | Usually no edits; do not duplicate every Cursor read |
| Deterministic harness | Tests, scripts, typechecker, CI and manual play | Reproducible evidence and limits | No paid inference or unapproved destructive side effects |

A model handoff should include **new information**, not a repeated wall of the same README. Start a fresh tool context when the role changes, carry forward the approved Change contract, exact file anchors, evidence and next slice. No automatic subagent multiplication. A separate reviewer is valuable when it has an independent perspective, not when it reads the same 50 files a second time.

## One efficient implementation packet

Use this shape for Cursor and other coding executors; aim for *information density*, not a hard word count:

```text
MODE: Implement one approved slice. No architecture redesign or new paid tools.
GOAL: [one observable outcome]
AUTHORITY: [product doc heading], [technical doc heading]; current plan: [optional exact checkpoint]
SOURCE ENTRY: [3-6 likely files/symbols; these are leads, verify them]
REQUIRED: [behavior, invariant, relevant failure/retry path]
OUT OF SCOPE: [explicit exclusions]
VERIFY: [smallest safe test/typecheck/manual acceptance]; no live LLM calls
RETURN: changed files, checks/result, contract mismatches, next action, provider spend status
```

If a PLAN checkpoint already contains those facts, reference it. Do **not** create a second giant prompt file for every slice. Don't paste entire code files, full repo trees, or unchanged documentation into a prompt when the agent can read one named section.

**Current tool allocation (Nov 12 owner decision): ChatGPT handles deep reasoning, source navigation and review; cheap/fast Cursor models implement bounded code. Claude Code is optional and not required or subscribed for this workflow.** The [layered navigation standard](../../.agents/references/documentation-navigation-standard.md#2026-11-12-explicit-layered-retrieval-contract-for-cheap-coding-agents) and [source-adjacent web maps](../../apps/web/README.md) replace repeated broad archaeology. Do not create another agent role merely because it appears in a historical architecture diagram.

## Context economics

Treat **cost per correctly delivered outcome** as the target. Raw input token savings are useful only when they don't increase wrong turns, rework or unverified code. Observe the following when selecting tools or a task:

- **Context routing:** the root entrypoint contains only boundaries and navigation; skills are discovered by description and loaded on demand; reference docs are read by topic/heading; source is opened by symbol and nearest callers.
- **Evidence budget:** prefer one targeted source trace and narrow test to repeated global searches, entire-file reads, duplicate summaries and repeated full builds.
- **Role separation:** spend expensive reasoning on genuinely hard decisions and risky reviews; use fast implementation for bounded execution; don't call all three models for trivial work.
- **Output budget:** require compact evidence packets and changed-file handoffs. Preserve high-value design nuance at its canonical owner rather than in transient conversations or a second spec.
- **Cache/reuse:** stable instructions and documented contracts help repeated work; provider caching is tool-specific and should be measured rather than assumed.
- **Live-provider budget:** game Storyteller/OpenRouter costs are independent of coding-tool allowance. Never conflate a historical $10 OpenRouter deposit with current available coding budget.

A skill is justified by a recurring, identifiable **procedure** or a specialized operation with real failure modes. A reference document is justified by knowledge an agent cannot reliably infer from code, such as app-specific architectural contracts or UI design language. Do not create 20 generic skills because 20 topics exist. Add one when there is a repeatable trigger, concrete inputs/outputs, and a way to judge whether it improved work. Periodically remove or consolidate unhelpful ones.

## Anti-slop review lenses

Every significant slice should face the questions relevant to its risk, not every checklist in the world:

1. **Product:** Does the resulting player behavior match intent, including boredom/quiet moments, timing and narrative memory where relevant?
2. **Authority:** Who owns this decision and state? Does the AI merely propose what code must admit? Is there one publication/state transition?
3. **Failure:** What if the call times out, a workflow wakes twice, a player retries, a response is malformed, a revision changes or memory retrieval misses context?
4. **Dependencies:** Did the change add new modules/services/packages without a necessity the existing architecture couldn't meet?
5. **Observability:** Can a developer distinguish proposed response, accepted state, selected evidence, packed request and committed publication?
6. **Evidence:** What was actually exercised offline, with providers, and by a human? Are test/build claims fresh and reproducible?
7. **Maintainability:** Can the next agent find the owner in one short route, or did this change leave a tangled coupling or duplicate doc?

An independent review should report precise defects with paths and failure scenarios. A vague review saying “consider better architecture” has little value.

## Documentation maintenance cadence

Reconcile documentation **as part of a completed slice** when contracts or implementation status change. Do not routinely regenerate all docs after each commit. `docs/README.md` routes questions; `docs/progress.md` owns honest current evidence; package READMEs map actual wiring; feature dossiers are temporary workspaces. Larger library restructuring needs a measured retrieval/navigation problem: multiple competing owners, recurring broken links or agents repeatedly loading irrelevant large documents.

For a targeted reorganization: map incoming links and owners → preserve the intended contracts → consolidate duplicates → update routes → check representative reading paths → validate claims against code/evidence → retire obsolete docs. Reducing bytes without protecting meaning is not an improvement.

For maintenance, `pnpm repo:docs-health` (or `--json`) measures each selected Change or legacy initiative checkpoint without calling providers. Oversized checkpoints are review candidates, not errors: move unique experimental findings to their evidence owner, keep durable contracts in technical docs, and replace the checkpoint with the current phase and exact next action. The old detail remains available in Git history. Do not make this audit mandatory for unrelated coding tasks.

## When to change these rules

After an actual frustrating task, identify the failure mode: bad context routing, missing product decision, weak source trace, unsuitable architecture, invalid test harness, or an ineffective reviewer. Fix the **smallest owning layer**. Prefer a deterministic hook/test for a rule that must never be violated; prose reminders are probabilistic, not enforcement. Avoid turning every failure into a new always-on rule.

### Public reference points (consult for updates, don't copy unreviewed templates)

- Anthropic, [Claude Code best practices](https://code.claude.com/docs/en/best-practices) and [skills](https://code.claude.com/docs/en/skills): short project memory, scoped skills, checks and enforced boundaries.
- Cursor, [rules](https://cursor.com/docs/rules) and [agent skills](https://cursor.com/docs/skills): conditional project context and `.agents/skills` discovery.
- [Agent Skills specification](https://agentskills.io/specification): portable `SKILL.md` frontmatter, reference files and on-demand loading.
- GitHub [Spec Kit](https://github.github.com/spec-kit/): specify, plan, tasks, implement and converge. Adapt the method; the full framework is not required here.
- OpenAI, [Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), September 2026: minimize mandatory docs, avoid over-scaffolded procedures and audit old instructions as models improve.
