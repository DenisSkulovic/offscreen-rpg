# Forensic access and read contract V1 | Role-specific truth without a universal data leak

**Authority:** this page owns the proposed forensic read contract: five disclosure tiers (S0 to S4), the capability taxonomy, the server-side authorization algorithm, purpose-bound disclosure with read audit, read models, cache/SSR isolation, erasure boundaries and the reconstruction steps. It is a proposed security and read architecture (2026-11-15). It implements and authorizes no staff grant, endpoint or new read.

**Current realization (source-inspected on this branch):** only a redacted diagnostic read exists. The AD05 capability `ai.operation.read` is in `packages/admin/src/registry.ts` and is checked by `apps/api/src/modules/admin/controllers/admin-evidence.ts`; it means **redacted operation diagnostics**, not unrestricted private context and not S3 raw prompts. The registry holds one forensics capability, `forensics.campaign.situation.read` (the synthetic Situation read); none of the proposed `forensics.*` names listed below (status, timeline, state-diff, prompt, raw output, hidden world) exist, no raw-prompt capability exists, production Support grants are absent, and the OBS06/07 Situation UI is synthetic. The proposed S1 to S4 read models below are not routes today.

**Neighbours.** Product intent is [AI investigation](../../product/admin/ai-engineering-and-investigation.md). Staff grants that already exist are [Admin authority](../admin/topology-and-authorization.md) and [investigation boundaries](../admin/investigation-and-privacy.md). Audit is [commands and audit](../admin/commands-and-audit.md).

## Owner map

Investigation and reconstruction stay on this page. Durable forensic evidence and provenance stay distinct from lossy telemetry.

| Record | Owner | Standing |
| --- | --- | --- |
| Evidence identity | [Evidence graph](identities-and-evidence.md#owner-map) | Selected target. Not a landed store. |
| Capture and causal identity | [Committed transition capture](capture-and-provenance.md#owner-map) | Proposal. |
| Investigation and reconstruction | This page | Proposed read. |
| Retention and access | [Replay, retention and privacy](retention-and-access.md#owner-map) | Unratified where that page already says so. |
| Telemetry | [Runtime telemetry](telemetry-and-diagnostics.md#owner-map) | Application enrollment proposed. The optional native stack is owned by [native observability](../platform/observability-native-infrastructure.md). |

[Reconstruction steps](#reconstruction-steps) stay on this page. This page does not authorize a new forensic read.

### Product status received from the AI engineering workspace

Received from the product page [AI engineering and investigation](../../product/admin/ai-engineering-and-investigation.md) (Status, proposed workspace dated 2026-11-14). The product text stays in place; this is the technical standing of the same fact, with no policy transfer.

- Some redacted diagnostic reads exist from the Admin and observability slices (source route above: `ai.operation.read`).
- Those reads are not the full proposed investigation workspace. Tiers S1 to S4, the read models in [section 5](#5-authoritative-read-models-not-raw-table-endpoints) and the case-bound exports are not built.
- They are not a production grant to open raw prompts. No raw-prompt grant exists, and a metadata read never implies one (negative 1 in the [acceptance suite](#8-negative-acceptance-suite)).
- No observability implementation, storage scheme, provider policy or alert threshold is selected by this fact. Illustrative Support, impersonation, raw-prompt, refund, export and LiveOps examples stay Proposed or Blocked in their product owners.

**Negative:** A staff metadata read, including `ai.operation.read`, does not grant a prompt body. The current world never fills missing history. Telemetry is not the canonical replay source. A lossy summary does not replace original evidence identity. Candidate retention figures stay unratified. This map does not settle a legal, privacy, or access policy.

## 1. Five increasingly sensitive disclosures

| Tier | Typical data | Intended principal | Default rule |
| --- | --- | --- | --- |
| **S0 operational aggregates** | service health, queues, aggregated failure/cost/latency by bounded labels | SRE, operator, sometimes Support | Scoped staff permission; no player/story body |
| **S1 case-safe subject metadata** | current campaign health, event kinds, accepted action status, generation/hold/attempt/publication IDs, safe error reasons | Support L1, approved engineers | Scoped story/player/case grant; no private narrative excerpt |
| **S2 player-visible historical evidence** | published scenes, public action effects and recorded player-known state at selected frontier | legitimate player; Support specialist only with explicit lawful case purpose | Owner/participant perspective and separate narrative grant for staff |
| **S3 restricted AI/world evidence** | full prompt components, raw context, hidden DM/world plans, source documents, model/tool output, confidential configs | approved developer/investigator | Separate time-bound purpose grant, strong staff session assurance, audit before disclosure |
| **S4 trust/security material** | sensitive user identity, abuse evidence, internal access audit, exceptional retention holds, secrets metadata | Trust/Security specialist | Independent explicit privilege/approval and legal process |

**Never store or disclose raw credentials** in any tier. S4 is not “all permissions, all game content”; trust/security also gets purpose-minimized projections. S2 as a *player* is often an ordinary product right, whereas S2 as *staff* requires its own authorized case context.

The same evidence graph can produce several projections, but it must not send an S3 artifact to the client and hide it with CSS. Permission is enforced in the server-side read path on every request.

## 2. Capability taxonomy, proposed separate from existing AD01–AD08

Use closed, versioned intact grants consistent with [Admin authority](../admin/topology-and-authorization.md). Illustrative grant keys:

~~~text
forensics.campaign.status.read
forensics.timeline.safe.read
forensics.story.player-visible.read
forensics.state.safe-diff.read
forensics.state.private-diff.read
forensics.prompt.provenance.read
forensics.prompt.raw-body.read
forensics.model.raw-output.read
forensics.canonical.hidden-world.read
forensics.replay.sanitized-export
forensics.incident.retention-hold.manage
forensics.access-audit.read
~~~

**Default packages** are small: Support L1 gets S1 status/causal timeline for assigned authorized cases; an engineer may have broad *technical metadata* S1 but raw S3 requires a named incident/case and an explicit protected-content grant; Trust has narrowly defined S4 evidence/audit rights. A staff member wearing multiple hats composes **intact grant packages**, not unrestricted dimensions: permission on account A + prompt read on campaign B cannot magically produce prompt read on account A.

**Case assignment is not authorization.** A case link can constrain a grant or supply purpose context, but cannot create the underlying capability. “View as player” preview does not confer user identity or private evidence rights; assisted session and data export are separate product actions.

## 3. Server-side authorization algorithm

At every forensic read, evaluate in order:

~~~text
authenticate staff or player
  -> establish proper principal, purpose, assurance, grant epoch
  -> resolve requested subject (story/G/artifact) internally WITHOUT leaking
     foreign existence to unauthorized caller
  -> verify story/player/participant or staff scope and environment
  -> verify resource type + exact capability + field classification
  -> verify mandatory case/incident/purpose and time bounds
  -> verify step-up / independent approval if this tier requires it
  -> verify artifact retention/status/encryption/custody and no active deletion
  -> for protected body: durable audit intent BEFORE bytes release
  -> fetch exact source/CAS body and verify hash/schema/owner
  -> enforce field-level release projection, size cap and signed source links
  -> respond with private no-store headers and correct cache key/expiry
~~~

**No user-supplied ownerId shortcut.** Resolve the target to its own source identity via the application service, then evaluate permission against it. IDs and content hashes are locators, not bearer permissions. For denied or out-of-scope objects, return indistinguishable safe errors without exposing a list of nearby campaigns or counts.

**Authorization remains live:** access epoch/revocation is checked at each read, not only at Admin entry or initial page render. If staff grant is revoked between loading an S1 timeline and opening an S3 raw packet, the latter must be denied. An in-flight stream should close or revalidate at chunk boundaries; permissions must not be cached for an unbounded streaming session.

## 4. Purpose-bound disclosure and read audit

For S3/S4 exceptional reads, require:
- `staffPrincipalId`, staff-session ID and current assurance/version;
- `caseId` or `incidentId` and allowlisted reason/purpose code;
- exact story/entity/artifact, evidence classification and intended fields;
- explicit approved scope and expiry, optional independent approver identity if policy requires it;
- rate/byte/export limits appropriate to role and environment.

**Write-ahead audit:** before returning protected bytes, commit a minimal audit record `access_requested / authorized / denied` with a stable request/operation UUID and source hash/classification (not the content). If this write fails, **do not return protected content**. After source retrieval, append or finalize `content_released` / `unavailable` / `error` with actual response class and artifact ID. Do not claim `human_read`: network delivery or click does not prove comprehension. Even if the response disconnects after the first byte, the initial audit proves that a disclosure was authorized/attempted.

**Revocation:** an approval/grant cannot retroactively erase bytes already delivered to a legitimate browser, so limit exceptional windows, disable persistent private caches/downloads where possible, audit exports and make lawful access purpose explicit. Browser cannot be a trusted container for permanent staff secrets.

**Audit storage:** `admin_audit_event` and dedicated typed evidence-access events can share the existing Postgres governance owner. There should not be an unaudited direct debug endpoint or a separate unprotected “developer mode”. All S3 content should be **data**, never executable instructions in a coding agent or a SQL/JS evaluation control.

## 5. Authoritative read models, not raw table endpoints

Recommended contract split:

| Route family (illustrative) | DTO | Main query evidence, default classification |
| --- | --- | --- |
| `GET /api/admin/campaigns/:id/forensic-summary` | `CampaignForensicSummaryV1` | S1; committed frontier, status, recent source IDs, coverage/freshness |
| `GET /api/admin/campaigns/:id/events?beforeSeq=` | `CampaignEventTimelinePageV1` | S1, optionally safe S2; bounded meaningful events and causal links |
| `GET /api/admin/campaigns/:id/historical-state?seq=` | `HistoricalStateAtV1` | S1 safe diff or S2/S3 fields with independent authorization |
| `GET /api/admin/operations/:generationId/causal-graph` | `StorytellerOperationCausalGraphV1` | S1 source IDs, statuses, timing, omissions; no raw bodies |
| `GET /api/admin/operations/:generationId/prompt-manifest` | `PromptAssemblyManifestV1` | S3 **metadata** under selected grant; source ID/version/hash/owner/decision |
| `POST /api/admin/evidence/read-intents` | `ForensicAccessIntentV1` | S3/S4 trusted purpose/access request with audited decision, not content |
| `GET /api/admin/evidence/:artifactId/content` | `RestrictedArtifactViewV1` | S3/S4 separate access check/audit and bounded body |
| `POST /api/admin/forensics/export` | `SanitizedReplayExportJobV1` | Named sandbox purpose, approved fields/sources/expiry; no prod replay |
| `GET /api/stories/:id/playback?cursor=` | `StoryPlaybackWindowV1` | Player perspective only, separate from staff API and no game commands |

**All DTOs have a strict schema and explicit coverage** (`complete, partial, expired, not-recorded, unavailable, denied` with carefully classified disclosure). A missing provider trace is not a missing completed action; a successful model generation is not proof publication. A SQL read projection can be rebuilt from authorities, never become a second writable game.

**Pagination/limits:** a long campaign must not return thousands of blobs in one response. Metadata timeline is bounded (start with 20–50 records per page; measure), graph expansion is lazy, prompt component list is paginated or bounded by actual selected packet, raw bodies fetched one artifact at a time with size/byte ceilings. Historical state uses a verified checkpoint/transition range, not `SELECT *` on every previous object.

**Business provenance:** an event page links exact source receipt/event/passage and code/contract version; it never relies on a compiled regex over process log strings to answer “why”.

## 6. Cache/SSR and UI security

- In Next Admin, private responses are `no-store` with no edge/CDN shared caching. React Query keys include staff actor, grant epoch, case/purpose, environment, story/G/artifact and disclosure tier. An S1 Query must never hydrate S3 body under the same key.
- Staff logout, account switch, permission revoke and case closure invalidate protected data and close SSE. Do not prefetch raw packet bodies in background or embed S3 data in server-rendered HTML hidden tabs.
- Live timeline SSE may announce **a change exists**; fetch the latest authorized view after reconciling grant. It must not carry secret prompt text or raw generation input.
- UI uses text escaping, trusted constrained Markdown rendering, content-security policy and safe downloadable file types. A player’s untrusted prompt is shown as **quoted data**, not executed in an interactive browser/agent console.
- No arbitrary SQL editor, arbitrary JSON Patch/Story mutations or private “copy entire campaign source” button under ordinary Support/Developer permissions.
- Cursor/ChatGPT/other coding agents should receive only minimized, specifically authorized exports. A prompt injection stored in player text must not become an instruction to the coding assistant merely because it appears in an evidence bundle.

## 7. Erasure, expiry and legitimate forensic retention

Each protected artifact needs retention class, subject/purpose owner, expiry and deletion/hold status. Authorization must check **both** current viewer scope **and** current source retention. An Admin may still see a safe tombstone such as “source existed; raw body expired” if lawful; the raw content must not be recoverable from some other SQL JSONB, object-store copy, cached SSR data, backup outside policy or old diagnostic zip.

The current schema's `generation.input`, `generation.output`, `storyteller_dispatch_review.packet` and `storyteller_memory_exploration.snapshot` may retain the full private content. That conflict is a **launch blocker** for any promised raw-content TTL. Do not ship a privacy dashboard claiming erasure until those existing columns, backups and derived copies are covered. A tombstone that says the body expired while the same bytes remain in SQL is a failed policy, not a success. See [retention](retention-and-access.md).

For future shared stories, an account owner, participant, narrative subject and payer may differ. Access to one participant's published passage does not confer another participant's private character information or raw prompt configuration. Build authorization from actual published visibility/participation evidence, not `story.ownerId` as a permanent global policy.

## 8. Negative acceptance suite

1. Support L1 has `ai.operation.read` but not `forensics.prompt.raw-body.read`: safe generation status works; raw packet endpoint denies without leakage.
2. Case A for campaign X cannot be used to inspect campaign Y under a grant scoped to X.
3. Staff role overlap and self-assigned case never compose into unauthorized S3 capability.
4. Authorized engineer reads metadata, loses grant, then attempts body GET with old deep link: denied; no old Query cache hydration.
5. Protected audit storage down: raw body read denied **before** disclosure; ordinary player gameplay unaffected.
6. Old `generation.input` path is not exposed via another controller, even when protected CAS artifacts are correctly gated.
7. Artifact hash matches but owner/story scope differs: denied; no cross-tenant dedup leak.
8. Raw body expired, source SQL still physically present: **test must fail policy conformance**, not pass because new CAS TTL was obeyed.
9. Actor switches between two Admin sessions in same browser: no stale S3 SSR or SSE content under new actor.
10. Player-controlled malicious text containing instructions/scripts cannot execute in the viewer or in a sanitized Chamber export.
11. Forensic replay GET does not mutate campaign, time, receipt, paid attempt or Storyteller generation.
12. Public event shown to player B only if B's authorized perspective includes it, not because A's staff case made it visible.
13. Malformed/source-incompatible artifact produces a typed `corrupt/unavailable` diagnostic without echoing body or raw DB driver error.
14. Audit record distinguishes “authorized response attempted” from “human read everything”; no false human-comprehension claims.
15. Independent export/retention-hold permission needed even if a developer can view one raw packet.

**Ready gate:** owner/security review of role/purpose/retention policy; existing Admin grant registry and audit source inspected; first S1 projections implemented and tested before exceptional raw body access. No access-changing Change is authorized by this document.

## Reconstruction steps

**Proposed, not landed.** The S0–S4 contract above is the access rule. This section is how a read would rebuild a moment after capture exists. It does not add a grant. The writer that would record those transitions is [proposed transition capture](capture-and-provenance.md). That page is not a landed writer and it does not authorize a Change.

An operator must name which truth they asked for:

| View | What it is | What it is not |
| --- | --- | --- |
| Committed frontier N | State after a completed SQL story transition | A projected future completion |
| Projected near future | An estimate from clock pace and a valid activity | A historic fact |
| Published narrative | What a permitted viewer could see | Every private mechanic or model thought |
| AI candidate | A frozen task, packet or pending output | Proof the story accepted it |

`readHistoricalState(storyId, targetTransitionSeq, viewerPurpose)`:

1. Authorize the viewer, the purpose and the field projection.
2. Require a real committed transition at or after the earliest complete instrumented frontier.
3. Take the newest verified checkpoint at or before the target. Reject a mismatched schema, owner, codec or checksum.
4. Read the ordered transitions after that checkpoint through the target, including ordinal steps inside one commit.
5. For each step, check the next sequence or a recorded gap, the typed delta, immutable source refs, and the before and after digests. Apply the **recorded** values only.
6. Project the authorized perspective. Return state, as-of, coverage, source refs, integrity and what is unavailable.
7. Do not write the game, call the Storyteller, draw randomness, advance time, admit work, signal Temporal, or touch the outbox.

The applicator reuses recorded values and validation. It does not call the live command functions. Those functions may roll dice, read the clock, or contact other services. If the design becomes a generic JSON Patch interpreter, reject it.

A missing historical root is a gap. Do not fill it from today's `story.documentRootHash`. A checkpoint built by reading the live campaign later is not a checkpoint of the old frontier.

Substeps inside one SQL commit explain the batch. The only public frontier is the commit's final digest. Label intermediates "within one atomic transition."

Sorting only by `gameSecond` can show a report before it was published. Sorting only by passage can hide mechanical progress that did not change the scene. Both axes stay visible. Coverage is several facts at once: published scenes through a revision, mechanical reconstruction from a transition onward, and whether a raw packet is still retained. One green badge is not allowed.

**Landed limit.** C1 and C2 proved narrow recovery and an interrupted-action receipt. They are not this reader. No production reconstruction endpoint exists.
