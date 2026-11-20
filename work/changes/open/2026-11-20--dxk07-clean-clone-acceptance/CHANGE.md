# DXK07 | Executable fresh-clone full-system acceptance and user onboarding

**State:** Partial (2026-11-20). The read-only gate is on this branch with current main. `stack-acceptance.mjs check` exited 1 on `kind-offscreen-lab` because the command had no player cookie. A browser on the same origin resumed the existing GitHub session, read the saved Seyda Neen story at revision 2, and was stopped at staff entry. Fresh-clone timing, a new action or fork, Tilt recovery, and the Headlamp desktop click were not run. Not Done.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Executable fresh-clone full-system acceptance and user onboarding. **Own/edit:** scripts/repo-tools/stack-acceptance*.mjs (new), tools/api-integration end-to-end or Playwright tests, docs/runbooks/local-development.md and kubernetes-developer-ui.md, README.md/STATUS.md observed claims.

**Source and technical authority:** DXK01-06 public command/health definitions; TURN03 golden campaign proof; docs/technical/platform/deployment-and-compatibility.md and docs/runbooks/kubernetes-lab.md. **Prerequisites:** All DXK01-06 replacement work, TURN02 real release, real provider-free gameplay route. This Change writes executable regression harness; final operator run is separate standalone Task.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Implementation checkpoints (details only in TASKS.md)

- **T01 | Cold/warm command acceptance harness:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T02 | Real browser, UI and restart proof:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T03 | Canonical onboarding and measured evidence:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | No change to accepted game rules, content rights or player intent | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | Local Kubernetes orchestration/developer workflow under docs/technical/platform/deployment-and-compatibility.md and relevant runbook | Consistent single origin, owner context, no false multi-Pod correctness |
| Code | scripts/repo-tools/stack-acceptance*.mjs (new), tools/api-integration end-to-end or Playwright tests, docs/runbooks/local-development.md and kubernetes-developer-ui.md, README.md/STATUS.md observed claims | Discriminating normal + negative from TASKS.md, not guessed execution |
| Related | work catalogs, active README/runbooks and source routes as actually impacted | Links/document check, evidence tier, truthful STATUS claims |

## Reconciliation ledger | fill before Done

| Affected selected owner | Observed source SHA/files | Positive and negative exact commands/result | Docs/evidence reconciled | Remaining |
| --- | --- | --- | --- | --- |
| `scripts/repo-tools/stack-acceptance.mjs`, root `stack:acceptance` | branch `change/dxk07-clean-clone-acceptance` merged with main `39364aad`; context `kind-offscreen-lab`; Node v24.19.0; pnpm 11.19.0; kind v0.33.0; kubectl v1.37.2; Tilt v0.35.2 | `node --test scripts/repo-tools/stack-acceptance.test.mjs` — 15 pass, 0 fail. Live `node scripts/repo-tools/stack-acceptance.mjs check` exit 1, `dataReset=false`, peakMemoryKib 51108. Diagnostics named only the missing player, story, and checkpoint. `game-migrate` succeeded=1. Anonymous `GET /api/me` and the known story GET were 401. Browser “Continue with GitHub” resumed the existing session to `/stories`, then `/play/7a1fe4f6-8613-4a7d-916b-136ffb1c8fa3` showed revision 2, passage `8655f74d-9f93-541e-84e5-0f6d4c53bdc2`, “Ask about the road to Balmora”, `balmora-route-known` true, location `seyda-neen`, septims 0. `/control/enter` said the session is a player and staff needs an enrolled principal. Unit negatives: health-only, foreign context, missing `game-web`, failed migration, port conflict, `0.0.0.0`, Compose boot, staff-as-player, warm identity loss, `--reset`, `--execute`, browser `/health` only, wrong actor HTTP 200 | [local development](../../../../docs/runbooks/local-development.md), [Kubernetes developer UI](../../../../docs/runbooks/kubernetes-developer-ui.md), [deployment and compatibility](../../../../docs/technical/platform/deployment-and-compatibility.md#local-development), STATUS, README | New action, fork, Tilt recovery, Headlamp desktop, and fresh-clone durations NOT-RUN. Packet stays open. |
