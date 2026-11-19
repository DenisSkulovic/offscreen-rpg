# GM07 | One consented safe response to an unanswered decision

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) has the source-backed, bounded `T01…` route, normal and negative tests and explicit stop gates; [full open-backlog audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) explains priority/ownership. **Default Cursor parent and child: Composer 2.5 Standard.** Current delegation: pure reducer verification; durable consent/expiry is PLANNER-BLOCKED, not a UI timer patch. A planned `T-ID` is **not** selection, implementation, PASS or lifecycle promotion; this Change's existing state and authorization restrictions still govern. No Grok unless a newly identified, specifically owner-approved exception survives additional ChatGPT investigation.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Ready for single-published-decision consent/expiry implementation (2026-11-18); no global autonomy or paid model work.

## Cursor first-screen brief

> **Current-source map:** [Time/absence](../../../../docs/product/gameplay/time-and-autonomy.md#response-windows-and-absence), [committed-time decisions](../../../../docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines), [application story operations](../../../../packages/application/README.md). Inspect current campaign/decision ownership and typed offer/receipt path; do not infer behavior from a UI countdown.
> **Selected design target:** [Decision delegation](../../../designs/open/time-and-autonomy/decision-delegation.md#initial-policy-candidates-and-recommendation) and [four independent permissions](../../../designs/open/time-and-autonomy/decision-delegation.md#four-separable-questions).
> **Known trap:** a fallback selected at expiry may race with an actual player response, manual pause, offer revision, revoked consent or another player's action. Exactly one valid action may settle; no hidden AI outcome/purchase.
> **Scope:** one withdrawal expiry for a published two-choice invitation in `packages/application/src/campaign/delegated-decision.ts` and `packages/application/test/delegated-decision.test.mjs`. No story-writer edit, no model call, and no general autonomy.

## One credible first behavior

A solo character has a _published_ decision with two already-admitted choices. The player previously consented to using a specific safe fallback class if no response arrives by an explicit **real** deadline. On expiry, the server:

1. Checks the same current authorized viewer/character/offer and captured policy.
2. Verifies a permitted, still-eligible fallback.
3. Atomically fences any simultaneous player choice against the fallback.
4. Admits **one** ordinary action with one idempotent operation, rolls/effects/time as supported.
5. Publishes a factual provenance event saying this was the user's **preapproved** absence response.
6. Remains held when no eligible choice exists or another hold forbids execution.

This proves **permissioned nonresponse**, not a generic “AI personality chooses anything.” A later personality-guided ranking feature requires its own cost/evaluation decision.

## Why this is separate from GM03

GM03 is a standing **activity** policy such as repeat approved work until a horizon.
GM07 is **decision authority** when a newly published scene asks something the player hasn't answered. A story may support one and not the other. Neither is enabled by merely selecting a creative Storyteller preset.

## Feasibility/baseline (reinspect before Ready)

The current first solo POC holds decisions indefinitely; [StorySnapshot.decision](../../../../packages/contracts/src/stories.ts) can represent dueAt/defaultOptionId in some paths, but the presence of a field **does not establish that general autonomous response is implemented**. Authoritative expiration begins only when a playable decision is published, not during generation. Current main baseline inspected 2026-11-13; may move under Cursor.

Do not add a fallback button in React and presume it owns application time or actor control. UI may preview supported policy only after a typed backend contract exists.

## Code scope and exclusions

Potential owners: typed campaign or decision delegation policy, versioned captured grant, application expiration/selection admission, idempotent receipt, source-linked public action provenance, scheduler conflict tests and a minimal safe test fixture.

**Exclude:** automatically responding to any question, combat, financial trades, relationship commitments, controlling another player, new NPC agent, unbounded fallback refresh, generic world ticking, new cost tier, model interpretation on every deadline, publication of hidden plans.

## Acceptance and negative cases

**Normal:** published two-choice scene has a 20-minute real response window under selected policy; at expiry one preapproved withdrawal/decline action is accepted, settled exactly once, and shown as a delegated choice in chronology.

**Negative:**

- Player accepts the other offered option just before expiry: fallback does not also run.
- Manual pause/revoked future grant: no autonomous response bypasses it.
- Offer changes, expires or becomes ineligible: no stale fallback, stay held.
- Deadline not published because generation failed: no countdown begins.
- A hidden option must not appear in public grant preview.
- Duplicate scheduler delivery cannot repeat roll, item transfer, clock duration or provider cost.
- Creative Storyteller style is not a permission to delegate.
- Shared viewer cannot act for someone else's character.
- If narration fails after action settlement, fallback is **not** repeated.
- Muted notifications do not change accepted time/action policy.
- Consent was absent: retain indefinite hold.

**Evidence:** provider-free deterministic race tests and a safe public projection, then separately authorized connected DB/scheduler integration. No provider calls and no destructive database actions are authorized by this dossier.

## Ready gate and Cursor handoff

Requires owner approval of exact allowed fallback class, response deadline, consent persistence, pause priority, public event provenance and the no-fallback behavior. Reinspect the actual story/decision state path; if consent or time policy cannot be fenced at the application boundary, **do not ship a UI approximation**. Split engineering if a complete safe result cannot fit one Change.

**Expected human outcome:** someone returning after absence can say **“My character chose the safe retreat I allowed, because I didn't respond in time”**, and can inspect the real source and limits. The app must never imply they personally clicked or that the Storyteller chose arbitrarily.

## Planned specification and implementation delta | planned-impact.v1

| Plane     | Selected authority and exact change/no-op                                                                                                                                                                        | Related documents/maps to inspect                                           | Evidence/decision                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Product   | unchanged: docs/product/gameplay/time-and-autonomy.md#first-playable-scope still leaves an ordinary unanswered decision open, and a general timed fallback stays Proposed/Blocked                                | docs/product/gameplay/time-and-autonomy.md#response-windows-and-absence     | The product page is not edited                                  |
| Technical | changed: docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines records this twenty-minute withdrawal and leaves every other decision open                                                  | docs/technical/engine/chronology-and-activities.md#permission-to-advance    | Focused offline test of the one expiry                          |
| Code      | changed: packages/application/src/campaign/delegated-decision.ts and packages/application/test/delegated-decision.test.mjs; negative: a player choice that arrives first wins and the fallback does not also run | packages/application/src/campaign/delegated-decision.ts                     | node --test of that file, with no provider call                 |
| Related   | unchanged: no contract-dependency table names this expiry, and no campaign barrel export was added                                                                                                               | docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines | The new exports stay in the module file for a later barrel edit |

## Reconciliation ledger

| Affected selected claim/heading                                             | Authority | Target delta (changed/unchanged; reason)                                                                                   | Source delta & inspected SHA                                                                                                              | Status/evidence tier | Negative proof                                                                                                  | Map/link update or N/A                                               |
| --------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| docs/technical/engine/chronology-and-activities.md#decisions-with-deadlines | technical | changed: one published two-choice invitation can expire into its consented withdrawal, and every other decision stays open | packages/application/src/campaign/delegated-decision.ts and packages/application/test/delegated-decision.test.mjs inspected from baf75f03 | fixture-tested       | a player choice that arrives first keeps the player settlement and the fallback does not also run               | The decisions heading stayed in place. No navigation map was edited. |
| docs/product/gameplay/time-and-autonomy.md#first-playable-scope             | product   | unchanged: an ordinary unanswered decision stays open, and a general timed fallback stays Proposed/Blocked on that page    | docs/product/gameplay/time-and-autonomy.md#first-playable-scope left unedited at baf75f03                                                 | reviewed             | absent consent still returns a held decision with no settlement                                                 | The product page was not edited.                                     |
| docs/technical/engine/chronology-and-activities.md#permission-to-advance    | technical | unchanged: an unaccepted clock still does not move, and waiting out this window adds no fictional seconds                  | packages/application/src/campaign/delegated-decision.ts records waitingFictionalSeconds 0 at baf75f03                                     | fixture-tested       | the withdrawal settlement records waitingFictionalSeconds 0 and a second delivery does not add another duration | No permission heading edit.                                          |
