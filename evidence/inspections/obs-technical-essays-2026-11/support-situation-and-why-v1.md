# Support Situation → Why V1 | Case-bound diagnostic truth with no private payload

**Status: proposed technical design, 2026-11-15. Not an implemented API, role or UI.** This is the *first source-backed human investigation service*, not the complete [Turn Evidence Capsule](forensic-turn-capsule-v1.md). Source baseline [OBS06 audit](../evidence/obs06-support-situation-source-audit-2026-11-15.md) `main@18158402`; existing [Admin permission model](../../admin/technical/staff-identity-and-policy.md), [forensic access rules](forensic-access-and-read-contract-v1.md), [evidence statement truth](evidence-claims-and-quality-v1.md), [OBS02 stage receipt](../evidence/obs02-h-stage-integrity-2026-11-15.md), [OBS03 source sidecar](../evidence/obs03-provenance-quality-review-2026-11-15.md). No code or paid evaluation authorized.

## 1. Product promise and launch boundary

Given a **legitimately assigned case** about a specific campaign, a Support investigator can answer:

- What is the last actually published scene? (metadata only, **not** body)
- Is the game awaiting player decision, running an action/activity, frozen by a Storyteller intent/G, blocked, or presently unknown?
- What was the last **recorded** meaningful development, and did a receipt/interrupt/publication actually commit?
- Which G/source stage explains a pending or blocked scene? What did **not** run, if proven?
- Which facts can we establish from source, which require developer escalation, and which are simply unavailable?

**V1 must not** show original private narrative, player choices/prose, hidden world details, profile/customized prompt strings, raw model packet, full game state or financial charges. Those belong to separately approved S2/S3 read contracts, not a hidden expandable panel on the S1 route.

**Case-bound** rather than globally browsable: the route and permission model are designed for a real support ticket. An Engineering Observer may use the same query only under a separately eligible case/campaign grant; the `ai.operation.read` grant alone is *not* cross-player discovery.

## 2. The essential new security capability

**Recommendation:** introduce `forensics.campaign.situation.read` in the **closed** Admin capability registry, associated with resource kind `campaign` and exactly this **allowlisted, body-free** view. Introduce a separately assigned `support-investigator-v1` capability package with this one grant.

**Never mutate the semantics of existing `support-operator-v1` or silently upgrade active assignments.** Ordinary Support roles currently don't have `ai.operation.read`/`campaign.metadata.read`. That is deliberate: do not borrow the broad engineering grants to build a Support feature.

**A valid S1 request requires all of the following, on the server:**

1. Authenticated, active staff session, stable staff principal and environment.
2. `case.summary.read` on the **exact caseId**, under the active grant.
3. Actual `admin_case.status='assigned'` with `assignedStaffId=actor.staffPrincipalId`. Closed/open/unassigned/foreign cases fail this V1 route. Later escalations can have independent policy.
4. An actual `admin_case_link(subjectKind='campaign',subjectId=campaignId)` on this same case and an existing `story.id=campaignId` resolved in one authorization-aware read. A `player` or `operation` link is **not automatically** a campaign link.
5. An **independently granted** `forensics.campaign.situation.read` capability for the exact campaignId and caseId, from a **single active, scoped assignment** with:
   - `scope.campaignIds` containing the **exact** campaignId (not absent/empty);
   - `scope.requireAuthorizedCaseAssignment=true`;
   - `assignment.provenance.authorizedCaseIds` containing the exact caseId;
   - permitted environment and nonexpired/revoked status.
6. **No case-created-by-me escape hatch**. A self-created case or arbitrary campaign link cannot mint/extend that grant. The assignment's exact campaign/case binding must come from an authorized independent case/permission stewardship process, not the user-supplied case title/link. Grant creation/approval is outside the request handler.
7. Recheck the relevant grant/session when serving each request; never return a different campaign if the G or source ref belongs elsewhere. Denied/unknown foreign resources use indistinguishable safe failures.

**Why this extra ceremony?** Today `AdminController.createCase` authorizes a supplied **player** link but not an arbitrary campaign/operation link. Therefore an arbitrary `admin_case_link` is just a reference until a trusted actor binds it to a grant. The **same immutable grant assignment** must prove both exact case and exact campaign, so a broad case grant and unrelated broad campaign grant cannot be combined into cross-scope access.

**No general S3 raw access, no campaign mutation/repair authority, no account payment privilege and no bulk search capability** is added through the proposed package. If an owner does not approve this capability or its assignment workflow, this S1 route remains blocked, even though the DTO is safe.

### Safe route and request

~~~text
GET /api/admin/cases/:caseId/campaigns/:campaignId/situation

- no body, no arbitrary “playerId” override
- exact caseId and campaignId are UUIDs
- controller/server resolves staff actor and evaluates all gates
- source read under a consistent, bounded Postgres snapshot
- strict SupportSituationV1 response; Cache-Control: private, no-store
- no raw prompt or hidden-source expansion
~~~

This route is **proposed**. If initial cases were created via unverified links, those links remain insufficient: a legitimate trusted grant steward must independently approve the case/campaign scope before this read is allowed.

## 3. Closed response model, with exact source provenance

Sketch of the minimal S1 DTO. Actual contracts should be implemented with strict Zod, bounded arrays, semantic names and deliberate serialization; do not return partial unvalidated JSON.

~~~ts
type SupportSituationV1 = Readonly<{
  version: 1;
  caseId: UUID;
  campaignId: UUID;
  observedAt: ISOTime;
  sourceFrontier: {
    storyRevision: number | null;
    viewVersion: number | null;
    latestPublishedPassageId: UUID | null;
    latestPublishedPassageSequence: number | null;
    // No claim of exhaustive historical state without E0 ledger.
    mechanicalHistoryCoverage: 'not-instrumented'|'partial'|'unknown';
  };
  now: {
    kind: 'decision-hold'|'narration-intent'|'storyteller-generation'
      |'world-obligation'|'finite-action'|'activity'
      |'idle'|'narrative-only'|'conflicting-sources'|'unknown';
    controllingRef: SafeTypedRef | null;
    gameSecond: number | null; // committed, not projected completion
    held: boolean | null;
    sourceConfidence: 'direct-current-source'|'partial'|'unknown';
  };
  activeGeneration: {
    generationId: UUID;
    state: 'pending'|'running'|'succeeded'|'failed'|'uncertain'|'unknown';
    capture: 'captured'|'materializing'|'ready'|'held'|'blocked'|'stale'
      |'not-recorded'|'unknown';
    publication: 'pending'|'published'|'stale'|'blocked'|'unknown';
    attemptCoverage: 'recorded'|'none-recorded'|'unknown';
    safeFailureCode: SafeCode | null;
    // Distinguishes supported OBS02 pilot vs absent/legacy rows.
    stageCoverage: 'recorded'|'not-instrumented'|'not-applicable'|'partial';
  } | null;
  recentDevelopments: readonly {
    sourceRef: SafeTypedRef;
    eventSequence: DecimalString | null; // GM05 public event only
    kind: 'passage-published'|'action-settled'|'action-interrupted'
      |'activity-development'|'world-development';
    gameSecond: number | null;
    observedAt: ISOTime | null;
    observation: 'recorded'|'derived';
  }[]; // max 8; no title/summary
  why: readonly {
    statementCode: ClosedSupportReasonCode;
    class: 'recorded'|'derived'|'unknown';
    sourceRefs: readonly SafeTypedRef[];
    missing: readonly ClosedEvidenceGap[];
  }[]; // max 6; human copy rendered by reviewed deterministic template
  coverage: {
    currentState: 'verified'|'partial'|'unavailable';
    gameHistory: 'since-enabled'|'partial'|'not-instrumented';
    storytellerStages: 'recorded'|'partial'|'not-instrumented'|'not-applicable';
    promptBody: 'not-included'; // This S1 endpoint never exposes raw
  };
}>;
~~~

**No giant mutable `GameData` payload** in this response. It is a *read-only safe projection* over original schema-authoritative source rows. Internal owners remain `story/campaign/receipts/events/generation/attempt/stages/publication`. Future Turn Capsule L2/L3 readers may resolve deeper details through separate grants.

**Source refs are not bearer tokens.** A user opening an operation detail must pass a fresh independent authorized read. Never include sensitive source hashes or storage object paths in S1 by default.

## 4. Deriving “Now” from actual current authority

The most reliable current source is `campaign.holds` (strictly parse with `campaignHoldsSchema`), plus `campaign.activeActionOperationId`, `activeActivityId`, `story.revision` and the actual latest published passage row. **Do not classify current process by latest G.updatedAt.**

Recommended precedence is **not an invented business priority**. It is a source-driven decision table:

| Observed sources | Safe V1 status | Explanation constraint |
| --- | --- | --- |
| No campaign row but story exists | `narrative-only` | Mechanic telemetry not supported; never call story broken |
| One valid `storyteller-intent` hold | `narration-intent` | A work request exists; don't invent G before capture |
| One valid `storyteller` hold with G | `storyteller-generation` | Resolve exact G; a recent historical report G is not necessarily controlling |
| One valid `world-obligation` hold | `world-obligation` | Source obligation controls pending transition; don't expose hidden details |
| One valid `decision` hold | `decision-hold` | Decision offered; not automatically overdue/auto-resolved |
| No hold, one active finite action | `finite-action` | Show actual state; due estimate is not earned completion |
| No hold, one active activity | `activity` | Show only committed progress when proven; no payoff guessing |
| No hold/active operation and valid source | `idle` | Not proof absence of all queued background tasks |
| Multiple contradictory controlling owners or invalid source | `conflicting-sources/unknown` | No priority guess; show safe inconsistency for escalation |

**Holds may legitimately coexist with other commitments.** Show the controlling hold and actual active commitment separately when both exist; don't describe a paused/waiting action as “no action” just because a hold exists. Multiple holds or outdated source pointers should return a **conflict/partial state**, not silently choose one by list order.

**Last published:** join `storyPassage` on `story.id + story.revision/sequence`, not just maximum `createdAt`. Publication may be delayed/historical, and source G may differ from current controlling G.

## 5. Building a truthful mini “Why?” explanation

A deterministic **closed statement code** plus source refs; no LLM synthesis. Examples:

| Statement | Exact required proof | Don't claim |
| --- | --- | --- |
| `action_interrupted` | `gameActionExecutionEvent.kind='interrupted'` with matching execution/story | “Successful transfer happened” |
| `action_settlement_recorded` | Same story/operation `gameActionReceipt` and execution settled | Exact reward/amount unless separately authorized and parsed |
| `context_materialization_held` | Exact G capture row `state='held'` or OBS02-H real stage, with current linkage | “Model timed out” if no model attempt exists |
| `scripted_provider_skipped` | Real OBS02 stage `stage-skipped`/`not-run` with scripted failureClass and stage identity | “€0 charged” without actual relevant attempt/usage proof |
| `validation_failed` | Exact generation/stage saved failure code, correct receipt stage | Prompt source was wrong without evidence |
| `publication_stale` | Exact `storytellerPublication.state='stale'` linked to the same G | “Story advanced” if no published passage source |
| `published_passage` | `storyPassage.sourceGenerationId=G` and source passage committed | Every source in the prompt was semantically used |
| `model_attempt_unverified` | no attempt row in the reviewed source set | “No provider was ever contacted” |
| `source_data_unavailable` | proven missing/unsupported source | “Nothing happened” |

The **first screen can show 2–4 decisive statements** rather than 12 verbose engineering codes. The "Why?" affordance reveals the source IDs and coverage. If a rule needs unapproved player narrative text to explain a fact, it must be withheld/escalated rather than fed through a model-generated summary.

## 6. Query plan and concurrency

**Use a source-aware, indexed and bounded read**, not `listCampaignLinkedGenerationIds` across all old history on each refresh:

1. Authorization guard checks exact case, campaign, staff/grant and approved link.
2. Within a bounded consistent SQL read: select `story` identity/revision/viewVersion and minimal `campaign` state, parse holds and choose a **source-linked current target**; select latest published passage identity by `(storyId,sequence)`.
3. Query at most the relevant controlling `storyResolution/contextCapture/G/publication/attempt` by ID; do not scan every historical attempt/round or use ownerId as a G surrogate.
4. Select a bounded recent `storyPublicEvent` slice (e.g. **8**, indexed by storyId/eventSequence) **without title/summary**, and an optional *one exact* action event/receipt if needed to confirm it.
5. Select at most **12** most recent OBS02 stage rows for the exact G (ordered stable by createdAt+ID), with explicit partial coverage if more exist; do **not** call `listExecutionStages` that returns the entire history without limit.
6. Project a strict S1 DTO server-side with a closed allowlist. Return one observedAt/frontier and source quality, not raw rows, mutable current context or false past state.

**SQL consistency:** use a consistent read snapshot or equivalent pinned source-state method. A multi-query read that observes campaign from revision R and G publication after revision R+1 can produce an impossible story. Avoid long SQL transactions over CAS/HTTP or UI rendering. If source mutates mid-read, return `partial/stale` with a safe re-fetch strategy.

**Performance:** target bounded indexed queries independent of 2,000-scene history and hundreds of G; benchmark 1/100/1,000 G, 8 recent public events, and current held G with 40 stage attempts. Counts/thresholds are V1 starting caps, not measured SLO claims. No N+1 nested campaign health loops.

## 7. Specific failures and proof cases

1. **Support Operator v1** with only existing grants cannot call S1 route; denied. No implicit upgrade.
2. **support-investigator-v1** with scoped case+campaign provenance and active assigned case succeeds, but only S1 DTO.
3. Support creates arbitrary `adminCaseLink(campaign=foreignId)`, no matching independent grant: **denied**, even if case assigned.
4. Grant permits case A and campaign X, but case A references campaign Y: denied.
5. Two separate grants, one for case A and another for campaign Y: **no cross-product permission laundering**.
6. Case closed, reassigned, staff suspended, grant expired/revoked, environment mismatch: subsequent reads denied, no protected/cache leak.
7. Campaign exists without any game row (narrative-only): source-backed `narrative-only`, not “stuck”.
8. Current `storyteller-intent` has operation ID but not G yet: show preparing, no fake model attempt.
9. Current `storyteller` hold G with CAS exhausted/held: G status and real OBS02-H stage visible.
10. Historical report G updated most recently while a different controlling G owns current hold: show the latter as current.
11. Interrupted action from GM05/source event: statement with source, no successful receipt or invented transfer.
12. G succeeded but `publication.state='stale'`: explain output vs publication, no new scene assumption.
13. Scripted G skipped provider (source-attested) vs legacy G with no attempt row (unknown): different copy and coverage.
14. User-created free-text title/summary, `generation.input` and `promptProvenance.manifest` contain sentinel secrets: **zero bytes** appear in S1 HTTP, SSR and browser query cache.
15. Multiple stage rows share millisecond timestamp: stable displayed order; no causal time assertion from ID sorting.
16. 2,000-scene history: bounded database work, no full story/attempt enumeration.
17. Missing/partial evidence: explicit unknown/limited result, no “normal” inferred from absent rows.

**Security gate before coding:** product owner accepts a new granular S1 capability and the trusted exact case+campaign binding procedure. If the existing assignment flow cannot prove that binding, do **not** broaden `support-operator` or permit a self-created case link to grant access. This is an honest design blocker, not a reason to invent authorization.
