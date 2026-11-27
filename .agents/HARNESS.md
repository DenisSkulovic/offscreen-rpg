# Coding-agent harness | Layer zero

**Workflow navigation:** [WORKFLOW.md](../WORKFLOW.md) is the single engineering lifecycle walkthrough. This harness defines agent-loading and responsibility rules; it does not duplicate Undertaking/Change/Task lifecycles.

**Owner:** `.agents/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/` and the Claude adapters. **Public engineering-system tour:** [ENGINEERING.md](../ENGINEERING.md) explains the methodology to a reviewer without becoming another normative instruction file. **Audience:** tools that help developers design, investigate, implement and review Offscreen RPG. **Not:** the game's Storyteller agent, its prompts, inference budget or model behavior.

This harness governs **how** coding agents navigate the three authority layers: product documentation (what and why), technical documentation (architecture, authority and invariants), generated code (implementation). It never turns code into the product specification. External practice notes are in [industry practices](references/industry-practices.md); practical token hygiene is in [context economics](references/context-economics.md).

**Planner/executor economics:** For a ChatGPT session **designing Changes**, [CHATGPT.md](../CHATGPT.md) and the [planner investigation standard](references/planner-investigation-standard.md) put broad source and architectural discovery upstream of lower-cost Cursor implementers. The selected Cursor child receives a short route card and only verifies the current source, implements and tests. This role distinction does **not** require every agent to preload the planner standard; see the table below for load triggers.

**Development runtime:** use the current [owned dev stack runbook](../docs/runbooks/dev-worktree-stacks.md) only when needed. Verify actual worktree/environment identity and recorded acceptance; no ambient context, stale rollout assumption or foreign resource mutation. Lease state is machine-local.

## What loads, and when?

| Surface                          | Load trigger                                                      | Purpose                                                                          |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AGENTS.md`                      | Universal coding-agent entry                                      | Short, essential project boundaries and how to find an owner                     |
| `CLAUDE.md`                      | Claude Code startup                                               | Real `@AGENTS.md` import and minimal tool-specific routing, not duplicate policy |
| `.cursor/rules/*.mdc`            | Always-on _only if essential_, otherwise matched description/path | Cursor-specific workflows; the root `AGENTS.md` is already supported             |
| `.agents/skills/<name>/SKILL.md` | Description advertised; body selected when useful                 | Portable domain knowledge and repeatable task procedures                         |
| `.claude/skills/<name>/SKILL.md` | Claude's discovery/invocation                                     | Small adapter to the canonical `.agents/skills/` procedure                       |
| `.agents/rules/`                 | Read only for the affected operation                              | Documentation, security, spending, domain, verification rules                    |
| `.agents/references/`            | Selected primary-source or economic question                      | Curated expertise, industry evidence and investigation strategy                  |
| `docs/`, packages and tests      | After scope and authority selection                               | Product intent, technical contract, current implementation and verification      |

**Documentation retrieval standard:** [layer-zero document architecture](references/documentation-navigation-standard.md) governs how coding agents find and maintain product/technical knowledge. [Technical owner index](../docs/technical/README.md) and [engineering index](../research/engineering-manuals.md) are on-demand routers, not mandatory startup context.

**Cold start:** root instructions + user task. Find the correct authority **by topic**, then open one relevant section, a source symbol/caller when needed and the smallest useful proof. This file is a _map_, not mandatory startup reading. Do not preload all rules, skills, docs or code to exploit a large context window.

## Durable session context across chats

The [daily session-minutes rule](rules/session-minutes.md) makes significant owner statements, decisions, alternatives, rejected work and evidence persist as dated [tracked minutes](../work/sessions/README.md). **Fresh substantive sessions** should consult the latest relevant log and current roadmap/Change selection before making assumptions; focused known edits need not reread old discussions. **During** important chats or role handoffs, authorized agents append the current day's minutes, and update permanent specs separately when a decision actually changes them. Meeting minutes are history and context, not source-of-truth contracts or permission to execute. No automatic always-on loading of the full archive.

## Role-centered development

The [role orchestration owner](roles/README.md) distinguishes **role responsibility**, **specialized skill**, **agent/session context**, and **model/tool**. The [role catalog](roles/catalog.md) supports UI designers, architects, reviewers, test strategists, implementers, data/security/observability specialists and coordinators without creating a native subagent for every job title. [Assignment contracts](roles/assignments.md) and [UI example](roles/playbooks/ui-feature.md) explain how decisions move between roles.

For substantial work, the coordinating chat should first recommend a minimal role graph, specify the owning product/technical decision, then assign focused stages. A subagent or independent chat is an **optional paid/context cost**, not a mandatory step or automatic permission grant. An independent reviewer challenges the author's work rather than reusing its confident conclusion. A failed gate returns to the owning role, not to spontaneous implementation.

## Professional knowledge activation

[The engineering knowledge library](knowledge/README.md) is **not another rulebook**. It helps roles deliberately retrieve a technology's design space: why multiple valid approaches exist, when to prefer one, cross-system interactions, evolution and operational cost, then risks and evidence. Architecture, data modeling, caching/performance, API/network, release engineering, and frontend state are distinct but interacting subjects. A role should combine manuals only where the actual decision crosses these boundaries; a new index or schema is not automatically permission to do a performance or migration refactor.

At a significant design gate, the role selects **one relevant manual** (and maybe a second crossing a genuine domain boundary), compares plausible options, and carries the resulting decision factors into the small handoff. The **executor need not reload the entire manual** if the architect already resolved the choice and passed its invariants; a separate critic may consult the same domain independently to challenge the proposal. No manuals are always-on. The [knowledge index](knowledge/README.md) routes architecture, visual design, frontend state, API/network, security, testing, stateful backend and observability expertise. A role should not collect all manuals to look thorough: choose the one decision it is accountable for and follow the relevant sections.

## Native subagent surfaces (opt-in)

Claude has two optional read-only critics; Cursor has additional bounded execution/utility roles. [Actual model roster and policy](references/cursor-model-budget-policy.md) owns selection. Native design-challenger and test-strategist use inherit and are not approved for automatic invocation; follow the explicit model and owner gate. A read-only critic does not substitute for the fresh-chat independent committee when material new architecture requires one. The reviewer or the local custodian persists that verdict. Check client discovery and actual tool permissions, not assumed behavior.

**Planning-unit boundary:** [work-unit standard](references/change-work-unit-standard.md) distinguishes Designs, Changes, Tasks and evaluation; no default execution if no work selected. Legacy initiative material is historical, not commission.

## Five development modes

1. **Harness setup:** compare an independent reference against `AGENTS.md`, skills, client-specific discovery and tool costs. Output harness Markdown/settings edits. **No gameplay/code changes.**
2. **Product/design:** ChatGPT and owner determine intent and important choices. Use the relevant product owner and alternatives; ask for source evidence only where feasibility is uncertain. Approve the technical owner before sending code to Cursor.
3. **Source investigation (current default):** ChatGPT using connected GitHub/source access follows one actual route read-only; paid Claude Code is **not** a required stage. A separate investigator is an optional escalation only if it provides distinct evidence. Return a **compact packet**: question, intended contract, 3–8 source/symbol anchors, current behavior, surprising edge case, strongest rival explanation and next useful experiment.
4. **Implementation:** Cursor gets an approved, bounded handoff from `cursor-handoff`: goal, exact product/technical headings, 2–5 source starting points, invariant, excluded work, cheap verification and factual receipt. It may choose local implementation details, never redefine the product.
5. **Review/convergence:** formal design defense and a fresh-chat committee for material new architecture and substantial redesign; proportionate review for evolutionary work; independent packet readiness before delegation; focused diff review and assigned acceptance after implementation. Correct the owning document if the spec changed, update the short active PLAN checkpoint, and retire stale dossiers. Only Critical and High findings block the affected scope.

**These are optional roles, not mandatory tollgates.** A trivial edit needs no multi-tool ceremony. A complex concurrency change might deserve an independent critic. Do not pay for Claude to read information already established by the present tool or transcript.

## Revision and evidence receipts for substantial work

For substantial source investigations, design handoffs, reviews and writes, name the inspected branch/ref and full HEAD SHA at the start and recheck affected paths if the branch advances before committing. A local agent must distinguish committed HEAD from dirty/untracked files; a GitHub-API-only assistant must say the local worktree is **unobservable**, not clean. Separate **ratified target**, **source-observed implementation**, **fixture/test proof**, **live proof**, and **proposal**. Include relevant exact headings/source anchors, one meaningful contrary/negative case, checks actually run versus skipped, and the post-write commit SHA when applicable. Avoid repeating this receipt for trivial prose edits.

**Optional retrieval tooling is evidence-gated, not startup infrastructure.** Built-in agent tools plus existing `wiki:find`/`wiki:read` are the baseline; no automatic Cognee, Serena, semantic DB, Docker stack or always-on MCP additions. Any retrieval-tool experiment requires separate selection, measured evidence and permission; no linked proposal creates a default service.

**Ordinary ChatGPT without a checkout:** the owner may use `pnpm repo:snapshot:chatgpt` to package committed source/docs into an ignored, versioned ZIP with provenance. The default exporter **requires** a portable heading/authority/link index generated with the existing parser against the committed snapshot tree; missing index is an error. Only explicit `--no-index` allows a source-only ZIP. Omitted history remains clearly labeled. See the [ChatGPT source snapshot runbook](../docs/runbooks/chatgpt-design-snapshot.md). The upload is a frozen Git revision, not a live worktree or tested runtime; reconcile remote HEAD before publishing designs. This is optional, not mandatory agent startup context.

## Context-expansion protocol

- **R0:** task statement, always-on entry, needed constraints.
- **R1:** one product/technical section or this harness's exact rule/skill. Search filenames and headings before opening large documents.
- **R2:** immediate owning code, callers and the relevant failure path. Prefer named symbols and line ranges to full-file dumping.
- **R3:** broader investigation, historical evidence or specialist references **only** when a named uncertainty remains.

Stop widening when you can state the authority, current route, meaningful negative case and next action. A missing detail is not a reason to ingest an entire library. Exact reading/token counts are evaluation data, not arbitrary hard caps.

At a role change, pass **decisions and evidence identifiers**, not the transcript. The owner's design-led default is **ChatGPT + owner research/design/experiments/review → chosen execution route**. Use [target-driven renewal](rules/target-driven-renewal.md) before packets for material design; direct planner implementation with owner terminal feedback, Cursor implementation, or hybrid are valid. Cursor is not mandatory. Optional Claude/subagents are not a step by default. Start a fresh Cursor context for unrelated work and follow the nearest [source-adjacent README](../apps/web/README.md) before deep source. Do not let Cursor rediscover product requirements from raw implementation. Do not require three separate models to review the same 50 files.

## Guardrails and review economics

- Written policy can guide but cannot guarantee safety. For repeated non-negotiable violations consider permissions, hooks or deterministic checks **after proving a real need**.
- No unapproved provider calls, deployments, destructive resets, secrets or automatic paid-review loops. Inspection is not permission to mutate.
- A review must add new evidence or an independent judgment. If it repeats the first model's praise, it is redundant paid context.
- More skills are not automatically better. Add one only for distinct triggers, expert facts/procedures and an evaluable benefit. Consolidate overlapping advice rather than generate a 40-skill menu.
- Documentation drift belongs to its permanent owner. An oversized plan checkpoint is a symptom; move durable findings to evidence owners and shorten the checkpoint. Git preserves history.

## Frontend Cursor efficiency route

The [preinvestigated frontend execution playbook](../.agents/skills/frontend-engineering/SKILL.md) supplies source-symbol anchors, a verification ladder and warm pnpm/Turbo/Next commands for the owner-selected React/Next modernization. Cursor receives one selected Change; the conditional [frontend implementation rule](../.cursor/rules/frontend-implementation.mdc) is short and does **not** preload the whole playbook. [W20 local test/caching](../work/changes/archive/2026-11/web/2026-11-12--web-fast-feedback-toolchain/CHANGE.md) and [W21 CI selection](../work/changes/archive/2026-11/web/2026-11-12--web-ci-budget/CHANGE.md) are archived Done changes. This page does not claim a new measured token saving.

## First real-client proof, before buying more tools

Static Markdown consistency is not proof of tool behavior. On a future fresh Claude Code session inspect `/context all`, `/skills`, `/usage` and `/doctor prompt-audit` (where supported); verify `AGENTS.md` loads, the skill adapter resolves, and an investigation stays read-only. In Cursor, check that canonical skills appear, look for duplicates from the compatible `.claude/skills/` path, and test a one-question routing response in Ask/read-only mode.

Record what **actually loaded**, correct source finding, useful counterexample, measured calls/tokens if exposed, human intervention and rework. See [evaluation](../.agents/references/context-economics.md). **No claimed token saving until measured.**

When a coding-agent session goes wrong, run `harness-audit` for the setup trigger or `context-economics` for waste. Fix one owning layer, not the whole ecosystem.
