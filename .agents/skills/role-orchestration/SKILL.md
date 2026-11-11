---
name: role-orchestration
description: Design an economical multi-role coding-agent plan for a consequential Offscreen RPG feature or investigation: choose specialized roles, contexts, handoffs, reviews and explicit human decision gates without spawning agents.
---

# Choose development roles and orchestrate handoffs

Invoke only for a **substantial cross-functional task**, unclear role ownership, repeated "agent ignored its job" failures or explicit questions about combining ChatGPT, Claude Code, Cursor, chats and subagents. Do not use this on a small one-file task.

1. Read [role architecture](../../roles/README.md) and the relevant slice of [catalog](../../roles/catalog.md). For a UI-heavy task, optionally load [UI playbook](../../roles/playbooks/ui-feature.md).
2. Identify the *next unanswered decision* and the risk if a generalist makes it. Separate **who may decide** from **which model executes**. Product and technical specs remain authoritative; user approval gates stay with the user.
3. Assign **one relevant professional knowledge pack/section** from [engineering knowledge](../../knowledge/README.md) to any consequential design or independent-review role. This is preparation for the decision, not a demand for every executor to reread the same manual. Choose the **smallest sufficient role graph**. For each material role specify: purpose, precise inputs, permissions, deliverable/negative case, dependency and next recipient. Use `roles/assignments.md` as a compact output shape.
4. Suggest a **new chat/subagent only when justified** by independent judgment, noisy research, distinct tools or true parallelism. No automatic launch; avoid concurrent same-file writes. Default to one or two roles; add specialists for real domain boundaries.
5. Select the execution surface economically: ChatGPT for creative synthesis and challenge, Claude Code for difficult source-grounded review when worth the subscription, Cursor fast model for approved execution. These are preferences, not fixed role assignments.
6. State phase gates and **bounce-back rules**. If evidence contradicts a spec, stop the dependent role and ask the owning upstream role for a decision. No autonomous escalation to additional paid agents.
7. Finish with one compact role plan: `now → next → optional parallel → implementation gate → verifier → reconciliation`, each with input/output and reasons. Do not start by writing product code or copying an entire engineering org chart.

**Distinctness:** A *skill* is a method; a *role* owns a decision; an *agent* isolates context; a *tool/model* determines capabilities and cost. Keep those separations explicit. Native subagents are optional and must be invoked deliberately when value outweighs extra context/usage. Never infer a positive cost ROI without measured evidence.
