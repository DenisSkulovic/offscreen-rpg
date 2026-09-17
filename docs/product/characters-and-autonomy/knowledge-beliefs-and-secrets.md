---
id: DOC-KNOWLEDGE-BELIEFS
layer: product
status: draft
domains: [characters-and-autonomy]
tags: [autonomy, continuity, consequences, world-creation]
updated: 2026-09-16
relations:
  - type: depends_on
    target: DOC-GLOSSARY
  - type: depends_on
    target: DOC-INVENTION-CANON
  - type: relates_to
    target: DOC-CHARACTER-IDENTITY
---

# Knowledge, beliefs and secrets

Owner: Denis. Release disposition: unassigned.
Scope: information available to characters and how it changes.
Sources: [terms](../foundations/glossary-and-domain-map.md), [world facts](../worlds/invention-discovery-and-canon.md), [identity](identity-personality-and-judgment.md).

This is a draft interpretation of limited character knowledge and fallible judgment. No knowledge simulation depth, memory model or new D&D mechanic is selected. Examples are illustrative only.

## What we need to distinguish

A fact may be true without a character knowing it. A character may believe something false, or doubt a true report. Two people can therefore act differently without the world itself being inconsistent.

Not all information comes from a narrated encounter. A character can plausibly know their own trade, home or acquaintances before play begins. The boundary between such background knowledge and information that must be acquired is still open.

A secret is not simply a fact omitted from the latest narration. Some truths exist but are concealed; some content has not been established at all. [CANON-F01](../worlds/invention-discovery-and-canon.md#authorship-and-fidelity-forks) owns when hidden facts are established.

## Proposed behavior

| ID | Draft expectation |
| --- | --- |
| KNOW-001 | Do not make every character aware of an event merely because it exists in campaign history. |
| KNOW-002 | Distinguish hearing a claim from believing it and from the claim being true. The world-fact boundary is owned by CANON-003. |
| KNOW-003 | Significant changes in a character's information should have a plausible route: observation, communication, background knowledge, inference or another source allowed by the rules. |
| KNOW-004 | New information can change beliefs without retroactively changing what the character knew when an earlier decision was made. |
| KNOW-005 | Do not grant the player character external player knowledge simply because it appears in input. How to handle such input is an open fork below. |

These expectations do not require tracking every conversation, every mundane fact or a numerical confidence score. They identify product distinctions; implementation and simulation detail come later.

## Illustrative situations

**A witnessed theft.** A witness may know what they saw; a distant person needs another plausible route to that information. Whether the witness reports it, to whom and how quickly is not decided by this example.

**A misleading report.** A traveler claims a road is safe. The character may trust it, doubt it or misunderstand it. A later danger does not prove the game forgot its own state: the report may have been wrong.

**News arriving late.** A character hears about a change after it occurred. Their earlier action should be judged against information available then, not current hindsight.

**A familiar trade.** A character need not inspect every ordinary tool to know what it is. Which expertise is supported by background versus mechanics must agree with the chosen D&D baseline.

**Player knowledge of a fictional setting.** The player may know a hidden location from a book or another game. The character's ability to use that information requires an explicit policy; recognizing a setting does not settle that policy.

## Options and forks

All candidates, release disposition unassigned.

| Fork | Alternatives and tradeoffs | Evidence needed |
| --- | --- | --- |
| KNOW-F01: information detail | Track only consequential knowledge; track selected relationships and rumors; model broader communication. More detail supports richer consequences but is harder to keep coherent. | A few cases where information actually changes a choice |
| KNOW-F02: belief and trust | Qualitative interpretation; explicit confidence/trust mechanics; rely on adopted checks where applicable | D&D baseline and desired predictability of character decisions |
| KNOW-F03: player knowledge crossing into play | Ask for a plausible character basis; restrict unsupported actions; permit broader player direction under an explicit policy | Compare an ordinary guess with use of an unknowable secret |
| KNOW-F04: memory over time | Preserve acquired knowledge; allow selective forgetting or distortion; vary by agreed traits/conditions | Whether forgetting adds worthwhile play and how it would be communicated |
| KNOW-F05: player inspection | Show only character-facing information; expose selected out-of-character knowledge; offer configurable disclosure | Decide desired mystery and mechanical transparency |

Player inspection is distinct from making all NPCs omniscient. Rules/status explanations are also distinct from revealing fictional secrets.

## Boundaries and next questions

This document owns acquisition and belief, not whether the player can author new truths. Invention/canon owns truth and correction. Identity owns personality's influence on judgment. World events own what happened and its consequences.

Still open: which knowledge deserves explicit treatment; what inference is plausible; whether source identity is visible; how lying or magical information sources use adopted rules; how much of this is needed in a first campaign. No fake precision or exhaustive social simulation is required by this draft.

## Initial knowledge coverage versus later information simulation

Recommend explicit relevant facts for the player character and key NPCs: known places/routes, job terms, observed changes and received reports. A report records what was communicated and its source/timing when consequential; truth and belief remain distinct. A notification summarizes authorized player-facing information, not every hidden world fact.

The first version can use direct observation and defined local notices/contact events. Do not broadcast every event to every resident or run a rumor conversation each tick. Faction membership alone grants neither all member knowledge nor instant news. Travel or a delivery rule can delay information where the initial scenario depends on that distinction.

General rumor networks, media technologies, interstellar communication delays, misinformation campaigns and detailed confidence/forgetting are later candidates. A modern or magical information system requires its own profile rules; the platform should not hard-code medieval messengers as the universal communication channel.

## Attention is different from knowledge

D054 proposes focusing presentation on what matters in the current scene. A character navigating a dungeon need not be shown an unrelated old market price, but that does not erase the memory or prevent deliberate inspection. Keep three distinctions: world truth, character knowledge and current presentation relevance. Recaps, messaging and generated imagery must respect the chosen knowledge policy. Character-centered presentation is the proposed default; detailed out-of-character inspection rules remain KNOW-F05.
