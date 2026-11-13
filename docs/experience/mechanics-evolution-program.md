# Gameplay evolution driven by the player experience

**Status:** separate **future mechanics program**, proposed for owner review. **No runtime/contract/source changes authorized.** It exists because the user explicitly challenged existing mechanics, not merely existing visuals. The [UX01–UX11 program](implementation-program.md) remains the near-term screen redesign; the **GM** queue addresses capabilities the screen cannot honestly invent.

## Design premise

The game should support an arbitrary character who **chooses an intention, invests time, experiences meaningful uncertainty and returns to persistent consequence**. Existing work has strong deterministic time/receipt safeguards; those are worth preserving. But current affordances for player expression, sustained autonomous life, relationship memory and long-term narrative quality may be too narrow to deliver the original dream.

A mechanical redesign is justified only when it improves **the actual player experience**, not because a schema could become more generic. See [mechanics critique](foundations/mechanics-reassessment.md), [time alternative study](foundations/temporal-philosophy.md), [Storyteller quality bar](foundations/storyteller-experience-quality.md) and [source/UI audit](evidence/current-ui-source-audit.md).

## Two tracks that must not be mixed

**UX track:** present current verified semantics beautifully and truthfully. It can work before new mechanics exist.  
**GM track:** change what a character can validly attempt, how standing offscreen intentions persist, and what canonical evidence can be retrieved. Every change requires new domain tests, content admission, privacy/cost review and owner approval.

**Do not** use a prettier frontend to bypass backend authority or infer missing mechanics. **Do not** block every UX improvement until all speculative engine work is done. They are separable by honest scope.

## Proposed code-bearing GM packets

| Packet | Small, falsifiable result | Dependency | Important limitation |
| --- | --- | --- | --- |
| [GM01 interpret candidate](../changes/2026-11-13--gm-custom-intent-proposal/CHANGE.md) | Bounded, noncanonical **custom-intent proposal** contract with cost/clarification/rejection tests | Explicit interpretation design and chosen cost policy | No direct game action or world mutation |
| [GM02 admit one custom attempt](../changes/2026-11-13--gm-custom-intent-admission/CHANGE.md) | A validated proposed action may execute **one supported finite action family** via existing immutable receipt path | GM01, stable private plan/rule adapter | Not general arbitrary magic or unrestricted natural-language action |
| [GM03 standing routine](../changes/2026-11-13--gm-standing-life/CHANGE.md) | One narrowly bounded, server-owned **standing repeatable routine** that stops at a hard horizon/decision | Accepted activity/routine protocol + owner selection of policy | Not passive global ticking, infinite autoplay or NPC simulation |
| [GM04 distinct offers](../changes/2026-11-13--gm-offer-distinctness/CHANGE.md) | One specific fixture prevents unchanged failed-persuasion action spam with authentic state/rule effect | Existing scripted fixture and offer resolution | Not a universal novelty engine or one-size-fits-all reroll ban |
| [GM05 sourced events](../changes/2026-11-13--gm-return-event-projection/CHANGE.md) | A safe, chronological **public committed-event projection** for Journal/recent developments | Existing receipts/events and owner authorization | No LLM recap, no seen cursor claim |
| [GM06 seen cursor](../changes/2026-11-13--gm-viewer-read-position/CHANGE.md) | Viewer-specific acknowledged chronology position for **truthful “since last viewed”** | GM05 source sequence, auth/viewer identity semantics | Does not mark content as read merely because delivered to browser |

All are **Proposed**, not Ready; each requires explicit owner approval and source inspection immediately before implementation. These **must not be auto-added to the active Change index** as authorized work.

## Order by player value, not code glamour

1. **First prove Now with existing engine**: one scene, admitted action, earned work, interruption and return, using UX01–UX04. If the presentation fails, expanding free text won't save it.
2. **GM04 can be researched early** as a small quality fix because identical choices after a failed check damage agency even in the current fixture.
3. **GM05** is likely the highest-leverage near-term domain projection: a credible return and Journal need facts, not invented summaries. It can follow UX07's data-gap audit independently of richer autonomy.
4. **GM01→GM02** unlocks a deeper fantasy but should be justified by a real corpus of player intents and error rates before paid interpretation becomes ubiquitous.
5. **GM03** is the largest emotional upside and engine risk. Validate a one-routine offline prototype before a new general life scheduler.
6. **GM06** follows trustworthy event identity and user-view semantics; don't implement a last-seen flag as a cosmetic feature.

These priorities are design judgments, not owner decisions or a Gantt chart.

## Hard invariants every GM Change must preserve

- Versioned authenticated actor/viewer and story authority; multi-player actor control is **not implied**.
- Deterministic time and dice/effects settlement; player prompt cannot dictate successful effect.
- Idempotent frozen operations; no paid retry merely because browser lost acknowledgment.
- Canonical history unchanged by summaries or presentation.
- No response-default power or autonomous irreversible action without explicit approved policy.
- Provider spending explicit and bounded; per-tick inference not acceptable routine cost.
- World neutrality: no mandatory humanoid body, map, currency or professions.
- Private hidden DM plans, DCs and future encounters never leak to public read models.

## Design-only questions to settle before code readiness

- How are custom intentions clarified without infinite prompt loops or expensive interpretation spam?
- When does an accepted standing routine revalidate world facts, and how does it distinguish safe repeated work from autonomous interpretation?
- Which public event types are meaningful enough for a return digest without turning the user into a log analyst?
- How can a failed attempt constrain repeated use without unfairly banning sensible new tactics?
- What will future spatial travel progress mean in a non-Euclidean world?
- Which relationship/social facts require typed state versus source-linked descriptive continuity?

## Proof ladder

**Level 0:** design and alternate hypotheses documented.  
**Level 1:** provider-free deterministic scenario and negative cases.  
**Level 2:** actual rules/DB receipt/transaction/identity tests in a disposable environment **only with explicit test authorization**.  
**Level 3:** bounded provider model test for semantic quality and cost **only with explicit spend approval**.  
**Level 4:** browser view of real source-backed state, without leaked secrets or fabricated progress.  
**Level 5:** unprompted player comprehension/interest after leaving and returning.

A fake demo can pass conceptual Level 0–1 while never proving live persistent mechanics. Do not conflate levels.

## What this program rejects

- Adding a generic freeform text box that maps straight to Storyteller prose.
- Running model inference every scheduler tick to make the world “alive.”
- A global autoprogression toggle that can spend, fight or create NPCs without bounds.
- A universal work/currency/health/crafting/relationship system just to populate UI tabs.
- Pretending the world clock alone creates social history.
- Auto-generating Journal recaps that alter the source of truth.
- Forcing another Storyteller call for every quiet completed activity.

**The future game should be flexible because its *rules and authoring boundaries* are well-designed, not because every string is passed to an LLM and hoped for the best.**
