# Offscreen Control | Cursor first-wave handoff

**Status:** Docs-ready handoff guide, 2026-11-14; **no active authorized Admin code Change**. The product target is [owner-accepted](../product-acceptance-and-scope.md) and the initial technical target has a [desk-review result](../technical/architecture-review-2026-11-14.md). Eight [code-bearing Changes](../implementation-program.md) exist under `docs/changes/2026-11-14--admin-*` as **Proposed, NOT Ready**. `docs/changes/README.md` still says `Current change: none`.

## Do not paste the entire Admin corpus into Cursor's context

**Entry:** [implementation program](../implementation-program.md) → **one selected** `CHANGE.md` → its exact technical headings → current source-adjacent maps → only the relevant implementation files and tests.

Proposed opening packet: [AD01 Staff principal, explicit Admin session and bootstrap](../../changes/2026-11-14--admin-staff-session/CHANGE.md). It is a security foundation with zero customer-data Admin surfaces. AD02 provides the first actual bounded policy/guard, and AD03+AD04 give the first usable safe Player 360 frontend.

## Required owner handoff / execution trigger

When the owner wants Cursor to implement:
1. Inspect latest committed `main` and Cursor's local worktree. **Do not overwrite uncommitted engine/frontend work.** Treat all Admin source anchors as pinned to a Nov 14 snapshot.
2. Bring **documentation-only** Admin architecture + the selected Change into the implementation workspace without blindly overwriting newer `docs/changes/README.md` or unrelated files.
3. Confirm the selected packet's source owners, dependencies, scoped normal/negative proof and allowed test environment.
4. **Explicitly select and authorize one packet**; only then mark it Ready and point `Current change` to that one `CHANGE.md`.
5. Implement the code/test/migration diff under that packet and return actual evidence, not a generic "done."

Until explicit owner selection, these packets are **instructions to review and prepare**, **not permissions to edit source code**.

## First wave's nonnegotiable boundaries

- Never authorize staff from `user.isAdmin`, user email match, client-provided role or a player cookie alone.
- Do not spoof target `ownerId` in existing player Story APIs to obtain an Admin read.
- Complete bounded grants, current staff session/epoch, case assignment provenance and sensitive field authorization are server-owned.
- Basic Player 360 shows **only** source-backed safe fields; no raw narrative, AI prompt, OAuth secrets or fabricated paid tier.
- View-only requests cause zero player gameplay writes and zero paid provider calls.
- No customer refunds, raw story exports, player write impersonation, arbitrary game repair, commercial catalog edits, platform deployment or emergency stop UI before separate product/technical gates.
- Tests are provider-free by default. The integration runner resets **disposable** `offscreen_auth_test`; check target and obtain explicit test authorization.
- Existing Cursor work has priority over old documentation refs; report exact conflicts rather than reconciling by guess.

## Completion and follow-up

After AD01: evidence for **verified staff actor, distinct Admin purpose cookie, fresh underlying authentication, revocation, bootstrap audit and nonstaff denial**. It does not claim a full administrator product. Review the diff and proof, update source-adjacent README, mark Done or Blocked, clear current Change and only then consider AD02.

The first useful end-user milestone is **AD01–AD04**, not a single all-at-once Admin sprint. [Verification matrix](../technical/security-and-verification.md) specifies actual V0/V2/V3 proof. The mature ten-workspace target remains the north star, not a permission to implement every future feature.
