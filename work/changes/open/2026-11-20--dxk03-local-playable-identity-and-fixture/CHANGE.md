# DXK03 | Secured local login and deterministic playable demonstration

**State:** Ready for bounded source implementation when named dependencies hold; not selected, not tested, not Done.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Secured local login and deterministic playable demonstration. **Own/edit:** apps/api/src/modules/auth/{auth.ts,config.ts} narrowly plus scoped auth bootstrap and tests; new dev-only seed Job/tools in infra/kubernetes/lab/dev/; test fixtures and game URLs.

**Source and technical authority:** apps/api/src/main.ts, apps/api/src/modules/auth/auth.ts, tools/api-integration/test/admin-session.integration.ts, scripts/repo-tools/{admin-bootstrap-staff.mjs,import-pinned-fixture.mjs}; TURN03 deterministic turn and BOOT03 state guarantees. **Prerequisites:** TURN02 real authenticated edge, pinned S3 import; TURN03 defines an executable provider-free action whose authoritative state survives retry. No need to wait for paid TURN04.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Executable plan and proofs

- **T01 | Explicitly gated, real Better Auth local identity (PATCH-L):** Decide settled contract: enable Better Auth email/password solely in explicit local-demo profile with loopback APP_ORIGIN, owned kind context/namespace and single local ephemeral secret; GitHub OAuth remains the regular default when configured. Create unique local account via official Better Auth flow and a usable login UI; no forged cookies, anonymous admin, backdoor route or hard-coded permanent shared password. Production env/remote host + dev flag must refuse startup. Tests demonstrate valid session, invalid credentials, CSRF, foreign/anonymous denial and non-demo refusal.

- **T02 | Idempotent staff bootstrap and pinned content (PATCH-L):** Use real authenticated user IDs and existing admin:bootstrap-staff authorization to provision one dev staff identity in owned cluster, not general admin impersonation. Import/verify pinned rule/world/start docs into S3 once; choose rights-cleared/publicly usable demo fixture consistent with selected campaign (do not silently treat Vvardenfell sample as licensed). Seed a selectable campaign/opening through existing application use cases, not direct fabricated game rows. Repeated deploy preserves user, staff grants, story and source hashes.

- **T03 | Real UI gameplay and negative checks (VERIFY/PATCH):** From browser login launch pinned campaign, play one deterministic meaningful action through Nest→private GA→SQL/S3/Temporal→publication, load scene continuation, inspect history and /control. If checkpoint/fork is prerequisite for declared golden scenario, use TURN03's real fixture; no fake response or green synthetic harness substitute. Wrong user denied, failed provider disabled and missing package have honest UI and readiness failure; capture exact browser/SQL/Pod evidence with zero model calls.

**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | No change to accepted game rules, content rights or player intent | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | Local Kubernetes orchestration/developer workflow under docs/technical/platform/deployment-and-compatibility.md and relevant runbook | Consistent single origin, owner context, no false multi-Pod correctness |
| Code | apps/api/src/modules/auth/{auth.ts,config.ts} narrowly plus scoped auth bootstrap and tests; new dev-only seed Job/tools in infra/kubernetes/lab/dev/; test fixtures and game URLs | Discriminating normal + negative from TASKS.md, not guessed execution |
| Related | work catalogs, active README/runbooks and source routes as actually impacted | Links/document check, evidence tier, truthful STATUS claims |

## Reconciliation ledger | fill before Done

| Affected selected owner | Observed source SHA/files | Positive and negative exact commands/result | Docs/evidence reconciled | Remaining |
| --- | --- | --- | --- | --- |
| Not executed / planning packet | 13bcd6cf + GitHub main inspected, local HEAD pending | NOT-RUN; code not changed by this packet | Implementation plan only | All T01-T03 pending |
