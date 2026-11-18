# DOC28 | Create a safe local diagnostic runbook for uncertain Storyteller and workflow operations

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** after WIKI16 supports declared CREATE. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** Uncertain paid attempts, SQL/Temporal divergence and short-lock publication require different recovery rules. Details are scattered in technical documents and code; HK01 was blocked because an existing repair CLI is the only safe way to settle some local uncertain attempts.

**Start with actual current owners:**
- [docs/technical/platform/execution-and-delivery.md](../../../../docs/technical/platform/execution-and-delivery.md)
- [docs/technical/storyteller/provider-boundary.md](../../../../docs/technical/storyteller/provider-boundary.md)
- [docs/technical/engine/concurrency-and-recovery.md](../../../../docs/technical/engine/concurrency-and-recovery.md)
- [apps/worker/README.md](../../../../apps/worker/README.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Write a READ-ONLY first-response decision tree: identify story/operation/generation/attempt, exact current source, persisted receipt, pending/outbox/Temporal status, provider usage uncertainty and which system owns truth.
2. Separate authorized local disposable investigation from production/staging instructions. Identify when to HOLD, record 'unknown' or escalate instead of automatic redrive; include HK01 CLI's supported evidence gate.
3. For each branch, cite the authoritative technical heading and actual read command only if verified safe and no side effects. Do not invent repair/delete/charge API. Mark advanced operational steps explicitly untested.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player guarantee or auto-retry policy can be decided by an operator how-to | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because the exact SQL/outbox, Temporal, generation and provider custody fences remain in their technical owners; guide is only a safe procedure and status check | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because this runbook is documentation-only and forbids worker dispatch, provider spend, DB mutation or custom repair code | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/uncertain-work-recovery.md and add docs/runbooks/README.md task route; link selected technical docs and active blocked HK01 recovery warning | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** An ambiguous provider send is blindly retried, a saved mechanical receipt is rerolled, or restored SQL alone is asserted to reconstruct lost Temporal work.

**Evidence:** Dry-run/read-only trace and two planted ambiguity examples; no remote commands, provider calls or mutation. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/execution-and-delivery.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | An ambiguous provider send is blindly retried, a saved mechanical receipt is rerolled, or restored SQL alone is asserted to reconstruct lost Temporal work. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
