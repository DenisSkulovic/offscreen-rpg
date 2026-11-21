# OPS12 | adversarial readiness and fault proof

**Source basis:** 6dd12761 ZIP; files read: runtime/{control,execution,storyteller-distributed-live,connections}.ts, bootstrap/{control-main,executor-main}.ts and existing worker split/cleanup tests. No runtime test executed by planner.

G0 PASS correct Undertaking, future post-wave gate. G1 PASS three concrete leaked-resource paths traced. G2 PASS once-only close and all-settled rollback chosen, no new scheduler. G3 PASS exact file-owned tasks with fake inputs. G4 PASS T01 first actionable. G5 PASS disjoint from WR09B runtime/index, writer-loop/activities and DX12 scripts/Turbo. G6 PASS explicit start/stop failure matrix below. G7 PASS material operational fault isolation with no cosmetic package split.

**Must demonstrate:** (a) fail control start: relay stopped; (b) fail executor start: control then relay stopped **in that order** despite either failure; (c) fail Worker's create after native connect: native.close once; (d) Worker.run rejects: done rejects and close completes; (e) stop called twice/concurrently: one shutdown and native close; (f) any stop throwing doesn't short-circuit remaining roles; (g) close failure never silently hides primary Worker failure; (h) no executor DB credentials or workflowsPath; (i) existing task queues and guards intact. All pure tests without Temporal/Postgres network. Separate later multi-process fault trial required for claims of restart-safe gameplay.

**Proof commands:** pnpm --filter @offscreen/worker build; pnpm --filter @offscreen/worker typecheck; pnpm --filter @offscreen/worker test (if unrelated baseline failing, also run focused compiled tests directly), git diff --check. Actual PASS/FAIL/NOT RUN recorded by executing Cursor. No deployment or paid call.
