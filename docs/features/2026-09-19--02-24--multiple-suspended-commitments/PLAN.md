# Multiple suspended commitments plan

Feature: [Multiple suspended commitments](FEATURE.md)
Execution scope: approved as the next offline architecture change; begin in the next work session. No provider call is authorized.

## Phase 1 — Separate persistence concepts

- Replace the single-pointer assumption with a durable campaign commitment collection plus an explicit currently running identity.
- Define lifecycle states and legal transitions: running, suspended, encounter, blocked, invalidated, abandoned and complete.
- Preserve existing activity IDs and version-4 process plans where possible; this is a lifecycle correction, not permission for a universal job system.
- Reset the disposable pre-POC database baseline if the schema changes.
- Exit: multiple unfinished activities can coexist without more than one receiving advancement.

## Phase 2 — Capacity and commands

- Add revision-fenced suspend, resume and abandon admission.
- Model exclusive capacity claims as captured data and validate reacquisition on resume.
- Starting B automatically suspends conflicting A only when the admitted command makes that transition explicit; it never marks A abandoned.
- Exit: A → suspend → B → resume A is atomic, idempotent and mechanically legible.

## Phase 3 — Scheduling and invalidation

- Schedule only running commitments and make stale wakeups harmless through identity/revision fences.
- Re-evaluate action prerequisites and capacity at resume time.
- Distinguish temporarily blocked from permanently invalidated; process-specific rules own decay or lost progress.
- Exit: changed circumstances cannot silently resume, restart or complete old work.

## Phase 4 — Play projection and acceptance

- Expose a compact unfinished-commitment view without turning play into a project-management dashboard.
- Extend the beacon flow with a second small activity and verify suspension, reload, restart, resumption, abandonment and exactly-once rewards.
- Add focused database integration before browser polish.
- Exit: the owner can follow why A retained progress while B occurred and why resumption is or is not currently possible.

## Current checkpoint

- Base revision: `736a27b` on `main` implements one persisted activity with encounter-state resumption.
- Known limitation to remove: starting a different process automatically marks the interrupted activity `abandoned`; `campaign.activeActivityId` exposes only one commitment.
- Reorientation on 2026-09-19 found a sharper defect: immediate encounter resolution clears `campaign.activeActivityId`. The existing resume integration constructs the encounter and resume offer directly, so it does not prove the real interruption-response-resume path. Repair and cover this before extending the lifecycle.
- Keep `game_activity` as the commitment collection. It already stores multiple identities per story. Treat `campaign.activeActivityId` narrowly as the one commitment allowed to advance, rather than introducing a redundant collection table.
- A resume plan must eventually identify the retained activity instance, not only its reusable action definition. Multiple instances of one action can otherwise make resumption ambiguous.
- Today's vertical acceptance target is: start beacon work, earn contribution through checks, interrupt, resolve the interruption, start a second commitment while retaining the first, resume the exact beacon activity, and apply completion once. Reload and stale scheduled wake-ups must preserve the same facts.
- Implement in separately pushed checkpoints: real interruption linkage; retained commitment lifecycle and A -> B -> A integration; minimal play projection/controls; running browser evidence.
- Preserve: opaque offers, private plans, earned contribution, exact clock arithmetic, idempotent commands, revision fencing and exactly-once effects.
- Do not begin with UI redesign or generalized process families.
- Provider spend: $0 authorized; cumulative OpenRouter usage remains unverified.
- Implementation checkpoint: `game_activity` is now used as the retained collection, `activeActivityId` is only the advancing identity, starting B suspends an encounter/paused A, and resume searches for one eligible retained instance before repointing the campaign. The play projection exposes unfinished commitments and the browser labels them as non-advancing work.
- The integration covers an immediate encounter response followed by authored A -> B -> same A with retained contribution. Full workspace typecheck/build, 19 game tests, 29 Storyteller tests and the 10-case PostgreSQL/Temporal Storyteller integration pass.
- Docker Desktop 4.91 still crashes in its Windows WSL socket bridge even after a clean reinstall. The verified local runtime is Docker Engine inside Ubuntu WSL using mirrored networking; this is an environment workaround, not application architecture.
- Next: perform the manual wall-clock beacon rehearsal through the browser, then implement explicit abandonment and legible blocked/invalidated resume results before closing this feature. Do not start another feature before the browser evidence exists.
