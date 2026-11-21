# MA06 | cross-cutting definition of done
1. Graph: direct package dependencies acyclic; no forbidden intra-application paths hiding after partial migration; `story-authority` independent from runtime, provider or lab; new runtime consumes narrow authority APIs.
2. Build: pnpm lock, NodeNext exports, per-package tsc, Turbo dependency order, API/GA/worker and tool integration references work. Browser imports remain pure contract/game only.
3. Source behavior: same story owner/refusal paths, campaign clock and action settlements, typed World state, document source hash and fork root, Writer dispatch lease/fence, retry idempotency, SQL rollback/outbox and public evidence projection.
4. Costs/security: reserve/settle/uncertain provider outcomes, spending caps, permission boundaries, scoped tenants and private knowledge remain unchanged. No new network/paid call or production DB migration.
5. Verification: same-byte fixtures where canonical serialization changes module location, source/replay negative tests on disposable SQL, independent committed SHA receipts, compatibility consumer tests; declare NOT RUN where unavailable.
6. End-state: `@offscreen/application` exports no unbounded operational subdomain; every remaining entry is documented composition or a compatibility shim with a *specific removal gate*. No permanent alternate architecture manuals or packet archives.
