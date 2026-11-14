# Admin technical verification | attack matrix, proof levels and safety gates

**Status:** Selected target proof program, 2026-11-14, **not yet executed**. Product: [accepted design](../product-acceptance-and-scope.md) and [adversarial risk register](../product-adversarial-review.md). Technical: [staff authorization](staff-identity-and-policy.md), [read models](read-models-and-privacy.md), [actions/audit](action-approval-and-audit.md), [frontend](frontend-and-operator-experience.md).

## 1. Proof must follow the real boundary

Tests must distinguish:
- **V0:** pure type/policy/domain tests without DB or network.
- **V1:** Next and API component tests with controlled fakes for normal/denial/failure UX, no provider.
- **V2:** disposable PostgreSQL integration for auth + policy + typed query + audit + concurrency.
- **V3:** real composed Nest + Next browser integration with isolated sessions and network assertion.
- **V4:** production-like security/exposure review and operational drill, **explicit approval required**; not a background CI claim.

**Never call paid model providers or real payment processors for routine proof.** Use fake deterministic provider/usage records. The repo's `pnpm test:focus` resets a specifically disposable `offscreen_auth_test` DB; it is not a harmless code formatting command. See [integration harness warning](../../../tools/api-integration/README.md) and inspect exact environment before running.

## 2. Threat model by actor and attempted crossing

| Threat | Boundary | Mandatory negative case |
| --- | --- | --- |
| Anonymous -> Admin | HTTP/SSR staff gate | No Admin HTML, JSON, role names, account list or sensitive search suggestions |
| Authenticated player -> Admin | Staff principal/session | Player cookie alone cannot enter or call Admin APIs |
| Staff with one narrow grant -> unrelated account | Resource scope and environment | Search/GET/deep link with guessed ID reveals no protected existence/content |
| Staff with overlapping packages -> global mutation | Bounded grant evaluator | A case-limited write plus global analytics read never yields global write |
| Case self-assignment -> new privilege | Case policy/source of authority | Creating/assigning case doesn't permit sensitive reads/grants on protected target |
| Staff after revocation -> cached content/action | Access epoch and real API evaluation | Old Next pages, tabs, queued operations and streams cannot preserve usable access |
| Staff -> other participant private story | Field-level data release and source visibility | One campaign link doesn't disclose another member's private narration |
| Engineer -> raw prompts | Separate sensitive evidence authority | Metadata trace available but prompt/output unavailable, even via derived summary |
| Marketing -> small private cohort | Aggregate disclosure/export policy | Tiny segments cannot infer protected subject/characteristics |
| Audited writer -> unauthorized undetectable effect | Transactional audit/action boundary | Audit persistence failure refuses sensitive write |
| Browser -> duplicate irreversible action | Intent idempotency and receipt | Lost ACK, refresh and concurrent tabs cannot execute a new grant/refund |
| Approval requester -> own approval | Separation of duty | Same human via second session/account cannot self-approve high-impact change |
| Control plane -> world engine | Domain command ownership | Admin cannot bypass game receipt/time/rules via direct storage patch |
| LiveOps -> spending without true dispatch stop | Provider admission/dispatch | Paused new spend actually prevents dispatch with worker race |
| Admin session -> secrets | Redacted DTOs/logs | OAuth tokens/cookies/API keys never appear in RSC, JSON, logs or audit |
| Deleted/retained data -> false completion | Processor/state provenance | Privacy workflow shows partial and lawful-retention exceptions |

## 3. V0 pure policy specification tests

Build table-driven tests around complete grants:
1. Matching action/resource/scope/conditions/expiry -> allow.
2. Missing staff principal, expired session, suspended user or missing privilege -> deny.
3. Package A case-only grant + Package B global analytics -> never global compensation.
4. Environment mismatch, revoked grant, spend cap exceeded, unknown capability -> deny.
5. Assigned-case is needed but assignment self-created or unauthorized -> deny.
6. Consent/approval/assurance required but missing -> required/deny; no accidental allow.
7. Sensitive field independently restricted when summary access succeeds.
8. Same person acting as employee and player -> protected conflict path.
9. Approval bound to changed target/delta/version -> invalid.
10. A shared campaign with multiple participants never automatically broadens one participant's account scope.

These tests must include **positive examples** so policy does not become "deny everything".

## 4. V2 database and HTTP proof

- **Staff bootstrap:** a verified subject is explicitly granted minimum staff access; repeated bootstrap, guessed email and nonexistent identity do not create privilege.
- **Auth/session:** distinct Admin purpose, revocation/expiry, CSRF/origin, nonstaff, replay and assurance fail closed.
- **Account search:** exact ref and bounded paging; scope applied before count/sort/return; nonexistent vs forbidden target response does not leak protected metadata.
- **Read DTO:** raw OAuth tokens, `generation.input/output`, narrative passages and hidden Trust fields never serialize in basic summaries.
- **Legacy owner relationship:** `story.ownerId` produces valid single-owner summary without invented multiplayer/currency.
- **Missing billing:** Admin returns explicit unsupported or unknown, not a false paid/free assertion.
- **Staff changes:** privilege revocation causes next API/SSR fetch denial, including concurrent sessions.
- **Audit:** successful/denied privileged actions produce attributable record; cannot edit past events; sensitive-read precondition fails closed when audit unavailable.
- **Concurrent mutation:** pending approval becomes stale, idempotent same-action replay, conflict on body reuse, no two financial/game outcomes.
- **Provider uncertainty:** mock attempt may have been billed; re-query original receipt rather than duplicate model dispatch.
- **Cross-domain source:** status links to exact technical records with authoritative timestamps and coverage.

The first foundation wave can prove **only the relevant subset**. Do not claim future refund/repair/live-stop behavior proved by a test of the policy evaluator.

## 5. V3 browser and SSR proof

Use an authenticated real Nest + Next + disposable DB browser:
- Anonymous, player-only, active staff, limited staff, suspended staff.
- Direct route, SSR HTML, JS hydration, client Query cache, soft navigation, back-forward and a stale tab after revocation.
- Open `/control` as active staff → safe summary; as player-only → no privileged HTML or prefetch.
- Simultaneous A/B user sessions → no cross-user records, query cache, RSC or `history.back` leakage.
- Role/case assignment changes while an operator is viewing a Player 360 → old privilege cannot be reused on detail/operation links.
- Operator uses keyboard to reach search, permission messages and account detail; no trapping modal or inaccessible action.
- Missing API or DB → honest unavailable state, **not** "no players", zero cost or successful audit.
- Developer Chamber remains unavailable under normal production API composition.

A mocked role badge, isolated React component test or network stub **cannot** substitute for this integration proof.

## 6. Cost and observability test policy

Tests should make no real paid provider requests. A fake provider should record attempted dispatches, requests and intended charges so the team can assert:
- Admin GETs and Player Preview cause zero model calls and zero fictional-state mutations.
- A future stop gate actually prevents new cost-bearing provider dispatch after activation.
- Accepted/settled game receipts remain unchanged if AI work is blocked.
- A late provider callback is reconciled and doesn't trigger double spend.
- Technical window allocations are not treated as paid subscription balances.

If the stop semantics cannot be proven at the real worker dispatch seam, the LiveOps emergency control remains **blocked**, regardless of how complete its React button looks.

## 7. Evidence and sign-off for a Change

Every implemented packet must return:
- exact changed source files and relevant routes/contracts;
- positive and negative assertions;
- tests/commands **actually executed**, with precise results;
- whether a disposable DB was reset and which one;
- provider spend, if any (default **none**);
- outstanding source drift, assumptions, risk and next dependency;
- whether acceptance is V0-only, V2 DB, or V3 browser;
- compatibility with existing player story operations and Next SSR privacy.

**Security acceptance is capability-specific.** A reader can ship with tested permission-aware summaries before a commercial refund subsystem exists, but there can never be a sensitive write first and its authorization/audit "later".

## 8. Gates beyond initial operator read-only

- **Hosted commercial Admin:** MFA/assurance, account recovery, incident response, secret/access controls and production security testing.
- **Sensitive narrative read:** documented lawful purpose/consent/notice if required, access audit before disclosure and source preservation.
- **Assisted player write:** explicit action allowlist, actor attribution, consent/participant impact and cost policy.
- **Commercial money movement:** accepted plan/refund policy, provider integration idempotency/reconciliation, legal/accounting review.
- **Game repair:** exact repair classification, authorization, participant impact and mechanical correctness proof.
- **Live cost stop/rollout:** actual worker admission/dispatch verification, in-flight behavior and scenario tests.
- **Trust/privacy data rights:** qualified policy review and correct external processor/retention handling.

No abstract "security tested" checkbox replaces these proofs.
