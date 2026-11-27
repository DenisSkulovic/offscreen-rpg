# Developer observability

**State:** R5 architecture accepted and promoted; implementation recovery active. Owner: ChatGPT planner; human integration custodian. Next review: staged certification decision and independent D01 packet readiness. No implementation or live operation commissioned. The old monolithic packet is superseded and archived; D01 is the only imminent implementation proposal.

## Objective

Make the optional native observability stack useful for local development: maintained Helm inputs, separate trusted developer and strict diagnostic telemetry, foreground WSL access, safe known-predecessor Collector upgrade and truthful backend verification. Preserve five pinned native releases, three retained claims, credentials, release behavior, privacy and custody. No application SDK enrollment, generic upgrades, public exposure, paid calls or destructive cleanup.

## Current route

| Document | Purpose |
| --- | --- |
| [TARGET](TARGET.md) | Selected architecture, tradeoffs, remaining material decisions |
| [SOURCE-MAP](SOURCE-MAP.md) | Current source ownership and integration seams |
| [ACCEPTANCE](ACCEPTANCE.md) | Complete native/developer gate ownership and binding certification rule |
| [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.md) | Bounded successor outcomes, dependencies and recovery |
| [Canonical technical contract](../../../../docs/technical/platform/observability-native-infrastructure.md) | Permanent selected authority |
| [D01 artifact normalization](../../../changes/open/2026-11-27--obs-d01-native-artifacts/CHANGE.md) | First proposed bounded packet, not yet independently reviewed |

## Historical and transition material

[DESIGN-R2](DESIGN-R2.md), [SELF-DEFENSE](SELF-DEFENSE.md), [committee](committee/pass-02.md) and [experiments](experiments/) preserve the research, independent findings and actual pinned feasibility work. The [archived predecessor](../../../changes/archive/2026-11/observability/2026-11-27--observability-developer/CHANGE.md) retains every original file byte-for-byte. Four former transition pages are preserved at the [original design revision](https://github.com/DenisSkulovic/offscreen-rpg/tree/8acf432dcdbfea6f99a02dbd6abf547d917e6a78/work/designs/open/observability-developer); their current meaning is in TARGET, SOURCE-MAP, ACCEPTANCE and IMPLEMENTATION-PLAN. Historical documents are not execution routes.

Workloads and datasource health were observed on predecessor source; clean install, complete backend queries and full certification were not established. All successor evidence stays NOT RUN until executed. Original dossier and packet provenance: [audited baseline](https://github.com/DenisSkulovic/offscreen-rpg/tree/270a3b6e323872e4735f8d5ceac4a71027433ffd/work/designs/open/observability-developer).
