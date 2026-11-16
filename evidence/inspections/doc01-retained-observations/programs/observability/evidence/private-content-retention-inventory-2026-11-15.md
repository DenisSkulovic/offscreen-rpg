# Private content custody inventory | Existing copies, readers and retention blockers

**Evidence class:** direct source/schema inspection of GitHub `main` `7e15db38`, 2026-11-15. **No** production DB scan, disk inspection, backup/replica enumeration, real player content review or test execution. See [protected artifact port](../../../../../../docs/technical/observability/retention-and-access.md), [physical model](../../../../../../docs/technical/observability/retention-and-access.md), [sensitive access](../../../../../../docs/technical/observability/investigation-and-reconstruction.md). This document is a **source-based candidate data inventory**, not proof the organization already handles data correctly.

## 1. Critical conclusion

**A future 30/90-day “raw AI payload TTL” would currently be false if implemented only in a new CAS store.** The existing schema persists model and player content in multiple first-party PostgreSQL JSONB/text columns. Some of those are **necessary to execute in-flight work**, some are canonical player story data needing a *different* long-lived product purpose, and some are derived/support/QA copies that may be transient.

The answer is neither “delete all generation inputs after 30 days” nor “retain all private data forever.” Define **content class + source owner + actual read dependencies + lawful subject + retention state** and then migrate *every physical copy* to a consistent custody rule.

## 2. Classify by source owner, not superficial field name

| Source and actual columns | Likely body contained | Authority and lifecycle | Preliminary disclosure/retention treatment |
| --- | --- | --- | --- |
| `generation.input JSONB NOT NULL` | Frozen Storyteller task, profile, context, source evidence and compiled request, or other generation types | **May be required** for execution, retry, repair and publication; owner FK `restrict` | **High sensitivity.** Keep while needed for task; later decoders must support protected artifact pointer. Cannot simply `SET NULL` without schema/code migration |
| `generation.output JSONB` | Validated Storyteller candidate or scripted content, possibly private options/continuity | Final task output, may be needed at publication/review | Preserve published outcome separately under game story policy; raw unpublished candidate governed short forensic class after terminal |
| `generation.repair_candidate / repair_diagnostic JSONB` | Rejected output and structured diagnostics, possibly original model text | Debug/recovery; not canonical world | Raw candidate protected/short-lived, diagnostics sanitized or held by explicit case |
| `storyteller_context_capture.capture JSONB` | Frozen SQL authority/context source, story facts, character and context selections before CAS stage | Provisional same-G correctness/retry, with capture SHA | Protected task-source evidence; cannot expire while materialization/rearm eligible; after settlement may move to source-referenced artifact with bounded retention |
| `storyteller_dispatch_review.packet JSONB` | **Full inspected OpenRouter packet body**, includes model-visible system/user prose and output schema | Required review/dispatch identity; packet SHA + revision/status | High-sensitivity E1 source. Raw-body retention must include **this** SQL column; no generic AD05 raw read |
| `storyteller_dispatch_review.inspection JSONB` | Request sizes, hashes, provider projection/diagnostic metadata | Mostly technical metadata, may still reveal source identity | Prefer longer narrow metadata class; verify no embedded body in actual inspection object |
| `storyteller_memory_exploration.snapshot JSONB` | Tool round history, handles, selected/returned evidence, working state | Bounded agent controller state for in-flight and recovery | **May include private retrieved content**; classify/inspect schema before any public export or TTL promise |
| `storyteller_memory_exploration.pending_model_request / pending_model_output JSONB` | Pending exact model round request and response | Durable uncertain/settlement recovery | Protected E1 until attempt definitively settled, with no blind resend |
| `storyteller_memory_exploration.pending_request / final_output JSONB` | Tool request/intermediate/final content | Multi-round operation and final generation result | Protected raw or final published content based on actual status; expiry blocked by active operation |
| `storyteller_operation.resources JSONB / storyteller_attempt.policy+attribution JSONB` | Effective usage/recipe/model/routing metadata, potentially identifying user/story fields | Funding and audit/cost reconciliation | Not assumed public just because no prose; retain according to accounting requirements and minimize exposed fields |
| `story.premise/storyteller/continuity_notes JSONB` | Campaign narrative, private direction and persisted memory | **Canonical ongoing story product data** | Story lifecycle/perspective rights, not raw packet TTL; never expose to Support by default |
| `story_passage.content/response/interaction/appearance/decision_plan/wait_plan/effects JSONB` | Published narrative, recorded response and possibly private rules/decision options | Historical player story and source of playback | Retain with story rights while promised; separate private fields and hidden plans from player-visible replay |
| `story_resolution.submission / story_control.request JSONB` | Player response/command, selected offer, potentially text | Accepted command/choice evidence | Durable product-replay/source truth; per-person perspective and erasure policy |
| `campaign.character/story_facts/content/offer/holds/accepted_activity_plan/world_conditions JSONB` | Canonical/current mechanics, possibly private descriptive setting | **Mutable live authority** | Live source; historical protected deltas/checkpoints separately, not short raw-provider TTL |
| `campaign_settings.settings/profile JSONB / storyteller_preset.creative/profile JSONB` | User-selected creative direction/personality/settings | Versioned settings vs mutable user preset | Retain actual effective version with story; source creator/revision, subject rights; not a universal staff-readable AI config |
| `campaign_command.request / game_action_receipt.offer/plan/effects/roll / game_activity.plan/progress` | Player intention, mechanical rules/checks, frozen plan, effects | Game authority and historic receipts | Protected gameplay history, retain while replay promise requires; raw model source text not automatically necessary |
| `world_obligation.definition / world_obligation_event.details / campaign_report.report JSONB` | Hidden future obligations and published/queued historical report content | World source, event and report hook | Distinguish **hidden-unpublished** from player-visible published report; permission and lifecycle differ |
| `custom_intent_candidate.input_text/response` | Free text authored by player in GM01 proposal, even if rejected/unsupported | **Candidate state, not canonical game command** unless accepted | Separate short operation/abuse purpose; do not automatically retain every rejected typed input as long-lived story history |
| `story_draft.title/premise/storytelling_direction/text and storyteller JSONB` | Player-created original narrative and private direction | Draft product data before Start | Draft deletion/abandonment and Start source lineage, not per-model forensic TTL |
| `story_public_event.title/summary` | Player-safe sourced event projection | Derived GM05, not complete canon | Player-facing only after validated source perspective; delete/rebuild when original rights change |
| `story_viewer_visit_open/ack` | Viewer IDs, visit frontiers and token references | Personal attention metadata, **not** gameplay history | Short challenge lifecycle; don't treat opening token as full read receipt |
| `admin_audit_event.payload` | Staff action reason/grant/case/resource metadata | Security audit | Keep bounded lawful purpose; **never** insert full prompt or private game dump into audit payload |
| `admin_case.title / admin_case_link.subject_id` | Support case purpose and linked entities | Support/case operational data | Case retention/redaction separate from player's story; don't copy raw prompt into case title/notes |
| `qa_run.case_definition/setup/execution/accounting/environment/notes + qa_run_stage.evidence` | Fixtures, observations, potentially player/model text if imported from a real incident | **QA copy**, not canonical game state | Test-only synthetic by default; any production bundle requires sanitized export/purpose, expiry and explicit access |
| `auth.account.access_token/refresh_token/id_token/password`, `session.token` | Credentials/secrets | Identity security source | **Never forensic-capture or export raw**, including OTel exception bodies, SQL debug and incident bundle |
| `DocumentStore` canonical CAS `source_passage`, structured docs, manifests | Published/hidden narrative, world/rules, canonical owner | Immutable content-addressed product source | Product retention/manifest reachability; private DM-only documents still protected and separately authorized |
| Optional `LocalLexicalStoryIndexStore`, caches and exports | Derived text/search fragments and source handles | Rebuildable, not authority | Must expire/delete with source rights and not become shadow private history |
| Process logs/OTel/Tickets/Browser caches | May accidentally include raw text via exception or inspection | Derived/operational, often third-party | Explicit metadata-only collection and export filtering; not an accepted raw-provider archive |

**Important existing SQL shapes:** `generation.input` is `NOT NULL`; `story_teller_dispatch_review.packet` is `NOT NULL`; `campaign` stores current mutable state. Their foreign keys/restrict/cascade vary by table. A deletion/archival migration must examine FK graph and task decoders, not assume `ON DELETE CASCADE` on player automatically purges all protected history.

## 3. The content-class matrix we actually need

| Class | Examples | Persistent reason | Proposed custody |
| --- | --- | --- | --- |
| **P, published player product** | published passage, visible effects, canonical user-known story/character, replay media | User explicitly plays/keeps/replays this story | Story lifecycle; user-authorized access/export/delete, long-running if product promises |
| **G, committed game authority** | accepted command, recorded RNG/effects/time/holds, typed state deltas/checkpoints | Integrity and deterministic historical replay | Durable while corresponding story playable/replayable; hide private mechanics by viewer scope |
| **R, raw restricted AI** | full model request/response/tool output, unpublished candidate, private DM plans | Debug exact real incident and source provenance | Protected, finite/opt-in retention; expensive and sensitive, no default staff read |
| **M, narrow provenance metadata** | packet/model/adapter hashes, profile/recipe/config revision, source selected/omitted IDs, validation status | Debug after R body expires | Longer bounded, personal-data review; meaningful coverage after body expiration |
| **O, operational transient** | OTel spans/logs, HTTP traces, failed request details | Latency and on-call symptoms | Short retention, sampled/aggregated, metadata-only |
| **S, security/administrative** | staff grant/audit, access intent, case/incident references | Attribution, security, regulatory obligations | Separate lawful governance and minimal disclosure |
| **T, disposable QA/repro** | Chamber bundle, synthetic experiments, sampled screenshots | Test/reproduction, not source truth | Expiring, isolated, sanitized; no silent raw customer import |

**Orthogonal dimensions**: subject/tenant, player perspective, hidden-world visibility, declared lawful purpose, existing active task dependency, privacy request/legal hold, sensitivity of free text, and known duplicates. A field may be both G and contain P/R content; that requires explicit partial projection or storage splitting, not blunt TTL based on a table name.

## 4. Where data leaves the original owner

### A. Application code and worker

- `prepareStorytellerTask` archives prompt/context in `generation.input`.
- `prepareDispatchReview` archives inspected `packet` and `inspection` before provider attempt.
- `memory-exploration-controller` persists pending/request/output/snapshot to survive retries.
- `budget.reserve/dispatch/settle` writes attempt and cost metadata, not proof of provider-side receipt at dispatch.
- `publication.ts` writes passage/plan/continuity root once source fences pass.
- `campaign` and `story` overwrite active state; derived story snapshots and cache may temporarily duplicate data.
- `LocalDocumentStore` / `S3DocumentStore` write immutable docs to separate local/object storage.

### B. Human/automated inspection

- `admin/diagnostics-reads.ts` projects **redacted** states and safe failure classes; this is a good boundary. It still joins `storytellerAttempt` for list, so unattempted generations may not appear in campaign list; a new Forensic read should avoid that coverage blind spot.
- `stories/reads.ts::readSnapshot` selects `generation.input` and repair fields into a server-side read transaction to classify retry/blocker, **then returns validated public projection**. This currently does not imply raw exposure to browser, but bulk selection/caching may increase sensitive data access and complicate future SQL-body migration. Preserve only required status/repair projections where possible.
- `chamber`/QA can inspect test contexts; access to real customer data must not be silently inferred from developer-tool route availability.
- `storyteller:packet-audit` may write local fixture `operation-traces` files; they are lab evidence, **not** live production captures.

### C. Backups and distributed data

Not inspected: actual production PG replication/PITR retention, S3 versioning/Object Lock/bucket encryption, client CDN, external monitoring/provider logging, internal helpdesk, incident exports, developer laptops, GitHub artifacts. These are **open inventory gates**. Do not claim an erasure guarantee until each active configured system is included and its retention is verified.

## 5. A sane staged migration that does not break running stories

**Phase I, classify/lock down (no destructive data migration):**
1. Enumerate actual active generation statuses, raw JSONB sizes and consumer queries **using a disposable DB or approved read-only dataset**.
2. Enforce protected read APIs and audit; keep existing task execution semantics unchanged.
3. Add a source copy registry (`contentClass,subject,sourceRef,retentionPolicyId,activeDependency`), or encode this in existing artifact descriptors rather than a generic global registry.

**Phase II, new-write custody:**
4. Introduce verified `ProtectedEvidenceStore`, with secret-free wire bytes and typed source values.
5. Stage protected raw bodies and persist immutable refs before *new* paid dispatch. Write a source-body compatibility adapter without changing original generation ID, receipt, prompt or model.
6. Instrument one task purpose, check exact raw task+packet read equivalence and retries under injected faults. Existing SQL copies may remain temporarily, but the system must state “dual copy: raw TTL not enforced”.

**Phase III, consumers switch:**
7. Move in-flight execution/recovery/publication readers to a version-aware task loader that accepts legacy inline JSON and new protected artifact refs. Preserve v15/v16/v17 decode and root/policy identity. No model reruns to migrate.
8. Move administrative privileged reads and QA export to the same governed loader; disable direct uncontrolled raw SQL dump paths.
9. Model pre-existing generation rows separately: only terminal/nonneeded records can have raw content migrated/expired safely; active/uncertain/retryable tasks require their actual recovery dependencies.

**Phase IV, erasure and proof:**
10. Design additive `generation.input` reference shape with an explicit discriminant while column remains NOT NULL, or a strictly validated new pointer field; verify every query/foreign key/state constraint. Do not simply null the required column.
11. Purge or replace raw SQL values only after dual-read is proven and all consumers migrated. Verify no old raw body can be reached through data views, caches, QA files, nonexpired backups or process logs; retain valid product P/G history under separate policy.
12. Implement repeatable deletion directives, bounded lawful holds, subject- and storage-version-aware GC, restore-tombstone application and honest Admin status.

**No big-bang rewrite.** Additive migration with explicit compatibility/rollback plan is crucial while Temporal may resume an old execution hours or days after the code changed.

## 6. Retention policy options for the product owner

The initial [retention doc](../../../../../../docs/technical/observability/retention-and-access.md) suggests **30-day standard raw + 90-day incident hold** as a candidate. This is **not accepted**, and is arguably short for diagnosing a months-old narrative inconsistency. Consider alternatives:

| Option | Benefit | Trade-off |
| --- | --- | --- |
| Short raw default (30 days), long metadata/history | Least private raw accumulation | Old LLM-context incidents become metadata-only; a real user may report weeks late |
| Medium raw default (90 days), case hold to 180 | More time for ordinary support cycles | More cost/insider access risk; requires deletion and audit maturity |
| Explicit enhanced diagnostic retention by story (e.g. 180–365 days) | Supports long-running campaigns, users and beta testing with consent/notice | Tiering/consent complexity and high storage; still no blanket indefinite |
| Never expire raw private model packets | Maximum source availability | Indefinite sensitive-data blast radius, unclear legal purpose/erasure, increasingly costly; **not recommended** |

**Advisor position:** decide on **long-lived published story + committed game evidence** first; allow **explicit prolonged forensic capture on development/test stories**, and choose production raw window only after real size/privacy/legal review. A single hardcoded 30-day TTL would be premature for the user's forensic ambition. Do not claim consent/legal basis is automatic merely because a toggle exists.

## 7. Falsifiable inventory completion gates

- Every persisted raw Storyteller/task/tool source location has a schema owner, actual runtime reader, required active lifespan, archive class and verified expiry/deletion method.
- A synthetic high-PII sentinel inserted in a test generation is discoverable only by granted readers, and disappears from **every** raw source path when deletion is complete; metadata/published story remain according to their own legal classes.
- Active G pending/uncertain, including C1-R capture rearm, can finish or remain safely blocked through a storage-reference migration without new provider spend, lost input or source rebase.
- Older v15/v16/v17 tasks remain decodable until intentionally retired; no unbounded “parse unknown JSON” rescue path.
- A revoked developer cannot use old Admin SSR/Query/cache to retrieve raw prompt; `ai.operation.read` alone is insufficient.
- Per-class storage/backup metrics and orphan/tombstone/hold status are visible in Admin, without leaking body/content.
- No raw secrets from `auth` are copied to forensic artifacts or exported to telemetry.
- Reader can distinguish **raw expired**, **not captured**, **staged but uncommitted**, **stored but unauthorized**, **corrupt** and **no model request ever sent**.
- A restore from a dated backup replays deletion tombstones/holds before exposure and does not “resurrect” supposedly erased content.

**Next:** [proposed custody/erasure protocol](../../../../../../docs/technical/observability/retention-and-access.md) and [change execution menu](../../../../../../docs/technical/observability/identities-and-evidence.md). No retention policy is selected or enforced by this document.
