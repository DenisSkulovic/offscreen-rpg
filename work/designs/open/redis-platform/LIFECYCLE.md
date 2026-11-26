# R2 | Native Helm lifecycle (provisional selection)

2026-11-26. Integration baseline b6d128061fd0eb4d30296589d9393a277b09477a; predecessor cbacbbb38abc844823c89af311f639c5d9d5c6f8. No formal defense or implementation commission.

## Comparison and decision

Select a small repository-owned Helm chart and native Helm install for new pools, conditional on version-specific verification. No operator, third-party dependency or custom generic reconciler. Direct kubectl create is credible and intrinsically refuses existing names, but lacks release inventory and standardized subsequent lifecycle; still requires inventory, ownership and partial-failure handling. Helm provides those lifecycle records, not a transaction or security fence. Third-party chart adds no proven requirement for this three-object singleton. Do not use upgrade --install, takeover, replace, force, automatic rollback/uninstall or SSA forced conflicts. Existing legacy installation cannot be claimed by stamping metadata. Keep legacy operational until explicit cutover is selected.

Research (2026-11-26): Helm v3 install documentation https://docs.helm.sh/docs/v3/helm/helm_install/ describes takeover and atomic uninstall on failure; https://docs.helm.sh/docs/v3/topics/advanced/ describes adoption; upstream main https://github.com/helm/helm/blob/main/pkg/action/install.go and validate.go show existing-resource checking and adoption branches, but main is not installed-version evidence. https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands documents create and server dry run; dry run is not atomic admission. https://github.com/helm/helm/issues/31333 illustrates uninstall ownership hazard in historical version, not proof of current behavior. Installed Helm version remains unknown. Before implementation, inspect matching tagged install/validation/client sources and run collision/partial proof. If native Helm cannot meet selected custody guarantees without reproducing reconciler, reopen direct create option.

## Concrete lifecycle

Chart emits only ConfigMap, Deployment and Service, no Namespace, hooks, CRDs, cluster-scoped resources or credentials. Use normal YAML, explicit chart values and schema; pool name used in names and instance selector. For baseline keep existing redis/redis-config names where possible; namespace dev offscreen-dev-redis, release lab-a until cutover decision. Named pool namespace/identity not final. Namespace created by guarded separate step only if absent, owned labels and UID captured; shared release namespace not release-owned. Never delete namespace on failure.

Install command specimen (illustrative, NOT authorized for live execution):
    helm install redis ./chart --kube-context <exact-context> --namespace <owned-namespace> -f <profile> --wait --timeout 180s

Use exact local installed version flags; above syntax assumes Helm 3-style wait. Wrapper checks explicit authorization, assertPlatformTarget, lock, namespace UID and expected release history (all states), resource inventory and matching-pod absence. Check every intended kind/name absent before install; fail closed on unreadable. Recheck under lock immediately before mutation. No claim against arbitrary noncooperating kubectl writers; require maintenance quiescence for migration. A pre-existing matching Helm annotation is not sufficient for admission. On timeout, nonzero or unknown mutation result, stop, report observed inventory and release state; never retry blind. Release record and resources are not atomic; no automatic rollback. For existing deployed release require same chart content and values, live intended object compatibility and runtime checks; no-op only, no revision created. Use actual resource fields, not just labels/hash. Refuse drift, failed/pending history, mixed/foreign objects and unreadable observations. For old raw-manifest baseline: classify LEGACY, do not install or patch; preserve current behavior until explicitly approved migration. Cutover options: alternate endpoint with explicit client transition vs quiesced replacement at original endpoint; decide from live inventory and consumer census. Do not delete shared lab-a.

## Integration facts and target deltas

- infra/platform/redis/observations.mjs observeRedis and planRedisInstall read namespace and three objects; plan currently authorizes apply for owned state. Replace plan semantics with fresh/compatible/refusal; preserve public receipt compatibility via adapter.
- infra/platform/redis/readiness.mjs assessRedisReadyState checks ready generation/replicas, Service selector {app:redis}, config data and hash (missing annotation tolerated). It does not compare actual config bytes to expected rendered config in all cases; checks rendered annotation against rendered data, live annotation against live data. It does not observe image, endpoint, Pod UID or Redis protocol. New native path requires expected config hash, image, security/resource/selector checks and protocol observation.
- infra/platform/redis/reconcile.mjs manually applies CAS patches; candidate retires default mutation path after cutover. Do not port generic patch logic merely to retain current files.
- infra/environments/platform-plan.mjs routes dev and release differently; infra-cli.mjs observeSelectedServiceState uses observeDevRedisReady and observeRedisReady. Preserve external plan/up/status/render invocation and optional Redis semantics; exact receipt mapping and render/common call census remain open.
- infra/platform/temporal/install.mjs uses explicit context, fresh-only Helm and flock supervisor. Reuse target/lock discipline where compatible, not Temporal-specific persistence or namespace assumptions.
- Current chart helper produces JSON documents via fromYaml/toJson. Ordinary YAML templates sufficient; shared render consumer needs inspection before replacement.
- Current service selector app=redis can match another pool in same namespace. New selector must include immutable instance identity. Deployment selector immutable; legacy replacement or preservation must be deliberate.

## Owner-operated read-only evidence

Run from repository root in WSL. The following does not change context, install resources, read Secret values, or touch cache keys. It prints Helm version, cluster identities, namespace and object metadata, pods and endpoints. Failures are informative. Do not run destructive smoke.

    helm version --short
    kind get clusters
    for pair in 'kind-offscreen-dev offscreen-dev-redis' 'kind-offscreen-release lab-a'; do
      read -r ctx ns <<< "$pair"
      echo "=== $ctx / $ns ==="
      helm list --kube-context "$ctx" -n "$ns" --all
      kubectl --context "$ctx" --request-timeout=10s get namespace "$ns" --show-labels
      kubectl --context "$ctx" --request-timeout=10s -n "$ns" get deployment/redis service/redis configmap/redis-config -o custom-columns='KIND:.kind,NAME:.metadata.name,UID:.metadata.uid,HELM:.metadata.annotations.meta\.helm\.sh/release-name,IMAGE:.spec.template.spec.containers[*].image,SELECTOR:.spec.selector'
      kubectl --context "$ctx" --request-timeout=10s -n "$ns" get pods -l app=redis -o wide
      kubectl --context "$ctx" --request-timeout=10s -n "$ns" get endpointslice -l kubernetes.io/service-name=redis -o custom-columns='NAME:.metadata.name,ADDRESS:.endpoints[*].addresses,READY:.endpoints[*].conditions.ready,POD:.endpoints[*].targetRef.name,UID:.endpoints[*].targetRef.uid'
    done

Read-only discovery is not authorization for install, scale, flush or delete. Verify endpoint and ownership before any protocol probe. Next experiment after output: version-matched Helm collision and partial failure in unique disposable namespace, with separate permission and bounded resource use. Need concrete UID-fenced cleanup before authorizing. No source tests or live checks executed by planner.

## Acceptance refinement

Fresh-only native install and repeat no-op must prove release revision stable and object UIDs unchanged; foreign resource with matching labels or annotations must cause refusal before writes; partial/failed release must refuse without cleanup; extra matching Pod or mismatched endpoint target UID must not be reported ready. Readiness must establish actual image identity, effective config and a PING through intended Service, not localhost only. Native observer must never log secret values. Check a second independent pool cannot match baseline selector. Legacy cutover and memory/ACL proof remain separately gated. Formal self-defense not yet passed.

## R3 update | actual Helm v3.22.1 source and observed inventory

Supersedes earlier installed-version unknown and live inventory missing statements. Owner output: Helm v3.22.1+gd6c1a0e; both Redis baselines legacy, each with one endpoint targeting intended Pod UID; dev Helm list initially unreachable, subsequent read-only retry succeeded, release list empty. See [observations](OBSERVATIONS.md). No migration or install occurred.

Exact-version upstream source inspected 2026-11-26 via GitHub:
- https://github.com/helm/helm/blob/v3.22.1/pkg/action/install.go#L351-L361: normal path invokes existingResourceConflict, takeover invokes requireAdoption; either may produce toBeAdopted. Lines 402-411 store release record before install. Lines 458-468 create when adoption list empty, otherwise Update or UpdateThreeWayMerge. Therefore ordinary install is not inherently create-only if matching metadata present. No flags alone prove fresh ownership.
- https://github.com/helm/helm/blob/v3.22.1/pkg/action/validate.go#L65-L117: existingResourceConflict retrieves resource and checkOwnership evaluates label and annotations, not UID/custody. Refusal before Helm invocation for any reserved present object (even matching metadata) required on fresh path; namespace and history checks under shared lock; external noncooperating writer race remains explicit local operational constraint.
- https://github.com/helm/helm/blob/v3.22.1/pkg/kube/client.go#L143-L149 and #L573-L590, #L630-L640: Create delegates to resource helper through batchPerform, aggregates errors; no multi-resource transaction. Failure can leave partial inventory. No automatic cleanup/rollback.
- https://helm.sh/docs/v3/helm/helm_install/ version 3.22.1: --wait/--timeout, --atomic and --take-ownership; latter two not used. Exact chart render and disposable runtime tests remain unexecuted.

Selection retained for fresh local pools with cooperating-writer discipline; no unconditional guarantee against concurrent arbitrary writers between precheck and Helm's own adoption check. This scope limitation must be defended explicitly; if unacceptable, choose guarded kubectl create-only instead. Runtime proof must include matching-metadata orphan and partial-install scenarios. Legacy cutover still gated.

## R5 decision after native experiment

[Release lifecycle experiment](experiments/lifecycle/results.md) passed all scoped checks. Select native Helm for fresh local pools as candidate architecture. No arbitrary-writer safety, full compatibility or migration claim. Continue with [integration and cutover](INTEGRATION.md); formal defense remains pending.

## R6 scope and observer

See [TARGET.md](TARGET.md) for current baseline target and explicit compatible-state observation requirements. Owner census supports quiesced legacy replacement at original DNS, not automatic adoption. The disposable fixture observer does not establish complete compatibility. Formal defense pending.
