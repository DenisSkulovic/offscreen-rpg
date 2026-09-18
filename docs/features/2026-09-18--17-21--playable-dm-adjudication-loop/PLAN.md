# Playable DM adjudication loop plan

Feature: [Playable DM adjudication loop](FEATURE.md)
Status: Proposed for owner review. No live provider calls are authorized.

## Design trace

The invariant is that the DM may propose judgment while application code owns admission, dice and committed effects. SpongeBob/Gary proves visible agency and changing facts. The microbe proves that the contract does not require money, employment, human anatomy or geography. An apple-bound wizard with no plausible immediate escape proves zero/one-option behavior. Long work and travel are excluded because their progress semantics remain under review.

This plan replaces the remaining implementation scope formerly split between contextual-option agency and the D&D repair checkpoint. Implemented behavior stays documented in permanent specifications; Git retains the earlier plans.

## Phase 1 — Correct contracts and separate public/private offers

Outcome: one immutable offer identity owns a public option projection and private immediate-action plans.

Owning components:

- `packages/contracts`: public offer/receipt schemas and private proposal schemas where shared;
- `packages/db`: clean baseline tables for offer plans, planning operations and steps;
- `packages/application`: persistence and admission boundaries.

Work:

- replace `action.definition` lookup into a global authored action array with an offer-local private plan lookup;
- define `immediate-action.v1`, automatic/check resolution and bounded outcomes;
- define scoped fact declarations/effects without introducing an entity census;
- keep private DCs/outcome branches out of story snapshot DTOs;
- fence plans by offer ID, story ID and captured narrative revision;
- remove duration fields from this immediate contract rather than setting them to zero.

Exit: a forged public request cannot supply or alter mechanics, and stale offer selection cannot roll.

## Phase 2 — Pure validation and adjudication

Outcome: deterministic code can validate a proposed package and resolve a selected admitted action exactly once.

Work:

- validate identities, evidence handles, prerequisites, supported skills/abilities, DC bounds and effect vocabulary;
- derive character modifiers server-side;
- commit automatic or checked outcomes, receipts and facts atomically;
- preserve command idempotency across retry;
- return structured proposal diagnostics suitable for both tool output and application logs.

Exit: normal, rejected and retried selections are understandable without model execution.

## Phase 3 — Durable bounded agent runner

Outcome: one task-specific runner persists model and tool steps and can resume without replaying completed work.

Work:

- add planning task/step schemas and persistence;
- implement allowlisted `inspect_rule`, `read_evidence` and `validate_action_package` tools;
- implement round/tool limits and final-result revalidation;
- adapt accounting so each model round has its own attempt identity and saved request/outcome;
- stop uncertain dispatches and stale publication safely;
- implement a scripted agent that requests tools through the same protocol.

Exit: offline execution proves tool request → tool result → final package → saved publication across retry/restart boundaries.

## Phase 4 — Connect opening and consequence planning

Outcome: mechanical opening review and every committed immediate consequence use the same planner contract.

Work:

- change mechanical opening content from a fixed action list to a character/rules/fact seed;
- run the planner while preparing the opening candidate, expose only its public scene/options in review, and capture its private plans with that candidate;
- copy the reviewed candidate's exact private plans into the story at Start, then admit the same planning contract after each committed result;
- publish scene prose and offer plans together under the story revision fence;
- feed saved dice/effects/facts into the next planning context;
- retain a legitimate held state when planning yields no action.

Exit: there is no application-policy branch that chooses the next pineapple or microbe options.

## Phase 5 — Player-visible vertical loop

Outcome: the browser supports a coherent three-round immediate playthrough.

Work:

- present planning/pending/failure/held states;
- render public option intention and derived risk/commitment copy;
- show selected intention, saved roll, committed effects and new scene/options;
- keep retry bound to the same operation; disable stale buttons after snapshot refresh;
- remove developer wording that calls current options “authored” once the path is genuinely generated.

Exit: pineapple and microbe acceptance paths work through creation, selection, dice, consequence and fresh options with an offline source.

## Phase 6 — Focused review and POC gate

Review normal selection, invented mechanic, stale offer, invalid final result, crash after saved round, crash before publication and retry after committed roll. Use focused local checks only when helpful. Do not run paid inference.

After offline acceptance, stop and review the actual play experience. A live-model evaluation is a separate owner-authorized gate with a small scenario set and explicit spending reconciliation. Do not expand into long-running processes merely because immediate play works.

## Current checkpoint

Design only. The present code still uses authored action definitions in `campaign.content`, and the one-shot consequence task can only choose among them. The next action after owner approval is Phase 1: specify and implement offer-local private immediate plans plus their public projection. No schema compatibility layer is required; reset the pre-POC database.
