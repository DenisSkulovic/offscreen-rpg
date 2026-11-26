# Source receipt

Cursor source implementation is on `change/rabbitmq-native-source`. Record the tested SHA in the commit that adds this note. Commands actually run, all from that worktree:

- `node --test infra/platform/rabbitmq/tests/*.test.mjs infra/environments/platform-plan.test.mjs infra/environments/infra-cli.test.mjs infra/verification/provisioning.test.mjs` — 104 pass, 0 fail, at T04 commit `f7bdba1a`.
- `node --test infra/verification/smoke/rabbitmq/proof.test.mjs` — 21 pass, 0 fail.
- `python3 -m unittest discover -s infra/verification/smoke/rabbitmq -p 'test_*.py'` — 10 OK.
- `node --test infra/verification/verify.test.mjs infra/verification/diagnostic.test.mjs` — 22 pass, reported by T06.
- `helm lint` both chart profiles — OK, reported by T06.
- `scripts/repo-tools/check-lab-manifests.test.mjs` — FAIL, reported as a pre-existing temporal chart discovery miss. Not reclassified as a RabbitMQ pass.

Live rows below are NOT RUN. No cluster writes were made.

# Acceptance matrix
Source and cheap fixture proof (Cursor): T01–T06 exact canonical negative matrix, actual Helm render both profiles, real local lock/subprocess and host receipt interruption fixtures, wire parser unittest; no cluster. Record command/results and exact SHA. Heavy proof (ChatGPT + owner): broad diagnostic source suite, guarded live batch only after explicit permission and actual tested source receipt. 
1. Verify current branch SHA, canonical dev/release target guards, complete read-only inventory, vendor hashes and pinned platform image identities. Preserve volume/context and unrelated service snapshots. Stop unknown or occupied dev; no reset.
2. On fresh canonical dev only, explicit pnpm infra:up --env dev --services rabbitmq; 900s installer budget, structural readiness and native identity observations, repeat same ensure zero writes. No other service activation. Record actual imageID child/config mapping, disk/headroom and credential references without values.
3. Ordinary proof: OFFSCREEN_RABBITMQ_PROOF=authorized node infra/verification/smoke/rabbitmq/proof.mjs smoke dev kind-offscreen-dev. 420s ceiling; exact routing/confirm/payload/ACK/empty/auth-negative and management/metrics.
4. Separately authorize dedicated dev disruption: same CLI durability then worker-loss with OFFSCREEN_RABBITMQ_PROOF=authorized and OFFSCREEN_RABBITMQ_DISRUPTION=authorized. 1800s/900s ceilings, 90s cleanup reserve, durable host receipt, repeat ensure, persistence, redelivery and duplicate assertion. Stop any incomplete phase, preserve receipt; no retry/cleanup by guessed name. R10 attribution only.
5. Current occupied release: explicit RabbitMQ ensure refusal under normal guard, no writes; snapshot pre/post relevant identities; expected nonzero LEGACY_OCCUPIED and mutation none, not provisioning PASS. Do not invoke if inventory no longer occupied without new owner decision. No fresh release deployment.
6. Review all receipts, unrelated service/volume/context preservation, source and live proof against exact SHA; reconcile main shared seams and rerun affected tests before join. Fresh release runtime remains GATED, not claimed accepted. No merge until initial essential proof accepted. Exact owner batch finalized after source receipt, no Cursor heavy runs.