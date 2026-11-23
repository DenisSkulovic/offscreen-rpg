# DXK10-A | acceptance proof template

**State:** NOT RUN. Planner-authored packet at `fb5bf588`; writing docs is not implementation proof.

| Gate | Required evidence | Status |
| --- | --- | --- |
| Registry compatibility | v1/v2 fixtures and old attached records, new null-attachment validation | NOT RUN |
| No-side-effect reservation | Instrumented CLI and injected external tools: zero Docker/Kind/SQL/S3/Temporal/Tilt/Pod writes | NOT RUN |
| Uniqueness / races | Two concurrent reservations, distinct ID/ports; corrupt/high-watermark refusal | NOT RUN |
| Explicit attach | Unprovisioned only, idempotent same checkout, atomic default record update | NOT RUN |
| No foreign adoption | Different checkout `up/status/stop --instance` fails even if parked | NOT RUN |
| Negative ownership | Live/unverified/stale PID, session, port conflict, unknown cluster state all fail closed | NOT RUN |
| No lost state | Failed attach makes no registry/default/tenant mutation | NOT RUN |
| Backward compatibility | Existing `dev` / `dev:new` / status/stop focused fixtures pass | NOT RUN |
| Documentation | Runbook accurately marks new commands as implemented only after proof | NOT RUN |
| Integration | Accepted code, evidence, archive and branch join to undertaking | NOT RUN |

**Do not claim:** selective activation, released/recycled environment, cross-checkout reuse of retained tenant, four full concurrent stacks, browser OAuth or completed Storyteller.

**Stop:** if namespace/tenant absence is unprovable using bounded read-only checks, leave attach blocked instead of accepting a prior occupant's credentials.