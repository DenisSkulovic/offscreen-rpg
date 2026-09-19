# Multiple suspended commitments plan

Feature: [Multiple suspended commitments](FEATURE.md)
Execution scope: approved as the next offline architecture change; begin in the next work session. No provider call is authorized.

Current execution order is the [feature-index handoff](../README.md), starting with activity A1. The historical phase labels below describe this feature's unfinished acceptance, not a competing code path. Exact instance/clock ownership belongs to the foundation; authored resume permission belongs to the situations feature. Keep this folder until those dependencies and its remaining lifecycle/capacity acceptance are actually delivered.

## Phase 1 — Separate persistence concepts

- Replace the single-pointer assumption with a durable campaign commitment collection plus an explicit currently running identity.
- Define lifecycle states and legal transitions: running, suspended, encounter, blocked, invalidated, abandoned and complete.
- Preserve stable work identity/history semantics in the design, not obsolete prototype formats. A1 intentionally replaces per-activity clock authority; reset disposable saves/schema rather than maintain version-4 compatibility.
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

- Current phase: partial retention implementation, incomplete feature. The owner's 2026-09-19 request prioritizes the broader [activity foundation design](../2026-09-18--16-48--activity-processes-and-progress/PLAN.md); follow its identity/clock phase before adding isolated lifecycle patches here.
- Reviewed source: `1ef5a81`. Activity rows retain interrupted work, starting B suspends encounter/paused A, and a unique action-definition match can resume A with saved contribution. Running A cannot yet be switched directly.
- Evidence: the earlier focused integration passed, but its diversion is marked complete and its previous offer restored by direct database writes. It proves retention, not real B completion or subsequent chronological correctness. Source inspection found old A's start/cursor can regress campaign time after B.
- Remaining acceptance: exact instance/revision resume, world-clock correction, capacity claims, explicit abandonment, blocked/invalidated results and real browser rehearsal. Broader participation/transfer/deadline design is owned by the existing activity foundation folder; do not create a competing lifecycle design here.
- Next action: review that concrete proposal, then follow its phase 1. This changes sequencing, not the completion status of this feature; retain the folder until remaining acceptance is delivered or explicitly rescaled.
- Infrastructure: Docker Desktop's dependency stack is restored; [development](../../development.md#local-dependencies) owns the recovery details.
- This design pass ran no tests/builds and made no provider calls ($0); cumulative OpenRouter usage unverified.
