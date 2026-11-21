# Code architecture health | unresolved investigations

**State:** Open investigation, **not an executable Change or selected work**. **Owner:** ChatGPT architecture review. **Review trigger:** after relevant WR03/WR05/WR06 source has landed; if still open, reassess by **2026-12-05**. Follow [Design lifecycle](../../README.md), promote ratified decisions to the canonical wiki, and retire this dossier with Git/ledger provenance when resolved.

**Observed baseline:** At 2026-11-21 the committed `packages/application/src/storyteller/` held **63 direct TypeScript files, no subdirectories and 741,865 bytes**. `context-capture.ts` was 3,078 lines, `capture-materialization.ts` 1,612, and `writer-loop.ts` 780. Flatness and size trigger review, not automatic file moves or security conclusions. The full [dated audit](https://github.com/DenisSkulovic/offscreen-rpg/blob/4ee459b9acdc73c7f63674b697baeb9c7e685da4/work/changes/CODE-CRAFT-REMEDIATION-2026-11-21.md) is preserved at an exact Git revision for source evidence, not as a live instruction.

**Checker:** `pnpm repo:code-health` is the read-only report. On `66a37abe` it still measured **63 direct production files, 0 child source directories, and 741,865 bytes** in `packages/application/src/storyteller`. Newline-aware line counts were `context-capture.ts` 3,077, `capture-materialization.ts` 1,611, and `writer-loop.ts` 779, matching `wc -l`. That folder stays a review candidate. Do not move its files to shrink the count.

**Monorepo package/domain ownership:** [inspected architectural diagnosis and proposed modular-monolith target](MONOREPO-MODULE-OWNERSHIP.md). This is a **Design**, not current technical authority. [Separate proposed Undertaking](../../../undertakings/modular-monolith/UNDERTAKING.md) tracks MA01–MA06 and the future integration branch; no automatic implementation or source movement.

**Already scoped implementation:** [CQ01–CQ05 Change packets](../../../changes/README.md) own their own source maps, algorithms and acceptance. Do not duplicate their schedules here.

| Unresolved design question | Evidence required before deciding |
| --- | --- |
| Writer tool-call trust boundary | Inspect landed Writer schemas, Zod parse, casts, `workdesk.*` dispatch, grants, root/revision and replay negatives |
| Capture/materialization ownership | Map Zod versions, task assemblers, SQL leases, source pins and canonical hash behavior before proposing pure extractions |
| Provider/budget/publication cohesion | Trace request, reservation, transport, uncertain delivery, settlement, locks and publication tests; no cosmetic transaction surgery |
| Admin hosted-environment authority | Determine local/staging/production configuration and capabilities before changing `adminEnvironmentForOrigin` |
| Storyteller folder architecture | Trace `index.ts` exports and all consumers, package boundaries, persistence ownership and real import cycles; select semantic seams rather than arbitrary subfolders |

**Review output:** keep / narrow clarity fix / selected architecture decision with bounded Change / defer to predecessor. Every disposition must cite actual source SHA, relevant positive and negative proof, integration conflicts and owner. No swarm of automatically created refactor tickets.
