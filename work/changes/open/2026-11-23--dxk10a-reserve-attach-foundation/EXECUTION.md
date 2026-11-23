# DXK10-A | decided execution algorithm

## Transaction 1: pure reservation

1. Parse `reserve` as a distinct top-level operation, incompatible with `--instance`; do not fall through to `runDevTiltLaunch`.
2. Hold the existing registry lock; read/validate v2. Refuse missing/unsupported/corrupt registry rather than initialize a new identity counter against potentially persistent cluster tenants.
3. Check `nextSequence` monotonicity against **all recorded** slot suffixes. The existing durable v2 registry is the allocation authority; refuse a missing registry instead of rebuilding its counter. Do **not** contact the cluster during reserve. Unexpected external resources are a hard attach/activation refusal, never a reason to reuse the ID.
4. Allocate disjoint available ports, construct a neutral unbound record with `worktreePath:null, processIdentity:null, lease:null, resourceUids:{}`, increment counter and atomically write registry. No checkout default entry.
5. Return the ID and `reserved/unattached/unprovisioned`; no process, socket listener, image, pod or tenant write.

**Crash:** lock and atomic rename produce old or new snapshot, never half a reservation. Repeating reserve creates a *new* ID; it does not silently claim someone else's reservation.

## Transaction 2: explicit attach, only never-provisioned slots

1. Parse `attach --instance dev-N`, canonicalize the calling checkout. Refuse no `--instance`.
2. Hold the same registry lock; read current record and confirm it is **unattached** (or already exactly attached to caller, for idempotent read). Verify no active/unverified lease or recorded process, no retained resourceUids, no session identity, and no occupied owned-port listener. This binds only a new unprovisioned identity and does not require a live cluster. Existing provisioned/parked slots are **never** eligible. External namespace/tenant collision checks must occur at activation before mutation, fail closed if indeterminate.
3. Ensure caller has no conflicting default mapping. Set `worktreePath` to canonical path and install its default mapping atomically in one registry write.
4. Return `ATTACHED / UNPROVISIONED`; no workload, tenant, image or CLI launch. Recheck status is read-only.
5. Ordinary `up/status/stop --instance` must require matching attached checkout and never make binding changes. A request from a different checkout is a refusal even if the slot's last process is parked.

**Crash / concurrency:** under the existing registry lock only one attachment wins. Keep attach as a short synchronous registry/session/port transaction; no network/Pod calls within the lock. Failed probes or default collision leave old record unchanged. Do not clear stale PID, kill a process or modify Kubernetes as part of attachment.

## Compatibility and testability

- Introduce a pure helper for registry validation/transition that accepts injected read-only external identity probes; the CLI supplies bounded real probes.
- Existing `dev:new` and no-flag `dev` must retain their observed allocate+start semantics. Existing attached records require no one-off rewrite; only the newly reserved unbound form uses `worktreePath:null`.
- Preserve v2 registry format and v1 cutover integrity; strict validation must reject an unattached record with default mapping/lease/resource UIDs.
- Do not modify application source, Tilt manifests or cross-tenant credentials.
- Keep no-Kubernetes-mutation test mechanically clear: the injected spawn/reconcile/writeTenant stubs must never be called on reserve/attach.

## Known risk and stage boundary

The existing `withRegistryLock` stale-lock eviction uses age alone; do not broaden this Change into global lock redesign. While testing simultaneous reserve/attach, use deterministic injected lock simulation and ensure no loss of update. If real lock ownership becomes a demonstrable data-integrity hole, stop and report the exact defect. Only DXK10-C may add guarded transfer or release of a previously provisioned slot, with explicit tenant inheritance semantics and separate acceptance.