# WRD03 | ChatGPT documentation wave 3: world-state, publication, time and historical forks

**State:** Proposed, unselected. **Kind:** documentation-only. **Owner:** ChatGPT; not Cursor. **Depends on:** WR01 product semantics + WRD02 rooted Library/agent authority. **Outcome:** reconcile engine, lifecycle, scene publication and fork technical contracts so a newly published scene has one historical fiction/state boundary and a branch can continue from it, including accepted active fictional commitments.

[Program](../../WRITER-IMPLEMENTATION-2026-11-21.md) · [ChatGPT handoff](../../WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md) · [WRD02](../2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) · [WRD04 next](../2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md).

## Distinguish world semantics from execution machinery

The Storyteller writes proposals and evidence; Game Authority validates and commits effective world consequences. The committed *post-publication state* for a scene includes exact Library root, world-state frontier, creative/source/rule pins, admissible choice meaning and causal lineage. The schema is **not necessarily a giant copy-per-scene object**, and runtime worker execution/billing identities are **not** forked fictional state.

**Primary pages:**

| Owner | Required reconciliation |
| --- | --- |
| \`docs/technical/engine/lifecycle-and-compatibility.md\` | Replace the **target** assumption of required draft → reviewed preview → Start with one captured Play launch/first publication. Distinguish optional saved prompt draft and old POC compatibility. Fork semantics, original-world launches, scene history and obsolete quiescent-only target constraints. |
| \`docs/technical/engine/selected-architecture.md\` | World-neutral capability/state architecture without universal D&D/character scaffolding; one Game Authority; semantic history and efficient shared roots; logical subsystems, not extra processes by assumption. |
| \`docs/technical/engine/authority-and-transitions.md\` | Admitted post-scene state, exact previous frontier/root/version fence, mechanical effects and no double settlement, narrative vs typed rules, active work on scene publication. Avoid rewriting source-specific current status as if target were implemented. |
| \`docs/technical/engine/chronology-and-activities.md\`, \`ticks-and-tags.md\`, \`calendars-and-world-time.md\` | Fictional time, game-time progress, accepted activity, interruption/holds and branch-clock reanchor. Never reuse a parent worker/wall-clock deadline as fictional authority or silently advance when only the opening was generated. |
| \`docs/technical/engine/mechanics-and-capabilities.md\` | Typed capability/grants, source rule packages as optional domain-specific mechanics, narrative-only original worlds, choice/offer/action intent semantics and branch-portable fictional commitments. |
| \`docs/technical/engine/concurrency-and-recovery.md\` | Root/state capture, staging vs SQL selection, idempotency, unknown provider custody, holding incomplete operations, exact poststate with no late side-effect notes. |
| \`docs/technical/storyteller/generation-and-publication.md\` | The **Game Authority publication seam**: accepted scene, visible choices with stored intent, document changes, source pins, coherent post-state; rejects missing roots and stale/fork-incompatible outcomes. WRD02 owns author-side agent tools. |
| \`docs/technical/platform/http-api-and-client-contracts.md\`, \`data-and-persistence.md\`, \`execution-and-delivery.md\` | Co-review exact launch/202/status/GET/retry, branch authority, immutable store/SQL/outbox and worker ownership. Preserve current auth/billing/trust rules; update only claims materially affected. |
| \`docs/technical/client/interaction-contracts.md\`, \`state-and-server-boundary.md\` | Co-review when new Play, historical choice or fork route changes intent projection/GET freshness. Presentation details remain their existing owners. |

**Important boundaries:** user-facing response/first-arrival experience lives in WR01 product; model tool/custody design WRD02; visual book geometry remains an existing selected POC, not a mandate to redesign it in this Change.

## Behavioral contracts to carry

- **Every newly published scene is forkable by construction** (subject to owner ratification): exact admitted fictional facts, uncertainty, clock, progress, active plans/offers/obligations and choice meanings are representable and rehomeable under a new branch. An in-flight not-yet-published operation need not be forkable. **Do not claim legacy v1 scenes retroactively possess missing state.**
- Fork copies neither a whole Library nor parent jobs/provider attempts/leases/paid billing. Child references old immutable sources and state, creates new operational identities, and cannot read parent/sibling *later* information.
- A scene commit is a **post-publication** boundary; a later mechanical event has its own causal frontier and cannot rewrite scene 37. Correct previous source-level note skew must be named as a known implementation gap without calling current runtime fully correct.
- Accepted fictional outcomes and pending obligations are distinct from random future predictions; preserve source evidence and choice meaning. Avoid automatic rerolls or duplicated external side effects.
- Game Authority may admit narrative-only choices, arbitrary original settings and typed mechanics where enabled; no universal humanoid, 5e, inventory or profession.
- Player's first scene appears without an invented background timer, while previously accepted autonomous actions continue as policy allows.

## Deliverables

Substantive rewrites in existing technical owners, with accepted **target / current POC reality / unresolved or unsafe case** labeled adjacent to the claim; source/semantic negative examples. A concise Change reconciliation ledger must name each co-reviewed page and exact edits/NO-OP. Cross-links to WR01 product and WRD02 Storyteller owners. Link checks and doc-health commands (where available) with honest failures. **No new tables, migrations, provider runs, source code or unapproved cost/security changes.**

**Done means:** WR05–WR07 can be implemented from permanent technical owner pages without interpreting old quiescent-only checkpoints as the desired future, while preserving the real selected engine authority and operational safeguards. **Next:** WRD04 wiki-wide routing/verification.
