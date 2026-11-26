# Object storage platform | archived design

2026-11-26 · integration main `88b6ebae6acb1664c8c571aadd8cc4385dbb40eb` · designer ChatGPT.
**State: Accepted and promoted; archived by owner 2026-11-27.** Bounded R9 accepted on 2026-11-26 after independent pass 02. Source integrated on main at `5079a086`; heavy acceptance and occupied legacy admission remain pending under the implementation Change. [Original complete dossier](https://github.com/DenisSkulovic/offscreen-rpg/tree/79e00fb1e81563133c1588fea35dd1960571c79e/work/designs/open/object-storage-platform). Research, proposals, experiments and review instructions below are historical, not dispatch authority. No migration, credential transition or live mutation permission.

Canonical authority: [native object storage](../../../../docs/technical/platform/object-storage-infrastructure.md). [Implementation Change](../../../changes/open/2026-11-26--object-storage-native/CHANGE.md). Actual occupied admission still gated. [Pass 02](committee/pass-02.md) committed at abf279fe586a9b2d99c6b554e9e62e68bc2b4dc3.

## Historical design reading order

- [R9 committee closure evidence](R9.md): controlling scope, observed IAM and storage evidence, remaining gates.
- [R8 committee response](R8.md): custody and authorization amendments, subordinate to R9.
- [Independent pass 01](committee/pass-01.md): three material findings and original verdict.

- [R7 defense and final scope](DEFENSE.md): controlling final choices, proof matrix, source retirement and self-defense.
- [R6 integration](INTEGRATION.md): detailed render, runtime, credential and custody contracts, as amended by R7.
- [R5 target](TARGET.md): lifecycle and architecture, subordinate to R6/R7 where amended.
- [R4 compatibility](COMPATIBILITY.md): owner live SDK receipt, 12/12 checks and 4/4 cleanup calls, limits.
- [R3 inventory](INVENTORY.md): existing clusters and startup provisioning defect.
- [R2 bindings](BINDINGS.md): initial source mapping and research, historical where superseded.
- R1 initial design retained in Git history at be4d3d8767f06da7e0932a45cd8de2421e223547.

## Selected candidate

S3 data-plane portability; SeaweedFS 4.54 only a minimal local provider. One native Helm chart, one PVC, one deployment, one ClusterIP. One provider administration owner and per-context mutation guard. Existing compatible legacy installation observed and reused without Helm adoption; eleven dev tenant identities and two existing PVCs retained. Shared resolved S3 binding across workloads and fixture jobs; application runtime checks bucket access but does not provision. Fresh release scoped credential, legacy release explicitly retains existing compatibility binding; no automatic rotation. External preprovisioned binding supported at source/config seam only, not a deployed hosted profile. AWS SDK verification, no custom signing. No provider operator, HA, cloud provisioning abstraction, migration or data deletion.

## Evidence and gates

Owner observed both local providers running, pinned image, PVCs bound, no listed Helm releases. Owner SDK experiment against two existing dev tenants passed conditional writes, one winner among eight simultaneous writes, authentication and cross-tenant denial. No fresh Helm installation, new scoped release identity, guard implementation, hosted or migrated deployment tested. R7 specifies required source and isolated live structural proof.

Self-defense verdict DEFENDED for fresh local structural renewal and source-level provider-neutral binding, including design of read-only legacy classification. Actual occupied legacy admission remains evidence-gated until complete classifier readback and owner acceptance. R9 records observed continuity and targeted IAM readback, not full compatibility certification. Destructive adoption/cutover, existing release credential migration and actual external hosted deployment separately gated. The independent committee gate was completed by pass 02 before owner acceptance. Remaining implementation and operational gates belong to the open Change; no new acceptance is claimed.
