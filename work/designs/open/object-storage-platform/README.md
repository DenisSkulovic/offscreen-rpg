# Object storage platform | R7 defense candidate

2026-11-26 · integration main `88b6ebae6acb1664c8c571aadd8cc4385dbb40eb` · designer ChatGPT.
**State: self-defended, awaiting independent committee and owner acceptance.** No implementation or migration authorized. Next review: independent committee, 2026-11-26.

## Normative reading order

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

Self-defense verdict DEFENDED for fresh local structural renewal, read-only compatible legacy continuity and source-level provider-neutral binding. Destructive adoption/cutover, existing release credential migration and actual external hosted deployment separately gated. Independent committee must commit verdict against frozen candidate SHA before owner acceptance or implementation packet planning. No further designer edits during review.
