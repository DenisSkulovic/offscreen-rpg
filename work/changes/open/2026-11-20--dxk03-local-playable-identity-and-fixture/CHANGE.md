# DXK03 | Secured local login and deterministic playable demonstration

**State:** Partial (2026-11-20). Loopback email/password sign-in and the dev seed script are in source. The kind Job and the browser play-through were not run. Not Done.
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

## Implementation checkpoints (details only in TASKS.md)

- **T01 | Explicitly gated, real Better Auth local identity:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T02 | Idempotent staff bootstrap and pinned content:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
- **T03 | Real UI gameplay and negative checks:** Execute one bounded task via [TASKS.md](TASKS.md) and attach concrete positive/negative proof to the receipt.
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
| `apps/api/src/modules/auth/{auth.ts,config.ts}`, sign-in page | branch `change/dxk03-local-playable` from `7cf6a3c1`; T01 `3d9633e3` | `node --test dist/test/auth-config.test.js dist/test/auth-options.test.js dist/test/auth-email-disabled.test.js` — 9 pass, 0 fail. `https://example.com` with `LOCAL_DEMO_AUTH=1` throws `Invalid authentication configuration: LOCAL_DEMO_AUTH`. Email sign-in while the flag is off is not HTTP 200; a foreign origin is 403. | [Authentication and sessions](../../../../docs/technical/platform/identities-and-access.md#authentication-and-sessions), [local development](../../../../docs/runbooks/local-development.md) | Production/remote refusal is the unit proof. A hosted deploy was not run. |
| `scripts/repo-tools/seed-local-demo.mjs`, `infra/kubernetes/lab/dev/local-demo-seed-job.yaml` | T02 `db6603cd` | `node --test scripts/repo-tools/seed-local-demo.test.mjs` — 5 pass, 0 fail. Missing `LOCAL_DEMO_SEED=1` exits 2. | Seed path named in the identities paragraph. The Job was not applied. | Cluster apply NOT-RUN. No password is stored in the manifest. |
| Disposable email session | integration worktree | `DATABASE_TEST_URL` pathname `/offscreen_auth_test` and `node --test dist/test/auth-local-demo-session.integration.js` — 1 pass, 0 fail. Sign-up cookie reads `/api/me` as that email. Wrong password is not 200. `Origin: https://evil.example` is 403. | Same two doc headings. STATUS records the session only. | A hosted deploy was not this proof. |
| kind lab sign-up and seed | `kind-offscreen-lab`, API image tag `dxk03` | Gateway sign-up HTTP 200. Anonymous `/api/me` was 401 while `POC_OPEN_ACCESS=0`. `seed-local-demo.mjs --s3` exit 0 with the pinned hashes unchanged. Story GET 200 includes two choices. Choice PUT returned 409. `canRespond` is false. | The release shim allowlist includes `LOCAL_DEMO_AUTH`. | Browser email form NOT-RUN. The seed Job was not applied. The packet stays open. |
