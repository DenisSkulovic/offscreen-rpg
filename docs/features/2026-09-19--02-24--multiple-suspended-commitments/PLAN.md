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
- First implementation task tomorrow: map every read/write of `activeActivityId`, settle the smallest persistence representation for many commitments plus one running identity, and write the A → B → A integration test before changing behavior.
- Preserve: opaque offers, private plans, earned contribution, exact clock arithmetic, idempotent commands, revision fencing and exactly-once effects.
- Do not begin with UI redesign or generalized process families.
- Provider spend: $0 authorized; cumulative OpenRouter usage remains unverified.
