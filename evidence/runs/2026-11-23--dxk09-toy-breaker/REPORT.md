# DXK09 toy-breaker campaign

Date: 2026-11-23. Verification only. No live environment was started, parked, scaled, or deleted by this campaign.

## Baseline

- Repository: `/home/dskul/projects/offscreen-rpg-dxk09-t05`
- Branch at execution: `change/dxk09-t05-hardening`
- HEAD at execution: `2c1dd7aec2191b93ad1a53c35c3ccbbeea56b241`
- Integration branch: `undertaking/storyteller-workshop` at the same commit before this report
- The previously reported HEAD `bebbbf5a433f58a6310b5c539199ab06326a14d2` is not the current branch tip
- Host: 19 GiB RAM, about 3.8 GiB available, 157 MiB free, disk 16G used / 940G free on `/`
- `kind-offscreen-dev` responded and listed `offscreen-dev-1` through `offscreen-dev-4` plus shared data namespaces
- `kind-offscreen-lab` context exists and was not selected for any write
- Live registry `~/.local/state/offscreen-rpg/dev-worktree-registry/owners.json` is version 1 with four owners: dev-1 has a lease, dev-2, dev-3, and dev-4 do not
- v2 session directory is absent
- Primary checkout dirty files were left untouched: `infra/kubernetes/lab/app-release/install.sh` and the TURN03 execution note

## Prerequisite gate

Live Phase B is **BLOCKED**. The registry has not migrated to v2, and the earlier orphan park of dev-1 and dev-2 was refused because live port-forward and Tilt consumers were present. This campaign did not cut over the registry and did not restart those environments.

Phase A ran in temporary registries. Phase C destruction stayed unimplemented because no authorized destruction operation exists.

## Counts

| Result | Count |
| --- | ---: |
| PASS | 38 |
| PARTIAL | 3 |
| FAIL | 0 |
| BLOCKED live phase | 48 scenarios not run live |
| NOT IMPLEMENTED | 7 |

The 2026-11-23 repair fixed L01 and S06. R01, W05, and I06 are PARTIAL because the fixture does not exercise the full scenario. The live lifecycle remains unproven.

## Scenario matrix

| ID | Expected | Actual | Result |
| --- | --- | --- | --- |
| L01 | First environment has one id and four distinct ports | `dev-1` ports 20000, 20001, 20002, 20003 | PASS |
| L02 | Repeating a read keeps one identity | one `dev-1` record | PASS |
| L03 | Ten park cycles keep identity | 10 parks, namespace unchanged | PASS |
| L04 | Parking an already parked environment is idempotent | `already_parked` | PASS |
| L05 | Release with nothing running succeeds once | `already_stopped` | PASS |
| L06 | Partial scale keeps ownership and a retry can finish | `scale_incomplete`, then `parked` | PASS |
| R01 | Competing allocations for one reservation | 8 sequential allocations produced distinct ids; one reservation was not contended | PARTIAL |
| R02 | Concurrent release does not create a second owner | both calls ok, at most two signals | PASS |
| R03 | A full port range refuses another environment | 2 admitted, then `exhausted-port-range` | PASS |
| R04 | A foreign consumer cannot release | `foreign_consumer` | PASS |
| R05 | Starting B does not release A | `dev-2` allocated, A stayed `foreign_consumer` | PASS |
| R06 | Twenty isolated fixture allocations | 20 distinct ids | PASS |
| W01 | Two environments may watch one checkout | `dev-1` and `dev-2`, same path | PASS |
| W02 | Separate worktrees get separate ids | `dev-3` | PASS |
| W03 | Identity does not follow identical contents | ids stayed distinct | PASS |
| W04 | A live sibling blocks a shared host write | host write refused | PASS |
| W05 | Successful reattachment to another checkout | park refused `checkout_mismatch`; successful reattachment was not exercised | PARTIAL |
| W06 | Missing checkout during an active session | no live watcher in the fixture API | NOT IMPLEMENTED |
| P01 | A dead Tilt process is not signalled | `not_running` | PASS |
| P02 | A replaced port-forward pid is not owned | `start_time_mismatch` | PASS |
| P03 | A reused pid with new start ticks is not owned | `start_time_mismatch` | PASS |
| P04 | A corrupt session fails closed | read threw | PASS |
| P05 | No lease is stored before persistence | lease remained null | PASS |
| P06 | WSL or Docker connection drop | no injectable cluster connection | NOT IMPLEMENTED |
| K01 | Application pod loss keeps the environment id | namespace stayed `offscreen-dev-1` | PASS |
| K02 | One unavailable Deployment blocks release | `replicas_not_zero` | PASS |
| K03 | Namespace UID mismatch is not reusable | preflight `uid-mismatch` | PASS |
| K04 | A Deployment that refuses scale-down keeps ownership | `scale_incomplete` | PASS |
| K05 | Unauthorized migration is refused | `migration-unauthorized` | PASS |
| K06 | S3 or Temporal provisioning failure | no fixture hook | NOT IMPLEMENTED |
| I01 | Identical source on a second slot does not require a new build | cache decision `loaded-on-required-nodes` | PASS |
| I02 | A source byte change changes the fingerprint | fingerprints differed | PASS |
| I03 | Ignored documentation does not change the fingerprint | fingerprint stable | PASS |
| I04 | A missing node alias is not fresh | `missing-kind-node`, build false | PASS |
| I05 | A compile error cannot report freshness success | no compiler runner in the fixture | NOT IMPLEMENTED |
| I06 | Concurrent callers share one build | two plans reused a supplied digest; a concurrent single-build was not exercised | PARTIAL |
| S01 | Duplicate ports are refused when the registry is read | `duplicate-port` | PASS |
| S02 | A corrupt registry is refused | read threw | PASS |
| S03 | Takeover by another consumer is refused | `foreign_consumer` | PASS |
| S04 | Foreign start ticks are refused | `start_time_mismatch` | PASS |
| S05 | A symlink checkout is stored as its real path | stored path was the real checkout | PASS |
| S06 | A dev operation against `kind-offscreen-lab` is refused | `invalid-cluster` before registry mutation | PASS |
| C01 | Capacity exhaustion refuses another environment | refusal observed | PASS |
| C02 | Owned fixture environments can be parked | both parked | PASS |
| C03 | Restart keeps ports and namespace | game port stayed 20000 | PASS |
| C04 | Destruction of an active environment is refused | no destruction operation exists | NOT IMPLEMENTED |
| C05 | Scoped destruction | not authorized and not implemented | NOT IMPLEMENTED |
| C06 | Fresh creation after destruction | depends on C05 | NOT IMPLEMENTED |

## Measurements

- Live start, park, and restart times: NOT RUN. Phase B was blocked.
- Docker image builds: 0. Cache behavior was planned in memory only.
- Maximum concurrent live environments started by this campaign: 0.
- Fixture concurrency reached 20 registry records in one temporary v2 file.
- Same-checkout independence: W01 allocated two ids for one path. W04 then refused a host write while the other session's pid and start ticks matched.
- `kind-offscreen-lab` received no kubectl write from this campaign. S06 now refuses that cluster name before either allocator writes the registry.

## Final inventory

Temporary registries were created under the system temp directory and removed at the end of the test. Live namespaces, the v1 registry, Tilt, and port-forwards were not modified. No secret values were printed. No tenant data was deleted.

## Corrective candidates

1. L01 and S06 were repaired in `scripts/repo-tools/dev-worktree-allocator.mjs`. New bundles use four distinct ports. Existing three-distinct-port records are copied through migration. A caller-supplied cluster other than `kind-offscreen-dev` is refused before registry mutation.
2. `environmentSessionRoot` places sessions in the parent of the registry directory. Two registries in one parent share session files. Keep sessions inside the registry root.
3. R01, W05, and I06 are coverage gaps, not new allocator defects. Live cutover, orphan parking, W06, P06, K06, I05, and C04–C06 remain blocked or unimplemented.

Proof command: `node --test scripts/repo-tools/dev-worktree-allocator.test.mjs scripts/repo-tools/dev-worktree-registry-v2.test.mjs scripts/repo-tools/dev-toy-breaker-campaign.test.mjs` exited 0. Counts: 38 PASS, 3 PARTIAL, 0 FAIL, 7 NOT IMPLEMENTED. No newly exposed product failure.
