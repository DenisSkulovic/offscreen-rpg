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

- Current phase and exact next action: S3/S4 player observation. Story creation
  now follows foundation → player role → Storyteller → review → opening. The
  prepared Seyda experience and custom story are separate routes, a character
  name reaches both Storyteller input and prepared mechanical state, and the
  player-facing opening screen distinguishes queued, running, failed,
  billing-uncertain and succeeded states. Reset the smoke-test database, leave
  Story mode running, and inspect the owner's actual choices and continuations.
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
  human UX review. Subsequent continuation quality and canonical mutations are
  not yet proven.
- Provider spend and accounting certainty: the first schema-valid but
  application-invalid smoke cost provider-reported USD 0.00255815. The
  successful smoke cost ledger-rounded USD 0.002247. After the provider's brief
  reporting delay, an authenticated read at 2026-09-21T20:59:04Z reported total
  account usage USD 0.004825326 and available USD 9.995174674, consistent with
  the two attempts within microusd rounding. No automatic retries or fallback
  calls occurred.
