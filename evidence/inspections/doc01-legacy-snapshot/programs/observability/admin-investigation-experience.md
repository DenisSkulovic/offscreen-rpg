# Offscreen Control | Support Investigator, Engineering Workbench and Story Replay

**Status: proposed Admin wave-2 product direction, 2026-11-15; not an approved AD09+ Change.** Parent [accepted Admin charter](../admin/product-acceptance-and-scope.md), [Support](../admin/support-and-customer-success-product.md), [AI/Engineering Ops](../admin/ai-engineering-operations-product.md), [staff policy](../admin/technical/staff-identity-and-policy.md), [data security](../admin/technical/read-models-and-privacy.md). This design depends on the [native evidence spine](technical/evidence-model.md) and [replay/retention contract](technical/replay-retention-and-privacy.md). Do not increase privilege by adding a visual link.

## 1. A single investigation, several deliberately different interfaces

**Product thesis:** from one scoped subject (player/campaign/scene/operation/case) an authorized employee can move between **semantic overview**, **source-backed historical timeline**, and **deep engineering evidence**. The interface should proactively answer normal questions instead of offering a blank SQL or Grafana Explore editor.

The initial entrypoint should be a case- or incident-aware **Investigation workspace** in Offscreen Control, with breadcrumbs from Player 360, Campaign Operations, Storyteller Operation and Support Case. Different grants reveal different projection layers of the same causal evidence, not separate incompatible shadow databases.

### Structural route concept (not current source)

~~~text
/control
  /cases/:caseId
    -> case context, relevant campaigns, safe incident summary
  /campaigns/:campaignId/investigate
    -> Overview, Timeline, Scene Replay, State, Related Operations
  /operations/:generationId
    -> Summary, Task/Context, Model Rounds, Validation, Publication, Cost
  /operations/:generationId/context
    -> restricted prompt composition/provenance workbench
  /incidents/:incidentId
    -> cross-campaign operational health/incident impact
~~~

**Never render protected data into a server HTML payload simply because it is behind a closed/hidden React tab.** Load each protected panel through a distinct server-enforced capability and scoped purpose. A URL is a locator, not permission, and deep-linked objects must recheck the staff principal, case/subject and current privilege epoch.

## 2. Support-first investigation (technically shallow, trustworthy)

### Main Support screen

~~~text
[Case # / customer-verified subject / campaign / updated time]
[CURRENT STATUS] Waiting for narration | last verified 14:24
[What happened?]
  Accepted: "Move the sealed crate"  (source)
  Time: action reached accepted endpoint
  Result: interrupted — required item was no longer held
  Next scene: preparation held, not published
[Evidence confidence] Complete for action; partial for Storyteller context
[Current player impact] No transfer occurred; character is waiting
[Recent developments | linked cards]
  ... chronology, filter Action / Activity / Scene / AI / Error ...
[Recommended safe next steps]
  Check progress / explain waiting / escalate to Engineering
[Escalate] Attach allowed evidence references, not raw prompts
~~~

This is an example **fictional fixture**, not observed customer data. Wording must be derived from committed source and typed state classification, not an LLM improvising the reason. Show the difference between a fact the engine knows and a plausible cause that has **not** been proven.

**Support interaction grammar:**
- Search exact account/story/case with existing scope checks; no global text search across player prose by default.
- Open a campaign “Now” panel showing owner/participant relationship, last published scene *metadata*, committed clock/hold/activity, last accepted command, publication/AI status and freshness. Read no narrative body without its own grant.
- Open **Recent Timeline** with icons/labels and filters: accepted choices, finite actions, activities, interruptions, published scenes, funding/usage gating, errors and case/audit actions. Default to meaningful changes, not all scheduler ticks.
- Select an event → “What changed?” safe summary and source IDs; show “not yet earned / still processing / no model request sent” explicitly.
- **Guided diagnosis**, from deterministic rules: “Work started but no completion receipt” vs “receipt committed, narration pending” vs “output failed validation” vs “source changed, publication refused” vs “usage restricted”. These statuses must be sourced from real state, not guessed from lack of logs.
- **Escalate** attaches scoped deep links and a signed/hashed evidence manifest listing what can be accessed, not copies of entire private text. A developer who opens it performs their own independent authorization.
- **No high-risk button** to retry a paid provider task, modify story JSON, spend/refund credits, change time or override an actor; escalation is a case work item, not power transfer.

### Support quick questions

| Customer asks | UI must show | Do not expose |
| --- | --- | --- |
| “Did my character finish the shift?” | Confirmed boundary + earned work units + actual reward/none | Unpublished DM world plans |
| “Why did my gear disappear?” | Actual item transfer/holder provenance if player-known and allowed; exact source event | Other player's private possessions/history |
| “My story froze after clicking” | Accepted command operation ID, current hold/worker/narration/publication state, safe reason | Full provider prompt and secrets by default |
| “Why did I pay for this failed turn?” | Distinguish reserved, dispatched, settled or uncertain provider usage and existing customer allowance | Internal pricing contracts or raw provider key |
| “Why was this scene inconsistent?” | Safe source-linked discrepancy; escalation request | Privileged narrative root/prompt unless separately authorized |
| “Can I replay yesterday?” | Authorized historical scene timeline / player-compatible route | Hidden options or draft model outputs |

## 3. Engineering Investigation Workbench (the difficult part)

**One generation is the principal investigation object**, but the developer may also begin from passage ID, accepted command, game event, Temporal run, provider attempt or incident. The workbench should synchronize **five views**, not open five disconnected JSON tabs.

### E1. Causal timeline / service topology

A horizontally zoomable timeline with explicit axis choice:
- **Commit/event order:** what was actually recorded first.
- **Fictional time:** when actions occurred in the story.
- **Wall time:** CPU/DB/Temporal/provider spans, gaps and late reports.

Selectable nodes: player input admitted; SQL source freeze; CAS reads; model request compiled; packet persisted; money reserved; provider dispatched; tool round; output validated; publication fence and resulting passage/SSE. Each node shows **status, duration if measured, source ID(s), retry/duplicate relations and evidence coverage**. Missing spans are *missing operational telemetry*, not a non-event.

Parallel rows show API, outbox, Temporal workflow, worker Activity, SQL transaction, document storage, provider and web refresh. Cross-service arrows come from explicit causal IDs/OTel links. Duplicate delivery should visibly converge on **one game operation/G**.

### E2. Historical State Inspector

Select a commit frontier or event and render structured original game data:
- Character capabilities and quantity/fact changes.
- Item holder chain with old/new holder, admitted transfer source and blocked attempts.
- GameSecond, world-time projection, pace revisions and whether time was truly eligible to advance.
- Active/queued/interrupted activities, contribution/checks, authored occurrence limits and stop conditions.
- Current public offer vs private admitted plan (private plan hidden unless granted).
- World obligations and which actually fired/published.
- Canonical document root/hash and history relevant to the chosen scene.

**Diff mode** compares before/after using stable field paths and source operation; includes “why changed?” evidence, not just red/green JSON. Show “unknown at this moment” if the historical state was not recorded. Never re-evaluate game rules merely to construct an old-state view.

### E3. Prompt & Context Composition Inspector (first-class product)

For each G/model round:
- **Composition tree:** Platform rules → task instructions → Storyteller profile/tone → effective player/campaign settings → world/rule fragments → current scene/actor/time/receipt → continuity/history → retrieved tool evidence → output contract.
- Each component displays **name, owner, origin kind (code/JSON/DB/setting), logical ID, immutable revision/hash, creating/updating actor if known, active-in-this-turn status, override ancestry, applicable feature/experiment decision and final packet location/byte count**.
- **Included / omitted lanes:** eligible / selected / fetched / packed / final-included / model-cited where supported / published. Click an omitted passage for **the recorded reason**, not a fabricated “probably over budget”.
- **Effective Settings panel:** “Original default” vs “player selected at revision R” vs “live dispatch authority narrowed route”; distinguish captured creative settings from funding/route.
- **Request tab:** exact compiled message/JSON schema/policy, serialized byte identity, estimated vs reported tokens, output ceiling, provider route, transport status and checksum; restricted content access is explicit.
- **Round carousel/graph:** per actual model request and read-only tool call, show input, requested source, returned source and final output; no fake agentic loop or hidden thoughts.
- **Validator panel:** type/schema/admission diagnoses with source field paths, what was rejected, whether another permitted repair round happened and its actual cost.
- **Publication panel:** source/canon/actor/receipt/scene fences, held/stale/blocked reason, actual published passage/offer/changes.

**Human-friendly example:** The engineer sees “Continuity note n12 was required by active scene; read from root H, but omitted from final packet due to bounded source selection” only if the actual selector and packet recorder attest it. An original note that never entered the source catalogue displays “Candidate enumeration unavailable” rather than a guessed reason.

### E4. Provenance graph and compare

A linked DAG (“This turn used…”) with nodes for prompt component, configuration revision, source passage, canonical world/rule section, retrieval decision, frozen SQL state and model round. Edge labels are typed: **derived-from, captured-from, selected, pruned, overrides, validated-by, published-as**.

Click **Compare with another generation** to align component versions, inclusion decisions, policy/config, effective mode, packet size and outcome. Good examples: two turns before/after a prompt fix; different A/B variant; same player changed Storyteller preset; two otherwise identical captured states but one source doc missing. The diff must tell **actual changed inputs**, not imply causality from correlation alone.

### E5. Reproduction and diagnostics drawer

- “Open related traces in Grafana”: correct trace/time filter, no internal secret URL.
- “Make Chamber diagnostic bundle”: uses explicit exporter capability, purpose and sanitization; shows exact evidence coverage, schema/build requirements and missing dependencies before creating anything.
- “Replay recorded turn”: **read-only archival playback**, no provider cost. “Run comparative evaluation” is a different, separately authorized sandbox action.
- “Report reproducibility”: complete state/entropy/external fixture vs partial; compare result under selected code version; no silent new mechanic in prod.
- “Create regression case”: links source fixture/evidence hash, no copy of PII by default.

## 4. Cross-role access is not a cosmetic UI toggle

Proposed **distinct additive grants**, to be resolved with existing Admin registry `packages/application/src/admin/registry.ts` and the accepted intact package policy:

| Capability family | Support | Developer | Trust/Privacy |
| --- | --- | --- | --- |
| `forensics.campaign.metadata.read` | Case-scoped yes | Scoped yes | As authorized |
| `forensics.event.public-projection.read` | Case-scoped yes | Scoped yes | As authorized |
| `forensics.state.diff.safe.read` | Limited to safe player-known facts | Technical source fields under scoped grant | As authorized |
| `forensics.prompt.provenance.read` | Usually no, safe config category only | Yes under technical grant | Investigation-specific |
| `forensics.prompt.body.read` | **Not by default** | **Exceptional, purpose-bound, audited** | Protected legal/trust scope |
| `forensics.provider.output.read` | Not by default | Exceptional | Protected |
| `forensics.hidden-world.read` | No | Explicit internal capability with purpose | Explicit trust/legal scope |
| `forensics.replay.export` | No | Sandbox only, redaction required | Approved deletion/export workflows |
| `forensics.evidence.retention.hold` | No | No default; incident approver separate | Authorized hold under policy |
| `forensics.evidence.access.audit.read` | No | Own investigation views only when allowed | Dedicated audit permission |

Current `ai.operation.read` is only safe redacted operation diagnostics in AD05, **not consent for raw prompt viewing**. Do not silently broaden it. Multiple staff packages may overlap, but composing them must not create more access than the intact grant scopes permit.

Every exceptional protected read must record **staff principal/session, authenticated actor, case/incident/purpose, resource/version/field disclosure class, grant/step-up/approval if needed, timestamp and outcome**, with an audit strategy robust to a read succeeding just before cancellation. If logging/audit storage fails, **deny the protected disclosure** rather than expose private content unaccountably. Case assignment cannot grant privileges by itself; “View as Player” is not impersonation.

**Privacy-sensitive UI:** route/meta preview and unauthorized error payload should not reveal an unscoped story’s existence. SSR/React Query caching must be keyed by staff actor+grant epoch+case+target+field classification; revoke/role change closes live streams and invalidates private cached material. Clipboard/export/screenshot warnings aren't the security model: server DTOs and audit are.

## 5. Player-facing Replay is a separate space

A player-facing “Replay story” belongs in the Story/Journal product, **not** exposed by linking to the Admin workbench. Its contract:
- navigation over only authorized recorded scenes/events and player-known facts;
- seek/step/playback and source-backed “what happened” summary;
- no writable controls or Storyteller call, no hidden plans, no re-use of current actionable offer;
- appropriate historic visual appearance/asset if retained, truthful partial coverage;
- future fork must be explicit and separate from replay.

The player may value this feature for nostalgia, storytelling and learning, not just debugging. It is an independent high-value product that reuses the historical data spine. A current “Recent developments” list is *not* full replay.

## 6. Efficient request/data architecture for these screens

Each panel calls a narrow, purpose-limited, typed **Admin application read service**; it should never join unrestricted `SELECT *` on arbitrary evidence/artifact tables. Pagination, time/event cursor, bounded expansion, source relation and redaction are enforced before returning bytes. Heavy provider payload and graph expansions are loaded on demand after an independent sensitive-content authorization check.

**Read models** (illustrative names, not current API claims):
- `CampaignForensicSummaryV1`: safe current health and evidence coverage.
- `CampaignEventTimelinePageV1`: typed chronological cross-source event references with status/time.
- `HistoricalStateAtV1`: source frontier + permitted actor/world/time reconstruction + explicit gaps.
- `StorytellerOperationCausalGraphV1`: stages/edges/status, no raw content by default.
- `PromptAssemblyManifestV1`: component ID/version/origin/hash, status, omitted reasons, access affordances.
- `RestrictedArtifactViewV1`: a **separate** content response with purpose/field-level audited authorization.
- `ReplayWindowV1`: bounded historical passage/events, validated perspective and coverage.
- `ForensicDiagnosticBundleManifestV1`: references, sanitization policy, missing data, expiry.

**UI performance:** virtualized long timeline, chunked graph expansion, server-side indexes for story+event sequence / G / operation ID / attempt ID / case; historical snapshots not replicated into React local state. A “jump to this turn” request must not fetch every prior full provider packet. Query caches are short-lived and permission-scoped. Timelines can show approximate wall-clock tick positions where necessary, but committed sequence/identity remains exact.

**Live mode:** SSE invalidations/refresh update *current* status. A developer studying an old checkpoint sees a pinned read-only snapshot that **does not silently mutate under them**. A visible banner offers to move to the latest frontier. If CAS or Admin read source is unavailable, show partial/temporary outage, not an empty timeline.

## 7. Visual interaction and accessibility quality bar

- A clean **synchronized split layout**: investigation rail / main timeline-stage / inspector drawer, with optional multi-column comparison for large screens; narrow layouts stack panels while retaining selection. No 80-field JSON dump as the first screen.
- Color/status always accompanied by text and source; “uncertain spend”, “publication stale”, “no model run”, “missing evidence” are distinguishable without relying on red/green.
- Stable selected node ID in URL/deep link, but URLs never contain private content or auth tokens.
- Keyboard navigation, search/filter, event grouping, semantic labels, accessible tree expansion, local display preferences; no forced animation or unlimited canvas render.
- Easy switch **show only meaningful transitions** / **show technical stages** / **show all recorded evidence**. The last must not manufacture missing events or fetch protected payload automatically.
- “Why?” affordance is the killer feature: each visible decision offers a short answer and a source link or “evidence unavailable” marker. Low-level source fields are available one click deeper.
- Readable typography and diff/graph topology; a developer should **not** need to parse obscure Zod object shapes to understand a prompt origin, though the raw typed artifact remains inspectable when authorized.

## 8. Minimum end-to-end acceptance scenarios

1. Support finds a user’s missing narration and distinguishes mechanically completed action from unpublished Storyteller output, without reading prompt body.
2. Developer opens same G and sees exact previously captured source, prompt component versions, actual packet hash, model attempt/usage and publication refusal.
3. Two-day action spans five distinct worker/Temporal traces; UI joins them by domain IDs while honestly marking an expired telemetry trace.
4. A memory source was loaded then pruned; source selection visualization says exactly that, and does not imply model saw it.
5. Customer shifts profile at revision R+1; old turn uses R, new turn uses R+1; compare view shows genuine effective differences.
6. An Admin reader with `ai.operation.read` but without raw-body capability receives redacted metadata, 404/deny on content deep link, and no private HTML payload.
7. Exceptional engineer raw packet read is approved, attributed and expires; a revoked session cannot continue via cached Query or SSE.
8. Player replays original 20 scenes without generating one new action/cost, including one interrupted step and late report.
9. Reproduction bundle is created only under sandbox permission; no production actions, raw secret or cross-story data are exported.
10. The system shows historical source coverage honestly when raw packet has expired, old POC state was never captured or a provider attempt remains uncertain.

**Next gate:** accept Support L1 vs Developer vs Trust data disclosure boundaries and the minimum screen set. Then wire typed native read models to the evidence spine before investing in elaborate visualizations. A gorgeous graph of missing or unauthorized data is still a useless or unsafe product.
