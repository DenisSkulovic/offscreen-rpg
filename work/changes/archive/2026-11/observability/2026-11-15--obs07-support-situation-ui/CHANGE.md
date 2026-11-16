# OBS07 | Support Situation → Why: first actual investigation screen

**State: Done (2026-11-15, synthetic/disposable scope; no production grant issuer). Evidence: [obs07 receipt](../../../../../../docs/programs/observability/evidence/obs07-support-situation-ui-2026-11-15.md).** Original design state: Proposed. **Dependency:** [OBS06](../../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) **Done and security/coverage proven** before this UI code is authorized. One bounded frontend packet: render the **existing strict S1 SupportSituationV1 response** in the Admin Support workspace, with source-linked explanation and clear evidence gaps. No backend schema/auth grants, raw context, world changes, player replay or Grafana deployment.

**Target:** [Support/Developer human-first interactions](../../../../../../docs/programs/observability/admin-investigator-interactions-v1.md), [S1 read contract](../../../../../../docs/programs/observability/technical/support-situation-and-why-v1.md), [source audit](../../../../../../docs/programs/observability/evidence/obs06-support-situation-source-audit-2026-11-15.md), [React target](../../../../../../docs/engineering/targets/react-next.md). No code authorization from Markdown.

## Cursor first screen

> Given one **real authorized assigned case linked to a campaign**, a nontechnical Support staffer opens the case and sees **What's happening now?**, **Last confirmed developments**, and **Why?**. They can identify a held narration, interrupted action or stale publication and share the **allowed source references** with Engineering. They never open the Developer Context Workbench, browse private prompt bodies or read uncontrolled JSON.
>
> Do not redesign all Admin navigation or copy player story content. This is one measured user journey.

## 1. Existing frontend anchors

- `apps/web/src/features/admin/case-queue.tsx::AdminCaseQueue` currently lists cases and supports basic case creation using category account + optional **player** link. It has **no existing campaign-binding UX**, and case linkage itself is not authorization.
- `apps/web/src/features/admin/player-lookup.tsx::AdminPlayerLookup` already presents campaign and redacted operation IDs/status, useful link patterns but **not** a direct Support case context.
- `apps/web/src/features/admin/admin-query-keys.ts` keys queries by `staffPrincipalId + accessEpoch`; `AdminQueryProvider` clears caches on exit/grant epoch change.
- `apps/web/src/lib/admin-transport` is the typed network boundary; reuse it with strict response validation and signal cancellation. Do not build a second untyped `fetch('/api/...')` wrapper in components.
- Existing admin pages/workspaces are the only navigation authority; do not add a parallel Support application.

**Scope:** enrich the existing Support Cases area with **selection of an assigned case and its source-linked, verified campaign identity**. For a case lacking a verified accessible campaign link/grant, show an ordinary "Investigation not authorized or not yet linked" state, **not** an input that guesses another player's campaign ID. New case-link approval/assignment belongs to a separate trusted workflow, not this UI.

## 2. Minimum useful screen

~~~text
CASE #...        Campaign • authorised S1 metadata only
[CURRENT SITUATION]   Narration preparation held
 Game second: 900 (committed, not projected due time)
 Controlling source: Generation G / capture C
 Latest published passage: #23 (metadata only)
[WHY?]
 ● Action was interrupted (source event E)
 ● Next-scene capture was held during materialization (stage S)
 ● Model attempt: none recorded (coverage, not proof no provider sent)
[RECENT DEVELOPMENTS]
 Published scene  | Accepted action interrupted | Activity advanced ...
[Source links] source type / ID / coverage / last observed
[ESCALATION] Copy safe source references, linked to current case
[CURRENT COVERAGE] Stage receipts since OBS02; historic game state partial
~~~

This is a **synthetic UI copy fixture**, not actual customer data. All source explanations come from `SupportSituationV1.why[].statementCode` and fixed allowlisted templates. Never call an LLM to write the Support conclusion in this V1.

### Required interactions

1. **Choose case:** select from existing authorized case list, show status/assignee and available campaign link. Only launch investigation for an actual **assigned, linked** case; server independently rechecks access.
2. **Situation:** clear current headline from the DTO; indicate updated/revision/clock status. Show "narrative-only" where no mechanical campaign exists, not "stuck".
3. **Why?:** expand 2–6 source-linked facts, with truth kind (Recorded / Derived / Unknown), original stage/receipt ID and source coverage; no raw data.
4. **Recent developments:** display up to 8 meaningful closed event kinds; highlight source selection and avoid spinner loops; no raw title/summary.
5. **Safe source referral:** optionally use a **copy** interaction that copies only allowlisted case/campaign/G/operation/stage/event IDs and coverage; no raw content or auth tokens. No implicit send/export or employee impersonation.
6. **Live/freshness:** use manual Refresh or bounded revalidation, never aggressive constant polling. A pinned view must not silently change while Support is explaining what happened.
7. **Blocked/revoked:** display non-enumerating authorization/closed-case state, clear stale data on grant epoch change and never show protected content already cached under another principal.
8. **Accessibility:** keyboard selection, text source labels/status, semantic list, visible focus and screen-reader error/status. No decorative giant graph or cryptic raw JSON as first UI.

## 3. Data and cache contract

- One TanStack Query keyed by `staffPrincipalId, accessEpoch, caseId, campaignId, 'situation', responseVersion`. **No raw content or case title in query keys**; case title remains separately authorized case metadata.
- Query uses `AbortSignal`, strict `SupportSituationV1` parsing, no SSR prefetch of case/campaign details and no cross-account caches. Admin Query cache flush on logout/epoch preserved.
- Do not reinterpret `attemptCoverage='none-recorded'` as "zero provider charge"; surface exactly the documented safe statement.
- Don't choose controlling G from operation-list order in UI; backend owns that decision.
- Avoid trusting story/public event `title/summary` for copy because the S1 API intentionally excludes it.
- Never synthesize missing stage timeline edges from timestamps or prior fixture-only SA01 spans.
- No new `GET` to a player route using Support session; current source of truth is the separate authorized Admin read.

## 4. Normal/negative tests

| Scenario | UX and data guarantee |
| --- | --- |
| Assigned case and proper trusted scope | Situation and why appear from exactly one S1 response |
| Support v1 without investigator grant | No eligible S1 detail; clear safe disabled state, no silent request with broad Admin token |
| Case with only player link, no verified campaign link | Can't launch campaign investigation; no arbitrary ID entry |
| Closed/reassigned case or expired grant after open | New request denies, stale Query data cleared/not reused |
| Stale G/historical report updated later | UI displays backend selected controlling G, not newest operation as “current” |
| Held before G exists | "Narration intent pending"; no fabricated generation/model round |
| Real G held before provider attempt | Source-backed held + none-recorded attempt coverage, no claimed €0 |
| Interrupted game action | Source event shown, no successful settlement/transfer |
| Output validated but publication stale | Both facts displayed separately, not "scene delivered" |
| Legacy story no OBS02/03 | Partial/not-instrumented explanation, not empty success |
| Body/private prompt sentinel in DB/test fixtures | Sentinel never arrives in S1 data, DOM, clipboard or SSR |
| Server unavailable / slow | Bounded retry/clear error; prior data not mislabeled current |
| Staff principal/accessEpoch changes | No cross-principal cache or stale case disclosure |
| Long case/source history | UI renders bounded list, no full JSON/SQL/trace upload |
| Safe copy | Copies only the allowlisted source references and case ID; no hidden player text |
| Mobile/narrow viewport and keyboard | Readable, accessible route and status labels; no huge observability canvas |
| Replay button in S1 | **Absent**; no game/model operation accidentally triggered |

**Proof:** focused RTL/MSW + existing Admin Query tests + minimal browser/Playwright fixture when available; screenshot of real rendered **synthetic** Support situation; network assertion one authorized S1 fetch and no raw/extra game/providing calls. Note evidence source SHA, platform compatibility, complete negative role/epoch test.

## 5. Exclusions and Ready gate

No new Admin grant or trusted case-binding action (OBS06 owns security), no payments/usage amount, no prompt/source text, no Developer Context Workbench, no raw evidence API, no event-sourcing DB, no historical-state replay, no A/B editor, no new React state management system. No redesign of overall Admin visual-art direction.

**Ready only after OBS06 is Done**, role-specific capability and exact case/campaign scope are demonstrated on a disposable DB, support S1 payload passed redaction tests, owner explicitly selects OBS07, and targeted UI tests are agreed. This is the first actual humane observability surface, not a complete enterprise admin platform.
