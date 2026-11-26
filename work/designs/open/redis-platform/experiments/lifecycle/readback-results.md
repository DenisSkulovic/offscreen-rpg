# Native readback results | 2026-11-26

Owner terminal run of 3e5dcd71946274a92b5fc1abd0b6cb4695b0b300, 14s. Python compilation, lint/render, fresh installation, no-op and parsed installed manifest equality passed. Namespace offscreen-redis-proof-ae85090e281b UID a1f256e8-f417-4b51-8cb2-54f52d7e6aff deleted and wait confirmed gone. Legacy three object UIDs unchanged. Helm release 1, Pod/endpoint target UID 3b66d3b7-d6a2-40e9-9235-4a010e32e4cc, Service owner UID 985b9c27-d041-4d9a-9b59-c6bbfc06d014, PONG via Service. No production acceptance.

Computed values exactly observed:
```json
{"image":"docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232","redis":{"evictionPolicy":"allkeys-lru","maxmemoryMiB":32},"resources":{"limits":{"cpuMilli":500,"memoryMiB":128},"requests":{"cpuMilli":20,"memoryMiB":32}}}
```

Helm stored manifest equals parsed native render, three docs. Helm ownership annotations on actual objects checked by specimen; not part of stored manifest. Desired ConfigMap checksum 8394281eba10d4aed07a2ee7b4b46863864917a1a180468470039875560664c1. ImageID exactly same digest reference as values.

Defaulted fields, observed release Kind specimen (not universal Kubernetes guarantee):
- Deployment progressDeadlineSeconds 600, revisionHistoryLimit 10; replicas 1, Recreate.
- Template PodSpec dnsPolicy ClusterFirst, restartPolicy Always, schedulerName default-scheduler, terminationGracePeriodSeconds 30. No serviceAccountName at template level. automountServiceAccountToken false, enableServiceLinks false. Pod security context exactly desired.
- Container TCP protocol, both probes failureThreshold 3, successThreshold 1, no initialDelaySeconds field; terminationMessagePath /dev/termination-log, terminationMessagePolicy File. Requests 20m/32Mi, limits 500m/128Mi. Volume mounts config readOnly true, data readOnly omitted. ConfigMap defaultMode 420 (0644), emptyDir sizeLimit 32Mi.
- Actual Pod adds nodeName offscreen-release-worker, preemptionPolicy PreemptLowerPriority, priority 0, serviceAccount and serviceAccountName default, two NoExecute tolerations for node.kubernetes.io/not-ready and node.kubernetes.io/unreachable (Exists, 300 seconds). No extra containers/volumes/env were allowed by specimen assertions.
- Service clusterIP and clusterIPs allocated 10.96.173.148, internalTrafficPolicy Cluster, ipFamilies [IPv4], ipFamilyPolicy SingleStack, sessionAffinity None, protocol TCP; no extra ports or external exposure shown.
- EndpointSlice addressType IPv4, exact Service ownerRef (controller true, blockOwnerDeletion true), TCP port redis 6379; one endpoint 10.244.1.23, ready true, serving true, terminating false, Pod targetRef namespace/name/UID, nodeName offscreen-release-worker. Pod IP was not printed separately, so actual address equality remains future proof.
- Full actual Pod spec includes controller/default fields above; readback intentionally omitted env/envFrom and template annotations from printed output, but fixture asserted no env/envFrom and prior verify checked config hash. Do not claim exhaustive runtime drift checks executed.

Owner caller grep (committed HEAD, infra/tools/scripts/package.json) anchors: infra-cli.mjs 16-17,522,600; infra-cli.test.mjs 55; platform-plan.mjs 103,115,122; platform-plan.test.mjs 91,108; legacy Redis internal imports; diagnostic.mjs 14,21; smoke.sh 37-38; infra-layout.test.mjs 29,293-294. Source reinspection confirms diagnostic static test list, source suite does not currently register Redis tests, status mapper maps ok to installed, detail absent to not-installed, unreadable to unreadable, else not-ready. Historical layout move map is not a new runtime dependency. Grep scoped to named patterns and directories; final implementation removal checks must include docs/runbooks and relative imports. No new baseline mutation.
