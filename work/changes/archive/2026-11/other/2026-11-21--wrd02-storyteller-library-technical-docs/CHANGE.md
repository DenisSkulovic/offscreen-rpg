# WRD02 | ChatGPT documentation wave 2: Storyteller and versioned Library contracts

**State:** Done, 2026-11-21. Documentation-only target contract; runtime implementation follows.

[Program](../../../../WRITER-IMPLEMENTATION-2026-11-21.md) · [ChatGPT handoff](../../../../WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md) · [WR01](../../../../open/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) · [WRD03 next](../../../../open/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md).

## Source-of-truth boundary

The product wiki decides outcomes. Technical docs specify invariants and boundaries; runtime code/tests are realization evidence, not permission to weaken the target. Design dossier material is proposed until accepted. Preserve selected POC behavior **as current realization**, not a future architectural mandate. Read the relevant parts of [VISION-FIRST-TARGET](../../../../../designs/open/story-creation-and-writers-workbench/VISION-FIRST-TARGET.md), [agentic writer candidate](../../../../../designs/open/story-creation-and-writers-workbench/AGENTIC-WRITER-POC.md), [Library DAG](../../../../../designs/open/story-creation-and-writers-workbench/PERSISTENT-LIBRARY-DAG-DESIGN.md), and [self-review](../../../../../designs/open/story-creation-and-writers-workbench/CRITICAL-SELF-REVIEW.md), **not the whole dossier by default**.

## Canonical technical owners and work

| Page | What the permanent contract must explain |
| --- | --- |
| \`docs/technical/storyteller/canonical-documents-and-packages.md\` | File roles (\`STORY_PROMPT.md\`, \`STORYTELLER_PROFILE.md\`, \`START.md\`), scopes, metadata/visibility/authority, editable campaign overlay vs immutable authored source, copy-on-write branch-neutral Library root, exact content-hash-qualified citation, named path/index discovery, staging vs Game Authority publication, retention and portability. |
| \`docs/technical/storyteller/context-selection-and-recall.md\` | How a task starts with *small pinned mandatory inputs*, browses and searches Library contents on demand; how historical/fork-scoped retrieval and semantic indexes handle source identity, attribution, privacy, omissions and context cost. Model context ≠ Library manifest. |
| \`docs/technical/storyteller/operation-and-controller.md\` | Actual **multi-round writer mission** with tool use, draft/re-read/revise, skill consultation, recoverable provider/cost custody and optional independent bounded assistant contexts. No inherited fixed 2–3-round ceiling in the target; no mandatory unnecessary steps. |
| \`docs/technical/storyteller/prompts-and-tools.md\` | Capability contracts: browse/find/read/compare, skill loading, staged write/read/diff/discard, submit scene, independent child research and returned source handles. Skill text cannot elevate runtime grants, clocks, safety or budgets. |
| \`docs/technical/storyteller/versioned-settings.md\` | Captured effective creative profile and skill revisions vs separate typed mechanics/clock/spend policy; which historical creative guidance follows a fork versus which permissions are freshly authorized. |
| \`docs/technical/storyteller/request-context-and-cost.md\` | Purposeful exploration, scalable small context, bounded total mission costs, independent subagent accounting, latency/unknown delivery and optional creative-quality evaluation. Do not codify arbitrary current numeric limits as eternal target. |
| \`docs/technical/storyteller/context-and-memory.md\` | Determine whether this is a navigation/overview hub or duplicate old authority relative to canonical-documents and context-selection. Preserve unique surviving claims, route to exact owners and avoid a second competing document contract. |
| \`docs/technical/storyteller/provider-boundary.md\` | Co-review only for cost/reservation/uncertain-delivery semantics touched by child invocations; preserve existing financial/security guarantees. |

**Owned elsewhere:** \`generation-and-publication.md\` publication authority is WRD03. Engine state/fork operations are WRD03. Product creative expectations are WR01. Client/server request transport remains \`docs/technical/platform/\` / \`docs/technical/client/\`. Don't duplicate these contracts.

## Exact invariants to reconcile

- The agent gets a **captured source/versioned tool view**; it can discover filenames and sources without stuffing the full Library or manifests into model input. Search indexes are rebuildable aids, not truth.
- Story Prompt is recorded verbatim as **intent**, not already established world canon. A private planning note is an admitted *possibility*, not settled fact.
- The Workdesk is durable across task rounds/restarts but **not** published game state. It uses bounded staged revisions and accepted proposals; it cannot write canon/SQL directly.
- A real subagent has its own context and spending identity; it must not borrow other branches' future documents, bypass access or publish direct mechanical effects. If isolated child draft proposals are permitted, parent adoption is explicit.
- Library versions are immutable and structurally shared; a fork references an older root, not copied Markdown. Source version/hash and root authorization protect divergent branches. **Do not hardcode an unapproved radix/B+ tree algorithm in the normative contract**; physical choice belongs to WR02 engineering.
- Actual v1 limits such as \`readManifestHistory\` 256, \`memory-exploration.v1\` round counts, flat manifest schema and legacy JSON profiles are *dated implementation constraints*, not product target invariants.
- Multiple writer/assistant contexts may work independently, but final authoritative publication is by Game Authority under WRD03.

## Output and gate

Rewrite owning technical sections substantively. Preserve strong existing custody/error requirements and precise present-day implementation notes instead of deleting anything inconvenient. Capture per-section **selected/proposed/implemented** status and a compact reconciliation/NO-OP ledger in the packet. Verify new headings, inbound source links, citation semantics, cross-links to product and WRD03 and relevant docs/wiki checks. Avoid creating a second 40-KB replacement technical mega-page.

**Done means:** an engineering agent can implement WR02–WR04 using permanent technical docs and their acceptance contracts, with no mandatory excavation of design scratchpads. No code, no migration, no paid model dispatch. **Next:** WRD03.


## Reconciliation receipt | 2026-11-21

**Permanent technical owners rewritten:** `canonical-documents-and-packages.md`, `context-selection-and-recall.md`, `operation-and-controller.md`, `prompts-and-tools.md`, `versioned-settings.md`, `request-context-and-cost.md`. `context-and-memory.md` is explicitly a router rather than duplicate authority. `provider-boundary.md` retains its existing dispatch/uncertainty guarantees and now covers delegated assistant attempts.

The target contract now specifies: branch-neutral immutable Library roots; `STORY_PROMPT.md`, `STORYTELLER_PROFILE.md` and `START.md` roles; exact rooted source identity; structurally shared campaign/fork roots; adaptive multi-round writer missions; Workdesk stage/reread/revise; versioned writing skills; bounded independent research contexts; explicit parent adoption; provider-independent browse/find/read/compare/skill/stage/diff/submit capability boundaries; and mission-wide cost/custody.

**Deliberately not frozen:** physical persistent-tree algorithm, provider/model choice, default token/tool/round ceilings, subagent parallelism and one eternal spend envelope. Those are implementation/resource policy under WR02–WR04, not the Storyteller's permanent identity.

**Current-runtime notes were preserved where they explain migration or evidence.** They do not weaken the branch target. No source code, schema, migrations, provider dispatch or queue selection changed.
