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

### S2 — Maintained Vvardenfell start library

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

- Current phase and exact next action: S2; inspect the existing world/start
  importer descriptors and add the smallest maintained Vvardenfell/Seyda Neen
  directories, then seed them into local Story mode and expose selection in
  ordinary creation.
- Base/reviewed Git revision and relevant uncommitted changes: base `4cfff33`;
  S1 code, feature/plan and permanent specification edits are in progress.
- Actual checks/results for this revision; checks not run: Chamber typecheck
  passed. The dedicated launcher created/used `offscreen_story_local`, served
  cookie-free `/stories` with HTTP 200 and returned 404 for a Chamber-only QA
  endpoint. No broad suite was run.
- Unresolved findings/blockers: current checked-in content contains only the
  default rule package; Vvardenfell world/start package and Story selection do
  not yet exist. Existing active canonical-storage and memory features remain
  the component owners; this feature composes their contracts into the player
  flow rather than creating parallel storage/retrieval.
- Provider spend and accounting certainty: no calls in this work. A previous
  memory-provider attempt remains uncertain, so all provider inference stays
  stopped.
