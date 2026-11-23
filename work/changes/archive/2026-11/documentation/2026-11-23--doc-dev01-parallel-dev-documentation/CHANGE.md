# DOC-DEV01 | Human-first developer environment documentation reconciliation

**State:** Done, documentation-only. **Commissioned by owner:** 2026-11-23. **Integration target:** `undertaking/storyteller-workshop`. **Source baseline:** `d9a2c11ea3450972c21f90fa9566821848cb5f4e`. **Execution branch:** `docs/dev-environment-human-and-technical-reconciliation`. Final integrated SHA is in the Git PR/ledger and should be recorded as the immutable retirement locator before pruning this packet.

## Goal and material documentation impact

A new human should understand why three Cursor coding agents need separate source and environment identities in two minutes. A coding agent should find one technical architecture owner and one command runbook, without mistaking an unintegrated image-generation repair or DXK10's reservation-only design for implemented behavior.

| Surface | Disposition | Reason |
| --- | --- | --- |
| Product docs | unchanged | No player behavior or game design altered |
| Technical contracts | **created** `docs/technical/platform/developer-environments.md` | One selected image/deployment owner, lifecycle, admission/rollback invariants, explicit implementation/proof separation |
| Human architecture | **created** `docs/architecture/10-developer-environments.md` | Two small Mermaid diagrams of environment isolation and resource lifecycle, plus a failure decision chart and plain-language roles |
| Operational runbooks | **updated** `docs/runbooks/dev-worktree-stacks.md`, `local-development.md` | Correct current root `pnpm dev` ownership, v2 selectors vs DXK10 targets, stop safety and image conflict |
| Repository entry routes | **updated** `README.md`, `ENGINEERING.md`, `docs/{README.md,architecture/README.md,technical/README.md,runbooks/README.md}`, `AGENTS.md` | Link the human → technical → command → evidence path |
| Status and coordination | **updated** `STATUS.md`, DXK09 and DXK10 Change intros, undertaking `OVERVIEW.md` and `NEXT-WAVE.md` | Explicit integrated `d9a2c11e` versus unintegrated local `e93f33c7`; retain existing ~65/40/25/40% estimates and ~20pp uncertainty |
| Executable code and live resources | unchanged | No Docker, Tilt, Kubernetes, SQL/S3/Temporal, process, secret, or Cursor code branch mutation |

## Document shape | shape-ops.v1

- **CREATE:** one illustrated explanation under `docs/architecture/`, linking to exactly one canonical developer-platform technical contract.
- **CREATE:** one selected technical contract under `docs/technical/platform/`, retaining code/source/proof distinctions.
- **UPDATE:** existing runbook in place; do not fork its command authority.
- **UPDATE:** linked human/agent navigation and current checkpoint. Historical undertaking notes are retained below a prominently labeled history boundary.
- **RETIRE:** no physical page removed; stale authority statements replaced rather than deleting unique historical constraints.

## Migration receipt | shape-receipt.v1

- The earlier `local-development.md` claim that root `pnpm dev` starts the release lab has been corrected. Release `stack:up` is no longer presented as a universal prelude to developer `pnpm dev`.
- The DXK09 opening status that still held T05 and prohibited already-proven tenant provisioning has been replaced with a dated current-state distinction. Its historical sections remain intact.
- The dev-stack runbook now begins with a current command matrix and marks `dev:new` as allocate-**and**-start. Reservation-only and minimal profiles remain planned DXK10 operations.
- The undertaking's rough progress table moved from deep in the dated chronology to the first screen, with unchanged percentages. Dated notes remain retrievable.
- In-flight Cursor `e93f33c7` is **reported local failure evidence**, not assumed reachable GitHub source, passing acceptance, or integrated functionality.
- The selected new image contract does not duplicate proof and expressly prohibits the image loader from patching active Deployments. Detailed DXK09 receipts remain owned by `PROOF.md`.
- New human/technical documents have checked relative path resolutions to the runbook, DXK09/DXK10, STATUS and existing program map. Full `pnpm wiki:health`, docs-health, Markdown rendering and Mermaid parser checks are **NOT RUN** in the GitHub-only authoring environment; no green claim is manufactured.

## Reconciliation and remaining limits

**Open:** DXK09's single Tilt Deployment writer is an accepted **target**, not yet integrated code. Unattended image/current-generation, full fresh-worktree gate, live negative compile, and relay workflow-task proof remain pending. DXK10 selective service activation is not executable. Four-full-stack capacity, OAuth and cold release tests remain separately open. These are implementation and proof gates, not documentation omissions.

**Close criterion:** human overview, one technical owner, accurate runbook, source/status distinction, links through entry indexes, and no material player-contract changes. Document-only Change completed on its own branch; does not authorize infrastructure mutation or mark DXK09 Done.

