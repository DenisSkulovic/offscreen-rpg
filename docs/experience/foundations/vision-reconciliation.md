# Original vision vs UX reset | preserve the dream, not the accidental POC

**Status:** product reconciliation, 2026-11-13. **Authority:** [original vision](../../vision.md) and [player experience](../../player-experience.md), both inspected on `main` at `4a6b7077ed92dd04b74b37092e2c5bc867681801`. Design proposals here do **not** replace engine contracts or authorize code.

## Why this document exists

The existing implementation is intentionally incomplete; the desired UX must be defined independently of it. But the new UX specification itself can accidentally narrow the game if it overfits today's solo scripted choices and no-idle rules. A **pleasant solo reader with a bounded repair task** is a strong vertical slice, **not** the complete dream.

The original vision includes:
- a character whose ordinary life accumulates meaningful earned time and consequences;
- a player who can watch, briefly intervene, give general intentions or leave characters to act **according to personality** within a campaign's permissions;
- unanswered decisions that can normally lead to a **supported autonomous response** when the policy allows;
- a small shared storyline with invited friends, each owning their own character, as part of the first playable target;
- **one** notification channel that brings someone back to a development or decision;
- arbitrary worlds and character forms, from mundane to nonhuman;
- a short, genuinely compelling hosted portfolio experience.

**Non-negotiable correction:** the first UX implementation wave will not prove all this, and the planned long-term product must **not silently drop** autonomy, shared play or notification just because they complicate the architecture.

## Vision-to-capability decision map

| Vision promise | Inspected current boundary | Desired product/UX end state | Planned owner / status |
| --- | --- | --- | --- |
| Be present in a situation, choose an intention | Published passages + authored contextual offers; mechanical variants | A single **living situation stage** with player-language choices | [Now](../spaces/now.md), UX01–UX04 |
| Earn effort over meaningful real time | Accepted finite actions, contribution/wait, holds and receipts | Precise earned progress, forecast vs actual, change-course semantics | [Time truth](../patterns/time-and-truth.md), UX04 |
| Leave without babysitting a long task | Bounded admitted work and accepted finite itinerary | Clear **what will continue** with no browser open | [Offscreen handoff](../flows/offscreen-handoff.md), UX12 |
| A character may act according to personality after nonresponse | First solo proof holds choices indefinitely; timed/default behavior is separate | **Explicitly bounded autonomous decision delegation** with visible policy/deadline/result | [Decision delegation](../patterns/decision-delegation.md), proposed GM07 |
| An ordinary standing life over multiple days | Finite plan, no free idle advance; reusable opportunities still developing | Optional **bounded standing routine**, not global autoplay | [Three time models](temporal-philosophy.md), GM03 (future) |
| Return to meaningful changes | Paged passages, some bounded public activity records | Honest **Recent developments** then source-backed since-viewed chronology | UX07, GM05/GM06 |
| Invite friend, each owns their character | General shared actor/time authority not proven | Small common storyline with per-person intent, readiness and pause policy | [Shared story](../flows/shared-story-collaboration.md), future shared-play engineering program |
| One notification channel in first playable | User channel not selected or proven end-to-end | Important verified decision/results with safe deep link to Now | [Notifications](../flows/notifications-and-reentry.md), future delivery program |
| Flexible worlds | Nonhuman fixture, versioned rules; broader adaptation unproved | No forced map/body/money, contextual World/You | [World-shape stress tests](../prototypes/world-shape-tests.md), UX08 |
| True AI DM creative freedom | Bounded generated options; no freeform gameplay action | Hybrid curated options plus **interpreted/reviewed** custom attempts | [Custom intent](../patterns/free-intent-future.md), GM01→GM02 |
| Hosted demo on CV | Scripted /demo; no default paid public guest | Original honest scripted preview now, eventual bounded **real** trial | [Portfolio first contact](../flows/portfolio-first-contact.md), UX09; provider trial separate |

**A status in the table is not a release promise.** Future mechanics need exact approved contracts and evidence before UI may advertise them.

## Distinguish the three forms of offscreen life

1. **Commitment continuity:** “Continue repairing the beacon.” This is already conceptually supported by accepted work. No automatic choice needs to be made.
2. **Standing routine:** “Repair when eligible each morning, up to a bound; stop for a decision.” This is a **new kind of bounded repetition**, not the same as the present finite activity plan.
3. **Delegated response:** “If I do not answer a particular permitted decision within the authorized window, the character may select one of these safe actions.” This concerns **player choice authority** at an event, not labor scheduling or whether idle time ticks.

**GM03 and GM07 must not be combined as one toggle called Autonomy.** The first concerns continued routines; the second concerns ownership of a consequential response. Their security, moral and cost boundaries differ.

A higher “dramatic initiative” Storyteller profile does not grant either permission. Personality can influence an approved choice policy; it cannot create a free mandate to trade away possessions, kill NPCs, direct other human characters, or reinterpret the risk ceiling.

## First-playable target is not first implementation Change

**UX vertical proof:** one solo character, one scene, meaningful offered attempt, saved timed work, interruption and return. It is small enough to evaluate and proves the highest-value experience.  
**Original first-playable ambition:** the above plus a coherent small shared party **and** an offscreen notification route **and** a bounded autonomy response contract once rules are chosen. This is a **later release milestone**, not a reason to contaminate UX01 with multiplayer infrastructure.

Don't describe the first solo wave as a complete fulfillment of the vision. It is the first honest playable segment.

## High-stakes product decisions that require design beyond these screens

### A. Autonomy isn't a default

The vision says unanswered choices normally lead to an autonomous response. That is an **end-state experiential aim**, not license to act without captured policy in the first POC. Select a constrained initial default policy and clearly show its scope during creation/plan review. Keep the first solo indefinite decision hold until the domain contract is explicitly approved. See [decision delegation](../patterns/decision-delegation.md).

### B. Shared story isn't just a members widget

Invited group play needs actor-specific offers, ready state, shared time/hold policy, conflict resolution, permission to pause and a grounded explanation of what happens when one player disappears. A future UX packet cannot implement it as three avatars around the existing `StorySnapshot`.

### C. Notifications are an output of authority

An offscreen message needs a **published** event or decision with viewer-scoped authorization. No speculative AI push, secret future danger or generic growth nudges. Muting notifications does not change the character's autonomy/risk.

### D. The world need not simulate everyone

World richness is **relevant continuity**, not an agent for every patron, a map for every setting or a global history of farmers. The UI should make personally meaningful facts accessible, not elevate incidental lore into a database admin task.

## An honest maturity vocabulary

- **Product vision:** the full experience we intend, including future multiplayer/autonomy/contact.
- **Selected UX design:** chosen human-facing interaction target pending validation.
- **Approved engineering contract:** explicit domain API/state/rule guarantee.
- **Implemented offline slice:** provider-free fixture/screen that runs.
- **Connected verified slice:** authorized DB/worker/Next behavior tested.
- **Human-validated experience:** actual strangers navigate the designed flow and understand what happened.

Do not collapse these into one badge called “Done.”

## Verdict for the present handoff

**We can responsibly hand UX01 (the story shell) and UX02 (narrative stage) to Cursor once the design freeze and source-protection gates are checked.** Those packets neither require shared play nor autonomous response mechanics and can be judged on a realistic solo fixture.

The **first playable product is not complete** until the missing original pillars are independently designed, built and proved. The strongest UX architect protects the original promise while reducing the first implementation slice. This is a scope strategy, not a demotion of the dream.
