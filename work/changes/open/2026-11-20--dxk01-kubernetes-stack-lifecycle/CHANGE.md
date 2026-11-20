# DXK01 | Safe one-command-capable Kubernetes stack lifecycle

**State:** Ready for bounded source implementation when named dependencies hold; not selected, not tested, not Done.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Safe one-command-capable Kubernetes stack lifecycle. **Own/edit:** scripts/repo-tools/stack-*.mjs (new), infra/kubernetes/lab/dev/ (new), infra/kubernetes/lab/{lib.sh,kind.yaml} narrowly; root stack:* entries after DXK04 coordination.

**Source and technical authority:** existing infra/kubernetes/lab/up.sh,down.sh,lib.sh,kind.yaml; TURN02 T04 release manifests and Jobs; docs/technical/platform/deployment-and-compatibility.md. **Prerequisites:** TURN02 real release T04 and its migration/content Jobs in place. Implement scaffolding/static negatives earlier, but do not claim live READY before TURN02 T05/T06.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Executable plan and proofs

- **T01 | Guarded preflight and ownership (PATCH-M):** Read infra/kubernetes/lab/{up.sh,lib.sh,kind.yaml} and TURN02 T04. Implement one Node24 CLI/bootstrap runner that verifies pinned prerequisites, Docker daemon, kind context ownership, WSL available memory, loopback port availability and resource profile. Do not switch foreign contexts or delete volumes. Negative tests: wrong context and occupied port refuse before mutations.

- **T02 | Idempotent reconciler and lifecycle (PATCH-L):** Implement stack:up, stack:status, stack:down and explicitly confirmed stack:reset against the **single** selected app release; no duplicate manifests. Reapply stable resources and wait for migration/import Jobs with pinned roots, preserve SQL/S3 on warm startup, no orphan port-forward process or false URL on detached run. Stop/down default only touches labeled owned resources, preserve cluster data; reset demands exact context and explicit typed confirmation. Wrong-root/migration-failure reports nonzero.

- **T03 | Three-layer health and disaster negatives (VERIFY/PATCH):** Report cluster, service and playable fixture readiness separately, with actionable namespace/Pod/Job/log diagnostics. Inject missing pinned object, dead GA/worker, failing migration and repeat start; check no READY on failed gameplay, no data reset, no external port. Record WSL memory and cold/warm durations. Only claim kind proofs when actual Pods used.

**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | No change to accepted game rules, content rights or player intent | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | Local Kubernetes orchestration/developer workflow under docs/technical/platform/deployment-and-compatibility.md and relevant runbook | Consistent single origin, owner context, no false multi-Pod correctness |
| Code | scripts/repo-tools/stack-*.mjs (new), infra/kubernetes/lab/dev/ (new), infra/kubernetes/lab/{lib.sh,kind.yaml} narrowly; root stack:* entries after DXK04 coordination | Discriminating normal + negative from TASKS.md, not guessed execution |
| Related | work catalogs, active README/runbooks and source routes as actually impacted | Links/document check, evidence tier, truthful STATUS claims |

## Reconciliation ledger | fill before Done

| Affected selected owner | Observed source SHA/files | Positive and negative exact commands/result | Docs/evidence reconciled | Remaining |
| --- | --- | --- | --- | --- |
| Not executed / planning packet | 13bcd6cf + GitHub main inspected, local HEAD pending | NOT-RUN; code not changed by this packet | Implementation plan only | All T01-T03 pending |
