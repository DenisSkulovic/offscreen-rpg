# S4 | Implement one guarded Support read, then prove the human UI

**Execution boundary:** the owner's Cursor kickoff must **explicitly select/authorize OBS06 and OBS07 sequentially**, with the exact narrow S1 case+campaign policy in [OBS06 technical contract](../../technical/support-situation-and-why-v1.md). If the kickoff authorizes **only** evaluation, do an **evaluation-only** Admin access audit and leave both Changes Proposed. Never assume Markdown or a case link authorizes new staff privilege.

## 1. Establish existing Admin behavior first

Read only:
- [OBS06 Change](../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md) first screen and [source audit](../../evidence/obs06-support-situation-source-audit-2026-11-15.md).
- `packages/application/src/admin/{registry,policy,access,case-writes,diagnostics-reads}.ts` and `apps/api/src/modules/admin/controller.ts`; use narrow symbol search, not whole files.
- Existing test `tools/api-integration/test/admin-{policy,cases,diagnostics}.integration.ts`, and `apps/web/src/features/admin/{case-queue,player-lookup}.tsx` only when UI starts.

Run provider-free baseline, one suite at a time because `test:focus` destroys/recreates only `offscreen_auth_test` and uses ports:

~~~sh
pnpm test:focus -- admin-policy
pnpm test:focus -- admin-cases
pnpm test:focus -- admin-diagnostics
~~~

**Capture actual status** and a small authorized vs denied fixture response. No staff creation or grant mutation outside the designated disposable local test DB.

## 2. OBS06: make exactly one source-based S1 endpoint

Only if kickoff explicitly authorizes this code Change and current source/policy gates pass:
1. Update `work/changes/README.md` single `Current change:` to OBS06, mark its Change **Ready/Implementing** at proper stages. **One active Change only**.
2. Implement the strict `SupportSituationV1` read projection and case-bound Nest GET from [OBS06 Change](../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs06-case-scoped-situation-read/CHANGE.md), reusing existing Admin controller/contract/service architecture. **Do not** rewrite current game read or import raw task context.
3. Add the **closed, separately assigned** `forensics.campaign.situation.read` capability and `support-investigator-v1` package exactly as designed. **Do not silently grant it** to existing `support-operator-v1` or all staff.
4. Enforce **the same trusted assignment** binding exact active assigned `caseId + campaignId`, environment, scope and grant provenance. A case-creator's arbitrary `admin_case_link` is **not** permission. No case auto-assignment, no self-approval, no cross-grant Cartesian product.
5. For disposable tests only, use a synthetic legitimate test principal/staff session and **explicit fixture-issued grant** from a trusted test/steward setup. **Do not** add an automatic production grant issuer merely to make the green test easier. If no real source-backed authorized case/campaign binding can be defined, stop OBS06 as **Blocked** with a negative test and precise unimplemented grant-steward prerequisite, then continue evaluation-only S5/S6.
6. Query **minimal safe columns** from story/current campaign/holds, exact G and stage/publication/attempt, max eight GM05 event IDs/types and at most 12 stage rows. Strictly omit player prose/hidden world/`generation.input/output`/`prompt provenance manifest`/cost/body.
7. Generate ≤6 `Why` statements **only from recorded source** or validated deterministic rules; source IDs + covered/unknown dimensions. No LLM summary, no “model ignored a fact” claim.
8. Query bounded and consistent current state. Last `generation.updatedAt` is **not** current G; historical report can be newer. Stage timestamp is stable display, not causal total order.

**Testing S1:** add focused strict DTO, Admin policy, Nest and disposable SQL tests. Required negative cases: foreign case linked by its creator, separate case+campaign grants, revoked/expired staff, mismatched owner/G, narrative-only story, interrupted action, held G, stale publication, sentinel raw prose. Verify **response contains no sentinel** at JSON/SSR/log boundary, not merely CSS hidden.

Only if normal+negative tests and row/SQL-cost proof pass: set OBS06 **Done**, write a source-linked `evidence/runs/observability-program-2026-11-15/obs06-...md` **actual** evidence receipt, clear `Current change` to none and commit/push. Otherwise **Blocked/Verifying** with exact reason. **Do not start OBS07 while OBS06 lacks source-backed Done proof**.

## 3. OBS07: build a small actual Support screen

Once OBS06 is Done **and** kickoff explicitly authorizes OBS07:
1. Set exactly OBS07 active; read [its Change](../../../../../work/changes/archive/2026-11/observability/2026-11-15--obs07-support-situation-ui/CHANGE.md) plus `apps/web/src/features/admin/{case-queue,admin-query-keys,admin-query-provider}.tsx/ts` and `apps/web/src/lib/admin-transport`.
2. Render **Situation**, **Last confirmed developments**, **Why?**, **evidence coverage** and safe source refs on an **actually assigned and authorized campaign case**. No new pages for unscoped global browsing. Don't redesign entire Admin nav or add generic raw JSON.
3. Use TanStack Query keyed `staffPrincipalId+accessEpoch+caseId+campaignId+projectionVersion` and AbortSignal; no hidden raw prefetch or stale cross-user cache; old-case links don't authorize a new campaign.
4. Show real current hold/control facts; don't project dueAt as settled reward. Show deliberate **Unknown** when source missing and **Attempt not recorded** instead of “model definitely not called”.
5. Make links/copy actions include **only** allowlisted metadata IDs, not player text or bearer hashes. Browser click can't retry Storyteller, change game/GM06 visit ACK or spend money.

### UI evaluation must be real

Use existing `@offscreen/web` local test runner (inspect current scripts):
~~~sh
pnpm --filter @offscreen/web test:fast
pnpm test:focus -- admin-control-ssr
~~~

Add a focused RTL/MSW test for:
- permitted assigned case and real S1 fixture;
- default Support without new capability denied;
- unknown/partial/held/stale results;
- grant epoch/revocation switches;
- **a private sentinel cannot appear in DOM or network response**.

Then launch the connected local Admin stack in a disposable environment with an actual synthetic staff principal/case/grant, and drive **one real browser session** via existing Playwright test helper or agent browser. Screenshot **synthetic** interface and record the exact underlying S1 JSON source IDs/observedAt. A Playwright snapshot of mocked HTML **is not proof** that the Nest permissions/SQL query worked; run one connected authorized+foreign case test separately.

**Human-utility trial:** hand a fictional support ticket to the automated agent with only the S1 view: “Player says the game froze after an item action. Did the mechanic finish? Has the model run? Did a new scene publish?” The agent must answer from the **UI** without SQL/logs and cite the displayed source types, ID and coverage. Record answer, source of each claim, unsupported inference and navigation friction. Repeat with a stale publication case if fixture exists.

Only then mark OBS07 Done, write an actual `evidence/runs/observability-program-2026-11-15/obs07-...md` receipt, clear active Change, commit/push.

## 4. Honest scorecard if OBS06/07 cannot be safely finished

Do **not** force an unsafe new staff grant to make the UI look finished. Record as:
- `OBS06: Blocked (trusted case/campaign grant issuance missing)` with exact source/fixture and negative proof, or
- `OBS06: Done in synthetic/disposable scope, production grant issuance unsupported` (only if that qualified outcome is exactly what the selected Change promises), and
- `OBS07: Not started because dependency not Done`.

Meanwhile S0–S3 source evidence is still valuable, and S5 provider-free packet comparison can proceed. Don't ask the user to fabricate a staff grant by hand.

## 5. End S4

`RUN-LOG.md`: selected Change(s), actual touched files/source SHA, normal/negative tests and commands, sanitized response/screenshot, role/case/grant scope behavior, query count/latency, observed Support diagnosis outcome. No raw customer text or secrets in Git.

`CHECKPOINT.md`: next S5; commit and push; keep `Current change: none` except an actually active unresolved Change with explicit status.

**Next:** [S5 conditional paid model/agent trial and honest blocked path](05-CONDITIONAL-LIVE-AGENT.md).
