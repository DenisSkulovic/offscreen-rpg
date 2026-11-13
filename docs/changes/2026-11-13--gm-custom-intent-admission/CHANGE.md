# GM02 | Admit one reviewed custom attempt through existing game authority

**State:** Proposed, **not Ready**. **Owner approval:** none. **Kind:** domain action admission, immutable command/receipt and tests. **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). **Dependency:** GM01 completed with noncanonical candidate contract and player-facing review design approved.

## Cursor first-screen brief

> **Source map:** [application mechanical selection](../../../packages/application/README.md#mechanical-selection-and-consequence); inspect §packages/application/src/campaign/actions.ts§, §packages/application/src/stories/resolution.ts§ and §packages/contracts/src/interactions.ts§.
> **Target:** [custom intent review/accept](../../experience/patterns/free-intent-future.md), [time authority](../../../docs/technical/committed-time.md#permission-to-advance).
> **Known trap:** accepting a candidate after the world changed can execute stale or impossible mechanics; no custom text may set its own roll, DC, resource gain or actor. GET/refresh/retry must not reapply a result.
> **Scope:** proposed only. **One** supported finite action family in an offline fixture, not generalized freeform gameplay.

## Outcome

A candidate from GM01 may be **explicitly accepted once** by the authorized player into a supported finite action, under current scene/actor/revision and exact rule adapter. Acceptance revalidates all prerequisites and produces one durable immutable operation with one valid time/check/effect settlement or a clear refusal. Narrative generation follows the existing receipt/canon rules and can fail independently without rerolling.

The first slice should be intentionally narrow, e.g., a supported **inspect or speak** attempt in a maintained authored story. Do not claim universal actions work because one supported type does.

## Boundary choices

- Proposal and acceptance are separate requests/identities; interpretation can be edited without spending fictional time.
- A candidate expires or becomes invalid when relevant public revision/authorization changes; no optimistic execution from local browser text.
- The exact player intent and supported action plan are sealed at admission; the browser never sends the desired outcome.
- Rule engine calculates check, time, target effects and state with deterministic idempotence; Storyteller may narrate only what was committed.
- Unsupported requests fail without applying partial game effects.
- Provider spending associated with interpretation or narration follows existing caps; no silent new paid attempt after lost acknowledgment.

## Authority/baseline

[Rule adapters and effects](../../../docs/game-rules.md#authority), [technical admitted actions](../../../docs/technical/rules-and-activities.md#admitted-action-and-time), [command lifecycle](../../../docs/engineering/targets/react-next.md#3-command-error-and-recovery-contract), [UX grammar](../../experience/patterns/interaction-grammar.md).

Main 3be49cc baseline, 2026-11-13. Current offers already carry private plans and idempotent submitted commands, but a custom candidate acceptance contract has not been proven. Reinspect actual source and authorization paths before Ready.

## Scope and exclusions

Expected backend and contract changes limited to accepting a reviewed candidate; focused DB/idempotency/rule tests and one deterministic fiction fixture. Browser Custom Intent UI is separate and can be implemented only after candidate and admission contracts are verified.

**Exclude:** automatic execution from natural language, arbitrary executable code, unlimited LLM agent tool use, adding a separate roll engine, rewriting D&D rules, new multiplayer actor policy, world map changes, general combat or life planner.

## Acceptance and negative proof

**Normal:** current authorized candidate “inspect the badge” is accepted once, one supported check resolves with declared time and committed fact, then a correct passage appears when available.

**Negative:** duplicate same operation yields same receipt and no new roll; altered candidate body under same ID rejected; stale candidate/revision rejected; changed actor/form invalidates ability; unsupported impossible action doesn't consume time; timeout/uncertain ACK recovers existing operation; provider narration failure cannot reverse mechanic or duplicate coin/item; user cannot act for another player's character; stored secret DC not exposed.

**Evidence:** application/contract unit and transaction tests; real integration only with explicit disposable-DB permission; no paid provider needed for base proof. Browser presentation proves separate UX later.

## Ready gate

Only once GM01 has a secure, cost-bounded candidate contract and product owner has approved one supported finite action family. Cursor must not broaden scope while implementing. An unrestricted “AI understands every action” feature is **not** deliverable under this Change.
