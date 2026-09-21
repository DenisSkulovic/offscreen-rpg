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
- First run scripted/offline, then hold exact provider packets. Live generation
  waits for accounting reconciliation and a finite captured allowance.
- Exit: the permanent connected-POC and QA documents contain honest run
  evidence and remaining deficiencies; fold durable decisions into permanent
  owners and delete this completed feature folder.

## Current checkpoint

- Current phase and exact next action: S3; exercise a meaningful Socucius
  interaction and add only the smallest current-state representation exposed
  by that real flow. S2 now imports the checked-in world/start/rules at local
  startup and pairs the exact start reference with the Seyda mechanical seed.
- Base/reviewed Git revision and relevant uncommitted changes: base `13a83bc`;
  S2 connection changes are ready to commit.
- Actual checks/results for this revision: affected package builds passed. An
  ordinary HTTP run saved a grounded opening, started story
  `aeb7daae-ea0b-403d-a6fc-6c6f62debcf0`, and produced campaign manifest
  revision 2 with 14 entries including Socucius, Sellus, release thread,
  player character, exact start/rule/world references and source passage.
  `/stories` remained cookie-free and Story mode remained Chamber-tool-free.
- Unresolved findings/blockers: the currently runnable local player path is
  scripted/offline. A previous provider attempt remains unreconciled, so live
  inference is deliberately stopped; this does not block mechanical Story
  play or canonical-state work. Progressive changes to known people are S3,
  not falsely claimed by merely seeding their identity documents.
- Provider spend and accounting certainty: no calls in this work. A previous
  memory-provider attempt remains uncertain, so all provider inference stays
  stopped.
