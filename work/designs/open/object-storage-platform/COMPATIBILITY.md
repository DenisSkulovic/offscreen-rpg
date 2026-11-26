# R4 | observed S3 compatibility and selected design direction

2026-11-26. Owner-operated experiment on existing kind-offscreen-dev/offscreen-dev-objects, source main 88b6ebae6acb1664c8c571aadd8cc4385dbb40eb. Design parent ac6b9939763d918a64215763d806cea37daa6c09. SeaweedFS 4.54 build 5ef99c1d8, AWS SDK client-s3 3.922.0, Node 24.19.0. Existing dev-1 and dev-2 scoped credentials, loopback ephemeral kubectl port-forward, random prefix __infra-proof/02262232-7700-470f-9e3b-6dc6e2e8d0ee. No credentials printed.

## Observed receipt

12/12 checks PASS, 4/4 cleanup calls PASS, failures 0:
- HeadBucket both tenants: 200.
- initial conditional PUT: 200; duplicate: 412; original bytes unchanged.
- eight concurrent conditional PUTs to one previously unused key: 200, 412, 412, 412, 412, 412, 412, 412.
- missing HEAD: 404.
- invalid credentials: 403.
- second tenant own conditional write: 200.
- cross-tenant GET denied in both directions: 403.
- dev-1 cross-tenant conditional PUT denied: 403.
- cleanup DELETE acknowledged for all four generated keys.

Limits: one concurrent batch, no readback of race winner, no post-cleanup HEAD, no reverse cross-write, no Pod restart, no fresh tenant provisioning, no release or external-provider runtime acceptance. No generalized proof of all S3 semantics. No provider upgrade or new cluster mutation required by this evidence.

## Design conclusion

Retain pinned SeaweedFS and existing native bucket/scoped-user provisioning mechanism; isolate provider-specific control plane rather than reinvent it. Keep per-slot bucket and credential identity. Use existing AWS SDK rather than custom SigV4 for recurring proof. Runtime startup only checks required bucket access, never creates it. Provisioner creates before startup; external provider pre-provisioned. Existing source adapter error behavior and config compatibility need focused tests. HeadBucket requires appropriate bucket permission; observed both current scoped dev identities pass. External role must satisfy selected data contract; do not silently escalate permissions.

Freeze direction: one resolved binding consumed by workload Helm helper and release content jobs; provider choice stays in environment composition. Local provider deploys only for local managed selection, external binding validation does not inspect local Seaweed resources. Existing local release admin projection must be separated with scoped credential migration; no implicit changes to current Secrets. Fresh installation versus legacy adoption is separate. Keep PVC and identities intact; no destructive operations.

## Next review

Finalize concrete native Helm lifecycle and exact existing-install refusal/compatibility route; inspect common renderer and prior native platform decisions. Freeze source map, proof matrix and self-defense; independent committee per repository rules before material Change promotion. Current receipt supports provider compatibility only, not redesigned infrastructure. No implementation authorized.
