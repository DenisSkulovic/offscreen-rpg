# Gateway owner-operated acceptance 2026-11-26

Candidate 139bf674aa7d2ba920583699b1ffbf29f37ffa3d: 43/43 gateway and 40/40 platform integration test executions, both artifact hashes, real Helm lint/render, syntax passed. Existing release revision 12, current readiness, matching ensure mutated=false, game route UID df4d549f-ab2b-4727-8810-781eaf6089f0 preserved. Full measured baseline preservation PASS. Host report /tmp/gateway-acceptance.8tJGhF.

Fresh isolated release-profile specimen offscreen-gateway-proof-1795706323, private kubeconfig /tmp/gateway-acceptance.8tJGhF/proof-kubeconfig, port 26443. Cluster creation and ownership passed; worker initially NotReady. Fresh installer refused bundle-ensure gateway unreadable, mutated=false: preflight read an unregistered CRD resource. No Gateway installation occurred. Fix uses successful native APIGroupList discovery proving absent group (never converts arbitrary read failure to absence), skips unregistered GatewayClass only after that proof, repeats admission before bundle write, retains post-bundle object checks, adds bounded fresh readiness waits. Focused source tests and resumed specimen acceptance pending. No canonical changes. Main 855bb833d6404ff5ba12a2735ba9a4d9b120ad3f needs shared-file reconciliation before join.

## Corrected live acceptance

Candidate 5e48e002ee46b58f19ba70306af6b78f53549dff.

Owner-operated evidence: /tmp/gateway-acceptance.8tJGhF.
30/30 corrected installer tests passed.

- Fresh native installation: PASS, 24s, mutated=true.
- Repeat ensure: PASS, 3s, mutated=false.
- Controller UID/spec preservation: PASS.
- Helm revision remains 1.
- Synthetic backend setup: PASS, 8s.
- Quick HTTP and long-stream smoke: PASS, 47s.
- Four SSE events over one connection: 45.008s.
- Missing backend HTTP 503, unmatched routes HTTP 404.
- Spoofed identity ignored; unsigned webhook not verified.
- Loopback-only exposure and plain HTTP confirmed.
- Wrong-namespace route attachment refused.

Earlier failed fresh-install attempt superseded by corrected
successful installation. Existing canonical release revision 12
upgrade/no-op and measured baseline preservation remain accepted.

Specimen offscreen-gateway-proof-1795706323 retained with private
kubeconfig. Cleanup separately controlled. Fresh proof used a
substituted release-profile identity, not canonical port 6443.
Real application SSE/auth acceptance is outside this Change.

Integration reconciliation preserves both native Redis and Gateway
implementations. Combined focused regression passed before commit.
