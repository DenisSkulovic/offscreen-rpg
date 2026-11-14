# Gameplay & Worlds | operational forensics and safe intervention

**Status:** Proposed product workspace, 2026-11-14; owner review required. **Owns:** how authorized staff inspect and help with persistent game state, continuity, chronology, character relationships, repairs and diagnostics. **Not:** rewriting the game engine, implementing world editors, redefining fictional rules or authorizing Cursor work. Authorities: [game vision](../vision.md), [game concepts](../concepts.md), [Storyteller constitution](../storyteller-architecture/vision-and-quality-constitution.md), [Player 360](player-360-service-blueprint.md) and [staff authority](authority-operating-policy.md).

## 1. Purpose

A conventional game admin panel can show scores, inventory and moderation status. Offscreen needs **gameplay forensics**: understanding why a persistent fictional life arrived at its *current legitimate state* and whether what the player saw accurately represented it.

A competent operator should distinguish:
- what the game mechanically **committed**;
- what the Storyteller **proposed** but never had authority to publish;
- what was actually **published/narrated** to one or more viewers;
- what a character **knows or believes**, possibly incorrectly;
- what the application **derived or summarized** from source evidence;
- what remains a valid **pending operation** or an **unavailable observation**.

A fictional claim in prose is not automatically a mechanical fact. Nor is every contradiction a defect: a character may lie, misremember or misunderstand. Repair must be evidence-led, not an administrator selecting the more pleasing story.

## 2. The operator's subject model

| Subject | What an operator wants to know | Important separation |
| --- | --- | --- |
| Campaign / story | Status, story direction/profile/rules commitments, members, affected release | Can be solo or shared |
| Participant / controlled character | Identity and currently legitimate point of view | Character is not the human account or payer |
| Committed world state | Rules, current fictional time, relevant facts, possession, relationships, obligations | Current truth, not generator output |
| Accepted action / active work | What the player authorized, time commitment, progress, interruption and limits | Starting work is not completing it |
| Mechanical receipt / event | What actually resolved, earned or changed | Once accepted/settled, cannot be casually rerolled |
| Published passage / decision | What the player(s) actually saw and could choose | May have a different visibility audience |
| Storyteller task / execution | Why narration was requested and which evidence it used | Not necessarily one model call or one gameplay turn |
| Canonical/derived source | Source documents, notes, summaries and uncertainty | Derived summary must not override original evidence |
| Configuration / world policy | Which version and consent/risk limits applied | A newer global version does not rewrite the old campaign |
| Repair / diagnostic attempt | What staff proposed or tested, where, with whose permission | Sandbox evidence is not a live-world effect |

The model should not require a persisted named entity for every invented passerby or location. The original vision intentionally allows an implied world much larger than the set of continuity-relevant facts. The console reflects whatever is *actually* durable and source-backed.

## 3. Operator views

### Campaign overview
Status and latest known valid position; members and their legitimate views; last relevant activity; active accepted work or hold; current storyteller/rules configuration; important known issues; related cases and incidents.

A campaign can be quiet without being broken. An active journey can be ongoing without a recent AI call. A generation delay cannot silently advance fictional time.

### Current world / character state
Show only mechanically meaningful state that is actually represented: inventory with holders, admitted resources, location/relationships where known, commitments and scheduled obligations, fictional time and applicable campaign rules. Make **known versus implied versus uncertain** obvious.

The inspector should answer "why does this item belong to this character?" with a causal source or acknowledge missing evidence.

### Chronology and player-facing narrative
A navigable sequence of published passages, decisions, actions, events and receipts. Indicate which viewer(s) could see each item. A passage may be prose about the same scene; it is not necessarily a new scene, turn or world event. **No chapters** are imposed on the product model.

### State evolution / causal trail
At a selected fact or resource, inspect an intelligible before/after view and the accepted cause: action, rule, obligation or repair. If state reconstruction is incomplete due to retention or older records, mark incomplete rather than inventing a historical delta.

A world fact may be present as source text without a separate typed fact object. Provenance must remain clear despite that variety.

### Investigation / execution context
Follow a publication or failed operation to its Storyteller task, associated model rounds, admissible inputs, source coverage, rules/validation, and publication outcome. Private prompts, hidden future direction, other players' content and model inputs are separately permissioned.

Technical investigation is linked to [AI Operations](ai-engineering-operations-product.md), not duplicated into a second technical console.

## 4. Gameplay-forensics question taxonomy

| Reported symptom | First diagnostic distinction | Possible next investigation |
| --- | --- | --- |
| "My item vanished" | Actual holder changed vs UI missing vs wrong passage claim | Receipt/holder causal trail, projection, support case |
| "The gates were destroyed, then intact" | World truth vs character belief vs retconned prose | Original passage, committed state, later task evidence |
| "My 8-hour journey finished instantly" | Accepted duration vs progress/settlement vs display estimate | Execution time and receipt, pace/rule version |
| "The game is frozen" | Legitimate hold/decision vs missing wake vs provider task pending | Current attention state, operation diagnostics |
| "I was charged twice" | Player allowance versus provider calls versus duplicate admission | Commercial and AI execution links |
| "Another player saw a private scene" | Published audience/consent vs accidental disclosure | Visibility trail, security/privacy escalation |
| "The story is boring/repetitive" | Profile-faithful quiet vs unintentional repetition or missing context | Player feedback, profile, sampled qualitative review |
| "A character knew something impossible" | World fact vs viewpoint knowledge vs hidden future prompt leakage | Source visibility and context lineage |

For any anomaly, the Admin should make it easy to report **verified defect**, **reasonable interpretation**, **under investigation** or **insufficient evidence**, instead of forcing a premature diagnosis.

## 5. A worked continuity case: the destroyed city gates

A player reports: "Yesterday the gates fell. Today the narrator says they were never destroyed."

1. From the Support case, locate the exact campaign, participant and published passages.
2. Determine what the first passage actually said and whether destruction was **committed fact**, observed rumor, character belief or rhetorical prose.
3. Inspect subsequent relevant state/receipt and Storyteller task lineage. Was evidence absent, masked by valid point-of-view limits, stale, or contradicted by later composition?
4. Check whether a new configuration version, truncated context, derived summary or stale publication contributed.
5. If the error is only presentation, consider a separately supported clarification. If it corrupted authoritative state, escalate a bounded repair with affected facts, player knowledge and other members' impact.
6. Before any mutation, show current revision/ongoing work, expected corrected state, other participants, irreversibility and communication requirements.
7. Verify the actual durable result and customer-visible effect. A provider-generated alternative is **not** confirmation.

An employee should not "fix" the world by editing the gates row and then sending an apology if doing so silently contradicts subsequent choices and other players' experiences.

## 6. Interventions: graduated powers, not a universal editor

| Class | Example | Policy posture |
| --- | --- | --- |
| Observation | Read current state, receipts, published history | Read-only, sensitive evidence permission as necessary |
| Diagnosis | Inspect missing context, compare versions, open isolated reproduction | No live story writes; internal cost attribution |
| Service correction | Restore lost access to a known verified passage or resolve a stuck view | Only where authoritative outcome is already established |
| Bounded repair | Apply supported reconciliation for a well-defined state inconsistency | Specialized authority, current-state preflight, effect audit |
| Forward correction | Publish an attributable correction or amendment to future continuity | Must preserve previous visible history and consequences |
| Restore from checkpoint | Recover after severe corruption when product expressly supports it | Exceptional: irreversibility/participation notice and possible loss shown |
| Story fork | Create a separate new story from a committed point | Distinct player-facing creative feature, **not** automatic Undo |
| Restriction/stop | Pause unsafe admission, suspend feature or player eligibility | Not the same as changing fictional-world truth |

**Recommendation:** the default workflow is inspect → explain → reproduce safely → propose a bounded remedy → approve when required → verify. A raw editable state inspector is a tempting shortcut but an unacceptable long-term operating posture.

No repair may:
- arbitrarily reroll a settled check;
- award unearned time, work, inventory or money;
- grant a choice the player never made;
- rewrite another participant's private or observed history without the applicable policy;
- create a past event from uncommitted Storyteller prose;
- disguise a compensation grant as fictional progress;
- silently erase the original defect or audit history.

Some worlds may be beyond safe in-place repair. The product should be able to **say no**, offer an explicit fork/restart or specialist recovery, and explain why.

## 7. Isolated investigation and Chamber boundary

The existing Chamber is a developer laboratory for repeatable scenarios and controlled fault cases. The mature Admin might expose *governed outcomes* of this capability, not unrestricted test hooks in live production.

Product requirements for a support-facing sandbox:
- copy/snapshot the **authorized, permitted** source state and relevant task versions;
- inspect a recorded deterministic path separately from a new stochastic model simulation;
- prevent live-time progression, customer-allowance consumption, notification, presence or payment effects;
- label captured state, copied provenance, model variation and evidence gaps;
- allow selected safe findings to be attached to a case/incident without spraying private text into a broad audience;
- require a distinct administrative repair proposal to modify the real story.

**Open:** which Chamber operations become supported Admin actions versus remain developer-only. Technical implementation/reuse belongs to the later architecture phase.

## 8. Shared stories, visibility and player agency

For a shared campaign, **the subject of an action matters**: one participant, one character, the public world, a private perspective, or the entire campaign.

A Support assignment for Alice is not universal access to Bob's account or hidden prose. Yet some shared events genuinely affect both and need common causal investigation.

A repair preview should display:
- exactly whose experience and current commitments may change;
- whether the proposed effect is shared and whether a member is currently acting;
- who may need notice or consent, as later policy determines;
- what histories are visible to whom, including prior published consequences;
- what remains unchanged, and what future work might be invalidated.

A player's storyteller/risk settings are captured commitments. Staff must not quietly change the game's tone, lethality or dice authority to resolve a complaint.

## 9. Game quality and operator feedback

Distinguish **mechanical integrity** (rules/time/receipt/visibility), **narrative continuity** (source faithfulness), and **subjective taste** (profile match, originality, pacing, emotional resonance). No generic automatic score should decide that a quiet campaign is "bad".

Useful signals: confirmed impossible state transitions, invalid effects, misattributed inventory, interrupted activity loss, missing contextual evidence, repeated turns, player dissatisfaction, and qualitative samples across moment/sequence/life scales. Every such sample needs context and permitted access.

Operators need both **issue classification** and **uncertainty**. A plausible narrative imperfection is not automatically a production incident; a mechanical falsehood is not harmless merely because the prose is pretty.

## 10. Adversarial acceptance

- A player watches an eight-hour trip in progress; the Admin does not display arrival before valid completion.
- One model attempt produced attractive prose but publication failed; the Admin shows **unpublished**, not a canonical passage.
- After failed narration, a mechanical receipt exists; recovery cannot redraw or reapply it.
- A campaign has no recent generation because legitimate work is underway; no false "stuck agent" alert.
- An operator has campaign summary access but no raw narrative; titles and previews cannot leak private content.
- A support user diagnoses a shared event but cannot inspect other members' personal data.
- A repair is proposed against stale state while the player advances; execution is refused or re-preflighted.
- A story fork never retroactively changes the parent timeline.
- A missing source document is reported as absent, not backfilled from speculative AI interpretation.
- A new storyteller configuration cannot retroactively grant mechanical progress to an older campaign.

## 11. Still open

AD-P02: campaign membership/authority and shared-world impact; AD-P05/07: narrative evidence and repair policy; AD-P10: version adoption, migration and historical continuity; AD-P16: Chamber versus Admin split; AD-P23: published/private/shared evidence and participant notice; AD-P24: allowed repair taxonomy.

The model above is a product target. It does not say these repair primitives are implemented or universally safe.
