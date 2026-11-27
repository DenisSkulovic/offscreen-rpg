# Technical documentation renewal

**Status:** Deferred, unratified design investigation. Owner: human owner and designer. Deferred 2026-11-27 at owner request. Reactivation: explicit owner selection, refresh actual main, move dossier to open. No fixed deadline, implementation commission, paid calls or runtime mutation. Inventory baseline: `59693e9d86f9cfcdc3227669257d89dab5aaaf11`.

## Desired outcome

One coherent owner per guarantee, explicit selected target versus demonstrated realization, exact authority and failure semantics, economical retrieval. Scope [docs/technical](../../../../docs/technical/README.md), interfaces to product, source maps, runbooks and evidence. No runtime redesign or implementation. Correct stale status without silently selecting a new architecture.

## Initial review

59 tracked files, 1,358,788 bytes (1,326.9 KiB), Git metadata only, not complete source/claim certification.

| Area | Files | KiB |
| --- | ---: | ---: |
| Platform | 22 | 563.6 |
| Storyteller | 9 | 282.6 |
| Engine | 8 | 172.6 |
| Client | 8 | 103.4 |
| Observability | 5 | 97.8 |
| Lab | 2 | 47.5 |
| Admin | 4 | 46.5 |
| Index | 1 | 13.0 |

| Priority inspection target | KiB | Question |
| --- | ---: | --- |
| [Data and persistence](../../../../docs/technical/platform/data-and-persistence.md) | 79.4 | Durable guarantees vs accumulated implemented-record snapshots; overlap with DB, engine and documents |
| [Canonical documents](../../../../docs/technical/storyteller/canonical-documents-and-packages.md) | 56.1 | Root/version authority and consumer boundaries |
| [Request context and cost](../../../../docs/technical/storyteller/request-context-and-cost.md) | 54.0 | Overlap with provider/controller/spending/memory; preserve spend fences |
| [Native observability](../../../../docs/technical/platform/observability-native-infrastructure.md) | 52.9 | Accepted R5 vs pending realization/proof; preserve custody and negative obligations |
| [Topology](../../../../docs/technical/platform/topology.md) | 51.1 | Historical Compose/proposed topology vs actual service ownership |
| [RabbitMQ native](../../../../docs/technical/platform/rabbitmq-native-infrastructure.md) | 50.0 | Confirmed amendment-style canon: R7–R10 and self-defense coexist; later amendments override earlier text |
| [Controller](../../../../docs/technical/storyteller/operation-and-controller.md) | 48.7 | Agent Core successor and execution/cost authority |
| [Execution and delivery](../../../../docs/technical/platform/execution-and-delivery.md) | 47.7 | Command/outbox/workflow ownership and replay fences |
| [Deployment and compatibility](../../../../docs/technical/platform/deployment-and-compatibility.md) | 47.0 | Release guarantees vs historical lab and hosted-unproven |
| [Context selection and recall](../../../../docs/technical/storyteller/context-selection-and-recall.md) | 43.7 | Rooted context vs experimental retrieval |

Observed entrypoint defects repaired at baseline: two archived-audit links, stale Compose-centric index descriptions, object-storage source wrongly called pending, six technical owners missing index routes. Object-storage heavy acceptance remains pending. RabbitMQ amendment accumulation is confirmed by actual headings and opening; other candidates need full inspection. Size is a signal, not a verdict.

Prior [editorial audit](../../archive/documentation-editorial-audit/README.md), [page register](../../archive/documentation-editorial-audit/PAGE-REGISTER.md), [redlines](../../archive/documentation-editorial-audit/REDLINE-SAMPLES.md) are historical research, not authority or a current execution schedule. [Product renewal](../product-documentation-renewal/README.md) owns product intent.

## Suggested workshop

1. Define desired contract types and role-specific retrieval. Compare current domain organization with ownership-based alternatives; no new folder without demonstrated benefit.
2. Investigate one coherent domain at a time: native infrastructure first, then persistence/topology/delivery, Storyteller, engine, client/Admin and remaining contracts. Inspect actual HEAD, selected verdicts, source symbols, callers, schemas, tests and evidence. Distinguish real contradictions from suspected duplication.
3. Pilot one current-state rewrite (RabbitMQ is a strong candidate). Reconstruct accepted R10 once, mapping every invariant, refusal, deadline, lifecycle phase, exclusion and proof to successor text. Preserve historical committee evidence, repair incoming headings. No new mechanism or weaker safety.
4. Separate operator commands into runbooks, actual results into evidence, unratified design into Designs. Retain coherent large contracts where needed. Split only distinct responsibilities, audiences or revision cadence; no page-count games.
5. Review with owner; apply independent defense when material design warrants it. Repartition into separate domain Designs if scope exceeds submission profiles. Only after acceptance select bounded documentation Changes or direct editorial work, no giant rewrite packet.

## Acceptance direction

A fresh planner locates the governing guarantee and relevant source/test without reading amendment history. Coherent current contracts, clear exclusions and evidence status. Semantic negatives demonstrate permission, integrity, idempotency, finance and failure/recovery obligations survive unless separately ratified; moved claims and typed dependencies/inbound anchors reconciled. No new runtime PASS claim.

Follow [documentation governance](../../../../.agents/rules/documentation.md), [retrieval](../../../../.agents/references/documentation-navigation-standard.md), [design methodology](../../../../.agents/rules/target-driven-renewal.md) and [submission standard](../../../../.agents/references/planning-artifact-quality.md). No formal submission or execution packet yet.
