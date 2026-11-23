# DXK10-A | acceptance proof template

**State:** source-tested 2026-11-23 on `change/dxk10a-reserve-attach` from `ade6cfbfa`. Live cluster NOT RUN.

| Gate | Required evidence | Status |
| --- | --- | --- |
| Registry compatibility | v1/v2 fixtures and old attached records, new null-attachment validation | PASS in the 56-test focused run |
| No-side-effect reservation | Instrumented CLI and injected external tools: zero Docker/Kind/SQL/S3/Temporal/Tilt/Pod writes | PASS: `reserve and attach CLI handlers skip launch-side mutators`. Isolated smoke printed `RESERVED / UNATTACHED / UNPROVISIONED` then `ATTACHED / UNPROVISIONED` |
| Uniqueness / races | Two concurrent reservations, distinct ID/ports; corrupt/high-watermark refusal | PASS in registry/allocator tests |
| Explicit attach | Unprovisioned only, idempotent same checkout, atomic default record update | PASS |
| No foreign adoption | Different checkout `up/status/stop --instance` fails even if parked | PASS in session/CLI fixtures |
| Negative ownership | Live/unverified/stale PID, session, port conflict, unknown local session identity and occupied port all fail closed; unknown cluster identity must fail at later activation | PASS for local probes. Cluster identity check remains a later activation gate and was NOT RUN |
| No lost state | Failed attach makes no registry/default/tenant mutation | PASS |
| Backward compatibility | Existing `dev` / `dev:new` / status/stop focused fixtures pass | PASS in the same 56-test run |
| Documentation | Runbook accurately marks new commands as implemented only after proof | updated after the smoke |
| Integration | Accepted code, evidence, archive and branch join to undertaking | recorded at join |

**Do not claim:** selective activation, released/recycled environment, cross-checkout reuse of retained tenant, four full concurrent stacks, browser OAuth or completed Storyteller.

**Stop:** if a previously provisioned slot is presented, refuse attachment. A fresh registry-only attachment does not authorize activation: external identity must be verified later before tenant/workload mutations.