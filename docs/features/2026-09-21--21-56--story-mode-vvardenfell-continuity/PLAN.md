# Implementation plan

Feature: [Story mode Vvardenfell continuity slice](FEATURE.md)
Execution scope: all approved phases below; provider inference remains stopped
until the existing uncertain attempt is explicitly reconciled.
Implementation owner: Codex for the current owner-requested implementation.

## Phases

### S1 — Honest local Story mode — implemented

- Add a loopback-only launcher distinct from Chamber. Reuse API/web/worker,
  fixed local identity and the dedicated persistent local database/document
  root, but do not mount Chamber controllers or open the Chamber workspace.
- Keep normal deployed/development authentication unchanged. Keep provider
  execution offline by default.
- Exit: a cookie-free local browser reaches ordinary `/stories`, can save a
  draft and sees no Chamber controls.

### S2 — Maintained Vvardenfell start library — implemented

- Add bounded checked-in world and start-package directories using the
  existing importers/manifests. Include orientation, immediate geography,
  expected arrival characters including Socucius, initial narrative threads
  and private direction; reference the existing rule package.
- Seed/catalogue the package for Story creation and bind the current generic
  Seyda mechanical opening without scenario branching in shared policy.
- Exit: Start pins/imports the exact package and the campaign inspector/export
  shows the expected canonical files.

### S3 — Progressive entity continuity

- Define mention/registered/continuity/mechanically-active boundaries using
  existing identity/relationship/lore documents plus the smallest necessary
  structured current-state schema.
- Admit source-linked promotion/change operations atomically with passages and
  deterministic active-participant cues. Required state precedes optional
  history in context packing and cannot be silently omitted.
- Contrast with the microbe start, which must remain valid without people or
  social state.
- Exit: interact with Socucius, advance unrelated turns, return and observe the
  current relationship/state bundle in the next exact task.

### S4 — Connected play and evidence

- Drive at least five Storyteller turns through ordinary HTTP/application
  commands with player-selected options, checks, elapsed-time work/travel,
  canonical change and return recall. Record the compact ledger.
- Mechanical fixtures remain in tests/Chamber, but ordinary Story mode uses
  bounded live generation only. Capture exact provider evidence and stop on
  uncertain delivery; do not silently fall back to scripted prose.
- Exit: the permanent connected-POC and QA documents contain honest run
  evidence and remaining deficiencies; fold durable decisions into permanent
  owners and delete this completed feature folder.

## Current checkpoint

- Current phase and exact next action: S4 live-play repair. The owner's first
  ordinary Story-mode opening succeeded, and selecting `cooperate-release`
  exposed a transport-contract failure before inference. OpenAI rejected the
  continuation JSON Schema because the document path pattern used lookaround.
  Project unsupported pattern hints out of the OpenAI transport schema while
  retaining application validation, classify a confirmed schema rejection as
  zero-charge failure even when OpenRouter supplies a request id, reconcile the
  affected local attempt, then resume the exact saved action without rerolling
  or duplicating its receipt.
- Base/reviewed Git revision and relevant uncommitted changes: base `2fee4ee`;
  provider-only Story mode and the player-screen information architecture are
  implemented locally.
- Actual checks/results for this revision: all seven affected package builds and
  the production web build passed. The exact OpenAI transport projection has no
  `oneOf`, defaults or missing required object fields. The first live smoke
  exposed an evidence-contract mismatch; after narrowing opening evidence to an
  empty list, the second live smoke succeeded with a persisted “Released at
  Seyda Neen” opening and four distinct executable choices.
- Unresolved findings/blockers: visual automation could not initialize because
  its local kernel-assets path was missing, so the owner remains the decisive
  human UX review. The live continuation has not yet produced prose or
  canonical mutations. The failure was incorrectly recorded as financially
  uncertain because the adapter treated OpenRouter's request id as possible
  inference despite the explicit `invalid_json_schema` rejection. Mechanics
  correctly produced one automatic receipt and advanced tick 0 → 1, but the
  required Storyteller hold is now stuck pending operator reconciliation. All
  evidence exists, but reconstructing one journey currently needs multiple raw
  SQL queries; add a bounded story-session report before longer playthroughs.
- Provider spend and accounting certainty: the first schema-valid but
  application-invalid smoke cost provider-reported USD 0.00255815. The
  successful smoke cost ledger-rounded USD 0.002247. After the provider's brief
  reporting delay, an authenticated read at 2026-09-21T20:59:04Z reported total
  account usage USD 0.004825326 and available USD 9.995174674, consistent with
  the two attempts within microusd rounding. The owner's opening then used
  5,576 prompt + 795 completion tokens and cost provider-reported USD
  0.00174847. The following HTTP 400 schema rejection performed no inference
  and reported no usage, but the local ledger conservatively retains a 9,716
  microusd uncertain reservation until explicit reconciliation. No automatic
  retries or fallback calls occurred.

## First owner play evidence — 2026-09-22

- Story `838e5172-32ec-4de3-9945-90ee1b125dbe`, character Bob, Absurd Action
  Comedy profile, GPT-5.6 Luna via OpenRouter.
- Opening generation `4b89f776-0bad-4aed-b754-0393a3cd71c4` published one
  passage with five distinct choices. Exact request size was 33,438 bytes;
  provider usage was 6,371 tokens and USD 0.00174847.
- Start produced canonical root revision 2 with 14 entries: structured player,
  Sellus and Socucius identities, premise, release thread, settings, rule/time/
  world references, private direction, start orientation and source passage.
- Selecting `cooperate-release` produced execution
  `a1365562-91af-4a32-a1bc-4960be26325d`, one automatic receipt, no roll or
  effects, and advanced the campaign to tick 1. Generation
  `d2e1c3d6-8b03-4542-ad9f-4aebd480243f` sent a 44,863-byte continuation
  request but OpenAI rejected its schema before inference. No passage 2 or
  canonical document mutation exists.
- The public snapshot honestly shows the old passage, the committed receipt,
  the required Storyteller hold and an operator-only uncertain blocker. This is
  durable but not player-recoverable and appeared frozen in the UI.
