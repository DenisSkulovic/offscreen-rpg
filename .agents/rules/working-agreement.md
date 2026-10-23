# Working agreement

Read this and [spending](spending.md) at the start of work. Task-specific detail is routed below; do not load every linked rule.

## Product → Technical → Code

Code implements the product and technical specifications. Before behavior changes, update the affected product description, then its technical contract, then implement. For structural work with no product effect, confirm the existing product contract and update only the relevant technical owner. Correct a design problem at its owner; never leave known contradictions.

Distinguish proposed, implemented and verified behavior; [progress](../../docs/progress.md) owns current coverage. Use [concepts](../../docs/concepts.md) before introducing gameplay nouns. Turns, decisions, scenes, passages, model rounds and memory segments are distinct; there are no chapters. The engine is world-independent and creatively neutral: profiles/campaign content choose tone and pace, while code owns rules, time, evidence, persistence, permissions and cost.

Keep one authoritative explanation per decision. Replace obsolete text in place; Git holds history. Open product choices belong in [questions](../../docs/questions.md). Brainstorming examples are not automatic requirements.

## Navigation and durable understanding

Start with `pnpm repo:brief`, then the selected plan and [code map](../../docs/engineering/code-navigation.md). For rediscovery or an unfamiliar domain, use the [documentation map](../../docs/README.md). Read relevant sections, not whole libraries. Preserve non-obvious discoveries beside their owner during the same change; link rather than copy.

| Before this work | Read this owner |
| --- | --- |
| Documentation, navigation, rules or cross-file responsibility changes | [Documentation maintenance](documentation.md) |
| Shared domain/progression contracts or benchmark/fixture changes | [Domain design and living benchmarks](domain-design.md) |
| Code implementation or review | [Code quality](../../docs/engineering/code-quality.md) |
| Checks or verification planning | [Verification](verification.md) |
| Significant feature or rework | [Feature workflow](../skills/feature-workflow/SKILL.md) |
| Storyteller quality, profile, prompt, context or route tuning | [Tuning discipline](storyteller.md) and [tuning procedure](../../docs/skills/storyteller-tuning/SKILL.md) |
| Substantial context/retrieval/memory/tools/orchestration/tracing/evaluation design | Relevant sections of the [agentic systems field manual](../../docs/engineering/agentic-systems-field-manual.md); research reference, not policy or final architecture |
| Starting or repairing infrastructure | [Local dependencies](../../docs/development.md#local-dependencies); use the verified Docker Desktop path and documented recovery |

## Lifecycle and scope

This is a raw, rapidly evolving POC and portfolio project. Build balanced connected flows; do not perfect a subsystem while the experience remains disconnected. Scripted fixtures are not a functioning AI storyteller.

There is no production or user-owned game data. Remove discarded prototype formats instead of adding compatibility code. Keep exactly one current baseline migration; fold schema changes into it and reset disposable databases. Begin immutable additive migrations only after the owner declares a lifecycle change or identifies data that must survive. Preserve private evidence needed for an active investigation before resetting. Credentials and external side effects always require explicit accounting.

Checks are optional under [verification](verification.md), which overrides stricter plan/guidance requirements until the owner changes the lifecycle. Default to no routine check commands. Backend work uses application operations, authenticated HTTP and direct artifact/state inspection; browser driving is for requested UI work or deliberate human-experience QA. Improve an inconvenient backend harness instead of defaulting to UI automation.

Observability is product behavior: durable game history records meaningful facts; structured operational events diagnose machinery. Apply the [code-quality observability boundary](../../docs/engineering/code-quality.md#observability-and-game-history) when changing flows.

## Roles and handoffs

The owner prefers Codex for investigation/design/review and Cursor for bulk coding. Do not start large implementation passes without being asked, launch another task/agent, or switch subscriptions/models automatically. One implementation owner per slice; preserve unrelated working changes.

Significant work uses the feature workflow. Agree the product vision before bulk implementation; existing authorization persists across agreed phases. Stop only for a material scope, vision or cost change. When asked to prepare implementation, deliver bounded phases with dependencies, acceptance and an exact next slice, not another blanket approval gate.

Name feature folders `YYYY-MM-DD--HH-mm--feature-name` in local repository time; the creation timestamp is immutable. They are temporary execution workspaces, not a backlog/archive. Keep only genuinely unfinished authorized outcomes with exact next actions and concrete blockers. When complete, fold durable decisions/evidence/gaps into permanent owners and delete the folder in the same slice. Solve a blocker, select its dependency, or move deferred needs into permanent roadmap/questions owners; do not retain vague placeholder chains. Honor explicitly owner-retained dossiers.

At handoff, rewrite PLAN's phase, reviewed revision, changes, verification limits, blocker and exact next step. Keep it short enough to resume without the conversation. Use existing tools/local substitutes; paid services and deployment require existing explicit authority under [spending](spending.md). Keep private payloads, credentials and player data out of Git.

## Agent and prompt tuning discipline

Before tuning, read [the focused Storyteller rule](storyteller.md). It preserves creative neutrality, layer ownership, contrasting cases, exact-packet baselines and schema/admission alignment. A disappointing result alone does not authorize changing a shared prompt.

## Git checkpoint hygiene

Inspect status before each substantial slice. After a coherent slice has updated docs/checkpoints and chosen verification, make a descriptive commit before another substantial slice. Do not let a few independent slices or a full day accumulate without a checkpoint.

Before commit, review status, diff summary, untracked files and `git diff --check`; exclude generated output, local data, credentials, provider payloads and temporary diagnostics. Never discard unfamiliar changes to manufacture a clean tree. Prefer an honest checkpoint over a falsely atomic multi-day commit.

Push completed checkpoints when this is the established shared branch and a normal fast-forward. No force-push, published-history rewrite, remote changes or surprise branches. If authentication, protection, divergence or ownership is uncertain, retain the local commit and report the exact blocker. Include commit/push state in an unfinished handoff.
