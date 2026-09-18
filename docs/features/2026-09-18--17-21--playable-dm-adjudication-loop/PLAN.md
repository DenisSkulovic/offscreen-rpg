# Playable DM adjudication loop plan

Feature: [Playable DM adjudication loop](FEATURE.md)
Status: In progress; offline implementation authorized. No live provider calls are authorized.

## Design trace

The invariant is that the DM may propose judgment while application code owns admission, dice and committed effects. Authored benchmarks prove visible agency, changing facts, constrained options and independence from money, employment, human anatomy and geography. They are content records, never runtime branches. Long work and travel are excluded because their progress semantics remain under review.

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

The owner requested review, planning and implementation toward an offline-verifiable POC. The [offline acceptance contract](../../engineering/offline-poc-acceptance.md) records the dependency order, task responsibilities and manual matrix. A preliminary context correction narrows provider schemas per task and rejects conflicting current/future evidence; it does not implement any DM phase.

Phase 1's public/private offer boundary is implemented. `immediate-action.v1` has no duration field and supports an automatic outcome or one ability check. Public leaves contain only an attempt marker; `game_offer` owns the story/revision-fenced private plans. Selection resolves the leaf through that record instead of reopening a global authored definition array. Consequence publication copies selected saved plans into a new offer identity. Authored catalogue entries supply this package temporarily through the same contract intended for generated plans. Scenario identities, inhabitants, prose and capability choices must not appear in generic TypeScript control flow.

The remaining Phase 1 contract item is scoped declaration of a new character/situation fact. Current plans can require and update only facts or quantities already declared on the character; do not let the planner invent fact writes until that boundary is specified and persisted.

Phase 2 has started with a pure structured proposal validator. It reports bounded diagnostics for shape, captured evidence, declared prerequisites/effects, unavailable abilities, undeclared skills and unsupported situational modifiers. Fixture admission exercises the same policy. Every sheet retains the selected D&D ability scores while its current form declares which abilities and skills apply. The planner will eventually propose those declarations from the premise and committed state; deterministic code validates them and never infers them from a named species or world.

Authored mechanical openings and the offline narrative graph now live in schema-validated JSON content. The generic loader resolves arbitrary catalogue IDs, the API exposes content summaries and the client renders that catalogue; no shared contract, policy version or runtime branch names a scenario. The old premise-word and profile conditionals have been replaced by data lookup. This separation is preparatory work, not generated world understanding.

It does not yet publish generated proposals or replace the activity bridge. Next: design the scoped character/situation fact input, then implement direct exactly-once adjudication. Capability-changing transformations are separate admitted state changes, not ordinary immediate effects. The adjudication commit must persist the action receipt and durable follow-up intent independently of context assembly so a narration-preparation error cannot roll back or reroll a valid action. Scope later trace work to the same durable runner. No schema compatibility layer is required; discarded pre-POC artifacts are reset.

All authored examples use the same plan/admission/resolution contract. Neither task specialization nor context validation assumes a currency, human calendar, movement mode, profession, species or setting. Activity-progress design remains outside this authorization. No provider spend is authorized.

Verification: game tests passed 11/11, including private/public separation, availability, structured proposal rejection and form-specific ability/skill admission. Game, contracts, Storyteller, application, API and web production builds pass. Storyteller tests pass 24/24, including task-specific schemas, context contradictions, validated offline content and injected provider transport with no network. Database generation reports the single baseline matches the schema. No database/browser/full-game rehearsal was run. Provider spend: $0; cumulative account usage unverified.
