# DOC19 | Separate selected persistence and delivery contracts from implementation inventory

**State:** Proposed, unselected. **Kind:** documentation. **Editorial wave:** S4. **Sequence:** after DOC13 and DOC18; refresh current HEAD, working tree and exact headings before choosing Ready. **Baseline:** [70-page register](../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and [content audit](../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md), originally against `f3e3bfe`. No implied execution permission or code modification.

## Cursor first-screen brief

**Problem:** Platform persistence combines numerous 'Implemented' record inventories with planned contracts; caching and queue/delivery sections have different sources and recovery behavior.

**Canonical review set:**
- [docs/product/gameplay/continuity.md](../../../../docs/product/gameplay/continuity.md)
- [docs/technical/platform/data-and-persistence.md](../../../../docs/technical/platform/data-and-persistence.md)
- [docs/technical/platform/persistence-and-caching.md](../../../../docs/technical/platform/persistence-and-caching.md)
- [docs/technical/platform/execution-and-delivery.md](../../../../docs/technical/platform/execution-and-delivery.md)

Read [editorial standard](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [waves](../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md) and exact current owners, not the whole initiative as a coding prompt.

## Designed editing work

1. Restructure data-and-persistence around canonical identity, versioned/append-only source, transaction and projection contracts; keep exact existing schemas and proof links without a long release diary.
2. Distinguish Postgres commits from caches, outbox/Temporal signals, replay and reconstructable read projections. Give duplicate-delivery and stale-cache negative traces.
3. Remove duplicated engine ownership explanations; link exact engine/Storyteller result admission and effective cost ownership instead of claiming platform cache is narrative truth.

Work in the named document sections, with a before/after claim ledger, exact target-vs-realized classifications and reasoned no-edit findings. A split requires mapping all inbound headings and repairing links in the same execution slice. A reader must learn **who owns the promise, which implementation claims are evidenced, and why dependent text would need review**. Never optimize a word-count quota, change executable source or auto-ratify unselected proposals.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical editorial work does not revise selected player promises in `docs/product/gameplay/continuity.md` | `docs/product/gameplay/continuity.md` and governing claim anchors | Owner review when normative meaning would change |
| Technical | changed: `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/persistence-and-caching.md`, `docs/technical/platform/execution-and-delivery.md`; claim-led structure, factual proof status and precise examples, no new runtime behavior | `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/persistence-and-caching.md`, `docs/technical/platform/execution-and-delivery.md` and affected source maps/inbound links | Exact tested status only with inspected SHA; preserve selected target |
| Code | unchanged because the authorized outcome edits Markdown only: no executable sources, tests, migrations, configuration or provider operation can change | Read actual code only to verify dated realization statements | Negative: executable diff or unsupported test claim blocks completion |
| Related | unchanged because no new canonical route is assumed; change `docs/README.md` and relevant product/technical README if actual headings or paths move | All known reverse claim edges, inbound routes and archive citations | Reasoned dependent disposition and real link/heading checks |

## Acceptance and negative proof

**Normal:** fresh reader can isolate the governing claim, relevant current source evidence, one normal path and adverse branch without inferring proposed behaviors are already available. **Negative:** A duplicated Temporal event creates a second committed result, or a stale cache snapshot overrides a canonical SQL version.

**Stop:** No migrations, source changes, live DB access or invented proof; unsupported source behavior must be reported as discrepancy. Unresolved material claim stays Proposed/Blocked, not quietly edited into accepted canon. No gameplay code or infrastructure changes are authorized. Don't start the next packet automatically.

**Completion evidence:** exact before/after semantic equivalence for selected behavior, revised paths#headings, source/revision for all 'implemented' claims, impact-graph review with explicit unchanged reasons, independent adverse reading, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` plus current docs link checker (only if commands actually executed). A green structural result is not sufficient.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/data-and-persistence.md #heading to verify | technical | pending claim-specific review | no source behavior changed; record doc SHA | not run: Proposed | A duplicated Temporal event creates a second committed result, or a stale cache snapshot overrides a canonical SQL version. | pending inbound/dependent disposition |

**Handoff:** after owner selects this packet, inspect HEAD and its individual authorities, execute this one bounded documentation revision, verify and archive. No implementation Change is automatically approved.
