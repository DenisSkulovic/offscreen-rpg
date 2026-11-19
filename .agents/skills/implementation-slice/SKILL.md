---
name: implementation-slice
description: Implement one already-approved, bounded Offscreen RPG task or feature PLAN slice; optimize for low context, maintainability and a verifiable handoff. Ideal for Cursor coding agents.
---

# Implementation slice (executor mode)

The handoff route card is the read list. Read those files and the one named heading. Do not read `AGENTS.md`, `.agents/skills/change-workflow/SKILL.md`, `scripts/repo-tools/change-guard.mjs`, or Markdown slug internals to prepare for a guard that has not failed.

During an edit, run the one focused test and `git diff --check`. Near closure, run the guard commands the packet names. If a guard fails, read its printed code and message, then only the file that message names. Stop when the selected contract, the owner symbol, and one negative case are known. Another read needs a named uncertainty. Do not claim a token or dollar saving. A trace with no usage object keeps those fields null.

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

1. Inspect Git status and the narrow source route. Verify that referenced contracts match reality; do not read all 100+ docs. **Product docs are authority; code is the artifact.**
2. Ensure a **documentation pass** for any material behavior/ownership/status change: update product and/or technical owners as required (order flexible). If the contract already specifies the correct behavior, fix code and regression evidence—and still confirm permanent docs are not lying about status. For a structural change, adjust the owning technical doc if responsibilities move.
3. Make the smallest coherent implementation. Prefer existing boundaries. No token-saving unreadable code, pointless wrappers, sweeping formatting, speculative abstraction, legacy compatibility in a disposable pre-POC, or unrelated file edits.
4. Inspect diff and trace one normal and one failure/retry path. **During editing** prefer TS diagnostics, warm tools and `git diff --check`; don't rerun broad checks after each save. At a coherent Change/integration boundary use [staged verification](../../rules/verification.md) and [frontend economics](../../../.agents/skills/frontend-engineering/SKILL.md) when relevant. Never run paid model calls, external deployments or destructive database operations merely to verify.
5. **Complete the documentation pass before claiming Done:** Reconciliation ledger on the Change (when applicable), permanent owners updated or explicitly unchanged-with-why. Leaving docs more stale than code is a critical failure. Do not claim tests or gameplay happened if they did not.

## Output contract

Keep final response succinct:

`Outcome | Files changed | Checks with pass/fail/blocked | Known risk/unknown | Next exact action | Provider spend: no call / verified usage / unknown`.

If a blocker demands changing player behavior, authority, scope or spending: stop at the boundary and return an **evidence-backed question**. Do not silently make that decision. A coding assistant is a skilled executor, not a second product owner.
