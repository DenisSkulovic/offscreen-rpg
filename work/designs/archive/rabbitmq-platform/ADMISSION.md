# R5 normative admission proposal
Date 2026-11-26. Supersedes conflicting R1–R4 admission choices. No implementation or live authorization.
 
## Scope and trust
Fresh local dedicated broker, dev/release. Existing arbitrary cert-manager, operator, broker, legacy namespace/PV or unexplained partial state refuses. No adoption, update, deletion or automatic repair. Cooperating local administrator is trusted; hostile cluster-admin modifications are outside the security model. Receipt is not tamper-proof against cluster-admin. Existing foreign resources never become owned by marking them. Native reconciliation continues independently.
 
## Receipt instead of predicting every Kubernetes default
One create-only ConfigMap in dedicated broker namespace, rabbitmq-install-receipt, schema version 1. Created LAST after fresh successful structural observation and stable projections. No secret contents or hashes of secret values. Data is canonical JSON containing profile/context, baseline namespace UID, pinned source and rendered intent digests, inventory entries group/kind/ns/name/UID/projection SHA256, broker CR UID, generated default-user Secret UID, bound PVC/PV UIDs, and receipt version. Receipt missing when any target resource present means partial/unknown; never reconstruct automatically. Receipt is not an in-progress marker; failed receipt creation leaves partial refusal. No mutation on repeat. ConfigMap identity itself is checked against expected namespace and ownership marker; trust is bounded to cooperating administrator. Do not use host-only state or new database. No rolling upgrade or receipt rewrite.
 
Create response provides admitted configuration for each declarative object; compare final observed projection with its create-response projection BEFORE recording. Never fingerprint arbitrary late observed drift as approved configuration. For resources whose fields evolve through expected controllers, enumerate transformations narrowly below and validate health separately. Capture created UIDs, fail on replacement. If creation response lost or ambiguous timeout stop without final receipt. On repeat compare source/intent digests, exact identity census and stored projection digests; compare controller-owned generated resource references and persistent identities, not Pod UIDs. Missing or malformed receipt, mismatched UID/digest, extra unexpected resource in dedicated namespace, stale/unreadable health: refuse. Expected temporary smoke Pods/ConfigMaps and operator generated resources must be explicitly classified by ownership/role; do not reject ordinary queue/message changes. Define generated inventory through exact pinned operator specimen before freeze.
 
## Projection specimen (pure pseudocode, NOT executed)
```js
function declarativeProjection(o) {
  const meta = pick(o.metadata, ["name","namespace","labels","annotations","ownerReferences","finalizers"]);
  // Remove only named server/controller-managed metadata keys, not all labels or annotations.
  // Reject deletionTimestamp separately. Remove status, uid, resourceVersion,
  // generation, creationTimestamp, managedFields from projection; uid checked independently.
  const intent = omit(o, ["apiVersion","kind","metadata","status"]);
  // Only kind-specific explicitly documented normalization:
  // webhook: omit clientConfig.caBundle, verify injected CA and endpoint separately.
  // namespace: omit server-added immutable kubernetes.io/metadata.name label
  // only if it equals name. Namespace finalizer lifecycle checked separately.
  // service account: token-controller generated secret references excluded only
  // when proven expected; imagePullSecrets remain part of projection.
  return canonicalJson({meta,intent}); // recursively sort object keys, preserve array order
}
```
Full admitted spec including RBAC rules/roleRef/subjects, deployment Pod templates, CRD schemas, webhook rules, Service spec, Certificate/Issuer spec and RabbitmqCluster spec is compared; avoid generic desired-subset semantics. Preserve array order; conservative false refusal is acceptable, not false admission. Certificate renewal/status/CA injection excluded only in named fields, actual CA verification remains necessary. Generated Secrets read only metadata/key presence; no values in receipt. Do not fingerprint Deployment rollout revisions or operator generated Pod status. Existing cert-manager vendor contains 47 documents by delimiter/kind scan (R2 count corrected), operator 16; derive census using existing yaml dependency, reject malformed/duplicate/unknown kinds. Namespaced roles in kube-system are included; never treat kube-system namespace as owned or require it absent.
 
## Preflight and lock
Use explicit local context plus baseline namespace UID (common assertPlatformTarget checks UID but does not expose it, so obtain via readPlatformObject on baseline and compare at each stage; avoid unrelated changes to common API). Guard ambient Docker/proxy/auth plugin overrides as diagnostic-live does. One context-scoped flock bounded 30s covering plan/ensure receipt and staging, not nested. Recheck identity before every mutation stage and after wait, with cooperative exclusivity; no guarantee against hostile concurrent cluster replacement. All initial inventory reads before first write, including legacy PV claimRefs, every manifest identity and target namespace. Confirm API absent through CRD/discovery, never treat failed list as absent. Fresh when all relevant identities absent except preexisting system namespaces; existing cert-manager even if healthy refuses. Stage create-only cert-manager, wait all required CRDs/controllers/webhook; operator create, wait CRD/cert/issuer/webhook; broker namespace create, dry-run CR create then actual CR create, wait current generation/conditions, StatefulSet and Service endpoints/PVC/Secret. Recheck absence immediately prior to creation, AlreadyExists abort. Receipt created only after complete projection and health checks. Total 900s clipped deadline, no ambiguous retries. No deletion. Existing occupied release read-only refusal before any writes.
 
## Counterexample fixture table
| Scenario | Outcome |
|---|---|
| All identities absent; API discovery confirmed | Fresh |
| Matching receipt, same UIDs/projections, Ready, arbitrary extra queue | Read-only success |
| Receipt absent but cert-manager exists | Refuse partial/foreign |
| Same Deployment name different UID | Refuse |
| Added RBAC verb or container argument | Refuse |
| Injected CA renewed, usable endpoint/cert | Accept if all remaining projection matches |
| Broker Pod recreated, same CR/PVC/PV/Secret UIDs | Accept if ready |
| Secret recreated with same name | Refuse |
| Secret values altered in-place | Structural-only comparison cannot prove auth; separate protocol smoke detects mismatch, no repair |
| Legacy release PV with messaging claim | Refuse |
| Context baseline UID changes after stage | Stop, partial receipt absent |
| create timeout after server persisted resource | Stop, no retry, no completed receipt |
 
## Evidence still needed
Admitted-response vs final projection needs actual API defaulting/controller specimens, notably Namespace finalizers, ServiceAccount references, Deployment annotations, cert-manager CRD/webhook mutation, and RabbitmqCluster webhook defaults. No runtime proof from read-only owner census. A successful complete create cannot be guaranteed with untested projection rules; if benign controller mutations cause refusal, revise before final defense. Do not submit independent committee while this material question remains. A narrowly authorized disposable installation specimen can establish these observations separately from implementation; existing release not touched. No need to build generic diff engine.