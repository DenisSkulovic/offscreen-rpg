# Developer observability

**Status:** Accepted architecture (R5, independent defense pass 02); implementation pending. The Change packet is not commissioned.

## Objective

Make the existing optional development observability stack useful for local application experiments while retaining its diagnostic, storage and security guarantees.

- Keep the five pinned Helm releases and three persistent claims.
- Normalize maintained Helm values and locks; retain experimental specimens only in design evidence.
- Separate strict synthetic diagnostics from trusted local developer telemetry.
- Provide foreground, loopback-only WSL connectivity with owned process cleanup.
- Support an explicit, identity-checked Collector-only configuration upgrade; ordinary ensure remains install-only.
- Repair functional signal, datasource and resource proofs and retain all outstanding native infrastructure acceptance obligations.

No actual application instrumentation, public exposure, generic upgrade engine, release changes, paid calls or destructive operations are authorized.

## Specification

| Document | Responsibility |
| --- | --- |
| [TARGET.md](TARGET.md) | Architecture rationale and selected contract routes |
| [LIFECYCLE.md](LIFECYCLE.md) | Links to canonical lifecycle sections |
| [R5-GEOGRAPHY.md](R5-GEOGRAPHY.md) | Source and artifact placement |
| [R5-PROOF-CONTRACT.md](R5-PROOF-CONTRACT.md) | Links to canonical proof safety and freshness |
| [R5-CERTIFICATION.md](R5-CERTIFICATION.md) | Original acceptance obligations |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Acceptance matrix |
| [SOURCE-MAP.md](SOURCE-MAP.md) | Source investigation |
| [Canonical technical contract](../../../../docs/technical/platform/observability-native-infrastructure.md) | Permanent selected authority |

## Evidence and implementation

The existing workloads and authenticated datasource health were observed, but clean fresh installation and complete backend signal queries were not certified. Preserve the distinction between observed health and unrun acceptance.

[Historical R2 investigation](DESIGN-R2.md), [designer self-defense](SELF-DEFENSE.md), and [committee pass 01](committee/pass-01.md) are evidence, not execution instructions. Independent pass 02 accepted R5; the owner promoted the architecture.

[Implementation Change](../../../changes/open/2026-11-27--observability-developer/CHANGE.md) owns execution planning and unresolved packet-level decisions. OBSERVABILITY-NATIVE is archived as superseded; its outstanding acceptance obligations belong to this successor.

Original investigation and superseded README text are preserved in [the pre-consolidation revision](https://github.com/DenisSkulovic/offscreen-rpg/blob/dee29c6653b873b741197b04f84761d64b35824e/work/designs/open/observability-developer/README.md).
