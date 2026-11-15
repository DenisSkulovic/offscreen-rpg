# Forensic observability | Wave-5 evidence quality and investigation handoff

**Status:** design-only continuation on 2026-11-15, after the waves 1–4 PR was merged into `main`. **Source recheck:** `main@4e932da` after OBS01, OBS00-A, OBS02, OBS03 landed. **No runtime code/test/migration/provider call made in this design PR.** Current Change remains **none** until owner selects an implementation.

## 1. What changed while design continued

| Slice | Verified repository status | What is really available now |
| --- | --- | --- |
| **OBS00-A** | **Done** | `wrapApprovedWorkerProvider` now forwards both `(task,dispatch)`, preserving per-round request override. No independent `dispatchAuthority` resolver in default worker yet |
| **OBS00-B** | **Blocked / not implemented** | Provider sends remain denied without independently current account/entitlement/usage authority; don't hardcode allow or reuse captured task policy |
| **OBS01** | **Done** | Safe Admin operation discovery can include G without a Storyteller attempt; see [Cursor evidence](../evidence/obs01-operation-coverage-2026-11-15.md) |
| **OBS02** | **Done (first pilot)** | True redacted stage SQL receipts for scripted consequence and held capture; see [actual implementation evidence](../evidence/obs02-execution-stages-2026-11-15.md) |
| **OBS02-H** | **Proposed residual** | [Source review](../evidence/obs02-stage-integrity-review-2026-11-15.md) finds stage identity omits rearm epoch, stale lease can record phantom terminal failure, and stage conflicts can be silently ignored |
| **OBS03** | **Done (first pilot)** | Redacted same-G consequence prompt source manifest and code component hashes, no compiled-request changes; [source review](../evidence/obs03-provenance-quality-review-2026-11-15.md) clarifies it is **not exact per-attempt transport provenance** |
| **OBS04** | **Proposed** | First source-atomic finite-action E0 state transition, not implemented |
| **OBS05** | **Proposed** | Replace overstrong SA05 “model ignored” diagnosis with truthful uncited/unknown claim semantics and v1 compatibility |

**Source-grounded interpretation:** OBS01–OBS03 are real, useful progress. They **do not yet** constitute a complete provider/worker/semantic history, a retained raw artifact store, full historical actor-state replay or a production Admin Context Workbench. Do not mark those product goals Done from the first packet tests.

## 2. Wave-5 new design products

| Design | Why |
| --- | --- |
| [Evidence claim taxonomy](../technical/evidence-claims-and-quality-v1.md) | Recorded / derived / hypothesis, bounded absence proof, no automatic model-ignored diagnosis from missing citations |
| [Turn Evidence Capsule](../technical/forensic-turn-capsule-v1.md) | Read-only, lazily composed episode across original game/AI/context/attempt/publication source; not a new blob/table |
| [Support/Developer workbench interactions](../admin-investigator-interactions-v1.md) | Situation → timeline → Why → historical state/source context, deep protected sections only when authorized |
| [Configuration and experiment lineage](../technical/configuration-lineage-and-experiments-v1.md) | Exact code/profile/settings/overrides and future flag decisions; don't invent prompt-registry editors or A/B platform |
| [Player data-driven replay](../player-replay-experience-v1.md) | R1 published narrative playback vs R2 complete mechanics, no RNG/LLM/live action/GM06 ACK |
| [OBS02 integrity review](../evidence/obs02-stage-integrity-review-2026-11-15.md) | Epoch collisions, stale-lease false terminal stages and stage write crash window |
| [OBS03 scope review](../evidence/obs03-provenance-quality-review-2026-11-15.md) | Compiler-branch expected inclusion vs actual transport packet, per-G sidecar vs per-attempt exactness |

## 3. Proposed narrow follow-ups

| Packet | Scope | Recommended order |
| --- | --- | --- |
| [OBS02-H](../../changes/2026-11-15--obs02-h-stage-integrity/CHANGE.md) | Include rearm epoch in source stage IDs; co-commit start/terminal capture receipts with their actual DB state; detect divergent identical keys | **High for trustworthy cross-rearm forensic timeline** |
| [OBS05](../../changes/2026-11-15--obs05-evidence-claim-truth/CHANGE.md) | Versioned SA05/SA01 evidence-quality projection: uncited != ignored; no inferred source stage promoted into observed fact | **High for truthful future Developer Context Inspector** |
| [OBS04](../../changes/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md) | One true atomic finite-action before/after mechanic witness | After owner accepts SQL/codec/lock proof |
| **OBS00-B** | Current independent usage-entitlement resolver for paid dispatch, source-verified | **Must precede real paid provider launch**, not a forensics permissions shortcut |
| **S1 Situation read / later S3 Context Explorer** | Compose existing OBS01–03 source with [Turn Capsule](../technical/forensic-turn-capsule-v1.md), separate classified data | Only after source-linked query and permission proof; don't create big UI first |
| **Player published-scene Replay V1** | Separate read-only original history; full mechanics later | Owner product acceptance, cross-perspective/privacy tests |

**No automatic work authorization.** The order is advisor recommendation; Cursor must receive one named Change and pass current source and provider-free test gates. Some product/technical material (e.g. V1 Turn Capsule) is deliberately **not yet a code-bearing Change**.

## 4. Important truths, no shortcuts

- Existing `storyteller_execution_stage` is real source evidence, **but not guaranteed complete under every crash and operator-rearm race** until OBS02-H checks pass.
- Existing `storyteller_prompt_provenance` is a first-stage task/source manifest, **not every final per-round provider packet or every candidate omission reason**.
- SA05 fixture “model-ignored” can be inferred merely from missing citation; don't display that as historical model cognition.
- Code-backed prompt components have real Git/build origin; player settings have revisioned `campaign_settings` and original commands. An editor name is recorded only where source proves it.
- No arbitrary past character/world state from `viewVersion`, passage revision or GM05 public events. Full replay needs a verified committed E0 sequence and deltas/checkpoints; old source coverage stays explicitly partial.
- A new raw-content TTL doesn't delete `generation.input/output`, `dispatchReview.packet`, memory-round JSONB, QA exports or backup copies automatically. Proposed 90/180-day raw retention is **not implemented or legally accepted**.
- No universal raw private prompt access for Support; S3 developer access remains separately purpose-bound and audited.
- Never run a provider or modify game state from an Admin inspection or player Replay GET.

## 5. Review/verification gates for owner

1. **Accept/adjust evidence statement semantics** (recorded/derived/hypothesis) and source disclosure boundaries.
2. Select at most one narrow implementation slice (OBS02-H or OBS05 for diagnostic truth; OBS00-B before actual paid provider work).
3. Run targeted provider-disabled/disposable SQL tests and report exact source SHA, observed row identities and failure cases. A Markdown design is not runtime proof.
4. Before retaining new raw model bodies or promising player R2 replay, accept storage/retention/erasure law and fully audited E0 writer/codec data contracts.
5. Do not let Admin visualization or data export run ahead of verified source completeness/authorization.

**Owner advice:** put a hard limit on new forensic infrastructure until the first Support/Developer investigation can actually answer one real **provider-disabled** incident end-to-end from the captured source. The product goal is comprehensible historical truth, not a larger pile of diagnostic JSON.
