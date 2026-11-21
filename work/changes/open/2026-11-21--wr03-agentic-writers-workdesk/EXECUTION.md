# WR03 | decided execution design (planner-owned)
**Depends on WR02's landed v2 reader and exact-root citations.** Preserve legacy one-shot and memory-exploration routes as independent versioned recipes.

## Contracts and custody
Define `writer-mission.v1` immutable capture: generation/operation ID; owner/story/scene frontier; Library root+revision; profile and skill object hashes; tools allowlist; model selection; effective spend/round/token/time budgets; captured request hash. Store small capture and revisioned step journal (schema migration with UNIQUE (missionId,stepOrdinal), UNIQUE (missionId,modelAttemptId) or existing equivalent). Provider attempts continue through existing `storytellerOperation` / `storytellerAttempt` budget fences. Do NOT put unbounded transcript/document bytes into SQL: compact exact request/result descriptors and CAS hashes only; keep provider payload where existing custody contract requires. Use one stable attempt/step identity per requested provider call; after successful result persisted, replay that result with no re-dispatch. Unknown-delivery stays held/uncertain with its reserved spend, no automatic new attempt. Budget exhaustion produces a terminal explicit state rather than silently switching providers.

## Deterministic step state machine
`captured -> model-request-prepared -> attempt-reserved -> dispatched -> result-settled -> tools-applied -> model-request-prepared ... -> proposal-ready | held | failed | uncertain`.
Use optimistic SQL revision CAS to claim/apply **one step**. An external provider request is prepared and durably claimed before transport; result is durably settled before interpreting. On restart, continue from last settled outcome and re-execute idempotent tool step only if its result receipt is absent, using same tool invocation ID. No implicit “latest” root read. Final proposal carries hashes for staged objects and source evidence and cannot write canon.

## Provider decision serialization (settled after source review)
Use the observed `packages/storyteller/src/providers/openrouter.ts:buildOpenRouterRequest` and `prepareOpenRouterWire` which already serialize captured messages plus a strict JSON Schema `response_format`; do **not** introduce native provider function-call protocol. Add a versioned round-decision JSON Schema with `tool-calls` (bounded array of typed tool requests with caller-generated stable IDs) or `final` proposal. Persist the exact prepared wire SHA and provider result before interpreting tools, then append verified tool result summaries to the **next** captured messages. `createOpenRouterProvider` remains one provider attempt, with no retries or changed outputProtocol mid-mission. Existing `StorytellerProvider` task typing may require a new writer-round task union; implement it as a versioned route while preserving legacy `StorytellerTask` parse behavior. No tool request may directly publish a scene.

## Tool facade and Workdesk
Expose typed `library.browse/find/read/diff`, `skills.open`, `workdesk.stage/read/diff/discard`, `submit_scene`. Every tool accepts captured mission scope; root membership + visibility checked on every read. Per-tool byte/page/count caps and mission ceilings; no raw filesystem, network, SQL, arbitrary shell or tools-granting Markdown. Search returns hints then opens exact rooted source; stale/foreign citation fails. Profile is deterministically core-injected as creative-only content. Skill opens only pinned hash and never changes spend/security grants.

Workdesk stores private draft file bytes as v2 immutable CAS and a compact mission-private root/revision pointer; `stage` compare-and-set on expected revision, `read` and `diff` are root-scoped; `discard` updates the private selector, not published Library. Each tool invocation is idempotent under mission ID+tool-call ID. Final scene proposal lists adopted stage hashes and provenance; WR05 applies or rejects it as one publication transaction. A simple scene can skip research/staging, but **not** mission capture/custody.

## Edit order
1. Versioned schemas and mission capture; focused validation tests.
2. Durable step claim/replay/budget + crash tests.
3. WR02 rooted tool and pinned skills facade + authorization negatives.
4. Workdesk private CAS/selector + revision tests.
5. Provider decision→tool loop + scripted 200-scene and restart fixtures; do not run paid providers.
6. Typed final proposal contract and existing generation integration seam, without touching GA published state.

**Hard stop:** real provider tool-call transport not mapped, WR02 v2 reader not landed, or custody cannot distinguish unknown delivery; return exact signatures to ChatGPT rather than redesigning. **Collision:** WR04 cannot edit controller before WR03 closes.