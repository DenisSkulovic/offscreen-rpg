# DOC13 | Make lifecycle, compatibility and concurrency recovery independently readable

**State:** Proposed (unselected). **Kind:** documentation. **Editorial wave:** S2b; execute after DOC11 and DOC12, never automatically. **Source baseline:** [editorial register](../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) at `f3e3bfe`; refresh exact HEAD, headings, archived evidence and dirty worktree before selection. **Current change remains:** none.

## Cursor first-screen brief

**Why this Change exists:** Creation, history, offers, fork, retries, generation and recovery decisions occupy dense technical narratives; readers can confuse selected long-term behavior with the ENG03 implemented subset.

**Canonical pages to revise:**
- [docs/product/gameplay/actions-and-commitments.md](../../../../docs/product/gameplay/actions-and-commitments.md)
- [docs/technical/engine/lifecycle-and-compatibility.md](../../../../docs/technical/engine/lifecycle-and-compatibility.md)
- [docs/technical/engine/concurrency-and-recovery.md](../../../../docs/technical/engine/concurrency-and-recovery.md)

Read the [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [execution waves](../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md), and relevant current source/evidence only when factual status is at issue. Never treat a design-only target as shipped.

## Exact intended editorial delta

1. Group state transitions by stable ownership (story lifecycle, command identity, history cursor, effects, fork/compatibility) and give precise retry invariants.
2. Separate implemented short-lock pending-consequence capture from proposed full ENG03 path, using exact current evidence and no upgraded claims.
3. Preserve SQL/DocumentStore staging, generation identity, CAS/publish fences and settlement before/during/after conditional cases. Keep old compatibility behavior linked, not silently deleted.

No bulk formatting, no blanket shortening, no new product policy, no executable edits, no paid provider calls, no new data migration. Move or split only when one canonical responsibility and all inbound anchors can be preserved. Mark a genuinely good subsection reviewed unchanged instead of forcing edits.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical prose refactor may not revise player promises in `docs/product/gameplay/actions-and-commitments.md` | `docs/product/gameplay/actions-and-commitments.md` and their actual dependent headings | Owner ratification required for changed selected meaning; no automatic approval |
| Technical | changed: `docs/technical/engine/lifecycle-and-compatibility.md`, `docs/technical/engine/concurrency-and-recovery.md`; reorganize and qualify target, proof and failure boundaries without modifying runtime contracts | `docs/technical/engine/lifecycle-and-compatibility.md`, `docs/technical/engine/concurrency-and-recovery.md` and source maps as evidence | Exact selected/proposed vs implemented distinction and safe negative trace |
| Code | unchanged because this documentation-only Change authorizes **no** executable source/test/config/schema edit; source reads are evidence only | No code ownership move is planned; review factual source references only | Negative: any application code diff or invented passing test blocks Done |
| Related | unchanged because no file/anchor move is preapproved; repair `docs/README.md` and affected inbound Markdown links only if editorial movement is justified | All known reverse contract edges and meaningful inline links | Structural checker plus independent claim-level review |

## Success and discriminating negative

**Normal:** a reader can locate the selected claim, its governing rationale, its precise status and its negative branch with a bounded route through these owners. **Negative:** An uncertain retry rerolls an already settled reward or publishes an outdated storyteller generation under a new identity.

**Escalation:** Do not rewrite transaction algorithm or code; if status evidence is missing, hold the factual paragraph for review. Keep unresolved normative subsection Proposed/Blocked, while permitting only meaning-preserving edits elsewhere if reviewable independently.

**Proof required:** before/after claim inventory and unchanged-contract list, exact affected path/heading/links, real source evidence for any status correction, negative scenario result, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` when available, plus actual link checker. Mark Done only with an independent adverse-reading review and no unresolved material contradiction. Do not claim semantic correctness from a green structural checker.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/engine/lifecycle-and-compatibility.md #heading to verify at HEAD | technical | pending specific wording/meaning review | no source behavior changed; record doc SHA | not run: Proposed | An uncertain retry rerolls an already settled reward or publishes an outdated storyteller generation under a new identity. | pending dependent links |

**When selected:** update this plan with verified heading anchors; work only this packet, reconcile and archive; do not start the next DOC packet.
