# OBS-D03 tasks — owner-released offline source only

**Dispatch authority:** [CHANGE](CHANGE.md) and [joint offline release](../../../designs/open/observability-developer/ACCEPTANCE.md) govern. Owner-released implementation, not independent READY or live permission. Verify predecessor receipt and branch/worktree, then execute the serial tasks. Do not wait for another approval; stop only for concrete contradiction, ownership conflict or required cheap proof failure. No real cluster or Docker commands. No main merge or Done.


All paths rooted at repository root; P=infra/platform/observability/, V=infra/verification/smoke/observability/. Parent supplies only named card, exact EXECUTION subsection and source anchors, not archived dossier. Each serial predecessor must pass its focused checks; no interim public activation, waived assertions or unsafe fallback. All commands local/offline. Child receipt: ID/base, exact changed paths, commands/results, normal/negative result, contradiction or none; parent owns commit and close.

## T01 | Stable lock and pending record | RELEASED (offline; prerequisites apply)

Anchors P/custody.mjs::custodyPaths/readPending/acquireCustody; P/tests/custody.test.mjs; EXECUTION § Lock and pending. Preserve context/service path; private inode checks; legacy/unknown records fence; shared handle no mutation; exclusive compare-own durable begin/advance/clear. Schema2 envelope + exact ensure validator only; upgrade/persistence/outage refuse until D06/D10 adds validators; no permissive details. Root node --test infra/platform/observability/tests/custody.test.mjs. Negatives replaced inode/content, stale pending, symlink, failed fsync/rename, shared mutation, no unlink lock.

## T02 | Owned child and bounded cancellation | RELEASED (offline; prerequisites apply)

Requires T01. Anchors P/custody.mjs::runMutation; planned P/forward.mjs and exec-owned.py; P/tests/custody-worker.mjs; EXECUTION § Owned child. Implement direct Python Linux parent-death wrapper, bounded Buffer streams/stdin, actual close vs terminal outcome, inherited FDs and active cancellation. Wire bounded flock acquisition to primitive. Root node --test infra/platform/observability/tests/{custody,forward}.test.mjs. Actual short owned parent/child handshake, ignored TERM, cancel exit0, preabort, EPIPE/overflow, retained FD on unconfirmed close. Stop on unsupported Linux semantics.

## T03 | Wire ensure and regression | RELEASED (offline; prerequisites apply)

Requires T02. Anchors P/install.mjs::runWrite/runObservabilityEnsure; P/tests/install.test.mjs; EXECUTION § Mutation. Use held exclusive exact own record and inclusive phase deadlines; cancellation stops active child; any uncertain launch retains fence; no later write. Migrate injected custody fixtures to independently stored records. Root node --test infra/platform/observability/tests/{custody,forward,install}.test.mjs. Positive complete/no-op existing install fixture; negatives replacement, timeout, actual close unconfirmed, attempted but unknown; no cancellation reset. No new public proof path.
