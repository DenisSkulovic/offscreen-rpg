# DXK10-A | adversarial packet readiness review

**Reviewed:** 2026-11-23 · `undertaking/storyteller-workshop@fb5bf588` · review of planner-produced packet; **no local tests or live checkout inspection**. **Verdict: READY WITH EXPLICIT LIMITS** for source-only DXK10-A, **not execution permission for DXK10-B/C or any tenant handoff**.

| Gate | Verdict | Diagnostic evidence / limitation |
| --- | --- | --- |
| G0 repository/authority | PASS with host check | Current integration HEAD and AGENTS/CHATGPT/WORKFLOW/QUEUE inspected. HR02 owns Web feature paths; DXK10-A only local dev tooling. Cursor must confirm no unpublished infra writer and run branch guard before editing |
| G1 source truth | PASS for selected narrow ownership | Read `dev-worktree-registry::{validateRegistryV2,withRegistryLock,assertOwnerIdentity}`, allocator `allocateIndependentEnvironment`, CLI `resolveDevEnvironmentSelection`, bottom `dev-tilt` dispatcher, session park, cold reconcile, renderer and Tilt. Full codebase search not claimed; only affected importers and tests required |
| G2 decisions | PASS with narrow boundary | Nullable unbound only for never-provisioned reservations; explicit registry-only attach; no old-tenant reuse; failed transaction has no registry write; ordinary `--instance` cannot rebind. Activation must check external identity later |
| G3 child task simulation | PASS with scoped local reading | T01 validator/allocator; T02 session+registry attach; T03 CLI/package manifest; T04 tests/docs/evidence. Each card gives exact symbols and fault tests. One-time import/caller check allowed, redesign disallowed |
| G4 parent dispatch | PASS conditionally | First dispatch T01; linked Change branch/worktree and `change-branch-guard`, no global cluster startup. If another live infra author owns these scripts, stop before edits |
| G5 concurrency | PASS serial only | T01 → T02 → T03 → T04. Same registry/CLI files must not be edited by separate children simultaneously. HR02 disjoint Web source, but shared undertaking merges serialize |
| G6 discriminating proof | PASS planned, NOT RUN | Concurrent fresh IDs and ports; no external mutators called; foreign/parked `--instance` refused; wrong session/PID; zero writes on failed attach; v2 legacy behavior unchanged. No live cluster PASS implied |
| G7 cost and closure | PASS | No Docker/Kind/Pod startup for A, focused tests in existing source, one evidence update and serial integration; archive only on actual pass. DXK10-B/C not commissioned |

**First Cursor parent dispatch:** T01 only, with `CHANGE.md` and `TASKS.md`; parent opens selected source and focused registry tests. Next children sequentially. Existing `dev`/new/status/stop compatibility is a hard gate.

**Hard stop / planner return:** Unexpected call sites that require `record.worktreePath` always be a string; a registry v2 incompatibility requiring unplanned migration; incomplete safety of foreign `--instance`; unverifiable local session ownership; lock identity contradiction; any needed deletion/recycling of existing tenant resources. Stop at exact file/function and conflicting assertion.

**Advisories:** The existing lock's stale-age eviction is unchanged; do not widen into lock redesign absent reproduced failure. A full-stack runtime proof belongs to later DXK10-B. Local machine lease state is not observable from GitHub; pre-dispatch host guard is compulsory. Planning evidence does not establish implementation tests passed.

**No pending architecture choice within DXK10-A's narrow scope.** Cross-checkout transfer of *provisioned* environments is intentionally outside its approval boundary.