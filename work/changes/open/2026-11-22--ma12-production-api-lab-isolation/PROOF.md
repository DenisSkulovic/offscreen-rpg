# MA12 | source-based readiness and negative acceptance

G0 correct branch/source; G1 actual Lab imports, DI/controller paths and callers inspected; G2 one-way outer package/extension architecture selected; G3 named edit files and 5 tasks; G4 T01 actionable; G5 disjoint from WR10 GA/Worker/Writer and TURN03 infra/test fixture owners; G6 source graph, runtime route, owner/CSRF negatives; G7 substantial production install and dependency cleanliness improvement. **READY for implementation.**

Required: no `@offscreen/lab-support` reference in production API src or runtime manifest; regular `createApp` boots without Chamber/QA; new `createLabApp` exposes exactly previous endpoints with valid injected services and preserves auth/owner/validation; Chamber/API Integration tests build, package edge strictly Lab→API, no new cycle; production image dependency claim only with actual build proof. Do not silently drop existing tests. No tests executed in planning.
