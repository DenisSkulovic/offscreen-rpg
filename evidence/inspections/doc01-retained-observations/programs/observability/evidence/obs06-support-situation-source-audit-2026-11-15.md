# OBS06 | Source audit for a case-scoped Support Situation → Why read

**Evidence class:** direct code inspection of `offscreen-rpg main@18158402`, 2026-11-15. No running API, SQL, React browser or paid/model calls in this design review. Relevant verified changes: OBS01 operation discovery; OBS00-A transport-wrapper forwarding; OBS02 stage receipts; OBS02-H epoch/lease integrity; OBS03 prompt sidecar; OBS05 evidence lineage v2. All are **Done for their bounded slices**. OBS00-B independent current usage authority remains blocked. Source links below are actual file/symbol owners, not a claim the proposed read already exists.

## 1. The product problem is now query/access, not a missing general logging framework

The existing Admin flow `apps/web/src/features/admin/player-lookup.tsx` offers player → campaign list → Storyteller generation list/detail. `packages/application/src/admin/diagnostics-reads.ts` already queries campaign-linked generation IDs across `storyResolution`, published passages, reports, context captures and provider attempts, including provisional G (OBS01).

Source also now retains:
- `storytellerExecutionStage` and `listExecutionStages(G)` with real cause/capture/materialization/scripted validation/publication status, epoch-qualified stage identities and lease-fenced terminal records (OBS02 + OBS02-H);
- `storytellerPromptProvenance` and `readPromptProvenance(G)` for **promoted consequence** tasks, source profile/code identifiers and limited source decisions (OBS03);
- `createStorytellerEvidenceLineageV2`, a **diagnostic adapter**, which distinguishes packet-included-but-uncited from actual semantic use (OBS05);
- GM05 `storyPublicEvent` safe *player-visible* event type/sequence/source references, not a full internal story-state ledger;
- current `story` and `campaign` state plus original `gameActionExecutionEvent`, `gameActionReceipt`, `gameActivityEvent` and `storyPassage` identities.

**Missing product:** no current Admin **case-scoped situation/why** read that composes those facts into a comprehensible current hold/status and source-backed small timeline. No exact historical game-state reconstruction, no S3 raw Content Workbench, no player Replay V1 and no production OTel infrastructure.

**Decision:** compose a small, **read-only S1 source projection** first. Do not create new E0 transition tables, duplicate AI stage receipts, ingest logs, display raw prompts, or implement a generic graph engine in this slice.

## 2. Case authorization is the main security gate

Current `packages/application/src/admin/registry.ts`:
- `support-operator v1` grants `player.summary.read`, `case.summary.read` and `case.create`;
- it does **not** grant `campaign.metadata.read` or `ai.operation.read`;
- `admin-reader v1` grants `player.summary.read`, `campaign.metadata.read` and `ai.operation.read`;
- `engineering-observer v1` grants `ai.operation.read` plus platform status/spend, **not automatic campaign ownership**.

Therefore **a new friendly screen on existing AI diagnostics would not actually work for ordinary Support operators.** Granting `ai.operation.read` broadly to fix that would expand technical access without justified field-level scope. Existing closed capability registry is designed to support a distinct **Support-safe investigative capability** if deliberately approved.

Existing `apps/api/src/modules/admin/controller.ts::assertLegacyCampaignVisible` checks player or campaign scope for existing Admin reads and `requireCapability(ai.operation.read)` for operations. Those are **not a case-scoped Support grant**.

### Case references are not proof of authorized access

Current `admin_case` stores `status,createdByStaffId,assignedStaffId`, and `admin_case_link` stores `caseId,subjectKind,subjectId`. `case.summary.read` checks case capability scope. `AdminAccessPolicy` can require `caseId` in an assignment's `authorizedCaseIds`.

**Important source limitation:** `AdminController.createCase` checks a supplied **player** link against `player.summary.read`, but does not perform an equivalent target authorization check when creating a link to **campaign**, **operation** or **account**. Thus a newly created case link can be unverified target metadata, not a trusted entitlement. Later `assignCase` can assign cases, but assignment alone isn't a proof that a linked campaign was lawfully investigated.

**Required defense in any new S1 route:**
1. authenticate active staff session and validate current staff/grant epoch;
2. verify an actual active/assigned case and permitted actor/approved assignment (not just arbitrary caseId supplied);
3. validate the specific **campaign belongs to the case subject** through actual DB ownership/linked operation source; an arbitrary case link is not enough;
4. evaluate the **new narrow situation-read capability against the exact campaign**, with caseId and actual grant provenance; verify independent player/campaign scope or case target binding attested by a trusted authorization process, **not only the self-created link**;
5. block cross-subject enumeration and ensure revocation/closure/expiry invalidates later reads.

**Do not silently extend support-operator-v1.** Recommend new `support-investigator-v1` package with closed `forensics.campaign.situation.read` (campaign resource + verified case purpose), assigned explicitly. Package selection and case binding are policy/security decisions to approve with owner; code must never bootstrap grants from existence of a case.

**Hard blocker to Resolve before Ready:** define how a campaign link is verified when Support staff do **not** hold general `campaign.metadata.read`. A safe option is a separately attested/validated case-subject binding or independent capability/owner-scope check performed by an authorized case intake system. The first version may restrict to explicit **case + campaign grant provenance** created by a privileged staff actor, rather than letting Support self-create broad access. If not source-proven, deny.

## 3. Current state sources and their privacy classes

| Query source | Safe read fields for a first S1 situation | Fields **not** exposed to Support by default |
| --- | --- | --- |
| `story` | ID, owner ID **used only for internal authorization**, narrative revision, viewVersion, current passage identity via `storyPassage`, observed timestamp | premise, Storyteller profile prose, continuity notes, source prompt, hidden active scene details |
| `campaign` | gameSecond, `holds` parsed to **hold kind + matching operation/G reference only**, activeActionOperationId, activeActivityId, settings revision as safe number where policy allows | character, storyFacts, worldConditions, offer content, private clock/pacing/player prose |
| `storyPassage` | ID, sequence, sourceGenerationId, publication identity (no body) | content/response/interaction/wait plan/private choices/appearance |
| `gameActionExecution` | operationId, state, start/target fictional seconds and revision when case-authorized | label, plan, offer, pending private resolution, action intention |
| `gameActionExecutionEvent` | ID, kind (`started/paused/resumed/interrupted/settled`), gameSecond, source operationId and ordering | label text, unapproved private cause/body |
| `gameActionReceipt` | **existence/receipt ID** for exact settled operation; separately verify with event | full offer/plan/outcomeText/effects/declarations/roll without needed grants |
| `storyPublicEvent` | sequence, kind, source kind/ID, passage ID, gameSecond, record time, max bounded window | free-text title/summary (player narrative even when "public" to player, not automatically public to staff) |
| `storyResolution` | G, basePassageId/baseRevision, source operation link, used to identify controlling turn | submission JSON with actual user/private plans |
| `storytellerContextCapture` | captured G/operation, state, bounded failure category, epoch and attempts | capture JSON and frozen private SQL/actor/world source |
| `generation` | G, kind with existing sanitizer, state, sanitized failure, update time | input/output, repair candidate/diagnostic raw JSON |
| `storytellerExecutionStage` | stage ID/G/attempt ID, stage/outcome, source kind/ID, observed time, safe reason after allowlist | raw free-form failureClass, source hash if it would leak private data, internal confidential schema details |
| `storytellerPublication` | pending/published/stale/blocked, failure category where safe | actual output body and unpublished alternative |
| `storytellerAttempt` | whether a real attempt row exists, state/status if source-confirmed | provider request body, exact cost/payment/account metadata without separate commercial privilege |
| `storytellerPromptProvenance` | **presence/coverage only** if warranted | manifest, component hashes/source handles/root/profile detail and prompt bodies; these are engineering/private diagnostics |
| `adminCase/adminCaseLink` | case ID, assigned/staff scope, linked subject identity **for authorization and case context** | unbounded case title/notes as authorization proof |

**No raw default `SELECT *` across private JSONB tables.** Select only needed columns, parse holds with the owning `campaignHoldsSchema` and reduce to a safe closed-code DTO **before** returning data. Do not call owner-player `readCampaign` directly as the Admin data source; it returns character/offer/storyFacts and other richer player-private values.

## 4. The “latest operation” trap and safe source precedence

There are several competing notions of “now”:
- `campaign.holds` identifies **current controlling owner** (storyteller-intent operation, storyteller G, decision offer, world obligation) when present.
- `campaign.activeActionOperationId` and `activeActivityId` identify active mechanical commitments.
- `story.revision` and `storyPassage.sequence` identify published narrative source but not every mechanic.
- `storyResolution` maps G to a base passage/revision; a **historical report G** may be newer by `updatedAt` than the controlling scene G.
- `storytellerExecutionStage` records chronological stage receipt observations per G, not the source of current game authority.

**Do not choose current controlling G by “most recent generation.updatedAt”.** An old historical report may complete after the current scene. Match the actual G from current hold or controlling resolution at the active passage; if ambiguous/inconsistent, return `unknown/multiple-source-conflict` with supporting IDs, not a fabricated “narration currently running”.

**A held capture ≠ provider attempted.** Presence of a provisional G/`context-capture` with no attempt row means `none-recorded` for attempts, not definitive zero billing, unless the exact recorded phase/mode proves no send. `storytellerExecutionStage` can prove scripted provider `stage-skipped/not-run` in its supported pilot; absence of stage rows for legacy G cannot prove no execution.

## 5. “What happened?” is a bounded source-template, not a model explanation

Safe S1 event statements can be derived from actual source:
- `gameActionExecutionEvent.kind='interrupted'` linked to one accepted execution: “Recorded action interruption.” A successful receipt must not be implied.
- `gameActionReceipt` for exact operation with settled execution: “Successful action settlement recorded.” **Do not** show earnings/roll/player prose without separate authorized scope.
- `storyteller_context_capture.state='held'`: “Narration preparation held” with safe error class and same G.
- `storytellerExecutionStage(stage='stage-skipped',outcome='not-run',failureClass='scripted_execution')`: “Scripted path; model request not run” **only with source coverage**.
- `generation.state='succeeded'` and `storytellerPublication.state='stale'`: “Output recorded, publication refused as stale.”
- `storyPassage.sourceGenerationId=G` + published row: “Published scene linked to G.”
- `storytellerAttempt` uncertain with actual recorded status: “Possible provider work; usage unresolved”, **not** “zero cost.”

All statements carry source kind, ID and proof classification (`recorded` / `derived` / `unknown`). **No SA05 model-ignored wording**, no inferred root cause, no reconstructed raw context in S1.

## 6. Data completeness and query cost hazards

- **Legacy**: OBS01/02/03/05 started mid-project; a G lacking stage/provenance rows may be pre-instrumentation or a legitimately unsupported purpose. Mark `not-instrumented/not-applicable/unknown`.
- **OBS02-H** repaired epoch-qualified idempotency and stale-lease stages; still only limited Storyteller purposes and scripted/provider-disabled pilot, not full paid model round capture.
- **OBS03** is a per-G **task/compile-side** manifest. Don't say source component reached exact sent packet.
- **Two cursor families**: GM05 `story_public_event.event_sequence` sorts public developments, while current `story.revision` isn't a mechanical frontier; stage rows sort by timestamp+ID for stable display but this does not prove cross-service causality.
- **N+1 risk:** current `listPlayerCampaigns` loops up to 20 campaigns and resolves linked G per campaign; `listCampaignOperations` loads all campaign-linked IDs and joins attempts (potential fanout). **Do not copy this pattern** into a continuously refreshing Support Situation. Limit to current authoritative story/hold, a small recent event window and selected source G. Use bounded indexed queries. Benchmark 1/100/1,000 generations and 20-campaign search.
- **Source freshness:** prefer one consistent SQL read snapshot across case/auth subject, story, campaign, hold/G/publication/receipt and stage records, plus explicit `observedAt`, `story.viewVersion` and exact source IDs. Avoid remote CAS/Telemetry inside that transaction.

**Source-qualified verdict:** We have sufficient real data for a useful first **case-scoped S1 situation/why** projection, but not enough for exact old mechanical state or a full raw Context Inspector. The **security binding** is an essential part of that first packet, not something to bolt on after UX.
