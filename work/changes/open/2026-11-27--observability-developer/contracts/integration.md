# T12 | Parent integration

[Execution cards](../TASKS.md) · [Contract index](../INTERFACES.md) · [Proof and deadlines](../PROOF.md)

## T12 parent integration and receipt
Parent runs focused aggregate source checks on exact implementation branch after T11 child receipt; no broad workspace test swarm. Root:
```bash
node --test --test-concurrency=1 infra/platform/observability/tests/*.test.mjs infra/verification/smoke/observability/tests/*.test.mjs infra/platform/common/tests/commands.test.mjs infra/environments/{platform-plan,infra-cli,infra-cli-operation}.test.mjs infra/verification/{diagnostic,provisioning,diagnostic-engine}.test.mjs scripts/repo-tools/{check-lab-manifests,infra-layout}.test.mjs
python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_*.py'
git diff --check BASE..HEAD
git status --short
git rev-parse HEAD
```
BASE is actual commissioned integration baseline recorded in parent receipt, not a guessed SHA. No live diagnostic suite invocation; existing pnpm infra:verify diagnostic can touch real cluster, reserved owner route. Compare exact planned changed-file allowlists vs git diff --name-status BASE..HEAD, preserve unrelated work, no destructive Git. Inspect import boundaries runtime->verification/design forbidden; no old specimen runtime paths, no second installer/supervisor, no raw namespace DELETE, no host Python in-cluster DNS, no production fake runner/verifyArchive bypass, no secret in argv/evidence, no release mutation or SDK enrollment. Parent integrates child receipts serially, commits actual source/test evidence and updates packet status IMPLEMENTED — ACCEPTANCE PENDING only if all focused proofs pass; otherwise report exact failed/not-run cases and retain task state. Owner heavy A/V route in PROOF.md, no merge/next Change/automatic cluster action. Final receipt exact SHA, branch, task commit list, test commands/counts/failures, planned-vs-actual file delta, residual owner gates all NOT RUN, retained blockers; source-only not live certification.

Use actual tracked test census in SOURCE-MAP.md's tracked test census; new tests are predecessor outputs. No repeated planner approval after unchanged whole-Change commission.
