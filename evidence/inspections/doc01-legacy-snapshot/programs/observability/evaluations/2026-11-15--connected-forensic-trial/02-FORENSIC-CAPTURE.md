# S2 | Trace real persisted game/Storyteller evidence through its original source

**Goal:** produce one verifiable diagram/data table built from **actual SQL rows and source IDs**, not from log snippets, mock JSON or an inferred SA01 fixture. Read [S1 checkpoint](CHECKPOINT.md), [OBS02](../../evidence/obs02-execution-stages-2026-11-15.md) and [OBS03](../../evidence/obs03-prompt-provenance-2026-11-15.md) via paths under `evidence/runs/observability-program-2026-11-15/` only when needed, and this phase. Provider-free, read-only except synthetic fixture runs.

## 1. Build the causal ledger from the *actual* campaigns

For `storyId=A` and `storyId=B` saved in S1, query a **read-only, pinned-source snapshot** of **safe columns only**. The local Compose Postgres is loopback; never target a hosted DB. Example:

~~~sh
docker compose exec -T postgres psql -U offscreen -d offscreen_chamber -X -v ON_ERROR_STOP=1 -c \
  "select id, revision, view_version, document_root_revision, created_at from story where id = '<STORY_UUID>'"
docker compose exec -T postgres psql -U offscreen -d offscreen_chamber -X -v ON_ERROR_STOP=1 -c \
  "select id, sequence, source_generation_id, response_source, created_at from story_passage where story_id = '<STORY_UUID>' order by sequence"
docker compose exec -T postgres psql -U offscreen -d offscreen_chamber -X -v ON_ERROR_STOP=1 -c \
  "select event_sequence, kind, source_kind, source_id, passage_id, game_second, created_at from story_public_event where story_id = '<STORY_UUID>' order by event_sequence"
~~~

These examples intentionally avoid `story_passage.content`, `story.premise`, private plans, source document bodies and prompt text. Substitute **only the actual local story UUID**. If test stories live in `offscreen_auth_test`, query that DB **before** running any other `pnpm test:focus` since each invocation resets it. No changes to SQL authority from forensic analysis.

Add exact observed `story_resolution`, `game_action_execution_event`, `game_action_receipt`, `game_activity_event`, `world_obligation_event` **IDs and bounded outcome codes**, only when relevant. Determine actual columns from `packages/db/src/schema/{stories,campaign}.ts`, don't blindly `SELECT *` or paste SQL JSONB into Git.

**Make a row/edge map**:

~~~text
story S current source passage P + revision R
  -> accepted operation O (if any)
  -> execution/event E + receipt Q (if settled)
  -> story/source G (if narrated)
  -> capture C/Stage1 frozen source
  -> actual OBS02 stage rows (source IDs)
  -> OBS03 promoted consequence manifest (when supported)
  -> model attempt(s) (if any) / explicitly not recorded
  -> publication status + published passage P2
~~~

**Every arrow** should be labelled:
- **Recorded:** explicit source ID/revision relation, proven by source SQL.
- **Derived:** validated deterministic join/claim, with named rule.
- **Unproven:** plausible process order but no persisted source link.
A common cause or mere timestamp proximity is **not** a causal edge.

## 2. Inspect OBS02 real execution-stage receipts

Use one genuine **G** from a Source A/B (or a dedicated actual provider-free consequence fixture if those flows didn't make one), and inspect:

~~~sh
docker compose exec -T postgres psql -U offscreen -d offscreen_chamber -X -v ON_ERROR_STOP=1 -c \
  "select generation_id, stage, outcome, source_kind, source_id, idempotency_key, created_at, producer_build_id from storyteller_execution_stage where generation_id = '<G_UUID>' order by created_at, id"
~~~

The stage row has **no raw narrative** by design. Confirm:
- `cause-captured`, real materialization start/complete or held, task prepared, scripted skip, validation, publication **only if actual source produced those stages**;
- same G through provisional capture/promotion, not a second G;
- rearm epoch+attempt key distinct (OBS02-H), no false terminal row from stale lease;
- source stage identity matches actual capture/publication/source row;
- timestamps are **observed stage times**, not one total causal sequence across Temporal;
- stage coverage is **partial** when unsupported purpose/legacy/worker path.

**If no stage rows exist**, do not call it a failed OBS02 test until checking whether the executed path falls within supported purposes and whether the relevant migration and instrumentation were enabled. Record the source-coverage reason.

## 3. Inspect OBS03 sidecar without reading the prompt body

For a **promoted consequence/pending-consequence** G, not a held provisional G:

~~~sh
docker compose exec -T postgres psql -U offscreen -d offscreen_chamber -X -v ON_ERROR_STOP=1 -c \
  "select generation_id, task_input_sha256, compiled_request_sha256, created_at from storyteller_prompt_provenance where generation_id = '<G_UUID>'"
~~~

Inspect `manifest` **only in a private local process** if necessary for a bounded type-level audit, and write only:
- schema and producer/compiler build ID;
- component IDs, counted inclusion statuses and SHA *prefixes* where useful;
- effective profile ID/revision and **whether campaign settings revision was actually captured**;
- source candidates: selected/loaded/omitted counts, **observed vs task-derived**;
- `packetBinding` actual semantics: `compiledRequestSha256` is the task's model-neutral request hash, **not** proof of byte-identical provider HTTP request;
- no raw profile instruction, canonical source contents, full task JSON or provider packet in Git.

**Expected negative:** a held G before Stage2 promotion has **no** `storyteller_prompt_provenance` manifest. Do not label that "context empty" or "source missing" unless source capture proves it.

**Compare G1/G2** if both exist: inspect whether prompt source component/catalogue and settings/profile version differ. If only one G was captured, use an actual scripted additional fixture to create a second; don't claim a profile-regression comparison without data.

## 4. Check original game authority independently

For one real accepted operation O from the campaigns, prove:
- `story.revision` vs committed `campaign.gameSecond` and `viewVersion` are separate; GM05 public event seq is a third namespace.
- An accepted but running activity/action has **no successful final effect** without a source receipt.
- Interrupt: actual `gameActionExecutionEvent.kind='interrupted'` and **no `gameActionReceipt` for same O**; do not re-run random draw to "verify."
- Published passage links to source G only if actual `story_passage.source_generation_id`; a successful G with failed publication does not make a passage.
- An older published scene source is unchanged after current game moves; **do not** claim arbitrary historical character/hold state without OBS04/complete E0 prefix.

Write a compact table per episode `(O, G, source IDs, gameSecond before/after, passage revision before/after, attempt status, publication, source coverage)`. Blank/null means **unknown/no record** as defined, not "0".

## 5. The diagnostic truth challenge

Use the existing `createStorytellerEvidenceLineageV2` fixture output (OBS05) **only as an adapter**. Test two distinct propositions:

- **Source final-included but not cited:** only `packet-included-uncited` when proof exists; never “model ignored it”.
- **Source loaded then pruned:** may claim not in *that final packet* when actual selector + packet proof exist; cannot assert the model never knew the fact if included elsewhere.

For a real G, determine whether source observations were emitted by actual selection stages or merely **derived from final task** (OBS03). Mark what is unproven; do not re-run current selector over a changed canonical root and present it as history.

## 6. Inspect current observability coverage without deploying Grafana

Inventory current low-volume `runtime-logging`, actual SQL stage tables, current provider attempts and local Temporal status. Confirm whether OTel collector, Prometheus and Grafana have been implemented **or remain design**. A sample operational span from a fixture is not a production trace. No obligation to install monitoring tools in this evaluation.

**Critical question:** "If the customer reports this 3 weeks later, what could an engineer know from *persisted* SQL/CAS evidence if process logs have expired?" Answer source by source. Preserve a missing-evidence matrix for S6.

## 7. Exit S2

Save a **sanitized one-page trace** in `RUN-LOG.md` for at least one G and one command:
- IDs/link edges and their evidence class;
- stage count/epoch/order and source rows;
- OBS03 manifest presence/hash/limits;
- private body availability classification;
- game effect vs generation result vs publication;
- one **specific unanswerable** question and **specific source boundary** that would need capture.

Do not paste raw packets/SQL input JSON. Push checkpoint and evidence before the next Cursor session.

**Next:** [S3 intentional failures and retries](03-FAULTS-AND-RETRIES.md).
