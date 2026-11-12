# Independent standard for role-driven coding-agent workflows

**Reviewed 2026-11-11.** Applies to AI tools **developing the repository**, not agents _inside the game_. Sources are primary vendor docs, used for their documented mechanisms; our role architecture remains a design choice until evaluated.

## What current research actually supports

| Source                                                                                              | Reported mechanism / limitation                                                                                                                                                                  | Harness decision                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Claude Code custom subagents](https://code.claude.com/docs/en/sub-agents)                          | Separate context and tool access; descriptions are seen for delegation; usage counts toward same allowance; custom `.claude/agents/` files; read-only capability via tool restrictions/plan mode | Use a tiny set of high-value repeatable read-only subagents, not one per job title                                                            |
| [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)                              | Coordinated separate contexts; experimental; higher token use, known coordination limits                                                                                                         | Teams remain opt-in for genuinely independent long-running tasks; not our default                                                             |
| [Cursor subagents](https://cursor.com/docs/subagents)                                               | Project `.cursor/agents/`, `.claude/agents/` compatibility, `readonly`, model selection, isolated worktrees, usage cost even when parent on Auto                                                 | Small client-native wrappers; avoid duplicate discovery; don't force expensive model or auto-spawn                                            |
| [Cursor skills](https://cursor.com/docs/skills)                                                     | Skills load specific instructions when relevant; no isolation/context boundary required                                                                                                          | Use a skill for a _procedure_, native subagent for _context separation_, not the same thing                                                   |
| [OpenAI multi-agent guidance](https://developers.openai.com/api/docs/guides/agents-api/multi-agent) | Subagents work best on independent questions; dependent steps in main session; coordinate edits                                                                                                  | Parallelize read-only independent inquiries, sequence dependent product/contract/implementation gates                                         |
| [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/)                         | Repo knowledge and enforceable boundaries are an agent's environment; humans steer outcomes and feedback loops                                                                                   | Role outputs and checks return to authoritative docs, not untracked model memory                                                              |
| [Claude Code best practices](https://code.claude.com/docs/en/best-practices)                        | Model instructions are probabilistic; hooks/permissions/actual checks are deterministic levers                                                                                                   | Give role charters explicit responsibilities and use native read-only settings where feasible; never promise a prompt will _force_ compliance |

## Native compatibility and cost gotchas

Official Claude [custom subagent configuration](https://code.claude.com/docs/en/sub-agents) supports `tools`, `permissionMode`, `model`, `maxTurns`; its docs caution that a parent in `auto` or bypass modes may override the subagent's `permissionMode`. Our **tool allowlist** prevents edit tools being exposed to the read-only specialists irrespective of that override. Cursor's [subagents](https://cursor.com/docs/subagents) support `readonly: true` and recognize compatible `.claude/agents/` definitions, with `.cursor/agents/` taking precedence for same-name entries.

**Do not rely on one shared cross-client frontmatter file** for read-only enforcement: Claude's `permissionMode` and Cursor's `readonly` fields have different meanings. We keep tiny client-native wrappers with one shared conceptual role/procedure instead. No repository script should automatically spawn these agents or pin a paid model.

## Derived architecture: role ≠ skill ≠ agent ≠ model

A **role** is the agreed decision/evidence responsibility; a **skill** supplies expert method and knowledge; an **agent/chat** creates an execution/context boundary; a **model/tool** sets capabilities and budget. The many-to-many relationship is intentional: "test strategist" can run in ChatGPT, a read-only Claude subagent or Cursor Ask. A frontend developer may combine the implementation role with the frontend skill and a narrow source packet.

The right number of **roles** for a significant project can be high; the right number of **simultaneous agents** is usually much lower. More roles means better decomposition **only if each has distinct decisions or deliverables**. Context separation is helpful for independent criticism and noisy investigations, but it is not free.

## Tests for a good role

A reusable role must identify (a) an observable output, (b) what it may decide, (c) what it cannot modify, (d) its input authority, (e) a consumer and stop condition, and (f) how its work can be judged. A generic "senior engineer" personality without these attributes is decorative.

A useful workflow is a **dependency graph**, not a mandatory assembly line: product goal → optional source discovery → approved design/technical ownership → tests planned where needed → execution → independent verification → reconciling docs. Each edge passes a compact artifact. Human owner resolves unresolved product decisions; no model is authorized to vote a requirement into existence.

## Where agent multiplication becomes waste

- Ten specialists read the same files and offer variants of one opinion.
- Source investigator, architect and developer are all asked to "make the best feature" instead of distinct contracts.
- A reviewer merely validates another agent's claims without the actual diff, evidence or acceptance.
- Multiple writers race on the same checkout and then a fourth agent must reconcile conflicts.
- A premium reasoning model is called to repeat a deterministic test or transform an already settled spec.
- An agent team is started for a two-step sequential task whose second phase depends on the first.

**Working hypothesis:** a role assignment plus a compact source/decision receipt reduces repeated discovery and role drift. This must be tested in the actual Claude/Cursor clients, with measured context, usage, rework and human corrections. Do not claim speed or cost savings before an experiment.
