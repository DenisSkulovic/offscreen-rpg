# TURN03-R2A | Secure, opt-in live HTTP transport

**State:** Done, source-only injected-fetch proof. **Parent:** [TURN03](../../../../open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) remains OPEN. Live OAuth, cluster calls and cross-Pod PASS were not run. **Inspected:** `undertaking/storyteller-workshop@4708408b`, 2026-11-23. **Scope:** distinct infrastructure test utility, not a standalone TURN03 live acceptance.

## Precise source owners
- `apps/api/src/modules/auth/{auth,config,identity}.ts`: Better Auth `baseURL=APP_ORIGIN`, `/api/auth`, trusted origin only; `IdentityService.requireUser` uses session header; cookie is **not** a terminal bearer. `config.ts` admits HTTPS or HTTP loopback origin only.
- `infra/kubernetes/lab/app-release/overlay/edge.yaml`: `APP_ORIGIN=http://127.0.0.1:3000` in lab API; Gateway routes `/api/stories`, `/api/drafts`, `/api/me`, `/api/auth` to API. Cluster DNS is not the host browser origin.
- `infra/kubernetes/lab/app-release/turn03/trace-route.mjs::runPublicRouteTrace`: injected `request(method,path,body)`, frozen IDs; R1 is integrated. Do **not** modify it or `run.mjs`.
- `release-acceptance-preflight.mjs::runReleaseAcceptancePreflightSmoke` read-only by default; release install and fault suite independently gated.

## Selected implementation
**Write:** new `infra/kubernetes/lab/app-release/turn03/live-http.mjs` and `live-http.test.mjs` only. No package changes, Secret reads, cluster calls, story writes, auth changes or report PASS upgrades. Follow scan-first narrated algorithm convention.

Export `createLiveHttpRequest({origin,sessionFile,fetchImpl,allowMutations=false})` that returns a `request(method,path,body)` matching `runPublicRouteTrace`. On construction, parse an operator-owned **external JSON session file** with exactly `{origin,cookie}`. Open with `O_RDONLY|O_NOFOLLOW` and fstat (regular file, current effective uid when available, mode no group/other bits, size <= 4096 bytes); reject symlinks, unreadable files, CR/LF/control in cookie, missing or mismatched origin. Never copy cookie into report, thrown error, URL, debug line or JSON. Limit origin to exact absolute HTTPS origin or HTTP `localhost`/`127.0.0.1` loopback **without username, password, path, query or hash**. Require file origin identical to supplied origin. No automatic OAuth login, cookie minting, persisted tokens or credentials read from Kubernetes.

Allowed targets only relative `/api/drafts/... `, `/api/stories/...` (and optionally `GET /api/me` to verify identity), no network-path URL (`//`), fragments, query, percent-encoded separator/traversal, `.. `, or any other host/path. Allow `GET` read-only by default; `PUT` only when explicit `allowMutations:true` and only on those two route families. Deny POST/DELETE/PATCH by default. Use `fetchImpl` injected; `redirect:'manual'`, `credentials:'omit'` (manual Cookie header), `cache:'no-store'`, Origin header on writes, `Content-Type:application/json` for supplied bodies, fixed timeout/AbortSignal. Treat 3xx, opaque redirect, oversized response, malformed JSON, network timeout/error as sanitized failure (no raw response/body/header leakage); preserve HTTP 401/403 status to caller for R1 `TraceAbort`. Return `{status,body}` as current R1 adapter expects. No retries of any write. Response bound <= 1MiB and parse JSON only when applicable; valid empty 202/204 is null.

**Important authorization distinction:** `allowMutations` allows creating HTTP request capability **within a separately approved test execution**, it is not a live-run CLI or approval to send any requests. This Change's tests **must use injected fake fetch only**, never an actual endpoint.

## Bounded tasks and proof
T01 implement safe session parser/origin/route policy in new module, unit-test regular 0600 file/valid loopback and HTTPS, refuse 0644, symlink, other owner (where testable), wrong origin, malformed cookie, cross-origin, encoded traversal.
T02 implement injected `fetch` request with explicit GET-only default and opt-in PUT; fake-fetch prove exact Cookie+Origin use without token disclosure, no redirects, no raw error body, byte ceiling, one PUT on timeout (no replay), 401/403 preserved, unexpected status safely passed.
T03 run `node --test infra/kubernetes/lab/app-release/turn03/live-http.test.mjs`; existing `node --test infra/kubernetes/lab/app-release/turn03/{run,adversarial}.test.mjs` if current; `git diff --check`; update parent TURN03 execution status without claiming live PASS. Commit/integrate/retire temporary Change branch; archive **R2A** only if pure tests pass. Parent TURN03 stays open.

## Reconciliation ledger

| Claim / document | Delta or no-op | Source SHA and diff | Positive evidence | Negative evidence | Link/status |
| --- | --- | --- | --- | --- | --- |
| Product acceptance | unchanged because this adapter does not start a story or mint a session | `live-http.mjs` on `change/turn03-r2a-secure-http-transport` | owner-only session and GET `/api/me` | 0644, symlink, wrong origin, unsafe cookie | TURN03 stays OPEN |
| API auth contract | unchanged because Better Auth and identity owners were not edited | no auth source diff | Cookie header is manual; credentials omitted | redirect, malformed body and timeout stay sanitized | no login |
| TURN03 execution map | changed: R2A source-only receipt, live gates still blocked | `NEXT-EXECUTION-2026-11-23.md` | 6/6 live-http tests; 12/12 existing route tests | PUT refused until opt-in; one PUT on timeout | parent OPEN |
| Live cluster / cross-Pod proof | unchanged because not authorized | NOT RUN | NOT RUN | fake fetch is not a kind run | R3 not started |

**Hard stop:** If current `runPublicRouteTrace` request contract needs different response data, if secure cookie session format conflicts with the operator handoff contract, or if real OAuth cookie is not valid against selected origin, report exact contradiction; do not add test auth backdoor, bypass redirects, invoke cluster, or implement R3.

**G0–G7:** current source/authority PASS; selected algorithm/negative tests PASS as plan; concurrent write disjoint from R2B and other Changes; no host permission/live OAuth verified, no test executed by planner; conditional G0 local worktree guard. **Implementation-ready for bounded source-only tests, not live operator ready.**