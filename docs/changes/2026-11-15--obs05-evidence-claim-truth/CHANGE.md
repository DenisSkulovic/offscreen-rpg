# OBS05 | Stop reporting unproven model ignorance as forensic fact

**State: Proposed, not Ready.** **Scope:** bounded Storyteller SA05/SA01 diagnostic-label correctness and versioned provenance-only read adapter, provider-disabled tests. **No model/prompt/game mechanics change, no persisted production trace or Admin raw-content grant.** Authority: [claim semantics](../../observability/technical/evidence-claims-and-quality-v1.md), [source context](../../observability/technical/context-provenance.md) and [the read-only Turn Capsule](../../observability/technical/forensic-turn-capsule-v1.md). **Source baseline:** `main@010c980`, 2026-11-15, after OBS00-A and OBS01.

## Why this is a real source issue

- `packages/storyteller/src/providers/evidence-lineage.ts::classifyFailure` returns `model-ignored` for a final-included discovered memory item with no `cited-used` declaration. This proves **uncited** only, not actual non-use, so the label is too strong.
- `createStorytellerEvidenceLineage` defaults stored/eligible/discovered/exact-loaded to passage handles derived from the final task if those stage inputs were not supplied. That's **derived** coverage, not observed retrieval.
- When publication is marked published, it defaults `publishedHandles` to all final packet handles (plus citations). That is **publication status**, not proof each source was semantically incorporated into the published story.
- `operation-trace.ts` creates new random visual span IDs on every invocation and can default non-`not-run` modes to completed provider rounds when explicit rounds were absent. Those are fixture presentation shortcuts, not durable event/attempt IDs.
- The final packet lineage helper uses `inspectOpenRouterRequest(task)` without an actual per-round override unless its API is expanded. For repaired/memory turns, `task.request` may differ from the actual `dispatch.request`. OBS00-A now forwards overrides; OBS00-B current authority remains blocked.

**Do not claim customers already saw an incorrect root-cause message:** current SA05 is fixture/lab-only; this packet prevents importing its false precision into the future forensic Admin.

## One bounded implementation contract

1. **Preserve v1 fixture backward compatibility:** retain original `storyteller-evidence-lineage.v1` artifact reader/fixtures or a tested compatibility adapter; do not silently reinterpret old saved output. New production-facing metadata must have an explicit **new version** and clearly different semantics.
2. **Replace the overstrong failure diagnosis:** emit `packet-included-uncited` (or equivalent *observation*) when final packet inclusion and absence of citation are verified. The proposition “model ignored the source” must remain a **hypothesis** requiring separate semantic evaluation, never an automatic source status.
3. **Record observation origin:** source stage booleans have status `observed` / `derived-from-task` / `unknown`. If `stored/eligible/discovered/loaded` weren't observed from actual producer stage inputs, do not mark them direct evidence. Closed candidate-set/omission reasons require actual selector version and coverage.
4. **Separate publication levels:** `generation published` ≠ `specific source used in published prose`. Only actual source claim/field reference or validated source-derived claim permits `source.claim-published`. Otherwise label `publication-status-only` with source use unknown.
5. **Bind packet to the correct attempt/round:** the forensic lineage reader requires exact `generationId, attemptId/roundId, packetSha256` and, where present, the actual `StorytellerProviderDispatch` override. A task-only packet reconstruction is *derived* and cannot claim actual transmitted bytes.
6. **Stable stage identity:** production read nodes must use real persisted source/stage IDs or deterministic derived IDs from source identity+version, not random UUIDs created on every GET. Existing lab trace random IDs remain labelled fixture-only.
7. **Keep it redacted:** do not emit raw prompt/model/player/source text in the default v2 claim report or any OTel logger. Content access is separately authorized, unrelated to this packet.

## Tight fixture matrix

| Source fixture | Correct V2 output |
| --- | --- |
| Final packet includes `m7`; model output has no validated citation | `included, uncited`; **no model-ignored diagnosis** |
| Valid `m7` citation, published prose semantically contradicts source | Reference integrity valid; semantic support failed/unknown, never automatically “faithful” |
| Loaded but pruned by recorded byte budget | `loaded/omitted` reason and no final inclusion; model couldn't directly read that exact omitted item |
| Loader stages absent, only task evidence available | `derived-from-final-task` and missing producer stages, not observed retrieval |
| Published G with final packet sources but no validated claim mapping | `generation-published`, source `claim-published=unknown` |
| Repaired round with `dispatch.request !== task.request` | Source map bound to selected per-round packet/attempt; old task-only SHA cannot be advertised as actually sent |
| SA01 fixture called twice | Either explicitly synthetic IDs or stable derived read IDs; no fabricated two real provider attempts |
| Existing v1 SA05 snapshot fixture | Still decodable and marked v1 diagnostic semantics, no destructive rewrite |
| Two identical text blocks, different source IDs | Distinct origin refs; no substring-based attribution |
| G with provider not run | `not-run` source mode only where proven, no guessed charge/latency |
| Provider attempt uncertain | No free retry or zero charge inference |
| Restricted source in S1 Support | Safe metadata only; no raw hidden narrative or existence leak |

**Proof required:** focused package tests and fixture assertion diff, clear versioning/compatibility notes, one redacted v2 report with source and proof types, no payment/provider HTTP, no task request/schema/plan/receipt/publication behavior changes.

## Stop and Ready gate

If productionized v2 source stages cannot be derived from actual durable producer events, report **not-recorded/unknown**. Do **not** add artificial stage DB rows or annotate the original `storytellerTask` with fabricated historic sources merely to pass fixtures. Runtime stage capture belongs to [OBS02](../2026-11-15--obs02-runtime-storyteller-evidence/CHANGE.md) and prompt/source provenance to [OBS03](../2026-11-15--obs03-prompt-provenance/CHANGE.md).

**No code authorized by this doc.** Ready only when owner explicitly selects OBS05, latest source/SA05 test owner reviewed, backward compatibility confirmed and provider-disabled fixtures accepted. `Current change: none` stays so until an owner-selected execution.
