# OBS06 | Case-scoped Support Situation → Why read (2026-11-15)

**Change:** [OBS06](../../changes/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) · **Contract:** [support-situation-and-why-v1](../technical/support-situation-and-why-v1.md) · **Base source:** `main@7a7ee811` + working tree · **Provider spend:** zero (no model/network call; disposable `offscreen_auth_test` only).

**Outcome: Done in synthetic/disposable scope. Production grant issuance remains unsupported** (see Honest limits). OBS07 not started.

## What landed

| Piece | Location |
| --- | --- |
| Capability `forensics.campaign.situation.read` (resource kind `campaign`) + NEW package `support-investigator` v1 (one grant). `support-operator` v1 unchanged | `packages/application/src/admin/registry.ts` |
| Strict case+campaign binding in the pure evaluator: exact non-empty `scope.campaignIds`, `requireAuthorizedCaseAssignment=true`, `provenance.kind=steward-case-binding`, `provenance.authorizedCaseIds ∋ caseId`; all in ONE assignment | `packages/application/src/admin/policy.ts` |
| `SupportSituationV1` strict Zod (arrays capped 8 / 6 / 12, closed enums, no free text) | `packages/contracts/src/admin.ts` |
| Read service: one `REPEATABLE READ / READ ONLY` snapshot, explicit safe columns, re-verifies case status/assignee/link/story | `packages/application/src/admin/situation-reads.ts` |
| `GET /api/admin/cases/:caseId/campaigns/:campaignId/situation`, `Cache-Control: private, no-store` on every response incl. 404 | `apps/api/src/modules/admin/controller.ts`, `apps/api/src/app.ts` |
| Suite registered for `pnpm test:focus admin-situation` | `scripts/repo-tools/focused-integration.mjs` |

Gate order (all server-side, every denial is the same privacy 404): staff session → `case.summary.read` on caseId → `forensics.campaign.situation.read` with `{campaignId, caseId}` → in-snapshot `admin_case.status='assigned' ∧ assignedStaffId=actor` → `admin_case_link(campaign, campaignId)` → `story` row.

`case create/assign` code is untouched and still does **not** write `admin_capability_assignment` (asserted by row count in the test). A self-created link is a reference only.

## Selection / disclosure policy

Never selected: `generation.input/output`, `story.source/premise`, `campaign.character/storyFacts/worldConditions/content`, `story_passage.content/response`, `game_action_receipt.plan/effects/outcomeText`, `story_public_event.title/summary`, `storyteller_prompt_provenance.manifest`, any hash/cost column. GM05 events expose only type, sequence, game second, created-at and a typed source ref. Failure text passes an allowlist; anything else becomes `failed`. Why statements come only from the closed code list; `model_attempt_unverified` is emitted instead of "model never ran" unless an OBS02 `stage-skipped/not-run/scripted_execution` row proves skip.

## Proof (commands actually run)

```text
pnpm --filter @offscreen/contracts build ; pnpm --filter @offscreen/db build
pnpm --filter @offscreen/application build ; pnpm --filter @offscreen/api build
node --test packages/application/test/admin-policy.test.mjs                 # 15 pass (7 new OBS06)
pnpm test:focus admin-situation                                              # 3 pass
pnpm test:focus admin-policy | admin-cases | admin-diagnostics | admin-session | admin-audit | admin-player-reads   # each 1 pass (regression)
npx eslint <touched admin/contracts/api/test files> --max-warnings 0         # clean
pnpm --filter @offscreen/web exec tsc --noEmit                               # clean
```

| Required case | Test (`tools/api-integration/test/admin-situation.integration.ts`) | Result |
| --- | --- | --- |
| support-operator only denied | auth test step 1 | 404 |
| investigator + assigned + exact steward grant allowed; strict DTO rejects extras | step 2 | 200, parses |
| foreign self-created case+campaign link (via real `POST /cases` + `assign`) denied | step 3 | 404; assignment count unchanged |
| case-only vs campaign-only grants cannot compose; empty `campaignIds`; missing flag; `case-create` provenance | step 4 + 7 unit cases | deny |
| closed / open / reassigned case; revoked / inert / wrong-environment grant | steps 5–6 | deny, then allowed again when restored |
| grant exact but case lacks campaign link (player link only) | step 7b | 404 (mutation of the link check made this test fail) |
| missing story, malformed UUID, no staff cookie | steps 7–8 | 404 / 400 / 403 |
| narrative-only | states test | `narrative-only`, `source_data_unavailable`, no G |
| `storyteller-intent` before G | states test | `narration-intent`, `activeGeneration=null` |
| held G; newer historical published G is not selected; 15 stages → 12 + `partial` | states test | controlling = held G |
| scripted provider skipped vs attempt-unverified | states test | distinct `why` codes |
| succeeded G with `pending/published/stale/blocked` publication | states test | four distinct statuses; stale ⇒ no `published_passage`, frontier unchanged |
| invalid_output / free-text failure | states test | `invalid_output` / `failed` |
| interrupted action | states test | `action_interrupted`, no `action_settlement_recorded`, 10 events → 8 |
| hold + active action shown separately; multi-hold; foreign G in hold; corrupt holds | states test | `decision-hold`+commitment / `conflicting-sources` / no G detail / `unknown` |
| sentinel absent in every response (`story.source/premise`, character, facts, world, generation input/output, capture, passage content, GM05 title/summary, action plan/label) and forbidden key names absent | `read()` helper on every GET | pass |
| GET zero writes | before/after fingerprint (counts + md5 of campaign/generation/capture/story rows, outbox, audit) | equal |

### Query / row cost (synthetic disposable fixture, not an SLO)

Small world (3 passages, 3 stages) vs large (2,000 passages, 400 public events, 1,000 filler generations, 40 stages on the current G):

```text
OBS06_PERF small  queries=27 p50≈27ms max≈43ms
OBS06_PERF large  queries=27 p50≈32ms max≈43ms   (identical query count)
plans: passage=Limit>Index Scan  events=Limit>Sort>Bitmap Heap/Index Scan  stages=Limit>Incremental Sort>Index Scan
```

27 is the whole HTTP request (Better Auth + admin session + three grant lookups + ~17 statements for the one snapshot). Returned rows are capped at 8 events / 12 stages / 6 why regardless of history. No N+1, no history enumeration, no `loadCampaignLinkedGenerationIds`.

## Honest limits

- **No production grant issuer exists.** The only way to mint a `steward-case-binding` assignment today is out-of-band SQL/fixture (the test acts as the trusted steward). No endpoint, case action or UI creates one; adding an issuer is a separate reviewed Change. Until then the route is unreachable in production by design.
- Assignment rows have no expiry column; revocation (`status='revoked'`) and environment are enforced, absolute expiry is not.
- The `support-investigator` holder also needs `case.summary.read` (e.g. an existing `support-operator` assignment); the new package deliberately carries only the single grant.
- `mechanicalHistoryCoverage/gameHistory` is `partial` when GM05 events exist else `not-instrumented`; never `complete`.
- Stage `failureClass` and capture/publication failure codes are collapsed to the allowlist; original free text is not shown by design.
- Concurrent-publication consistency relies on the Postgres snapshot; no multi-session race test was added.
- Activity "development" events only appear as GM05 `activity-event` refs; no activity-specific Why code in V1.
- No browser/SSR proof: this Change has no React surface (OBS07).
