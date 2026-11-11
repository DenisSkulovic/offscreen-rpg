---
name: implementation-slice
description: Implement one already-approved, bounded Offscreen RPG task or feature PLAN slice; optimize for low context, maintainability and a verifiable handoff. Ideal for Cursor coding agents.
---

# Implementation slice (executor mode)

The user/architect supplies an **approved outcome**, the affected product/technical contracts, likely files/owners and acceptance. The executor should make ordinary local engineering choices but must not change requirements, widen scope or spawn agents to invent a new design.

## Input packet

Prefer a handoff with:

- **Goal/acceptance:** one observable behavior or structural outcome.
- **Authority:** exact product and technical documents/heading anchors; do not paste full chapters.
- **Scope:** candidate files, dependencies, prohibited changes; preserve unrelated work.
- **Verification:** smallest useful commands/fixtures; specify whether any side effects need prior permission.
- **Output:** changed files, checks, gaps and exact next step.

If information is already present in a selected PLAN checkpoint, use that rather than generating another summary document.

## Execution

1. Inspect Git status and the narrow source route. Verify that referenced contracts match reality; do not read all 100+ docs.
2. Update product then technical specification **only if authorized behavior actually changes**. If contract already specifies the correct behavior, fix code and regression evidence without restating specs. For a structural change, adjust the owning technical doc if responsibilities move.
3. Make the smallest coherent implementation. Prefer existing boundaries. No token-saving unreadable code, pointless wrappers, sweeping formatting, speculative abstraction, legacy compatibility in a disposable pre-POC, or unrelated file edits.
4. Inspect diff, trace happy path + one failure/retry path. Run risk-proportionate provider-free checks under `.agents/rules/verification.md` and inspect test scripts before invoking them. Never run paid model calls, external deployments or destructive database operations just to verify.
5. Reconcile a changed contract with the owning permanent docs; update the selected Change checkpoint when applicable. Do not claim tests or gameplay happened if they did not.

## Output contract

Keep final response succinct:

`Outcome | Files changed | Checks with pass/fail/blocked | Known risk/unknown | Next exact action | Provider spend: no call / verified usage / unknown`.

If a blocker demands changing player behavior, authority, scope or spending: stop at the boundary and return an **evidence-backed question**. Do not silently make that decision. A coding assistant is a skilled executor, not a second product owner.
