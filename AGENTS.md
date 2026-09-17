# Project instructions

Read README.md and docs/TASKS.md, then only the relevant topic owners. Read docs/WORKFLOW.md when changing product contracts. Follow docs/DOCUMENTATION_CONVENTIONS.md for stable IDs, tags and relations; docs/DOCUMENTATION_TREE.md is navigation, not a backlog to populate.

## Current phase

D064 reopens product baseline v0.01 to simplify mechanics before technical design. Read docs/product/experience/story-progression.md for the proposed minimal contract; it is not an accepted schema or ruleset. Repository setup does not select a runtime stack or authorize paid model calls, subscriptions, third-party installations or deployment. Resolve only decisions necessary for the next connected playable slice. Record actual choices; do not present proposed defaults as accepted or unexecuted scenarios as passing tests.

## Binding product direction

- Story-first, single-player character life with a bounded LLM storyteller, ordinary routines, optional player participation and configurable time.
- Running delegated play continues through ordinary nonresponse. Explicit pause freezes progression; hard-permission or invalid-state stops are exceptional and explained.
- Storytellers may originate incidents and compatible entities without simulated faction leaders or causal prehistory. Storyteller adjudication may determine consequences; the application preserves committed facts, generic state changes, limits and adopted check results. Dedicated mechanics for every narrative verb are not required.
- Rich lore, dormant persistent entities and active simulation are different. Preserve consequential identity, knowledge, objects and obligations without running every NPC each tick.
- Generic settings, bodies and scale concepts. D&D breadth is reopened: recommend a small character/check subset before extensive rules. Source, adjudication boundaries and exact adaptations remain open. Fishermen, miners, spacecraft and other examples are not required mechanics.
- A simple visual browser UI centered on current situation and chronology is intended. Messaging is a candidate additional surface. Avoid dense management dashboards and preserve direct player initiative.
- Context, model calls, retries and costs must be bounded. Self-hosted GPU inference is not a prerequisite.
- Senior fullstack portfolio quality is part of scope: coherent UX, reliable state, reproducible setup, useful tests, observable AI behavior and honest evidence.

## Working style and authority

Git is authoritative for project documentation and future code. The former Drive folder is historical; do not depend on machine paths, private workspace instructions or personal career notes. Keep this repository portable.

Apply review findings to owning documents, not standalone reports. Keep accepted direction separate from proposals and parked ideas. Preserve stable references, avoid duplicating detailed contracts across files, and update the short next-work queue when priorities change. Do not require the owner to read or approve entire generated documents; surface consequential choices conversationally.

Run `python scripts/check_docs.py` after documentation changes. Once implementation exists, run checks appropriate to the change. Never commit credentials, local environment files, private player data, generated save files or dependency/build outputs. Describe actual validation and limitations in commits/PRs.

D064 is explicitly brainstorming plus a request to apply simplification findings. Do not literally enshrine beads, example incidents, item representations, timing numbers or an all-LLM implementation. Do not restore per-activity work/travel/economy prerequisites from older references. Historical decisions remain history; current proposed release scope governs what is being evaluated. Preserve the distinction between removing an assistant-inferred requirement and selecting a new owner-approved design.
