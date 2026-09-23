# Implementation overview

**Next action:** Preserve the matched `storyteller.v8`/`storyteller.v9` Sol opening evidence and bind the reviewed `greywake-hidden-key.v1` comparison to one freshly verified Sol route without weakening the existing live-evaluation safety boundary. The provider-free comparison creates one-shot and bounded-exploration generations from the same canonical root, passage, selected intention, profile, prompt, output allowance and interaction identity; a hash proves that the captured task excluding resource policy is identical. The one-shot packet is 19,945 bytes with one round and no reads, while exploration is 24,540 bytes with two rounds and one 4-KiB retained read. Both stopped at review with zero provider attempts and zero spend. The packet review confirms that supplied context associates Mira with the ledger and key but omits the exact hiding relation, so the case can distinguish honest one-shot uncertainty from source-grounded tool use. A live comparison must release and reconcile the one-shot operation before deciding whether to release exploration; it must not enrich the library merely to induce browsing. The v9 opening remains the accepted narrow prose/state result at USD 0.016991. String fact values remain open vocabulary; a closed location identity set, if needed, belongs to content/mechanical policy rather than the shared prompt. T2 uses explicit fictional-second names throughout current executable contracts and disposable persistence, separating the canonical coordinate from fixed real-second scheduling; the provider-free T3 Seyda proof advances 1,800 fictional seconds and pays six septims once. UI polish is lower priority.

The connected acceptance target is the [generative POC proof](engineering/connected-poc-proof.md): an owner-enjoyable 10–15-turn Seyda campaign with choice, mechanics, elapsed time, durable reward, canonical change and later recall. The [gold session](technical/playthroughs/harbor-session.md) remains the deterministic mechanics/time oracle; Seyda Neen is the first generated experience proof.

**Lifecycle:** Pre-POC, solo development on `main`. Deliberate bounded local use of verified OpenRouter free models is authorized for gameplay; paid calls need separate authorization. Checks are optional per [verification policy](../.agents/rules/verification.md).

## Implemented boundary

| Area | Exists now | Important limit |
| --- | --- | --- |
| Workspace | Next.js web, NestJS API, Temporal worker/workflows, PostgreSQL; shared game, contracts, application and Storyteller packages | See the [code map](engineering/code-navigation.md) for actual wiring; architecture specs also describe unbuilt capabilities |
| Identity and creation | Stored sessions, GitHub OAuth integration, owned versioned drafts, profile selection, persistent opening review and idempotent Start | Real OAuth needs credentials/manual verification; local Chamber supplies a development session |
| Narrative rehearsal | Authored opening, choices, continuity notes, saved waits, pause/resume, story list and history | Exercises persistence and UI, not arbitrary-premise generation |
| Mechanical actions | Generated public offers backed by immutable private plans; automatic/check choices expose authored durations and become durable finite executions | Browser experience, actor/site occurrence scope and irrecoverable target invalidation remain separate work; human taste is unverified |
| Mechanical policy | Pure validation of shape, evidence, character/story facts, quantity minimums, abilities and skills; explicit story-fact declaration with receipt provenance | No general rule/target invention or story-fact update/retirement |
| Character capabilities | Selected D&D scores plus currently applicable abilities and declared skills/proficiencies | Mechanical creation still begins from developer-authored character seeds |
| Content | Validated JSON mechanical seeds, narrative rehearsal and creative profiles; server-supplied mechanical catalogue summaries | No species/world-specific engine branches; fixtures do not establish general world understanding |
| Time and settings | Campaign-owned mechanical clock, calendar projection, finite world obligations, activity/finite-action execution gate, pause/resume/pace controls | Explicit abandonment, named-capacity concurrency and broader process families are unimplemented |
| Storyteller tasks | Opening, continuation, consequence and report-only contracts; bounded context, multi-round retrieval, execution, publication and recovery | Connected retrieved-evidence publication and live-model quality evidence remain unproved |
| Context | Recent passages plus mandatory source-backed notes; bounded exact world/rule sections and campaign documents | No archived-memory query, automatic returning-identity selection or semantic retrieval |
| Provider/accounting | Explicit opt-in adapter, durable reservations, usage windows, dispatch authority recheck, safe blocker projection | Commercial authority selection and the broader failure/hold QA matrix remain |
| Exploration | Local Chamber inspection, manual QA catalogue, durable run/evidence records | Rich trace explorer and planned fault/mechanical scenarios remain unfinished |
| World/showcase | Small authored transfer and chronology examples | General inventory/combat/travel, shared worlds and public visitor onboarding remain unimplemented |

## Where to read more

| Topic | Owner |
| --- | --- |
| Coding route and active feature folders | [features/README.md](features/README.md) |
| Package entry points and flow maps | [code navigation](engineering/code-navigation.md), [application README](../packages/application/README.md) |
| Committed time and calendars | [committed-time](technical/committed-time.md), [calendars and world-time](technical/calendars-and-world-time.md) |
| Canonical files and memory | [canonical-files](technical/canonical-files.md), [long-story memory](engineering/long-story-memory-and-retrieval.md) |
| Storyteller runtime and cost | [storyteller-runtime](technical/storyteller-runtime.md), [context and cost](technical/context-and-cost.md) |
| Activities and autonomy | [rules and activities](technical/rules-and-activities.md), [bounded autonomy plan](features/2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) |
| Open product choices | [questions](questions.md) |

## What can be tried

Launch `pnpm chamber` and use `/stories` to select a storyteller, save a draft, review an opening and Start. `/demo` is a separate browser-only presentation prototype. Use [development](development.md) for setup and [QA journeys](engineering/qa-journeys.md) for manual evidence recording. An authored rehearsal is not proof of a functioning generative DM.

## Verification evidence

Checks remain optional. Passing compilation or scripted tests does not certify meaningful agency, live continuity, prose quality or general mechanics. One live Gate-1 call verified the real OpenRouter transport and durable settlement path; further paid calls require separate authorization.
