# Designer defense checkpoint | R5
Examiner: planning ChatGPT, not independent committee. Date 2026-11-26. Scope: fresh optional local singleton RabbitMQ dev/release, read-only repeat and legacy refusal, fixture migration. Baseline dee12a65beb90493728ef935e3d4d473cd264fe2. Overall EVIDENCE-GATED, no committee submission.
 
| Challenge | Judgment | Evidence / closure |
|---|---|---|
| No consumers: why install at all? | Defended | Owner explicitly wants optional general-purpose service; no core or app integration. |
| Handwritten operator or Helm release? | Defended | Existing shared chart renderer retained; native Cluster Operator owns reconciliation; no custom topology. |
| Can old release be reused? | Defended refusal | Owner observed bound messaging PV and reconciled legacy broker; destructive migration excluded. |
| Shared cert-manager first installed by another service? | Defended refusal for initial scope | Arbitrary adoption not required; no upgrade/removal. |
| Receipt blesses drift during create? | Revised | Use actual create response intent projection and compare final observation; reject ambiguous response. |
| Receipt mistaken for security boundary? | Defended bounded trust | Trusted local admin only; explicit UID/intent checks; no claim of adversarial attestation. |
| Kubernetes legitimate defaults/controller metadata change | Evidence-gated | Need actual create-response/final specimens for exact normalization and generated inventory; no generic omission. |
| Lost/recreated credentials | Defended structural distinction | Secret UID stable in receipt; in-place data mismatch detected by separate auth proof, never automatic repair. |
| Interrupted provisioning | Defended | Fail closed, retain resources, no final receipt or automatic retry/cleanup. |
| Proof breaks fault suite | Defended design direction | Existing worker_loss.py/run.sh read; preserve duplicate-effect negative with isolated queue and Pika. |
| Image identity | Evidence-gated acceptance | Owner index digests recorded, child/config mapping still to validate; no actual image proof. |
 
Actual revision: ADMISSION.md selects create-only completed receipt and exact admitted projection, abandons arbitrary compatibility comparator. Existing source common commands reads target UID but returns only profile/context/port; R5 captures baseline UID separately. Vendor cert-manager count corrected to 47 (source delimiter scan); 16 operator. Source inspection only, no executed fixtures. Next evidence: representative API admission/controller state on dedicated disposable target with explicit owner permission, then revise exact normalization and complete defense. No source implementation or change packet authorized. Fresh release acceptance separately gated due occupied current release.