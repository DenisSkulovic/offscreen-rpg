# INF33 execution

## T01 Read/create without accidental credential replacement

tools/dev-environments/src/adapters/dev-s3-tenant-live-adapter.mjs::secret/storeSecret/bucket/user; tools/dev-environments/src/adapters/dev-s3-tenant.mjs::ensureDevS3Tenant; tools/dev-environments/test/dev-s3-tenant-live-adapter.test.mjs

Use exact get secret --ignore-not-found -o json; successful empty means absent, transport/malformed throws. Validate name, namespace, UID, owner+slot label and required keys; do not log values. storeSecret uses kubectl create -f -, conflict refuses with actionable retry, never apply/overwrite. Read back expected metadata. Parse list exact name tokens with existing weed output fixture; ensure dev-1 does not match dev-10; if unknown format refuse rather than infer absent. Move partial-secret/partial-identity refusal before bucket creation. Preserve current bucket/user names, policy and explicit recovery mechanism, do not automatically rotate. Bound spawnSync transport timeout60s. Test denied reads, prefix collision, existing tenant reuse, partial state zero writes, credential create conflict.

## T02 Honest lightweight readiness

tools/dev-environments/src/adapters/dev-s3-tenant.mjs::ensureDevS3Tenant; tools/dev-environments/src/adapters/dev-s3-tenant-live-adapter.mjs::access; tools/dev-environments/test/dev-s3-tenant.test.mjs; infra/verification/dev-environments

Replace fabricated success flags with {status:'deferred'} on live adapter; ensure reports accessEvidence:'not-exercised' for that case, actual fake access check results remain enforced when supplied. Normal startup only verifies configured identity/Secret/bucket presence and preserves prior policy provisioning; no authenticated cross-tenant probe on every launch. Remove claim of verified access from runtime docs, link existing verification trial as optional later proof. Report mutated accurately (only bucket/user/Secret writes); warm reuse false. Test deferred success is not proof, actual negative access refuses, warm no mutation. node --test tools/dev-environments/test/dev-s3-tenant*.test.mjs; include moved S3 trial test if present.
