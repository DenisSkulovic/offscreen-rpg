# Investigation Workbench V1 | Human-first diagnosis, from ticket to historical evidence

**Status:** Proposed product interaction design, wave 5 (2026-11-15). No JSX, route or access grant implemented. Parent [accepted Admin product charter](../admin/product-acceptance-and-scope.md), [Admin forensic destination](admin-investigation-experience.md), [Turn Evidence Capsule](technical/forensic-turn-capsule-v1.md), [typed read projections](technical/investigation-read-models-v1.md), [evidence truth](technical/evidence-claims-and-quality-v1.md), [staff scope](technical/forensic-access-and-read-contract-v1.md).

## 1. One shared investigation metaphor, three human depths

**Default interaction:** find authorized subject → identify affected scene/operation → see *what happened* → expand *why* → explore *source and exact data*. A staff member should not open 3,000 log lines to explain a frozen story. A developer should not need to run the entire local stack to inspect **the original customer's operation**.

There are three conceptual levels, but they all read the same underlying source graph:

| Depth | Primary user | Default content | What requires deliberate action |
| --- | --- | --- | --- |
| **L1 Situation** | Customer Support | Player/campaign health, actual last event, current hold/operation, safe deterministic explanation, next step | Open related timeline/scene, escalate unresolved source |
| **L2 Investigation** | Support specialist / engineering | Synchronized scene timeline, state changes, G/attempt/publication status and source provenance metadata | Select as-of frontier, compare G, create case export |
| **L3 Forensic Body** | Purpose-authorized engineer / Trust | Exact archived task, composed prompt sections, actual packet and model/tool outputs, protected source documents | Explicit grant/case/step-up; audited access; no raw prefetch |

An employee's staff package is **not** an ability to “show L3 tab.” Each reader, from API route through SQL to asset fetch, must enforce actual classification and subject scope. A Support case alone is not authorization to inspect private text.

## 2. Support Investigator: “My game got stuck” in one screen

**Suggested screen composition, not visual-art-direction spec:**

~~~text
[Case #124  / verified player reference / campaign / observed 16:47]
[STATUS] Preparing the next scene (latest committed game second 900)
[LAST CONFIRMED DEVELOPMENT]
  16:44 Player accepted transfer O
  16:44 Action interrupted: required item no longer held
  16:44 No successful transfer was committed
[CURRENT PROCESS]
  Storyteller capture G: held before provider dispatch
  Source: original action interruption, passage #23
  Next player decision: unavailable until eligible narration publishes
[EVIDENCE QUALITY]
  Action receipt/event: verified | G capture: verified
  Model call: none recorded / not claimed sent
  Full historic state: partial (legacy instrumentation)
[WHY?] Show source-linked explanation
[ACTIVITY TIMELINE] choice / action / activity / scene / AI / alert
[NEXT SAFE ACTION] explain what has been earned; escalate if held
[ESCALATE] attach permitted source IDs, case and observed frontier
~~~

This **fictional fixture** illustrates behavior, not a claim about a real user.

**Important copy distinctions:**
- “No model request was sent” only when capture/attempt authority proves it; a missing DB join alone means “no attempt record found.”
- “Action completed, narration pending” distinguishes actual mechanical settlement from an unfinished scene.
- “Estimated completion at 16:50” is a **projection**, never proof that a job already earned its reward.
- “The Storyteller ignored the relationship” is **not** a Support diagnosis. A safe answer might be “A required source was omitted from the final request” only when the selection/packet evidence proves it.
- “Game is paused” differs from “publication blocked,” “provider uncertain,” “no available decision,” and “current UI has stale snapshot.”

**Case context:** selecting a case limits search, but it never independently broadens grants. Escalation should create a *source reference bundle*, not copy protected narrative into a case title or Slack/bug tracker.

## 3. Developer Workbench: one selected causal episode

A developer begins from an authorized `storyId`, `passageId`, `operationId` or `generationId`. The workbench opens a [Turn Evidence Capsule](technical/forensic-turn-capsule-v1.md). Recommended desktop layout:

~~~text
┌──────────────┬───────────────────────────────┬─────────────────────────┐
│ NAVIGATE     │ MAIN INVESTIGATION            │ INSPECT SELECTED        │
│ Story       │ [time axes: commit/fiction/wall]│ [statement / source]   │
│ Scenes      │  ├─ Accepted choice O           │ Why? [Recorded]         │
│ Operations  │  ├─ Settled/interrupted         │ ID / revision / build   │
│ Activities  │  ├─ Frozen capture G            │ What changed?           │
│ AI/rounds   │  ├─ Source selection/pack       │ Raw content? [gated]    │
│ Reports     │  ├─ Provider attempt A          │ Related graph edges     │
│ Incidents   │  ├─ Validation + publication    │ Proven/missing evidence │
│             │  └─ New published scene         │                         │
├──────────────┴───────────────────────────────┴─────────────────────────┤
│ SCENE/STORY REPLAY (read-only, source-pinned; if authorized)            │
└────────────────────────────────────────────────────────────────────────┘
~~~

The **navigation, timeline and inspector selection are synchronized**. Selecting a model attempt highlights exactly which prompt assembly/artifacts and money/validation status belong to that attempt. Selecting a published passage highlights the **actual** publication edge and original accepted command, not whichever G is currently newest.

### Controls worth building

| Control | Real behavior | Failure mode it prevents |
| --- | --- | --- |
| **As-of selector** | Pin selected committed game frontier, passage revision or G/attempt; preserve source hash and visibility | Inspector silently reading current mutable state for an old scene |
| **Three time axes** | Switch SQL commit order, fictional time and real wall/worker time | A late historical report appearing to have been published before the player saw it |
| **Meaningful events only** | Default deduplicated accepted choice/actual receipt/publication/hold | Thousands of idle Temporal ticks hiding the bug |
| **Show mechanical internals** | Expand one atomic activity commit into actual subevent sequence | Treating intermediate calculations as independent external commits |
| **Show AI stages** | Capture, context, review, dispatch, round, validation, publication, uncertainty | Conflating “G succeeded” with “player got next scene” |
| **What changed?** | Typed old/new actor/items/holds/clock/root diff, with source receipt/revision | JSON diff over current state mistaken for historical data |
| **Why was this included?** | Source candidate → selected → fetched → loaded → packed/final included, actual reason and version | “Model ignored memory” guessed from missing citation |
| **Why was this rejected?** | Real rule/validator/publication fence ID and exact source versions | Rejected output incorrectly attributed to provider failure |
| **Compare generations** | Align two G/attempts by component ID, source root, settings/profile version, packet hash, output and publication | Comparing raw prompt strings and missing configuration change |
| **Pin investigation** | Freezes historical result and source coverage; live SSE only announces new frontier | Investigation jumping around as customer continues playing |
| **Replay recorded** | Read-only original published scenes/choices, no new RNG/LLM or current actionable offer | Accidental live game mutation |
| **Export for Chamber** | Separately authorized/sanitized frozen fixture with receipts/RNG/source, strict expiry | Copy/pasting private customer JSON to a developer laptop |

A control is not “done” merely because it opens a tab. It must use the actual source identity and publish a demonstrable evidence/permission result.

## 4. Context Inspector: dissect prompt assembly instead of reading one giant string

The developer sees an ordered **composition tree**, not opaque `messages:[...]` JSON first:

~~~text
[Generation G]  Task consequence  | input v17 | prompt storyteller.v17
[Source] story S / passage P / root H / settings revision R
[Profile] source JSON definition, revision, build Git SHA
[Effective policy] captured creative + current dispatch narrowing (separate)

  1. Game authority            ✓ included   source file/version/hash
  2. Task instructions         ✓ included   branch consequence + compiler
  3. Storyteller personality   ✓ included   profile ID/revision/hash
  4. Player settings           ✓ included   settings R + command ancestry
  5. World and rules           ✓ included   pinned section handles/revisions
  6. Active scene facts        ✓ included   exact passage/actor/time/receipt
  7. Continuity/memory         ◐ mixed      4 loaded, 2 final, 2 omitted
  8. Tool evidence             – not run    recipe single-turn.v1
  9. Output schema             ✓ included   schema/transform revision/hash

[VIEW SOURCE DECISIONS] [COMPARE TO G2] [INSPECT PACKET (restricted)]
~~~

**Each row opens source metadata before raw prose:** logical ID, owning subsystem, original database row/document root or repo file, revision and content SHA, observed size, selector/transform rule/version, why included/omitted, field pointer or source-map location into exact request. Editing actor appears **only if actually recorded**; current repo-backed prompt rules have real Git provenance rather than invented DB edits.

**Source flow drilldown:**
- stored in canonical root;
- candidate eligible vs not in considered universe;
- selected/discovered, exact fetched;
- optional evidence pack level `lead/card/exact` and byte-budget decision;
- final included in **that exact attempt/round**;
- model cited (if validated);
- claim actually published (only with claim-level source evidence).

**Critical:** the existing `evidence-lineage.ts` classifies `model-ignored` from final inclusion/no citation. In this interface that is **uncited**, not conclusively ignored. Provide a diagnostic hypothesis only when evidence supports it, with alternatives.

## 5. One old scene as multiple original data layers

Selecting passage P should synchronize:
- **Published view:** original content, choices and appearance, only player-visible fields and retained assets.
- **Game truth:** original accepted command, actual roll/effects/item transfer/time, as-of committed frontier if captured.
- **Narration:** candidate G, exact task purpose/prompt context, visible rounds, validation and publication.
- **Meta state:** root/scene continuity settings, relevant player overrides, captured profile and code build.
- **Runtime:** outbox/Temporal/DB/CAS/provider spans if retained, durations and queue/status; absent operational trace does not erase game event.
- **Coverage:** each layer's integrity, retention, permission and instrumentation start. No universal green “complete” signal.

If the user asks “Can we rewind and try another branch?” show **Replay is read-only**. An actual fork is another authorized game operation, not a playback control. Current fork-from-start mechanics do **not** confer arbitrary old-scene fork authority.

## 6. Filtering and deep links

**Filter grammar:** exact source refs, task purpose, state, exception class, model/send status, publication, game mechanics, full/partial evidence, time axis, service, rule/profile revision and candidate source ID. Do **not** offer unaudited global full-text search through raw customer prose. A Support query uses authorized subject scope and safe indexed fields.

**Deep links:** point to scope-bound `storyId/G/attemptId/eventId/passageId` in route params; never include raw packet, content hash as bearer token, staff grant, signed artifact URL or plaintext. Opening any link reevaluates current staff capability/case/subject and retention.

**Large story performance:** initial page is a bounded summary and timeline window; graph expansion lazy by depth and source IDs, and raw packets loaded individually. Virtualized long lists, accessible alt table for graph, stable selected node in URL. An investigation of scene #1500 should not fetch scenes #1–1499 and every model packet.

## 7. Failure presentation is part of the product

| Source situation | UI should say | UI must not say |
| --- | --- | --- |
| Source recorded and hash verified | “Recorded: interrupted transfer (source event E)” | “Model caused interruption” |
| No provider attempt row but capture held | “Held before the recorded model-attempt stage” when source confirms | “Provider never called, €0” based only on a missing join |
| Provider `uncertain` | “Request may have been sent; charge unknown” | “Provider failed for free” |
| Packet prepared/reviewed but actual transport verification missing | “Prepared request captured; sent equality not verified” | “Exactly what provider saw” |
| Some memory source included but uncited | “Available in the request, not cited” | “Ignored by AI” |
| Old raw body expired but digest/source remains | “Metadata available, body expired” | “Context was empty” |
| Legacy pre-ledger story | “Published scene replay available; full old actor state unrecorded” | “Complete time travel enabled” |
| S3 artifact read denied | Restricted/missing according to privacy-preserving error policy | Leak restricted source title/owner/existence |

**Operator support runbook:** every safe problem classification offers a deterministic next step: explain progress, wait/recheck, route to Engineering with IDs, request explicit private-content authorization, report provider uncertainty to account/finance, or file a regression using sanitized evidence. No Support L1 “repair game state” button hidden behind a diagnostic panel.

## 8. Human acceptance tests

1. **Support first-contact:** from one authorized case, determine whether work finished and where narration is held using only S1 data; no raw JSON/source console.
2. **Developer memory omission:** from G, prove whether note m7 was considered, loaded, pruned or included, and distinguish citation from semantic use; explain unknowns without fabricated root cause.
3. **Developer prompt regression:** compare G before/after settings/profile/code change, identify exact source revision and original packet, with raw-content grant necessary for body.
4. **Interrupted action:** show source truth (no successful receipt) despite plausible model candidate, and explain hold.
5. **Stale publication:** show output validated but source fence refused to publish, so no new player scene.
6. **Long activity:** show actual earned progress vs projected future completion and grouped within-commit checks.
7. **Security:** S1 staffer cannot cause protected prompt to arrive in DOM, SSR hydration, React Query cache, clipboard/export or details endpoint.
8. **Revocation:** S3 grant revoked during investigation; new content reads denied, metadata remains appropriately scoped, cache cleared.
9. **Legacy:** old POC missing transition evidence still offers original published passages with unambiguous coverage.
10. **Provider disabled:** no fake tool/model loop, no cost assumption or invented hidden thoughts.

## 9. Execution shape

**First UI deliverable** should be a small **Support Situation + Operations Timeline** backed by OBS01/OBS02 real source records. It should prove one case can be diagnosed without code access. Then build Developer **Context Assembly Metadata Inspector** after OBS03 + evidence-quality contract. Restricted raw body reads and player full state time travel need their own accepted security and E0 data gates.

**Do not** implement this whole interaction blueprint in one Change. The product target defines the destination; narrow source-backed read services and explicit grants define the journey.
