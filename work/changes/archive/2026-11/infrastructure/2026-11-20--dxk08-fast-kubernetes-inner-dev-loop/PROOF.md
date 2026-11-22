# DXK08 | Proof contract

## Required positive proof

| Edit | Expected dev behavior |
| --- | --- |
| Web `.tsx` | source sync + Fast Refresh; zero Docker build |
| API `.ts` | API watch compile/restart only |
| GA `.ts` | GA watch compile/restart only |
| Worker `.ts` | relevant worker roles restart; no unrelated app rollout |
| Story Engine `.ts` | actual runtime consumers update; Web excluded unless dependency graph says otherwise |
| docs/test-only | no runtime update |

For each live case record elapsed edit→ready/visible time.

## Required negative proof

- lockfile change does not use source-only sync;
- workspace package manifest change does not use source-only sync;
- migration/schema change does not silently run against a stale dev runtime;
- dev Dockerfile/config change rebuilds;
- compile failure is visible and not reported as successful readiness;
- auth remains real;
- GA remains private;
- Worker control/executor do not gain broad DB credentials;
- release app images contain no dev source mount/watcher;
- TURN03 clean acceptance path remains independently invokable.

## Performance acceptance

No hard millisecond SLA is required, but ordinary source-only edits must:
1. perform **zero Docker image build**;
2. perform **zero kind image load**;
3. avoid unrelated Kubernetes Deployment rollout;
4. be materially faster than the current warm-image numbers.

If the implementation still rebuilds an image for every ordinary app source edit, DXK08 is not Done.
