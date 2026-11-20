# ChatGPT documentation handoff | before Cursor implements the Writer refoundation

**State:** EXECUTED, 2026-11-21. WR01, WRD02, WRD03 and WRD04 permanent-wiki waves are complete and archived; implementation follows from the selected target documentation. **Implementation:** ChatGPT edits the **permanent \`docs/\` wiki** in four doc-only Changes. Cursor executes code Changes **only after** the docs wave and owner review. This is a compact historical routing brief, **not** a replacement product/technical wiki. Owner approval for the target-state rewrite was explicitly given during execution and is recorded in archived WR01.

## Launch in a dedicated ChatGPT conversation

Copy/paste this to the ChatGPT model that will own the documentation work (GPT-5.6 is a reasonable choice). It should have access to connected [GitHub repository](https://github.com/DenisSkulovic/offscreen-rpg) and read current HEAD before edits.

> **You own the permanent Offscreen RPG product/technical documentation rewrite, NOT code implementation.** Begin at \`work/changes/WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md\`, then follow the four proposed documentation Changes: \`WR01\` product, \`WRD02\` Storyteller/Library tech, \`WRD03\` engine/forks tech, \`WRD04\` wiki routing and verification. First verify my approval status and unresolved whitepaper decisions; do not silently mark a proposed choice ratified. Read the existing owning \`docs/product\` and \`docs/technical\` files and the repository's documentation-reconciliation skill. Apply actual substantive edits to canonical \`docs/\` owners in bounded, committed waves. Preserve existing decisions and detailed narrative context unless clearly superseded; state selected target versus current runtime versus proposal. Do not write any application code, create new architectural mega-docs or delegate documentation rewriting to Cursor. After each wave, report exact files changed, outstanding owner decisions, checks run and GitHub commit SHA. Keep \`work/QUEUE.md\` unchanged unless I explicitly select a Change. Do not call provider models for storytelling, deploy to Kubernetes or perform schema migrations. Once the wiki is reconciled, make an owner-facing cold-reader summary and tell me whether Cursor's WR02–WR08 implementation packets now have adequate canonical owners.

**Important:** merely following this handoff in a chat does not automatically authorize selecting Changes or promoting proposed target policy into ratified docs. The user must explicitly approve the whitepaper/selected outcomes. If approval is partial, edit only approved policy and leave unapproved details clearly proposed. If no GitHub write capability is available, report this rather than claiming a push.

## Four documentation waves

| Sequence | Packet | ChatGPT assignment | Hard completion criterion |
| --- | --- | --- | --- |
| 1 | [WR01 product](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Reconcile vision, concepts, entry, Storyteller behavior, worlds, continuity and time/agency | Player product contract understandable without opening work/designs; statuses and examples preserved |
| 2 | [WRD02 technical Storyteller + Library](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Rooted Library, Workdesk, agent/skills/subagents, context, source identity and cost/custody | Technical Storyteller owners usable by Cursor's WR02/03/04 |
| 3 | [WRD03 technical Engine + forks](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Coherent scene publication, active-state semantics, fork/clock, direct launch and authority | Engine owners usable by Cursor's WR05/06/07 |
| 4 | [WRD04 wiki navigation and checks](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Indexes, architecture atlas, relevant runbooks, cross-claim reconciliation, cold-reader and docs/wiki checks | From docs/README to each new authoritative contract in <=2 heading-level hops, no new contradictions; completion receipt |

**Do not rewrite 114 pages wholesale.** Review the actual relevant owners. Long, rich pages may need meaningful sectional rewrites; unrelated admin/Kubernetes/security pages should be NO-OP unless an accepted claim actually depends on them. Don't flatten real product nuance into a dozen shallow summaries.

## The precise authority hierarchy

1. **User-approved product direction** governs desired player behavior. Pending six decisions from the [whitepaper and implementation program](WRITER-IMPLEMENTATION-2026-11-21.md): complete active-forkability, physical persistent-index algorithm, subagent staging rights, implementation priority, model spend/latency policy, authored-world prompt conflict precedence.
2. **\`docs/product/\`** becomes the actual product bible for approved behavior. Earlier selected claims that now conflict must be explicitly reconciled, with consequences noted, not secretly erased.
3. **\`docs/technical/\`** becomes the accepted implementation contract subordinate to product, including invariants, boundaries, failure modes and negative examples.
4. **\`docs/architecture/\`** explains the authoritative system; **\`docs/runbooks/\`** describes real operator procedures, not commands for imaginary code.
5. **\`STATUS.md\`, executable tests and \`evidence/\`** describe actual implementation proof. New design documentation **never** upgrades current readiness automatically.
6. **\`work/designs/open/story-creation-and-writers-workbench/\`** is a large, unaccepted research dossier. Read selected [target](../designs/open/story-creation-and-writers-workbench/VISION-FIRST-TARGET.md), [traces](../designs/open/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md) and [self-critique](../designs/open/story-creation-and-writers-workbench/CRITICAL-SELF-REVIEW.md) to extract intent, not copy into docs blindly. **Do not create a second new “Storyteller V2 wiki” in work/designs.**

Relevant local rules: [documentation reconciliation](../../.agents/skills/documentation-reconciliation/SKILL.md), [navigation standard](../../.agents/references/documentation-navigation-standard.md), [work taxonomy](../WORK-TAXONOMY.md). Each Change has an exact owner-page list, negative rules and end state.

## Cost-sensitive editing workflow for ChatGPT

1. Fetch/read HEAD and the **current Change** plus only the impacted owners. Do not load all 200 KB of prior designs or every page at once.
2. For each material claim, record: existing paragraph/heading → selected new outcome → authoritative target page → affected neighbor → needs owner decision? Preserve embedded rationale and counterexamples.
3. Actually edit the permanent owner pages in coherent batches; use connected GitHub file/commit tools. Keep a stable \`main\` lease or branch that is later merged with owner approval. If concurrent changes occur, re-read/rebase instead of overwriting Cursor's work.
4. Run actual docs/wiki health commands when a local checkout is available, and targeted Markdown link/anchor checks. Report what's not runnable. Regenerate generated indexes only with their official script; do not patch derived search indexes manually.
5. Produce one small per-Change **reconciliation receipt**; mark Proposed → Done only after diff/checks, accepted owner authority and closing review. Don't turn a requirements rewrite into “code implemented.”
6. Hand off to Cursor with **permanent governing \`docs/\` links** and an explicit owner sign-off. After WRD04, code Change [WR02](open/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) can be considered for selection, not blindly dispatched.

## What must remain open

Do not decide specific default per-scene token ceilings, tool call count, model, subagent parallelism, prompt-overrides-authored-world policy, or the Merkle data structure merely from current prototype limits. Put an explicit undecided boundary in the proper product/technical owner and flag to the user. The architecture can still provide meaningful selected invariants: genuine tool-using agent, Git-like structural sharing, no whole-Library copy, game/world authority, and properly pinned historical forks when owner-approved.

**Final deliverable of this phase:** a coherent **permanent wiki** plus verified navigation and the documented implementation contract. **Not another set of scratchpads.**
