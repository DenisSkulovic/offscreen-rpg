# MA06 | cross-package proof obligations (not yet executed)

**Static architecture:** package graph acyclic at every joined stage; no `story-authority → application/storyteller-runtime/dev-tools`, no runtime back-edge, no unbounded new barrels, no unadvertised production imports and no new type-only dependency that prevents build. Re-run MA01 graph after every stage; distinguish existing unrelated warnings from new violations.

**Package/build correctness:** real NodeNext `types`/`default` resolution including CommonJS/ESM classification and explicit root/subpath exports; pnpm lockfile importer refresh; Turbo dependency DAG; API/GA/worker and tools compile from clean relevant outputs; strict original/new symbol identity across compatibility layers. Verify generated `dist` isn't confused with stale output.

**SQL/fence/canonical invariants:** story and campaign ownership, same-row lock/revision, receipt exactly once, outbox notice same SQL transaction, canonical root/hash/checkpoint and fork lineage, read-only privacy projection, Game Authority admission authority, Storyteller lease/custody/retry/payment reservations and uncertain provider results. Failure/crash replay and stale root/owner/token negative suites on disposable SQL, no real provider calls.

**Gates by stage:** Stage A requires outbox ID conflict and lease semantics unchanged; B requires authority stale revision/campaign atomicity/denied owner and transaction compatibility; C requires admitted generation/capture/retry/publication fences and no duplicate spend/outbox; D requires host/worker consumer tests, no unknown legacy importer and exact export retirement. Each future stage packet must translate these into runnable commands with fixture names, not say “run all integration tests”.

**Provenance:** past source-map observations are not live SQL proof. Record PASS/FAIL/NOT RUN with command, cwd, test counts and actual environment. The program becomes Done only after all separately integrated Changes meet their obligations; an empty `application` directory is not proof of separation.
