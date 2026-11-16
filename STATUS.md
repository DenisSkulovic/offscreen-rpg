# Status | demonstrated boundary

**Owns:** what is implemented, proved, or still absent. Strategy is [ROADMAP](ROADMAP.md). Contracts are [docs](docs/README.md). The selected Change is [work/changes](work/changes/README.md).

## Orientation

**Status (reconciled 2026-11-16):** Local pre-POC **engineering portfolio**. Nov 12–15 waves landed substantial code (React W, Chamber CH, UX/PX/PF, ENG postwave, Admin AD, Storyteller SA, forensic OBS, GM slices). **DOC01**, **DOC02**, **DOC03**, and **DOC04** are Done and archived. The generic parked studies and expired handoffs are off HEAD; recover them at Git `69ac3c56`. Duplicate Admin and Observability essay copies are gone, and the DOC01 snapshot is no longer a product or technical source (Git `cda7444e` recovers it). Independent fresh-chat retrieval studies passed for DOC03 and DOC04. Sustained 10–15-turn live creative quality and production Support grants remain **unproved / absent**. Full ENG03 short-lock refactor is **not** finished; C1 and C2 narrow slices are the proved subset ([concurrency](docs/technical/engine/concurrency-and-recovery.md)).

**What worked (historical gameplay, Sep 24 2026):** Six successful Sol generations, exact 1,800-fictional-second warehouse shift, six septims paid once, coherent short-term conversation. Deterministic mechanics, saved generation/publication, canonical storage and bounded provider accounting are connected. October 23 rediscovery corrected the earlier “no notes/lost all recall” diagnosis without a new live run.

**Current development priority:**
1. Selection owner: [work/changes/README.md](work/changes/README.md). **Current change:** none. WIKI01, WIKI02, and WIKI03 are Done. WIKI03 did not run a live agent. QA-SF01 remains **Blocked** open (not auto-selected).
2. Open product/governance gaps (not auto-authorized): production Support grant steward; **OBS00-B** default-worker entitlement; OBS04 E0; live Story trial only with a **fresh** spend cap.
3. Prefer new product/technical subject owners. Coverage for what the source actually contains is the matrix below. Do not treat a retired study or an archived packet as implementation permission.

## Capability coverage

Inspected `4178e18f93c25c10d44632fd81ac94681673ba70` on 2026-11-16, then rechecked the named symbols on this branch. Tiers: **selected** (contract), **source** (symbol present), **tested** (named automated proof; not re-run for DOC03), **live** (paid or hosted observation), **absent**. A Done Change packet is not itself a live proof.

| Capability | Target heading | Source inspected | Tier | Still absent |
| --- | --- | --- | --- | --- |
| Fictional time | [time and autonomy](docs/product/gameplay/time-and-autonomy.md) | Engine chronology owners | Selected. No accepted execution, no time | General GM07 delegation |
| Unanswered choice | [vision](docs/product/foundations/vision.md) | GM07 packet is Proposed | Accepted hold. Chamber `chamber.v4` is a fixture deadline, not the product rule | Consented general fallback |
| Storyteller loop | [prompts and tools](docs/technical/storyteller/prompts-and-tools.md) | Narrow controller in operation-and-controller | Selected two-loop target. Optional bounded context is source-limited | General adaptive agent, `ask_memory` as the live default |
| Document CAS | [selected document store](docs/technical/platform/data-and-persistence.md#selected-document-store) | `packages/documents/src/s3-store.ts`, `document-store-config.ts` | Selected. S3 adapter is source-observed | Hosted cutover, automatic GC, implicit migration of old bodies |
| SSE and Query | [client transport](docs/technical/client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture) | `use-story-live-updates.ts`, `story-update-stream.ts` | Source-observed client invalidation. GET remains truth | Production hosting proof, F1–F15 human acceptance |
| Chamber lab | [chamber](docs/technical/lab/chamber-and-fixtures.md) | `lab/lab-run.ts`, `chamber-lab-controller.ts`, developer-tools map CH01–CH16 | Source-observed bench, faults, disposable DB, connected rig, workbench | Paid-provider lane; this row is not a fresh C01–C16 rerun |
| ENG03 short lock | [concurrency](docs/technical/engine/concurrency-and-recovery.md) | C1/C2 archived slices | C1 and C2 are the proved subset | Full short-lock refactor |
| World kernel | [capability kernel](docs/technical/engine/selected-architecture.md#world-neutral-capability-kernel) | Current `Character` shape is still the code | Selected concept | Finalized cross-world schema |
| Admin grants | [commercial and trust](docs/product/admin/commercial-and-trust.md) | AD/OBS synthetic packets are not production | Charter accepted | Production Support grant, raw-prompt grant |
| Turn capsule | [investigation](docs/technical/observability/investigation-and-reconstruction.md) | Synthetic read designs | Selected reconstruction steps | Full historical causal reconstruction |
| Presentation language | [V1 language](docs/technical/client/presentation-runtime.md#selected-presentation-language-v1) | PX seams exist; language is the contract | Selected | Engine-emitted presentation, arbitrary CSS |

## Evidence and limits

Dated DOC01 observations are under [doc01-retained-observations](evidence/inspections/doc01-retained-observations/README.md). The old snapshot is a [manifest](evidence/inspections/doc01-legacy-snapshot/MANIFEST.md). Provider spend requires fresh explicit authorization.
