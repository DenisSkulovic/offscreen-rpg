# Coding-agent harness | Layer zero

**Owner:** `.agents/`, `AGENTS.md`, `CLAUDE.md`, `.cursor/` and the Claude adapters. **Audience:** tools that help developers design, investigate, implement and review Offscreen RPG. **Not:** the game's Storyteller agent, its prompts, inference budget or model behavior.

This harness governs **how** coding agents navigate the three authority layers: product documentation (what and why), technical documentation (architecture, authority and invariants), generated code (implementation). It never turns code into the product specification. Our independent ideals are in [the coding-agent target standard](../docs/engineering/coding-agent-target-standard.md); evidence from external experts is in [industry practices](references/industry-practices.md); practical token hygiene is in [context economics](references/context-economics.md).

## What loads, and when?

| Surface | Load trigger | Purpose |
| --- | --- | --- |
| `AGENTS.md` | Universal coding-agent entry | Short, essential project boundaries and how to find an owner |
| `CLAUDE.md` | Claude Code startup | Real `@AGENTS.md` import and minimal tool-specific routing, not duplicate policy |
| `.cursor/rules/*.mdc` | Always-on *only if essential*, otherwise matched description/path | Cursor-specific workflows; the root `AGENTS.md` is already supported |
| `.agents/skills/<name>/SKILL.md` | Description advertised; body selected when useful | Portable domain knowledge and repeatable task procedures |
| `.claude/skills/<name>/SKILL.md` | Claude's discovery/invocation | Small adapter to the canonical `.agents/skills/` procedure |
| `.agents/rules/` | Read only for the affected operation | Documentation, security, spending, domain, verification rules |
| `.agents/references/` | Selected primary-source or economic question | Curated expertise, industry evidence and investigation strategy |
| `docs/`, packages and tests | After scope and authority selection | Product intent, technical contract, current implementation and verification |

**Documentation retrieval standard:** [layer-zero document architecture](references/documentation-navigation-standard.md) governs how coding agents find and maintain product/technical knowledge. [Technical owner index](../docs/technical/README.md) and [engineering index](../docs/engineering/README.md) are on-demand routers, not mandatory startup context.

**Cold start:** root instructions + user task. Find the correct authority **by topic**, then open one relevant section, a source symbol/caller when needed and the smallest useful proof. This file is a *map*, not mandatory startup reading. Do not preload all rules, skills, docs or code to exploit a large context window.

## Role-centered development

The [role orchestration owner](roles/README.md) distinguishes **role responsibility**, **specialized skill**, **agent/session context**, and **model/tool**. The [role catalog](roles/catalog.md) supports UI designers, architects, reviewers, test strategists, implementers, data/security/observability specialists and coordinators without creating a native subagent for every job title. [Assignment contracts](roles/assignments.md) and [UI example](roles/playbooks/ui-feature.md) explain how decisions move between roles.

For substantial work, the coordinating chat should first recommend a minimal role graph, specify the owning product/technical decision, then assign focused stages. A subagent or independent chat is an **optional paid/context cost**, not a mandatory step or automatic permission grant. An independent reviewer challenges the author's work rather than reusing its confident conclusion. A failed gate returns to the owning role, not to spontaneous implementation.

## Five development modes

1. **Harness setup:** compare an independent reference against `AGENTS.md`, skills, client-specific discovery and tool costs. Output harness Markdown/settings edits. **No gameplay/code changes.**
2. **Product/design:** ChatGPT and owner determine intent and important choices. Use the relevant product owner and alternatives; ask for source evidence only where feasibility is uncertain. Approve the technical owner before sending code to Cursor.
3. **Source investigation:** Claude Code, or any inexpensive connected source reader, follows one actual route read-only. Return a **compact packet**: question, intended contract, 3–8 source/symbol anchors, current behavior, surprising edge case, strongest rival explanation and next useful experiment.
4. **Implementation:** Cursor gets an approved, bounded handoff from `cursor-handoff`: goal, exact product/technical headings, 2–5 source starting points, invariant, excluded work, cheap verification and factual receipt. It may choose local implementation details, never redefine the product.
5. **Review/convergence:** independent design review when architecture merits it; diff review after implementation when risky. Correct the owning doc if the spec changed, update the short active PLAN checkpoint, retire stale dossiers.

**These are optional roles, not mandatory tollgates.** A trivial edit needs no multi-tool ceremony. A complex concurrency change might deserve an independent critic. Do not pay for Claude to read information already established by the present tool or transcript.

## Context-expansion protocol

- **R0:** task statement, always-on entry, needed constraints.
- **R1:** one product/technical section or this harness's exact rule/skill. Search filenames and headings before opening large documents.
- **R2:** immediate owning code, callers and the relevant failure path. Prefer named symbols and line ranges to full-file dumping.
- **R3:** broader investigation, historical evidence or specialist references **only** when a named uncertainty remains.

Stop widening when you can state the authority, current route, meaningful negative case and next action. A missing detail is not a reason to ingest an entire library. Exact reading/token counts are evaluation data, not arbitrary hard caps.

At a role change, pass **decisions and evidence identifiers**, not the transcript. Clear old unrelated Claude context; compact only while continuing the same task. Do not let Cursor rediscover product requirements from raw implementation. Do not require three separate models to review the same 50 files.

## Guardrails and review economics

- Written policy can guide but cannot guarantee safety. For repeated non-negotiable violations consider permissions, hooks or deterministic checks **after proving a real need**.
- No unapproved provider calls, deployments, destructive resets, secrets or automatic paid-review loops. Inspection is not permission to mutate.
- A review must add new evidence or an independent judgment. If it repeats the first model's praise, it is redundant paid context.
- More skills are not automatically better. Add one only for distinct triggers, expert facts/procedures and an evaluable benefit. Consolidate overlapping advice rather than generate a 40-skill menu.
- Documentation drift belongs to its permanent owner. An oversized plan checkpoint is a symptom; move durable findings to evidence owners and shorten the checkpoint. Git preserves history.

## First real-client proof, before buying more tools

Static Markdown consistency is not proof of tool behavior. On a future fresh Claude Code session inspect `/context all`, `/skills`, `/usage` and `/doctor prompt-audit` (where supported); verify `AGENTS.md` loads, the skill adapter resolves, and an investigation stays read-only. In Cursor, check that canonical skills appear, look for duplicates from the compatible `.claude/skills/` path, and test a one-question routing response in Ask/read-only mode.

Record what **actually loaded**, correct source finding, useful counterexample, measured calls/tokens if exposed, human intervention and rework. See [evaluation](../docs/engineering/coding-agent-evaluation.md). **No claimed token saving until measured.**

When a coding-agent session goes wrong, run `harness-audit` for the setup trigger or `context-economics` for waste. Fix one owning layer, not the whole ecosystem.
