# OBS06 | Case-scoped Support Situation → Why read service

**State: Done (2026-11-15, synthetic/disposable scope; production grant issuer unsupported). Evidence: [obs06 receipt](../../../../../../evidence/runs/observability-program-2026-11-15/obs06-case-scoped-situation-read-2026-11-15.md).** Original design state: technical design specified. Code-bearing scope: one new **S1 metadata-only** Admin application read service, strict Zod DTO, guarded Nest GET endpoint, narrowly scoped role/case authorization, focused provider-disabled disposable SQL/policy tests. **No React work** in this packet (OBS07 owns the visible UI). **No raw prompt access, new telemetry fleet, model calls, story mutation or E0 replay schema.**

**Authority:** [source-specific audit](../../../../../../evidence/runs/observability-program-2026-11-15/obs06-support-situation-source-audit-2026-11-15.md) → [exact S1 read/permission contract](../../../../../../evidence/inspections/obs-technical-essays-2026-11/support-situation-and-why-v1.md) → [original Support workbench vision](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/observability/admin-investigator-interactions-v1.md) → [forensic evidence truth](../../../../../../evidence/inspections/obs-technical-essays-2026-11/evidence-claims-and-quality-v1.md). Source `main@18158402`. Review accepted Admin [staff authority](../../../../../../evidence/inspections/admin-program-essays-2026-11/authority-operating-policy.md) before authorizing any new grant.

## Cursor first screen

> **One independently useful result:** a legitimately authorized case-assigned Support staffer can GET one campaign's **current factual Situation + short source-linked Why**: hold/current commitment, last published passage ID, recent meaningful developments, controlling G and actual stage/publication status. No narrative text, hidden world plan, raw prompt, cost, generic SQL or generated explanation leaves the server.
>
> **Critical security fact:** current `support-operator-v1` lacks `campaign.metadata.read` and `ai.operation.read`. `AdminController.createCase` currently validates a **player** link but does not equivalently verify an arbitrary supplied **campaign/operation** case link. **A self-created case link is never authorization**. New access must require independently approved exact campaign+case grant provenance and a genuinely assigned open case. Do not give Support the entire engineering role.

## 1. Authorization and route

**Proposed** `GET /api/admin/cases/:caseId/campaigns/:campaignId/situation`.

**New S1 grant:** `forensics.campaign.situation.read` on resourceKind `campaign`, granted only in a new explicitly assigned `support-investigator-v1` package, not automatically added to existing `support-operator-v1` installations.

**All gates apply in server-side source service:**
1. Active staff session (current epoch, environment).
2. `case.summary.read` on caseId and `admin_case.status='assigned'` with `assignedStaffId=staffPrincipalId`. No read for closed, unassigned or reassigned case in V1.
3. Exact `admin_case_link(campaign, campaignId)` in that case, and real story/campaign ownership verification, not supplied by client.
4. An **independent single active grant** with `forensics.campaign.situation.read`, `scope.campaignIds` containing exact campaignId (**nonempty**), `scope.requireAuthorizedCaseAssignment=true` and `provenance.authorizedCaseIds` containing exact caseId; grant source must be a trusted authorized steward/binding, **not** case creation.
5. Revalidate environment/expiry/revocation; no unscoped self-created case or unrelated grant composition. Deny/404 without revealing foreign subject existence.

**Risk gate:** A safe case+campaign grant-creation procedure is **not yet demonstrated** by the existing case controller. Before the endpoint is called Ready, reconcile this with current Admin source policy/assignment issuance. If the exact trusted binding cannot be established, **stop** and leave the API unreachable rather than treating the case link as permission.

No grant for raw `generation.input`, `storyteller_prompt_provenance.manifest`, Storyteller packet, hidden `storyPassage.content`, full game facts or account money is implied.

## 2. One strict body-free response

Implement an explicitly bounded `SupportSituationV1` per [technical schema](../../../../../../evidence/inspections/obs-technical-essays-2026-11/support-situation-and-why-v1.md), not `Record<string,unknown>`:
- case/campaign identifiers, observedAt, `story.revision/viewVersion`, last published passage **identity**;
- current `campaign.gameSecond`, parsed **hold kind/reference** and actual active action/activity IDs/status where appropriate;
- **current controlling G** only when linked from actual hold or current controlling resolution; no “latest updated G means current” shortcut;
- source-confirmed generation/capture/publication/attempt state and safe failure class;
- up to eight GM05 source event type/ID/sequence/gameSecond entries, **no title/summary**;
- a small `why[]` list from closed deterministic statement codes and actual source rows (e.g. interrupted/settled, held capture, scripted provider skipped, output succeeded but publication stale, published passage);
- per-dimension coverage and unknowns, not universal “complete” flag.

**Selection policy:** SQL `SELECT` explicit safe columns; avoid reading `generation.input/output`, `story.premise`, `campaign.character/storyFacts/worldConditions`, `story_passage.content/response`, `game_action_receipt.plan/effects/outcomeText`, player-facing `story_public_event.title/summary` and `storyteller_prompt_provenance.manifest`. Raw free-text `failureClass` gets allowlisted safe code or generic `unavailable`. A source-hash is not Support-safe by default.

**No false “model never ran”:** a missing attempt join means `none-recorded`; only a supported actual OBS02 `stage-skipped/not-run` or known scripted authority may prove `provider not run`. `OBS03` sidecar presence is not per-round sent-packet proof. The default live provider still lacks independent OBS00-B authority, but do not globally assume every historic generation was blocked.

## 3. Query and reliability budget

- Query **the current story + campaign + exact hold/operation** under an internally consistent Postgres read snapshot. Resolve current passage by `story.revision/sequence` and current G via explicit hold/source mapping. A historical report G may be most recently updated but is **not** automatically controlling.
- Query only **the selected current G** plus its publication/capture/attempt and max **12** real stage receipts; cap recent GM05 events at **8**. For exact action source validation, bounded indexed event/receipt refs, no full history.
- Do not reuse `listPlayerCampaigns`'s N+1 health loop or `loadCampaignLinkedGenerationIds`'s entire campaign G enumeration in a frequently refreshed “Now” route.
- Distinguish a campaign with **no mechanical row** from a broken campaign. Distinguish decision hold, Storyteller intent before G, G hold, world hold, active action and actual activity.
- Stage timestamps/IDs permit **stable display**, not cross-service total causal ordering; game fictional time and narrative passage revisions are separate.
- A S1 client should receive no body for content that is missing/expired/private; source coverage reports accurate `not-recorded` rather than reconstructing current game as historical fact.

**Performance goal:** bounded query count/row count independent of a 2,000-passage story; actual p95/SQL cost measured in disposable 1/100/1,000-generation fixture before Done, not invented quota. No CAS read, model call, Temporal wake, payment allocation or game transaction write from GET.

## 4. Minimal test matrix (provider-free)

| Fixture | Must prove |
| --- | --- |
| Support Operator v1, no new package | Denied, no implicit privilege from `player.summary.read` or `case.summary.read` alone |
| Trusted case-bound support-investigator grant and assigned case | S1 response with current source IDs/status and ≤8 safe events |
| Support creates arbitrary foreign campaign-linked case | Denied without **separate exact authorized case+campaign binding** |
| Different case/campaign grant assignments | Can't compose a case-only grant and unrelated campaign-only grant into access |
| Closed/reassigned/unassigned case, revoked or expired staff grant | Re-request denied, no SSR/Query cache leak |
| Story not found or subject out of scope | Identical non-enumerating failure, no owner/subject leak |
| Narrative-only story, no `campaign` | `narrative-only` with truthful missing mechanic data |
| Current `storyteller-intent` pending before G | Preparation intent shown; no fabricated G/model attempt |
| Held C1/C2 consequence G | Actual G/capture/OBS02 stage and safe held reason |
| Historical report most-recently updated | Does not displace current controlling G selected from hold |
| Interrupted finite action | Actual interrupted event; never reports successful receipt or reward |
| Model output succeeded but publication stale | Two distinct statuses, no falsely published new passage |
| OBS02 scripted `stage-skipped/not-run` | Source-proven model skipped, not an inferred €0 receipt |
| Legacy no stage receipt/attempt | `not-instrumented/none-recorded` rather than asserted provider absence |
| Private prompt/hidden NPC/GM05 title contain sentinel text | Sentinel **absent from S1 JSON, logs and tests' UI output** |
| Large 2,000-scene / many G | Bounded query plan and finite DTO; no N+1/full-history scan |
| Concurrent publication during read | Consistent snapshot or explicit partial/retry, never a mixed impossible source state |
| GET invoked repeatedly | Zero new game, generation, outbox, receipt, budget, provider or visit-ACK writes |

**Proof receipt:** source SHA, permissions tests including deliberate self-created foreign link, SQL explain/row cap, actual endpoint contract validation, redacted fixture response with stable source refs/coverage, no paid provider or external network, and honest unsupported scopes. Targeted build/test only; no global CI requirement or automatic DB reset.

## 5. Exact implementation owners and stop conditions

Likely touched: `packages/application/src/admin/*` new read module; `packages/application/src/admin/registry.ts` and policy/assignment integration; `packages/contracts/src/admin.ts` strict DTO; `apps/api/src/modules/admin/controller.ts` and providers; existing `db/schema/{admin,stories,campaign,storyteller,generations}.ts` **read-only**; focused Admin API/application tests. **No database schema migration unless an actual missing security binding forces a separately reviewed additive plan.**

**Stop and return to design if:** authorizing a case requires global Support visibility, automatic support-operator package expansion, arbitrary case links as authority, missing trusted grant issuance, or cross-environment grant bypass. No launch of partial “helpful” diagnostic API behind a UI-only permission check.

**Out:** no React screen (OBS07), no historical E0 capture (OBS04), no arbitrary raw narrative, no provider/OB00-B fixing, no OTel/Grafana, no replay, no AI-generated root-cause prose.

**Ready gate:** the owner explicitly accepts the S1 Support disclosure and case+campaign grant-binding policy, selects OBS06 as the one active Change, Cursor rechecks current main and proves the provider-free security test plan. Until then **Proposed, no work authorized**.
