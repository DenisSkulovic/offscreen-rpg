# DOC29 | Separate production-readiness and backup/restore proof from local development instructions

**State:** Proposed (unselected). **Kind:** documentation. **Dependency/order:** after WIKI16 supports declared CREATE and DOC28. **Baseline:** clean `781c2fc` lean source; [coverage audit](../../../designs/open/wiki-discovery-coverage/COVERAGE-GAPS.md), [target architecture](../../../designs/open/wiki-discovery-coverage/TARGET-ARCHITECTURE.md), [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md). No code or product-policy ratification is authorized merely by this packet.

## Cursor first-screen brief

**Why this is missing:** Technical deployment doc requires restoring both PostgreSQL and Temporal histories and handling media/document objects. The docs/runbooks tree currently contains local development, ChatGPT ZIP export and historical harness evaluation, not an evidenced safe release/restore procedure.

**Start with actual current owners:**
- [docs/technical/platform/deployment-and-compatibility.md](../../../../docs/technical/platform/deployment-and-compatibility.md)
- [docs/technical/platform/data-and-persistence.md](../../../../docs/technical/platform/data-and-persistence.md)
- [docs/runbooks/local-development.md](../../../../docs/runbooks/local-development.md)
- [docs/runbooks/README.md](../../../../docs/runbooks/README.md)

Do not skim old DOC05–24 archives as if they were live authority. Inspect exact headings and source at HEAD; if the source has moved, correct this packet's paths and affected claims before Ready.

## Designed documentation outcome

1. Write a state-of-readiness checklist: versioned schema compatibility, backup inventory (Postgres, Temporal, immutable document roots, secrets by policy), restore validation, quarantine/known checkpoint, owner approval and replay/charging safety.
2. Classify each step: selected requirement, local fixture/proven, hosted unproven or explicitly blocked. Use no fictional commands or RTO/RPO promise; actual production recovery requires separate owner rehearsal.
3. Crosslink runbooks and technical deployment, preserving separation of human operational procedure vs normative architecture.

Each output must have a **distinct reader question, normative status, unique owner**, normal procedure/example, negative example and exact related links. A new file is only justified when the task cannot be answered economically inside an existing owner. Record *no page created* with a reason if survey disproves the proposed split.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no availability SLA, user promise, account deletion or retention duration is ratified by this guide | `docs/product/README.md` and mentioned selected player claims, including Proposed exclusions | No new rights; require owner ratification for changed meaning |
| Technical | unchanged because Postgres+Temporal disaster recovery is a selected target, not a demonstrated operational procedure; no change to the runtime contract | `docs/technical/README.md` and selected technical/source owners cited above | Status and evidence must reflect source/fixture reality |
| Code | unchanged because no infrastructure manifests, workflow deployments, DB migration or hosted backups are to be changed by this doc | Source path inspection is read-only and not a code-writing permission | Negative: any executable diff or imagined test report blocks Done |
| Related | changed: CREATE docs/runbooks/release-restore-readiness.md with explicit 'NOT TESTED/NOT PRODUCTION RUNBOOK' sections and update runbook/router links; move only durable operational checklist text if necessary | Existing inbound links, docs/runbooks, source-map and work/designs routes as relevant | Review actual created/moved/deleted targets and semantic dependence |

**Planned CREATE note:** where this packet names a new Markdown path, the file intentionally does not exist at design time. **Do not mark Ready until WIKI16's planned-CREATE guard compatibility is landed and checked**, or the owner explicitly revises the packet to an existing-page edit. A misspelled existing path is not a valid CREATE.

## Acceptance and negative proof

**Normal:** a reader can find the exact owner and perform the correct bounded intellectual/task step, or clearly distinguish unselected policy from an accepted rule. **Negative:** A standalone PostgreSQL restore is declared a consistent recovery while Temporal history or document roots are lost; an untested checklist is called a production runbook.

**Evidence:** Source contract review and safe fixture-only negative checklist; no remote/disposable restore assumed to have run. Run actual link/anchor and `wiki:change-guard` checks when selected in a full checkout; record actual command, revision and skipped checks. Independent adversarial reading must verify that the new page did not create shadow product/technical authority.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/deployment-and-compatibility.md governing owner to reverify | product/technical/guide as applicable | pending specific newly authored or unchanged claim | no source behavior changed; exact docs SHA pending | not run: Proposed | A standalone PostgreSQL restore is declared a consistent recovery while Temporal history or document roots are lost; an untested checklist is called a production runbook. | pending new/inbound route |

**Stop:** proposed new gameplay/privacy/security or public API behavior cannot be ratified by writing a document. No auto-selection of next packet. Archive only with unique-claim preservation and complete ledger.
