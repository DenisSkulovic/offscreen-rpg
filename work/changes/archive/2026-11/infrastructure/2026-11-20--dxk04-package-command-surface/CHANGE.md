# DXK04 | Minimal public package command interface and experiment ownership

**State:** Done (2026-11-20). Root scripts no longer expose host turbo dev, Compose boot, or story:local/story:server. Chamber and storyteller experiment commands live on `@offscreen/chamber`. Story inspect uses a read-only Postgres URL and does not call Docker. Compose files remain for DXK06. Live SQL and kind were not run.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Minimal public package command interface and experiment ownership. **Own/edit:** root package.json and package-local tools/chamber, tools/api-integration, script runner entrypoints; script reference docs and tests, excluding CI file and Compose file until DXK05/06.

**Source and technical authority:** existing 63 root scripts on 2026-11-20 main, tools/chamber/package.json, tools/api-integration/package.json, scripts/repo-tools/story-session-report.mjs, AGENTS.md + .agents/README.md command sections. **Prerequisites:** DXK02 new pnpm dev before removing root old dev; DXK01 stack:* interface. Coordinate with DXK06 mode removal, DXK05 CI command consumers.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Implementation checkpoints (details only in TASKS.md)

- **T01 | Evidence-based 63-script disposition ledger:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T02 | Mechanical relocation and non-Compose story tooling:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T03 | Root guard, docs/agent-route reconciliation:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | unchanged because accepted game rules, content rights, and player intent stay as written | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | changed: local boot commands are pnpm dev and pnpm stack:* under docs/technical/platform/deployment-and-compatibility.md | Consistent single origin, owner context, no false multi-Pod correctness |
| Code | changed: tools/chamber/package.json owns the experiment scripts and scripts/repo-tools/story-session-report.mjs uses read-only psql | Discriminating normal and negative from scripts/repo-tools/root-command-surface.test.mjs |
| Related | changed: work/changes/README.md and work/QUEUE.md name the archived command surface | Links and the close guard; Compose file deletion stays DXK06 |

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| One public dev and stack command surface | docs/technical/platform/deployment-and-compatibility.md#local-development | changed: supported boot is pnpm dev and pnpm stack:*; dev:host and infra:up/down/infra are not root scripts | docs/technical/platform/deployment-and-compatibility.md#local-development; package.json; scripts/repo-tools/root-command-surface.test.mjs; base 9dffd2ed | fixture-tested: root-command-surface.test.mjs 2 pass / 0 fail | the test fails if dev:host, infra:up, story:local, or a compose.mjs root command returns | local-development runbook points at the same commands |
| Chamber CLI spelling | docs/technical/lab/experiment-protocol.md#7-client-api-and-workbench | changed: bench, scenario, and inspect are pnpm --filter @offscreen/chamber scripts | docs/technical/lab/experiment-protocol.md#7-client-api-and-workbench; tools/chamber/package.json | fixture-tested: lab-evidence and packet-lab 6 pass / 0 fail after application build | root package.json has no chamber:scenario or chamber:packet key | tools/chamber/README.md uses the same filter commands |
| Story inspect does not use Compose | docs/runbooks/local-storyteller-rehearsal.md | changed: inspection is pnpm --filter @offscreen/chamber story-inspect and requires OFFSCREEN_STORY_DATABASE_URL | scripts/repo-tools/story-session-report.mjs; scripts/repo-tools/story-session-report.test.mjs | fixture-tested: story-session-report.test.mjs 7 pass / 0 fail | missing and non-postgres URLs throw; the planned psql env sets default_transaction_read_only=on; the file has no docker compose call | chamber README names story-inspect |
| Packet command spelling | docs/technical/storyteller/provider-boundary.md | changed: the held-opening command is pnpm --filter @offscreen/chamber packet; custody rules stay | docs/technical/storyteller/provider-boundary.md; tools/chamber/package.json | fixture-tested: packet-lab assertion matches the filter command | root package.json has no chamber:packet key | provider-boundary status paragraph only |
| Audit command spelling | docs/technical/storyteller/request-context-and-cost.md#three-different-caches | changed: the structural audit command is the chamber storyteller-packet-audit script | docs/technical/storyteller/request-context-and-cost.md#three-different-caches | fixture-tested: root-command-surface.test.mjs requires the chamber audit script | root package.json has no storyteller:packet-audit key | same cache section; cost numbers were not edited |
| Trust boundary map | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | unchanged: the boundary map was not edited; provider-boundary only changed the operator command spelling | docs/technical/platform/security-and-trust-boundaries.md#boundary-map; docs/technical/storyteller/provider-boundary.md | unchanged because no trust, custody, or grant rule moved | the security page is absent from the diff | boundary-map remains the owner |
| Product gameplay rules | docs/product | unchanged: this Change does not alter story, time, permissions, or player intent | no source behavior changed for gameplay | unchanged because the diff is root script ownership, a read-only inspect connection, and operator docs | a product page was not rewritten to match the script list | STATUS.md records the command fact and no product heading moved |

**Diff paths named for the close guard:** `package.json`, `tools/chamber/package.json`, `tools/chamber/README.md`, `scripts/repo-tools/story-session-report.mjs`, `scripts/repo-tools/story-session-report.test.mjs`, `scripts/repo-tools/root-command-surface.test.mjs`, `scripts/repo-tools/repair-docker-desktop.ps1`, `packages/application/src/developer-tools/lab/lab-evidence.ts`, `packages/application/src/developer-tools/lab/packet-lab.ts`, `packages/application/src/developer-tools/qa-catalog/storyteller-operations.ts`, `packages/application/src/developer-tools/README.md`, `packages/application/test/lab-evidence.test.mjs`, `packages/application/test/packet-lab.test.mjs`, `packages/storyteller/README.md`, `docs/technical/platform/deployment-and-compatibility.md`, `docs/technical/lab/experiment-protocol.md`, `docs/technical/storyteller/provider-boundary.md`, `docs/technical/storyteller/request-context-and-cost.md`, `docs/runbooks/local-development.md`, `docs/runbooks/kubernetes-developer-ui.md`, `docs/runbooks/content-package-authoring.md`, `docs/runbooks/local-integration-tests.md`, `docs/runbooks/local-storyteller-rehearsal.md`, `docs/runbooks/release-restore-readiness.md`, `docs/runbooks/uncertain-work-recovery.md`, `.cursor/rules/local-infra-unblock.mdc`, `STATUS.md`, `work/QUEUE.md`, `work/IMPLEMENTATION-ROADMAP.md`, `work/changes/README.md`, `work/changes/ledger/2026-11.md`, `work/designs/open/kubernetes-first-developer-experience-2026-11-20/README.md`.

**Remaining:** Live `psql` against the lab database was not executed. Deleting `compose.yaml` and `scripts/repo-tools/compose.mjs` stays with DXK06. QUEUE stays none.
