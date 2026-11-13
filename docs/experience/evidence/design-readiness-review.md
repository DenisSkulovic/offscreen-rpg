# Independent design-readiness review | UX implementation wave 1

**Status:** design review completed 2026-11-13; **implementation is not authorized by this document**. Project baseline: latest inspected GitHub `main` at `4a6b7077ed92dd04b74b37092e2c5bc867681801` for Play/Next/CSS source, with the React W-series and Chamber CH-series recorded complete in the existing Change index. Handoff branch may be built atop a newer main; the executor must re-inspect the latest actual source before edits.

## What was reviewed

1. Original [vision](../../vision.md), [player experience](../../player-experience.md), [gameplay](../../gameplay.md), [time/autonomy](../../time-and-autonomy.md), [concepts](../../concepts.md). **Result:** prior UX design was missing explicit reconciliation of delegated responses, first-playable shared party and notification; now captured in [vision reconciliation](../foundations/vision-reconciliation.md).
2. Existing `PlayScene`, `CampaignPlay`, campaign choice/activity/status, current global CSS, authenticated Next layout, SSR Play route and command ownership. **Result:** current page is subsystem-driven, but the selected React/Query/idempotence infrastructure is worth protecting; see [source audit](current-ui-source-audit.md).
3. Four competing composition strategies. **Result:** [Living Situation Stage](../spaces/living-stage-blueprint.md) chosen for first prototype; permanent dashboard rail and endless chatbot are rejected as primary patterns. This is a **designer judgment**, not a human A/B outcome.
4. Actual public DTO surface. **Result:** current passage/offers/work/status generally support an honest first stage; full viewer-specific return digest, stable world knowledge and free-form custom-intent do not. See [capability map](public-projection-capability-map.md).
5. External design research. **Result:** scene/choice visual separation, short repeatable content and context-grounded decision consequences are supportable principles, but no third-party game is a ready-made UI template. See [comparative case studies](comparative-game-research.md).
6. Testing infrastructure. **Result:** React Storybook/RTL/Playwright exists, and Chamber CH01–CH16 have implementation records, but specific player-state lab scenarios remain planned/blocked. See [Chamber UX bridge](chamber-ux-validation-bridge.md).
7. Security/architecture cross-effects. **Result:** authenticated Next route-group layout owns the private Query provider; global CSS influences public/demo/Chamber. UX01 must not mount player chrome globally. Moving settings cannot discard dirty RHF data.
8. Proposed Change scope and negatives. **Result:** UX01/UX02 are independently bounded after tightening; UX12 separately owns finite plan composition. GM01–GM07 require later mechanics authority and are **not** frontend cosmetics.

## Hard decisions selected for implementation planning

| Question | Selected design judgment | Reversal condition |
| --- | --- | --- |
| Primary screen metaphor | One **living situation stage** with editorial narrative and precise contextual game state | Actual users consistently cannot access critical state without a permanent shelf |
| Permanent sidebar? | **No** by default | Verified high-frequency tactical comparisons improve with one, without hurting reading |
| Main story destinations | **Now / Journal** (when Journal actually functional), Details contextual; Settings separate | Human task research demonstrates need for more permanent primary navigation |
| Main choice style | Compact verb-led, structurally separated action rows; more detail only for meaningful stakes | Observed mistaken taps/unknown consequences require greater card distinction |
| Everyday waiting | Accepted-time progress visible; no progress without authority | Explicit future rule model changes, not a CSS animation |
| Public demo | Original, explicitly **scripted and resettable** preview until real trial is supported | Hosted authorized trial with bounded provider cost and reliable back-end proof exists |
| Component strategy | Native HTML/CSS first, accessible Radix primitives selectively, Motion only for justified events | Evidence a different accessible primitive or animation solution is actually superior |
| Source of truth | Existing authenticated public projections and Query lifecycle, no new frontend rules engine | Accepted independent backend contract change |

## Go / no-go table

| Area | Design readiness | Implementation readiness | Current blocker / proof |
| --- | --- | --- | --- |
| **UX01 StoryFrame foundation** | **GO**: composition chosen, route/CSS hazards understood | **GO after explicit owner authorization and source reinspection** | Must return genuine wide/mobile Storybook/browser composition, no private/data regressions |
| **UX02 Now narrative stage** | **GO**: exact stage anatomy, alternate states and relocation semantics chosen | **GO after UX01 proof and explicit authorization** | Must preserve functional history/settings and dirty form state |
| **UX03 choices** | **GO for existing authored offers** | Dependency UX02, owner go-ahead | Current backend's two offer forms need safe typed adapters |
| **UX04 time and holds** | **GO for supported process types** | Dependency UX03, owner go-ahead | Must not infer route distance, forecasts or uncommitted reward |
| **UX12 finite plan UX** | **GO for existing finite successor contract** | Dependency UX03/04 | Supported horizon in game seconds must be translated without inventing new semantics |
| **UX05 story library** | Selected interaction direction | After UX01; read model may be narrower | Rich attention summary might require new public projection |
| **UX06 guided creation** | Selected flow direction | After UX01; source fields rechecked | Some advanced settings aren't supported; don't render as functional |
| **UX07 Journal/return** | Partial GO for historical passages/recent facts | After current stage and data-availability check | True since-viewed and full event feed require GM05/GM06 |
| **UX08 World/You** | Conditional layout is clear | Narrow initial public-facts implementation only | No complete verified public entity graph |
| **UX09 public demo** | Original script and truth boundary selected | After primary stage/action grammar; explicit authorization | Human script review, copyright and actual browser proof |
| **UX10 motion** | Semantics selected | Only after committed event lifecycle rendered | Reduced-motion, identity-keyed animations and performance proof |
| **UX11 validation fixtures** | Method selected | Incremental with each code Change | No mocked state may claim connected game truth |
| **GM01–GM07 mechanics** | Conceptual targets; not all owner choices settled | **NO-GO** until domain design/contract authorization | Model cost, policy/risk, character control, persistence, privacy, race semantics |
| **Original shared party + channel** | Vision explicitly retained | **NO-GO** until separate accepted time/permissions/delivery contracts | Not a CSS change or a feature secretly included in UX01 |

**Design GO ≠ approved Change state `Ready`.** Per repository harness, `Ready` requires the owner's explicit code authorization and a verified current-source scope. We have not changed `Current change: none`.

## What a first rendered prototype must answer

1. Does a new visitor see the current scene and an unmistakable next intention within the reading flow?
2. Does the screen avoid placing History, Settings and technical identifiers in a permanent panel?
3. When work is interrupted, do players recognize **the current decision** as foreground and the saved work as background?
4. Can a microbe or abstract mind use the same interface with no money/map/humanoid junk?
5. Can a person name what happens on tab close based on the actual admitted action?
6. Does a lost acknowledgment stay an unresolved **command**, not an in-world failure?
7. Can the player find working history/settings without a dead tab or losing unsaved values?
8. Does the public demo and developer Chamber remain intact when global CSS/layout are changed?
9. Can users read the full prose without motion, imagery or auto-scroll interference?
10. Is there actual atmosphere and reason to return, not merely a competent editorial CMS?

If 1–8 fail, stop polishing fonts and fix the contract/hierarchy. If 1–8 pass but 9–10 fail, the next work is purposeful visual/narrative craft, not another backend rearchitecture.

## What this review did not prove

- **No rendered UI has been inspected** for the proposed new design.
- **No human participant study has occurred.**
- No guaranteed Next/React package compatibility for newly recommended UI libraries has been experimentally validated.
- No paid Storyteller call, real multiplayer or notification delivery test was performed.
- The exact first-pass desktop/mock final aesthetic is unvalidated.
- Docs-only GitHub link checks cannot certify live gameplay/DB/race security.

These limitations do **not** block implementation of a narrow visual prototype; they define what its first review must prove.

## Recommendation for handoff

**Pass only UX01 to Cursor initially**, using [first-wave handoff](../handoff/first-cursor-wave.md) and [the selected screen blueprint](../spaces/living-stage-blueprint.md). The executor should return screenshots, actual tests/commands and newly discovered source gaps. Review those against the target **before** authorizing UX02. Do not hand Cursor all 19 UX/GM packets as an undifferentiated “redesign the UI” task.

The designer's choice is finished **enough for first implementation and empirical criticism**, not “validated final UX for thousands of players.” That distinction is exactly how to avoid another confident sideways rewrite.
