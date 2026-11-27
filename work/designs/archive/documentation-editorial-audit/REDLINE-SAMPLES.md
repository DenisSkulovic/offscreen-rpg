# Sample editorial redlines | concrete text decisions before implementation

**Status:** Proposed copy and page structure, **not merged into canonical product or technical documents**. These samples show how to improve fidelity and comprehension while protecting approved product policy. Quoted “before” passages come from canonical files in the supplied f3e3bfe lean snapshot. Verify latest HEAD before applying. No normalized text here independently ratifies a currently open decision. **Links inside the sample replacement prose resolve from this design file for review; change them to canonical relative paths when applying the paragraphs to their owning pages.**

## R1 | Product acceptance scenarios: separate a benchmark from a release obligation

**Current owner:** [acceptance-scenarios.md](../../../../docs/product/gameplay/acceptance-scenarios.md), heading “What the first playable build should demonstrate.”

**Before:**

> Walk through creation, a shared scene, a quiet interval, an immediate consequence, a timed autonomous choice and a return after absence. Repeat the core flow alone.

**Problem:** The article correctly calls the group/auto-response rules unsettled elsewhere, yet this sentence elevates both into first-playable acceptance without a clear ratification boundary. The problem is not the fantasy example; it is the contract implied by the heading.

**Proposed replacement structure** (product owner chooses what is actually selected):

### Acceptance authority for the scenarios

These stories test the intended *experience*. Each scenario capability has its own acceptance status. **An illustrative scene is not implementation permission.**

| Capability tested | Governing contract | Status to confirm before declaring milestone acceptance |
| --- | --- | --- |
| Solo creation and a playable initial choice | Product creation, gameplay rules and current POC acceptance | Check selected solo proof and actual source |
| Accepted time, quiet period, a committed consequence, return after absence | Product time/autonomy and continuity | Selected semantics; implementation proof still separate |
| Friend controls a companion in one story | Shared-play product decision | **Unsettled** until group authority and conflict resolution accepted |
| Missed response triggers delegated action | Delegation/risk/response-window policy | **Unsettled**, cannot infer consent from closing a page |
| Branch-specific goblin/apple content | Scenario illustration | Not a universal content or rules requirement |

The wizard-and-goblin case remains a **stress benchmark** for future shared and delegated play. For each accepted release scope, maintain an explicit minimal *solo* execution acceptance and separately list any authorized expansion. Do not call a shared or delegated branch shipped merely because a scripted Chamber fixture demonstrates its shape.

**Owner-decision question:** is small-party shared play mandatory for the *next* first playable milestone, or is it a later expansion? Do not resolve the answer by selecting whichever scope matches the code. A final approved milestone sentence must reflect the owner's answer. On 2026-11-18 a solo next milestone was recorded from judgment. DOC06 then kept the small-group first-playable ambition and marked the exact live acceptance Proposed/Blocked.

**Expected negative:** a developer implementing the solo POC must not gain permission to invent a timed default for an absent second player by reading this scenario.

## R2 | Engine time status: reconcile the two documents by slice, not by title

**Current:** [authority-and-transitions.md](../../../../docs/technical/engine/authority-and-transitions.md) states a deliberate-time execution/short-action correction is prepared but unimplemented. [chronology-and-activities.md](../../../../docs/technical/engine/chronology-and-activities.md) reports execution gate and finite-action boundary implemented with offline tests.

**Proposed editorial shape only after actual source/receipt verification:**

> **Current source boundary (verified at SHA ___):** [list exactly implemented sub-capabilities and tests, e.g., accepted execution gating; finite short-action settlement only if proven]. **Still selected but not proved:** [list remaining sub-capabilities precisely]. The [product accepted-time rule](../../../../docs/product/gameplay/time-and-autonomy.md#pace) governs both. This section is an integration overview; the exact unit/settlement contract is [chronology contract](../../../../docs/technical/engine/chronology-and-activities.md).

Then strip stale broad “not implemented” and “implemented” claims only where verified, moving the receipt detail to STATUS/evidence. The proof must answer: which command identity authorizes time; what happens without permission; what part of publication can overlap action execution; and which negative test demonstrates no double-award.

**Expected negative:** source changed yesterday but does not satisfy the product contract; no wording may change the product rule into a permissive clock.

## R3 | Vision: keep the philosophy, reduce ticket/status leakage

**Current owner:** [vision.md](../../../../docs/product/foundations/vision.md). Keep its strongest material: one life over real time, ordinary work is meaningful, loss can hurt, characters/worlds need not be humanoid, creative Storyteller is subordinate to committed mechanical truth, and D&D-style rules remain meaningful.

**Proposed article shape, not a wholesale replacement yet:**

1. **The promise:** a persistent character accumulates earned history through committed action and elapsed time. A quiet day is allowed to be quiet.
2. **How the player participates:** player has bounded agency; absence is not blanket delegation; action and pause have named owners.
3. **What makes this a game:** D&D-inspired typed rules and consequences; no instant reward from narration; applicability per world/form.
4. **What the Storyteller contributes:** personality, situation, selective initiative, memory-based callbacks and creative worlds, but no independent mechanical authority.
5. **What survives:** relationships, commitments, objects and their exact evidence, not a simulated database entry for every fictional passerby.
6. **Experience and scope:** immediate playable loop, followed by larger ambitions. Link to acceptance and STATUS; do not embed dated implementation ledgers.
7. **Long-life benchmark:** one short causal example; link to the substantive earned-life scenarios rather than repeating the full atlas.

**Example before:**

> The first proof of concept should let us create a character, experience ordinary life, encounter a development, intervene or let the character choose, and return to a coherent continuation.

The phrase “let the character choose” can be read as general autonomous decision permission. **Proposed owner-safe clarification:**

> The long-term experience supports a continuing character who can spend accepted time on ordinary work, encounter a meaningful development, and resume after the player returns. The initial proof must demonstrate the specific consent and action semantics accepted in [time and autonomy](../../../../docs/product/gameplay/time-and-autonomy.md); generalized delegated decisions remain a separately ratified policy, not implied by inactivity. The first-playable acceptance boundary is maintained in [acceptance scenarios](../../../../docs/product/gameplay/acceptance-scenarios.md), and current realization is tracked in STATUS.

A ratified decision may retain the precise “let the character choose” promise with a narrower authorized fallback; do not silently remove that ambition. The rewrite makes its **status** clear, not less ambitious.

**Expected negative:** a model cannot infer it may choose the player's combat response simply because the player was offline.

## R4 | Storyteller quality: strengthen a selected claim with a falsifying trajectory

**Current:** [behavior-and-quality.md](../../../../docs/product/storyteller/behavior-and-quality.md) contains adopted principles for agency, earned time, memory, creative neutrality, world neutrality, rules, privacy and cost. Keep that matrix.

**Proposed addition after “Falsifiable principles (adopted)”** (illustrative acceptance design, requires owner review before becoming normative metric):

> **Three-day continuity probe.** In a selected low-drama campaign, the character gives a named object to a recurring acquaintance, spends one uneventful accepted shift, and returns two days later. A later interaction consults the original source identity and remembers who owns the object, without creating a surprise incident to justify the recall. If the player abruptly changes route, an uncommitted planned development can be abandoned; an already committed gift cannot. An otherwise equivalent high-initiative profile may propose a new complication, but it cannot change past ownership or charge a model for each quiet minute.
>
> **Success:** bounded source-grounded recall, different creative behavior under different profiles, no fabricated transfer or idle model work. **Failure:** false confidence in a vague summary, obligatory dramatic escalation, hidden mechanical mutation, or an unauthorized response chosen for the player.

No invented statistical threshold is attached. The actual evaluation must replay known evidence with a consistent source snapshot and record what the source supports.

## R5 | Technical canon and model request responsibility: split by authority, not size

**Current:** [context-and-memory.md](../../../../docs/technical/storyteller/context-and-memory.md) (~8.3k words) and [request-context-and-cost.md](../../../../docs/technical/storyteller/request-context-and-cost.md) (~6.9k) cover overlapping retrieval, body-selection, context, storage and model operations.

**Proposed responsibility map (subject to inbound-link and source reinspection):**

| Stable question | Canonical content owner after editorial pass | Avoid duplicating |
| --- | --- | --- |
| Which source document/root/revision is authoritative, and how are world/rule packages pinned? | context-and-memory.md | Prompt assembly and provider budget tables |
| What exact context goes into a bounded task, and how is evidence selected/omitted? | request-context-and-cost.md, possibly renamed **request-context-policy.md** only if the title actually causes confusion | Canonical manifest/schema ownership |
| Which task/loop may ask for another read, stop, recover or publish? | operation-and-controller.md and prompts-and-tools.md | Invented live loop where only one-shot recipes exist |
| Which published passage/receipt can change current gameplay? | generation-and-publication.md plus engine admission owner | Narrative summaries as authority |
| Who funds a model call, and what happens when uncertain? | platform/spending-and-entitlements.md and provider-boundary.md | A second independent spending policy in context doc |
| How do experiments verify retrieval quality? | Lab/evidence owner | A made-up measured benchmark inside selected technical target |

If a large section remains with context-and-memory because it genuinely owns document semantics, keep it. Moving 100 lines for aesthetics is not success.

**Proposed technical writing pattern for a section like “Selected context”:**

> **Invariant:** one generation receives a snapshot of relevant admitted source evidence and exact versioned configuration; selection can omit optional context but must not invent a missing fact or substitute a later mutable revision for the captured source.
>
> **Permission:** [link to exact context selection contract] determines bounded section and document reads. A returned handle is an address to admitted evidence, not permission to edit game state.
>
> **Negative:** a document revised after capture cannot silently become evidence for an already admitted task; a private possibility is not public fact; a model cannot read from an unrelated story or pay for extra retrieval merely because the text requests it.

Those sentences are **editorial exemplars**, not an assertion that every captured runtime path currently enforces them. Verify real source and exact scope before applying.

## R6 | Proposals in Admin, observability and retention: preserve their safety labels

**Current examples:** [Admin authority](../../../../docs/product/admin/authority-and-governance.md) says packages are proposed; [evidence graph](../../../../docs/technical/observability/identities-and-evidence.md) selects a model while keeping Turn Capsule a proposed read; [retention](../../../../docs/technical/observability/retention-and-access.md) notes raw-AI retention candidate values awaiting legal/product approval.

**Bad rewrite:**

> Staff may access Turn Capsules with the permitted investigator role; raw artifacts are retained for 90 days.

This would quietly invent a deployed capability and a binding retention policy.

**Safe framing pattern:**

> **Selected architecture target:** immutable typed evidence and causal IDs, without telemetry acting as historical truth.
>
> **Proposed, not yet authorized:** staff-facing Turn Capsule reads, permission packages and raw-artifact retention values. They require independent product/security/legal decisions and an implemented, tested grant/read path.
>
> **Current realization:** list only actual read scopes and evidence, with source revision, or link to STATUS. Neither the page's directory nor a target diagram creates production permission.

**Expected negative:** no article describing a future read produces a route or capability grant for an operator in the current system.

## Editorial reviewer challenge questions

1. What exact promise changed, if any, in this rewrite?
2. Did the edit preserve the ability to have a week of uneventful life without constant inference?
3. Did it turn a prepared/optional possibility into a committed world fact?
4. Did it create any response, spending, team or privacy permission that did not exist before?
5. Can a reviewer distinguish a target architecture from the source behavior verified at HEAD?
6. Which related headings/links must be reviewed when the changed claim changes next month?
7. Does the article remain readable by a human who does not know internal ENG/T/W/OBS ticket names?
8. Is the edited prose more informative, or merely shorter and prettier?

**Next editorial action:** S0 first, because unresolved authority and current-source disagreement make a large vision rewrite unsafe. Then S1a (vision/concepts) as a tightly bounded source-preserving editorial session; expand after independent acceptance review.
