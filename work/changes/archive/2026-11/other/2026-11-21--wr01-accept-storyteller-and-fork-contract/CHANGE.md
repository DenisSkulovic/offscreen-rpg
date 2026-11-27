# WR01 | ChatGPT documentation wave 1: permanent product wiki

**State:** Done, 2026-11-21. Documentation-only target contract; runtime implementation follows. **Kind:** documentation-only. **Owner:** ChatGPT (a dedicated GPT-5.6 chat is appropriate); **NOT Cursor**. **Dependencies:** owner review of the 2026-11-21 whitepaper, especially its open decisions. **Outcome:** rewrite the canonical *product* contract for the Storyteller refoundation, preserving the repository's existing product truths and marking unresolved policies honestly. This is not another design dossier.

**Program:** [Writer implementation roadmap](../../../../WRITER-IMPLEMENTATION-2026-11-21.md) · [ChatGPT docs handoff](../../../../WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md) · [current work selector](../../../../../QUEUE.md). **Next docs Changes:** [WRD02 Storyteller and Library technical](../2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) → [WRD03 engine and fork technical](../2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) → [WRD04 wiki reconciliation](../2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md). No implementation, provider calls, migrations or cluster actions.

## Critical first rule: authority

**Owner approval recorded:** on 2026-11-21 the owner explicitly instructed this documentation line to treat the Storyteller refoundation as the selected target state and to have application code follow it next, rather than writing the target as a provisional proposal. This approves the product outcomes in this Change. It does **not** freeze the physical Library algorithm, provider/model, numeric mission ceilings, or other implementation/resource choices explicitly left open below.

The current 200+ KB [design dossier](../../../../../designs/archive/story-creation-and-writers-workbench/README.md) is **not** the product bible. Read its [vision-first target](../../../../../designs/archive/story-creation-and-writers-workbench/VISION-FIRST-TARGET.md), [worked scenarios](../../../../../designs/archive/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md), and [critical self-review](../../../../../designs/archive/story-creation-and-writers-workbench/CRITICAL-SELF-REVIEW.md) selectively. The approved owner choices, not the bulk of draft reasoning, must be incorporated into **existing \`docs/product/\` owner pages**.

**Before editing:** obtain explicit owner approval of the overall target and identify six whitepaper decisions (universal active-scene forkability, exact Library index algorithm, child-agent write rights, order, model spend policy, preset customization precedence). Do **not** silently mark a proposed mechanism selected. Where product principle is accepted but mechanics remain undecided, write a clear **selected outcome / proposed implementation / unproved realization** distinction, with the relevant section's qualifier.

Read the [documentation-reconciliation skill](../../../../../../.agents/skills/documentation-reconciliation/SKILL.md) and [navigation standard](../../../../../../.agents/references/documentation-navigation-standard.md). Check the actual current GitHub HEAD and owner pages. Do not treat stale DESIGN references as authority, and do not rewrite the bible to match legacy code.

## Primary product owners and intended edits

| Owner page | New or reconciled product claims |
| --- | --- |
| \`docs/product/foundations/vision.md\` | Preserve the earned-life narrative goal while no longer universally requiring a humanoid character or 5e premise; human-focused examples remain valid **examples**, not every-world requirements. Distinguish solo first playable, long horizon, deferred social ambition, and unproved quality. |
| \`docs/product/foundations/concepts.md\` | Define Story Prompt (verbatim intent), authored experience, Library, Storyteller, Workdesk, skill, assistant, scene, world-state frontier, historical review and fork in *player/product* language; avoid inventing one software class/table per noun. |
| \`docs/product/experience/entry-and-onboarding.md\` | Replace mandatory multi-step wizard with prepared **Play / optional Customize**, and one freeform Story Prompt; direct first-scene arrival, durable progress/error/uncertain handling, optional saved draft but no separate human approval step. |
| \`docs/product/experience/navigation-and-stories.md\`, \`play-and-decisions.md\`, \`return-and-journal.md\` | Preserve Now/Journal/book reader while reconciling creation navigation, honest wait/first arrival, history inspection and source-specific fork semantics. No player exposure of private Workdesk research. |
| \`docs/product/storyteller/behavior-and-quality.md\` | Genuine investigative writer, purposeful research/delegation, active drafting/revision, creativity with evidence, real quality expectations and simple-scene fast path. No universal one-shot or mandatory multi-agent theater. |
| \`docs/product/storyteller/profiles-and-settings.md\`, \`memory-and-continuity.md\` | Creative direction as versioned guidance; skill use and private possibilities, branch-scoped recall, source/epistemic distinctions and player-editable versus engine-only settings. Model context is disposable; files persist. |
| \`docs/product/gameplay/worlds-and-characters.md\`, \`continuity.md\`, \`rules.md\` | Arbitrary perspectives including observational/nonhuman stories; no compulsory body, inventory, profession, HP or D&D adapter. Preserve typed mechanics when a world opts into them. Distinguish story invention from executable world effects. |
| \`docs/product/gameplay/time-and-autonomy.md\`, \`actions-and-commitments.md\` | Narrative pacing ≠ mechanical clock; first-scene publication isn't consent to uncontrolled clock work; admitted offscreen activities continue under policy; fictionally active obligations must be meaningful when forked. |
| \`docs/product/gameplay/acceptance-scenarios.md\` | Add or adapt **small, source-linked acceptance narratives** (prepared Play, one-word custom, cosmic observer, 200-scene callback, active journey fork). Preserve original solo scenario and explicitly label still-deferred shared-play/goblin deadline examples. Do not present imaginary runs as passed tests. |

**Pages outside the primary set:** \`docs/product/experience/living-book-poc.md\`, \`presentation.md\`, \`settings-and-accessibility.md\`, \`gameplay/long-life-benchmark-playthroughs.md\`, Admin docs: inspect **only if a concrete dependent claim changes**; record NO-OP otherwise. Don't indiscriminately rewrite all 114 docs.

## Output and constraints

- Actual substantive edits to canonical owner pages. Preserve rich motivating examples, negative rules, context and status distinctions; do not replace them with a small README and links to design scratchpads.
- A concise per-page **reconciliation ledger** inside the Change (or small \`RECONCILIATION.md\`) recording claim, selected/proposed/current tier, owner, edit or NO-OP and linked affected technical owner. The ledger is an execution receipt, not competing permanent product content.
- Explicit list of **unresolved owner decisions**, not fabricated sign-off. Cross-reference the later WRD technical wave rather than copying technical algorithm decisions into product narrative.
- Update inbound links only for moved/renamed headings; preserve old heading aliases where practicable. Route newly accepted claims from \`docs/product/README.md\` in WRD04.
- Run documentation source/link checks where the available environment permits. Link checks alone do not prove semantics. Report commands, failures and scope honestly.

**Done means:** an uninformed reader can open the product docs and understand *what new experience is expected*, what remains old POC reality, what is proposed versus accepted, and what fiction/agency/forkability actually promise, without opening \`work/designs/\`.

**Do not** mark this Done based solely on a plan or a few see-also links. **Do not** create or alter application source, selected execution queue, compiled wiki index by hand, product permissions, paid models or deployment configuration. **Next:** WRD02 by ChatGPT, after this wave's commit and ledger.


## Reconciliation receipt | 2026-11-21

**Baseline:** `main` at `34e2b4fd8d9d9967e13311da3a938460b1a02244`. On this integration branch, the Storyteller refoundation is the target contract that subsequent Cursor code Changes must realize. `STATUS.md` remains the implementation-evidence owner.

**Rewritten owners:** vision; concepts; entry/onboarding; Storyteller behavior, profiles and memory; worlds/characters; rules; continuity; time/autonomy; actions/commitments; acceptance scenarios. Existing navigation/play/return pages were preserved for WRD04 co-review rather than flattened.

**Intentionally non-normative here:** physical Library tree algorithm; numeric model/token/tool/subagent ceilings; provider default; low-level assistant staging mechanism. Product law selects structural sharing, exact rooted history, a genuine tool-using writer, explicit authority, direct Play/Story Prompt entry and forkable published scenes.

**Verification:** `python scripts/check_docs.py` was run on the 34e2b4f snapshot. The repository already contains broad archive/reference link debt. The WR01-created route break was avoided by preserving the existing `#current-poc-honesty` anchor. No application source, schema, queue selection, provider call or deployment changed.
