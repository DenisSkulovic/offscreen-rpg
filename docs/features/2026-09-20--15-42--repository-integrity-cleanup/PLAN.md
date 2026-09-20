# Repository integrity cleanup plan

## R1 — Truthful project memory

Reconcile feature navigation with implemented T3 work, remove empty feature directories and replace stale continuation claims rather than preserving a cleanup diary.

## R2 — Story and Chamber ownership

Add an ordinary story application facade in the stories package. Normal routes consume it. A developer-only Chamber facade adds fixture starts/responses and inspection, and its controllers/providers are mounted only when explicitly enabled.

## R3 — Server-side consistency fences

Require exact finite-action settlement/receipt promotion before retrying pending consequence narration. Prevent a settings revision from changing while the current narrative revision has an admitted resolution.

## R4 — Pure/application boundary

Move the frozen pending-action resolution envelope and digest ownership into the application campaign layer. Keep the pure game package responsible for resolution and overlap eligibility only. Remove unreachable speculative eligibility inputs when no current caller can supply them honestly.

## R5 — Concentration follow-up

After the ownership/correctness diff is stable, split the QA catalogue by journey family and the Storyteller integration suite by responsibility without deleting or weakening cases. This phase is intentionally separate because file movement should not obscure behavior changes.

## Current checkpoint

- Current phase: R1–R4 implemented. Ordinary HTTP composition uses `createStoryApplication`; Chamber fixture mutation, inspection and QA providers are conditional developer services. Pending-action retry requires exact settlement/receipt promotion, settings cannot change under a current resolution, and the private frozen pending envelope belongs to application orchestration.
- Base: clean worktree at the start of 2026-09-20 cleanup; this checkpoint describes the current uncommitted cleanup diff.
- Exact next action: R5 may split `qa-catalog.ts` by journey family and `storyteller.integration.ts` by responsibility while retaining every case and stable catalogue identity. Do not combine that file movement with new gameplay.
- Verification: the affected eight-package API dependency build passes; the application, API and integration packages compile; game tests pass 33/33. The API bootstrap test passes 2/2 and proves Chamber inspection/start/response routes are absent without the developer-tools switch. No database-backed gameplay suite was run.
- Spend: $0 provider spend; cumulative provider usage unverified.
