# Installation and readiness file contracts

Proposed design only. These are responsibilities, not implementation authorization.

## install.mjs

Single mutation owner. CLI or imported invocation must use an explicit profile and operation; resolve target via common profile utility. Reuse existing command, artifact and authorization helpers. No implicit default context, shell interpolation or second bootstrap path. Inputs: profile, operation (plan / bootstrap / ensure), existing authorization and injected runner for tests. Bootstrap is missing-release installation only, never upgrade; ensure may apply same-version configuration changes, version change requires explicit maintenance approval. Plan produces the intended steps without side effects. Outputs: ordinary exit status and existing parent receipt-compatible failure detail. No new receipt schema.

Owns chart acquisition/checksum, prereq checks, shared mutation serialization and native Helm invocation. Does not create a database provisioner, register per-slot namespaces, implement Kubernetes reconciliation, or manage application workers. Importing must not execute CLI or mutate. Use explicit entrypoint guard if imported.

## readiness.mjs

Independent observation owner used by installer, diagnostics and shared dev startup. Inputs: explicit resolved target, injected bounded runner. Report release presence/status/version, core role rollout, frontend gRPC health, UI/admin availability separately; distinguish absent from observation error, pending from failed, and healthy from incompatible. No downloads, installs, credential reads beyond needed metadata, namespace creation or repair. No global cached status. A CLI-based probe may require admin tools; do not claim independent core health if probe cannot execute. Return concise structured facts, use existing receipt vocabulary at boundary. Final exported symbol names follow existing callers once mapped, not another public API layer.

## Operation semantics

Do not implement a competing Kubernetes reconciler. Existing environment CLI owns target authorization, memory gate, progress and dependency ordering. Both callers converge on one adapter. A callable read-only observation API is necessary because there are already multiple consumers; use readiness.mjs as the explicit owner of shared observation, not an installer import with CLI side effects. This is justified separation, not speculative modularization. Helm owns release revisions and object lifecycle. The adapter checks the explicit target, ready PostgreSQL and pre-provisioned credentials, then delegates.

- Plan: report intended profile, release, namespace and chart pin; no Kubernetes mutations or downloads.
- Status: helm status plus Kubernetes rollout and frontend health observations. Read-only.
- Ordinary startup: if owned release is present, healthy and same declared version, use it; do not rerun upgrade hooks for each slot. If not present, install only against explicitly prepared fresh/approved persistence. Compare declared chart version and supplied values (not computed defaults); if changed report explicit platform ensure required. Older worktrees may consume a healthy compatible newer platform but must never downgrade it; default to refusal until compatibility is explicitly established. Do not build a live-object drift engine.
- Explicit platform ensure: standard helm upgrade --install against the verified chart archive, explicit context and namespace, values then profile, --wait --wait-for-jobs --timeout 5m (provisional per-operation Helm bound). The parent defaultPlatformRunner currently has a 600000ms total subprocess deadline and common runPlatformCommand defaults to 15000ms. Helm timeout is per Kubernetes operation, NOT a whole invocation deadline. Select a bounded outer budget explicitly for the Temporal phase, longer than the hook + rollout + prerequisite budgets; propose 15 minutes with an independent total deadline for the adapter, and a parent allowance of 16 minutes. Do not globally enlarge unrelated phase timeouts. Ensure timeout termination handles the child process group, then re-observe pending Helm state before any retry. These numbers are initial operational bounds, not measured startup times. Namespace and Secret must exist before pre-install hooks. No --reuse-values; use declared values. If no changes, avoid needless upgrade; compare Helm recorded chart and supplied values, not every rendered Kubernetes object. For an actual version change, require explicit schema-compatible maintenance approval.
- Reuse existing coordination for shared install if available. Otherwise use a single machine-local lock covering this cluster/release operation, only when multiple callers can mutate; do not invent a lease framework. Helm itself refuses overlapping pending release operations, but that is not a substitute for protecting prerequisite creation.
- Health: deployment rollout plus frontend gRPC check (CLI command from admin tools or existing verification path). A successful TCP probe does not establish service readiness. Core readiness means the four server roles and frontend RPC; web/admin convenience availability is reported independently, unless the chosen tenant provisioning path actually requires admin tools. Helm --wait may still wait for all enabled deployments at installation; distinguish that installation result from application startup health. Functional workflow checks are independent, not startup gates.
- Stop/park: environment owner stops only its app workloads. Shared platform remains. Explicit uninstall is an operator operation and preserves DB and separately owned Secrets. No automatic destructive recovery.

On failure, report Helm status and bounded relevant Job/pod diagnostics, preserve state. No recursive retries, automatic rollback or broad garbage collection. Schema hook can run on any Helm upgrade; an ordinary scale/config edit therefore also needs awareness of this behavior. Do not create a second schema runner to avoid it. Helm rollback does not reverse SQL migrations. Version upgrades require supported upgrade sequence and schema compatibility, backup/recovery plan and separate authorization; detailed production disaster recovery is not part of local baseline implementation.

Human operation should be intelligible as:
```sh
helm upgrade --install temporal ./temporal-1.7.0.tgz \
  --kube-context "$CONTEXT" --namespace "$NAMESPACE" \
  -f values.yaml -f "profiles/$PROFILE.yaml" \
  --wait --wait-for-jobs --timeout 5m
```
Illustrative command assumes prerequisites, approved artifact and verified ownership. Not a command to execute on today's cluster.

## Failure ownership

Installer reports bounded redacted Helm/Job failures; readiness reports observations; parent owns progress and final CLI presentation. No repeated retry loops or overlapping diagnostics. Preserve pending/failed release and database state for explicit repair. No automatic uninstall or rollback.
