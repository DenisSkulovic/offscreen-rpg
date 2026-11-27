# Fixture laboratory | story launch before scene one

**Status:** DESIGN FIXTURE SPECIFICATION ONLY, prepared 2026-11-20; no runtime fixture importer, provider calls, database writes or CI execution performed. **Source basis:** user-supplied tree `09d5820bcafedbed7cf969fe228ee84f44ff2405`, checked against current dossier at `main`. Existing files are cited explicitly. Expected outputs are **proposed acceptance or rejection behavior**, not claims about current code.

## Purpose

Pressure-test the [pre-play Workdesk protocol](../PREPLAY-WORKDESK-PROTOCOL.md) and [canonical entrypoint resolver](../CANONICAL-ENTRYPOINT-RESOLUTION.md) using three deliberately different starts and one shared failure matrix. The fixtures should distinguish *what can be proved without a model* from *what requires human judgement and optional paid inference*.

| Case | Real/source situation | Hardest question |
| --- | --- | --- |
| [SEYDA-NEEN.md](SEYDA-NEEN.md) | Actual authored `content/starts/seyda-neen-prisoner` preset; no effective-profile Markdown yet | Can an authored package bypass setup inference without losing source, privacy and identity? |
| [BAH.md](BAH.md) | Original user text exactly `BAH`, no preset or character | Can a nearly empty request still launch something specific without pretending the user specified more? |
| [CONSCIOUS-GALAXY.md](CONSCIOUS-GALAXY.md) | User-defined galaxy consciousness with no body/inventory | Can perspective, player agency and mechanics remain distinct? |
| [REPLAY-MATRIX.md](REPLAY-MATRIX.md) | Cross-cutting failure cuts | Can every persisted source, stage, provider delivery and first scene remain consistent and idempotent? |

## Five explicit surfaces

1. **Source capture:** frozen player text (when supplied), frozen authored preset/world/rule roots, frozen default/profile versions, typed launch authority and budget. This is *not yet* a published campaign.
2. **Seeded Workdesk:** deterministic Library view over source inputs and any captured prompt/default notes; should not require paid inference merely to find `START.md` or the effective profile.
3. **Optional preparation:** the Storyteller may propose a very small set of documents and can also say **no extra preparation**. All proposed writes are staged and source-linked, not live canon.
4. **Opening composition:** one bounded mission receives the exact selected Workdesk/source snapshot, generates a scene and an appropriate player intention interface. Do not assume “action” always means a human body or dice roll.
5. **Game Authority activation:** validates and selects admitted first-scene text, root and supported state/checkpoint, exactly once. It does not grant mechanical permissions because Markdown says so.

These are *logical* responsibilities; a physical model API call may cover 3+4, a prepared preset may require zero work for 3, and some future stories may need an explicitly funded separate 3. A single player **Play** should always cover the entire launch.

## Universal contract targets (not yet implemented)

### Inputs

- **Prompt preservation:** accepted user text is persisted verbatim, including its original casing, whitespace and length; `BAH` is never expanded on disk into a fabricated user prompt. Longer-than-current 6,000-character prompts need a new explicit capture/size policy, not silent truncation.
- **Creative instructions:** required named guidance is deterministically resolved by scope and kind, then frozen by source hash/revision; a missing authored profile falls back to a versioned application default without a profile-selection form.
- **Optional material:** catalogue/index and bounded reads may discover other texts. Private source material remains private. No full scene-history replay or arbitrary shell access.
- **Mechanical authority:** a humanlike actor, D&D rules, inventory, body, established calendar and game-clock speed are not inferred from the adjective “story”.

### Outputs

- A source identity/captured snapshot that can be inspected and replayed.
- If any preparation happened, a bounded Workdesk stage with exact parent/root identity, proposed document kind/authority/visibility and normalized delivery reference. **No meaningless mandatory paperwork.**
- A validated first scene and at least one distinct intention when current playable-opening semantics require choices; decisions must be compatible with the chosen fictional perspective and admitted mechanics.
- An admitted root + passage + state under Game Authority, with an honest checkpoint status (not fake forkability).
- A replay/cost receipt showing whether any new provider call occurred.

### Checks that *cannot* be provider-free

Whether the story is beautiful, emotionally compelling, appropriately paced, original, memorable, or worth continuing must be evaluated by readers and ideally a blind A/B test. Provider-free fixtures can demonstrate reproducibility, authority, shape, caps and source selectivity, **not narrative quality**.

## Recommended model-selection experiment

Once fixture harness and product contracts exist, compare **A: source-grounded opening** versus **B: separate preparation followed by opening**. Use the same source bundle, model route and resource policy. Measure *total* actual cost, latency, number of rounds, document quality, contradictory inventions, first scene, and **whether newly written documents improve scene 2**.

A clever preparatory note that does not measurably help the opening or next scene is not a successful result. The default should remain the cheapest verified recipe with adequate quality, not the one with the most agent activity.

## Current source anchors

- `content/starts/seyda-neen-prisoner/start-package.json`, `START.md`, `identities/`, `threads/`, `possibilities/`
- `packages/documents/src/start-import.ts`, `start-instantiation.ts`, `schema.ts`
- `packages/application/src/storyteller/openings.ts`, `canonical-knowledge.ts`
- `packages/application/src/stories/start.ts`, `initialization.ts`, `passage-documents.ts`
- `packages/storyteller/src/tasks/task-contracts.ts`, `playable-proposal.ts`, `document-changes.ts`
- `packages/contracts/src/campaign.ts`, `drafts.ts`; `packages/db/src/schema/drafts.ts`
- `docs/product/experience/entry-and-onboarding.md`, `docs/product/gameplay/worlds-and-characters.md`, `docs/technical/engine/selected-architecture.md`

## No premature implementation

Do not import this directory as public start-package content, commit these illustrative outputs as new fictional canon, open a Cursor Change, send provider requests, or create schema changes based solely on these proposed assertions. They first need an accepted owner contract reconciling gameplay/world, experience, Storyteller and document package owners.
