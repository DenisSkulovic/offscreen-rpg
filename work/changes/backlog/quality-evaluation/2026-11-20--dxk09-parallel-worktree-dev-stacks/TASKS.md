# DXK09 | bounded implementation tasks

## T01 | Stack identity, registry and port allocation

Implement a DNS-safe stable stack ID and collision-safe local registry outside tracked repo files. Allocate game/Tilt ports automatically and expose a machine-readable status.

Tests: same worktree -> same identity; two worktrees -> distinct identity/ports; malformed explicit ID and occupied/foreign port refuse before mutation.

## T02 | Dedicated shared dev cluster and parameterized stack resources

Introduce `offscreen-dev` / `kind-offscreen-dev` (or source-equivalent name) distinct from the fixed release lab. Parameterize the DXK08 dev workload for stack-scoped namespaces/resources.

Shared infrastructure has one serialized owner. Dev commands must explicitly refuse targeting `kind-offscreen-lab`.

## T03 | Data-plane isolation

Provision per-stack Postgres database, Temporal namespace and S3 bucket/prefix credentials/config. Auth/session storage belongs to the stack DB.

Prove stack A and B can each create/read state while normal credentials/routes from A cannot read B. Do not fake isolation with naming alone.

## T04 | Parallel lifecycle and two-worktree proof

Run two worktrees concurrently with separate game/Tilt URLs; update one and confirm the other does not roll; down/reset A and confirm B remains healthy and its state survives. Measure memory and identify a practical recommended concurrent-stack count for the current workstation.

Implement cleanup/list/status behavior for abandoned registrations without touching foreign stacks. Then reconcile docs/ledger, close/archive, merge to current main, and stop.
