# Canonical documents and packages

**Quick route by question:** [who owns a fact](#one-owner-per-kind-of-truth) · [pinned worlds](#reusable-world-libraries-and-campaign-overlays) · [pinned rules](#reusable-rule-libraries) · [import and start](#campaign-bootstrap) · [document identity and visibility](#document-envelope) · [publication and content-addressed storage](#publication-across-files-and-the-execution-ledger) · [a summary does not replace a passage](#extract-summarize-and-revise-deliberately) · [recovery and the visibility fence](#recovery-inspection-and-portability) · [what a task reads](context-selection-and-recall.md#what-source-enters-this-task) · [author a content package](../../runbooks/content-package-authoring.md). Provider budget and request packing stay in [Request context and cost](request-context-and-cost.md). This page is package, revision, and publication authority. [The storyteller route](context-and-memory.md) is the short index. [Progress](../../../STATUS.md) owns demonstrated coverage.

Status: mixed implementation and target contract. Immutable local storage, descriptive admission, canonical narrative passages, pinned package import/Start, narrative-choice document hints, active-scene recall cues, exact world/rule sections and bounded multi-round exploration are implemented. Ordinary admissions can select rule topics and narrative dependencies; ordinary gameplay still defaults to one-shot tasks with tools disabled. Mechanical choices lack explicit document dependencies, selected bodies can be omitted during packing, and sustained recall remains unproved. PostgreSQL still owns live mechanical state/receipts; the structured-document ownership in [One owner per kind of truth](#one-owner-per-kind-of-truth) is a migration target. Use [packages/storyteller](../../../packages/storyteller/README.md) for the implemented package and [progress](../../../STATUS.md) for evidence. The [2026-11 engine-model inspection](../../../evidence/inspections/doc01-retained-observations/engineering/engine-model.md) is dated evidence, not the current owner. [Canonical storage](../../../work/designs/open/legacy-initiatives-index/PARKED-2026-11-15.md#canonical-campaign-storage) and [memory/recall](../../../work/designs/open/legacy-initiatives-index/PARKED-2026-11-15.md#storyteller-memory-and-situated-recall) own remaining work. Read [concepts](../../product/foundations/concepts.md): there are no chapters.

What a task loads is not restated here. Ordinary one-shot selection, recall cues, and conceptual future retrieval are [Context selection and recall](context-selection-and-recall.md).

## Product commitment

A campaign should have an inspectable, portable library that survives the destruction of every conversational context. A new Storyteller invocation can discover what world it is in, what happened, what remains unresolved, and where to inspect the evidence. Its creative identity also comes from versioned documents. Human maintainers can read and revise these materials through admitted changes without decoding a growing collection of content tables.

The first POC demonstrates this with the harbor story and a returning acquaintance. A short sequence of Storyteller turns can already expose lost detail, contradictory summaries and an agent that cannot find its own evidence.

Markdown is the preferred authoring format for prose. Typed metadata, links and mechanical definitions use validated frontmatter or JSON where that makes their meaning precise. Changing serialization alone does not improve memory: organization, retrieval, extraction, publication and the tools that connect them are the feature.

## One owner per kind of truth

This table describes intended ownership after migration. Current typed mechanical state, receipts and retained continuity notes still have transactional SQL owners; descriptive documents and canonical published passages already use immutable storage. Do not read bootstrap state documents as automatically current gameplay state.

| Material | Canonical owner in this contract | Other representations |
| --- | --- | --- |
| World premises, admitted descriptive lore, stable identity descriptions and authored relationships | Versioned campaign documents | Search records and prompt cards are derived |
| Published passages and accepted conversational exchanges | Immutable source documents with ordered publication references | Summaries and recaps cite them |
| Source-bounded memory summaries, interpretations and narrative threads | Versioned memory documents, explicitly labelled derived or attributed | Search snippets do not acquire stronger authority |
| Storyteller style, rhythm, taste examples and task guidance | Versioned document bundle | Validated prompt fragments compiled for a captured task |
| Reusable activity/opportunity definitions | Validated structured content artifacts linked from world documents | Executable instances capture admitted definition revisions |
| Character state, actual rolls, work progress, quantities, possession transfers, accepted choices, clocks, settings, offers, obligations and activity definitions/results | Validated immutable structured documents and committed state/receipt manifests | PostgreSQL may keep compact command/scheduling projections; provider money accounting remains transactional |
| Search chunks, vectors, backlinks and candidate rankings | Rebuildable index over committed document versions and permitted ledger projections | No exclusive facts live only in the index |
| Current invocation's context | Disposable working set with a saved input manifest | Reconstructed from pinned sources, never used as the world database |

“Canonical” means authoritative for a declared responsibility. A summary is the accepted account of its covered sources, but remains derived. A rumor document is authoritative evidence that somebody made a claim, not proof of the claim. A world document can establish newly admitted descriptive lore; it need not first be copied into an NPC or location table. Lore that changes executable rules, current possession or travel access must also pass the relevant mechanical admission boundary.

Distinguish reusable **source canon** from **campaign canon**. Source canon is the exact pinned world-library material. Campaign canon includes published developments and admitted overlay documents, including inventions that the campaign's effective [canon invention policy](../../product/storyteller/profiles-and-settings.md#canon-invention-policy) permitted. A generated addition does not acquire a fictional source citation merely because it is compatible with the source world: retain its originating passage, invention domain and permission as provenance. Pretrained model recollection is neither source canon nor evidence.

Keep a small database control layer for ownership, stable references, revision fences, root commits, operation deduplication, due-work claims, indexing jobs and money. Avoid a new table per kind of world or mechanical content. Executable definitions, current campaign state and exact receipts belong to validated JSON documents; SQL scheduling projections retain only what a worker must efficiently claim and recheck. Existing SQL content is the current implementation; replacing it must actually move ownership, not add a second independently editable copy. Merely exposing SQL through virtual file paths would not complete the requested direction.

## Reusable world libraries and campaign overlays

A campaign workspace is not necessarily the owner of its whole world. A player may create or import a reusable **world library** containing extensive lore, histories, places, cultures, terminology, metaphysics, rules guidance, maps/media references and other authored source material. Story start pins one or more exact world-library roots and mounts them into the campaign's knowledge view. The model's pretrained recollection is never treated as the authoritative substitute for supplied world material, especially with small, cheap or private-setting models.

World libraries and campaign documents have different lifecycles:

- A world library has a stable identity, immutable versions, a small orientation/index and canonical source files. Many campaigns can reuse it.
- A campaign pins exact library root hashes and revisions. Updating the reusable library does not silently rewrite an existing campaign or in-flight task.
- Campaign-specific characters, passages, relationships, discoveries and state live in the campaign workspace. Developments that alter local reality are campaign overlay documents linked to base-world sources; they do not mutate the shared package.
- Each world version declares per-domain invention ceilings. A campaign may choose stricter permissions, but neither a start package, Storyteller profile nor model route may silently widen the pinned world's authority.
- A campaign adopts a newer library revision only through an explicit conflict-checked operation with a readable compatibility/diff review.
- A campaign may use no external world library, one library or several deliberately mounted packages. Package order cannot resolve contradictory canon by accidental last-write-wins; authority and conflict policy are explicit.

Import accepts bounded user-authorized text, Markdown and supported structured files without requiring inference. Preserve useful authored divisions and provenance, validate encoding/size/path safety and assign stable document identities. A large monolithic upload may be deterministically sectioned for navigation while retaining its intact original as a source. Optional LLM-assisted classification or summarization is separately budgeted derived work and is never required to preserve the lore. Imported external settings remain private user-provided content subject to the user's rights and product policy; this project does not ship third-party fictional corpora or assume permission because a model recognizes a name.

Each package has a compact entry document describing scope, authority, major directories and high-value navigation handles. It is not a summary of every page. Documents distinguish descriptive lore, attributed claims, executable rules and creative guidance: prose about magic does not automatically become a mechanical rule, and a setting's writing style cannot override system instructions. Search spans pinned packages and campaign overlays while retaining package/document/version provenance and visibility.

Which pinned sources a task reads, including overlay-first assembly, is [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task). Reading more of a package does not change its authority.

## Reusable rule libraries

Mechanical references are their own package family rather than ordinary world lore. A rule package has a stable ruleset identity, immutable root/revision history, a compact `RULES.md` orientation, topic-indexed pages and an exact executable-adapter identity/version. Campaign setup pins that complete reference. Existing campaigns and captured tasks do not silently follow later edits.

Rule pages are canonical evidence for adjudication, terminology and examples; they are not executable code. Application policy admits only mechanics supported by the pinned adapter. A campaign overlay may record a local interpretation or optional ruling with explicit provenance and precedence, but prose alone cannot add an effect type, alter a die formula or bypass validation. An executable house-rule change therefore needs both readable rule documents and a supported validated adapter revision.

The manifest records source byte counts, headings and normalized topic tags so deterministic recipes can select known applicable sections cheaply. A richer recipe does not change canonical authority or retained storage. Which sections enter a task is [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task).

World libraries may contain setting-specific guidance about magic, technology or social convention. Such prose remains world canon until a rule package or campaign rule overlay explicitly binds it to a supported mechanic. This prevents evocative lore from accidentally becoming an executable rule.

## A concrete workspace

Illustrative logical paths, not mandatory nouns for every world:

```text
campaign/
  START.md                         # Small orientation and links; bounded
  premise.md                       # Accepted setup, genre and current direction
  world/
    rules.md                       # Lore constraints and references to admitted rules
    places/harbor.md
    identities/keeper-mara.md
    identities/visitor-17.md
  memory/
    index.md                       # Bounded topic/source navigation
    segments/visitor-exchange.md    # Derived summary of a covered source range
  sources/
    passages/passage-0001.md        # Original published prose, immutable
    passages/passage-0002.md
  threads/
    the-warning.md                  # Open/closed state, attribution and evidence
  state/
    current.json                   # Generated exact state projection; read-only
    decisions/command-17.json       # Exact choice/outcome projection; read-only
  storyteller/
    voice.md
    pacing.md
    examples.md
  private/
    narrative-direction.md          # Optional revisable Storyteller agenda; noncanonical
    possibilities.md               # Uncommitted ideas, explicitly noncanonical
```

A reusable source world can be organized independently and mounted read-only:

```text
world-library/
  WORLD.md                         # Scope, authority and bounded navigation
  cosmology/
  history/
  places/
  peoples-and-identities/
  institutions/
  rules/                           # Executable/advisory distinction is explicit
  glossary/
  sources/                         # Intact imported originals and provenance
```

These names are illustrative. A microscopic chemical environment, dream logic, contemporary apartment building or interdimensional consciousness is not forced into geography, nations or humanoid cultures.

Logical paths are navigation, not identity or authorization. A stable document ID survives renaming; the committed manifest resolves that ID to an immutable revision/hash and logical path. Backlinks and indices are generated from IDs. No automatic inference that two `mira.md` files name the same person. Package/world revisions are pinned per campaign: revising a reusable world template must not rewrite an existing campaign.

The manifest is a storage/catalogue structure, not another always-loaded prompt. Directory reads are paginated and exact document reads resolve one version; large campaigns must not require loading their full file tree into each task. The initial local implementation may use a bounded manifest, with an explicit capacity limit before selecting a more elaborate persistent directory structure.

Do not create one file for every die roll, adjective or clock tick. Published passages get source documents; bounded memory segments cite them. A segment can end for storage-size reasons while the same conversation continues. Quiet work stays cheap: exact receipts accumulate in the ledger, and readable bundles can be generated deterministically at useful boundaries. No model call is required to turn a saved receipt into a readable record. A memory segment need not be a human conversation or a geographical visit; a microbe's environmental interval fits the same source/identity contract.

## Campaign bootstrap

Story creation publishes a coherent starter library, not merely an opening passage beside an otherwise empty manifest. It includes every meaningful value already admitted by setup: a bounded orientation, accepted premise when present, opening source passage, each explicitly created character, selected rules/settings/time definition, initial possessions or story-item registry when present, executable current state, and references to the selected creative bundle. These are separate documents where they have different identities, visibility, revision cadence or read patterns. A character is at least one stable structured identity document; its current mechanical state may be linked from that identity or separated when the two begin changing independently.

Bootstrap does not invent content to fill folders. A calendar document is absent when the campaign has no calendar; no NPC, location, faction, economy, anatomy or inventory file is created merely because another story might use one. Later admitted people, relationships, places, threads, rules, receipts and possibilities add diverse documents as their durable relevance emerges. Application code projects already accepted typed values into these files once; the Storyteller is never asked to repeat the same content in storage prose.

A reusable start bundle may pin world and rule packages and provide campaign-owned starter documents: premise, starting identities, known relationships, initial state, private possibilities, and explicit obligations. Instantiation copies or derives only campaign-owned documents; it references shared package roots instead of duplicating their bodies. Every cloned document receives campaign provenance back to the bundle version, and later campaign edits do not mutate the reusable template.

An authored directory has one validated `start-package.json` descriptor. The descriptor owns package identity, title, author operation, exact world/rule pins and the metadata for each bounded `.md` or `.json` document. `START.md` is required and is the initial-canon orientation. Markdown bodies and structured JSON data are each read once, validated against the declared kind/authority/visibility/activation, assigned deterministic package-local document IDs and stored without inference. Paths are root-confined; symbolic links, undeclared files, invalid UTF-8, duplicate normalized paths and over-limit inputs are rejected. Import publishes an immutable package manifest only—it does not create a campaign or schedule an obligation.

Instantiation validates the selected start, world and rule roots again, then stages one campaign manifest. It writes compact typed `start/reference.json`, `world/references.json` and `rules/reference.json` documents and clones only the start package's campaign-owned entries. Clone IDs are deterministic from campaign identity plus package document identity, every clone cites its exact package document revision, and all cloned revisions begin at one. Markdown and structured data are copied without reinterpretation; shared world/rule bodies remain referenced. When layered onto the normal campaign bootstrap, the package's required `START.md` orientation mounts at `start/package.md` so the campaign's generated `START.md` remains the immediate entry point. Other path collisions fail, and already-staged world/rule reference documents must exactly equal the package pins rather than being overwritten. Repeating the same campaign/start/operation tuple produces the same root, while selecting another package revision is a distinct operation. Staging an executable-obligation document does not itself schedule it—the application transaction must validate and activate that typed obligation exactly once when it selects the staged root.

An executable obligation entry uses `schemaId: world-obligation.v1` and data shaped as `{ "version": 1, "obligation": <world-obligation proposal> }`. The proposal is the same generic tick/date, visibility, condition consequence and follow-up contract used by ordinary campaign setup. Start admission parses it again, deterministically remaps its globally stored obligation ID for the campaign, compiles its due tick under the campaign's selected time definition and inserts it through the existing obligation initializer. A package cannot use arbitrary JSON plus the obligation activation label to gain scheduling authority.

Maps, locations, quests and plots are content roles, not universal engine tables. A map may be descriptive Markdown, structured topology or a media reference depending on the world. A location can be ordinary lore until executable movement needs a validated spatial definition. A quest can be a player-known narrative thread, a private opportunity, an activity definition, an obligation, or a combination linked by stable references. Seeded characters use the same character/identity documents as characters introduced during play. The start manifest therefore composes existing document kinds instead of requiring every campaign to populate a fantasy-specific checklist.

Authored future material must state what kind of claim it is. A historical or present fact may be canon. A hoped-for arc, likely antagonist move or possible reveal belongs in storyteller-private `private-possibility` material and can be ignored or transformed by play. A future event that the rules require to become due is an executable world obligation with conditions and timing. Neither kind is recorded as though it already happened, and a famous source storyline is not automatically a mandatory railroad merely because the campaign begins in that setting.

An optional campaign-owned narrative-direction document gives those possibilities a coherent strategy: which larger pressures or themes the Storyteller currently intends to cultivate, why they fit, what established facts constrain them and what would cause reconsideration. It may explicitly record that no larger direction is wanted. It is storyteller-private, noncanonical and revisable; it does not duplicate the creative profile, current world state or a list of every possible scene. Changing a profile can change how later tasks pursue the direction, but cannot silently erase it or override an explicit no-grand-narrative campaign setting.

Direction becomes reality only through ordinary admission. If the Storyteller decides a meteor is now approaching, the same result can establish bounded descriptive lore/thread changes and propose whatever supported executable obligation is needed; application code validates and commits them. If it remains only a possible future, it stays private. The player may keep fishing, flee, investigate or fail—the direction guides pressure and reveal timing but cannot precommit their response or ending.

## Document envelope

Every stored version has validated metadata: `documentId`, `kind`, `schemaVersion`, `revision`, `visibility`, `authority`, source/derivation references, and any relevant story-time/sequence coverage. The commit manifest binds it to its campaign, path, content hash, author operation and previous version. IDs and hashes are assigned or checked by the application, not accepted as self-certifying model claims.

Links reference document IDs plus revisions/sections where evidence requires an exact version. Search and excerpts return the actual version/hash read. A mutable friendly path never serves as a frozen citation. A document can contain several claims with different attribution; a top-level `canon` label must not turn every quoted rumor into established truth.

Example human-readable memory segment, shown without machine-assigned hash/IDs:

```markdown
---
kind: memory-segment
revision: 1
authority: derived
visibility: player-known
coverage: { fromSequence: 2, throughSequence: 4 }
sources: [passage-0002@1, passage-0003@1, passage-0004@1]
---
# The visitor at the beacon
The visitor claimed to represent the harbor watch. Mara inspected his badge
and accepted the recorded successful result. She asked him to return to the boat.

## Consequences and loose ends
- The warning remains unresolved: [The warning](thread:the-warning).
- Repair was interrupted, not completed. Consult current state for its progress.
```

The original exchange remains available if the exact warning or tone matters later. This summary does not replace that evidence or grant a reward.

## The Storyteller as a versioned bundle

Move creative guidance toward a bundle with a small entry document, voice/rhythm/choice principles, a few relevant examples and task-specific sections. The current implementation already loads profiles from validated JSON files in `packages/storyteller/src/profiles/definitions`; it does not require a database row for each personality. File bundles evolve that boundary rather than introduce one agent instance per story or NPC.

Capture the exact bundle revision in every task. Load the entry and relevant sections within the context budget; do not concatenate the whole bundle on every call. Creative guidance may influence presentation and proposals, but executable schemas, tool permissions, accounting and mechanical rules remain application policy. Story text cannot impersonate bundle instructions. Campaign notes cannot silently rewrite the selected Storyteller's style, and changing a shared bundle cannot alter a task already captured.

## Descriptive changes and the revision fence

An already-required Storyteller call should produce reusable structured material in one response. Each semantic payload is generated once: the result contains one passage value, and application code both presents that value to the player and serializes the same accepted value into its canonical source document. Never ask the model to repeat the passage as JSON and Markdown, or as display prose and storage prose. Markdown/frontmatter, hashes, envelopes, paths and publication metadata are deterministic code projections. Optional proposed document operations contain only genuinely additional material or compact typed intent—such as linking an identity, revising an existing description or closing a thread—not a second rendering of the passage. Where the passage itself is sufficient evidence, the operation cites that passage rather than restating it. Generic application code validates and maps accepted values into canonical revisions; it must not pay for another call merely to rediscover useful facts in the first output. The complete raw provider envelope remains audit evidence, not canon, and rejected or unselected branches are not published. A later summarization or extraction call is optional maintenance with its own explicit budget, never a hidden requirement for preserving the turn.

Canonical documents are mutable logical records built from immutable versions. If a dragon destroys a city, a possession changes hands, a character becomes possessed or a wall is breached, the campaign root must advance to versions that represent the admitted new state. Old versions remain evidence and are never rewritten. Do not reconstruct current state by rereading all narration: the same Storyteller result may propose a bounded change set, and deterministic mechanics produce their own exact effects/receipts. Publication admits the passage, descriptive changes, mechanical effects and new manifest root under one revision fence or admits none of them.

Descriptive change proposals can create or revise bounded lore, identity, relationship, thread and private-possibility documents. The application assigns identities for new records, supplies passage provenance and checks expected document/root revisions. The model cannot use this channel to change inventory, skills, scores, HP, clocks, activity progress, obligations or other executable state; those require supported typed effects. A descriptive document may link to a mechanical receipt without duplicating or overruling it.

The current intermediate implementation admits typed story-item creation and transfer transactionally in PostgreSQL, which remains the live authority read by gameplay. The bootstrap `state/story-items.json` document is not yet advanced after those effects and must not be treated as current inventory. The next storage slice must prepare its successor outside the database transaction, then publish the item effects, passage and new manifest root under the same revision fence; object-store reads or writes do not belong under the story lock.

A revision may update the current body, title, path, authority or visibility allowed by policy, but it cannot change the logical document kind. Only an existing descriptive Markdown record of that same kind is eligible. Structured character, inventory, settings, time, package-reference and source-passage identities cannot be captured and rewritten through the Storyteller's descriptive proposal channel.

Active-scene cues and catalogue-handle aliases are loaded for a later task by [Active-scene recall cues](context-selection-and-recall.md#active-scene-recall-cues). They do not change document kind or executable state.

Entity and world event histories are useful indexes, not substitutes for current state. A material change can append a compact source-linked event and update the entity's current document in the same admitted change set. Retrieval may read the current entity first and expand into its event/source history only when needed. Do not emit bookkeeping for every adjective or restate unchanged files after every turn; record changes with future continuity value.

### Entity materialization

Entity materialization is progressive. A name may exist only in world lore or
a passage; registration adds a stable ID, aliases, kind and source;
continuity-active status adds a compact current identity/relationship record;
mechanically active status adds only the structured fields required by an
admitted rule. Expected start participants may enter at the registered or
continuity level immediately. Meaningful interaction, planned return or a
mechanical target can promote an incidental entity, but generic code never
creates a full character sheet merely because prose contains a proper noun.

## Extract, summarize and revise deliberately

- Preserve original published passages and exact decisions/results. A failed or unselected generated branch is not history; keep it out of ordinary canon/search.
- Maintain bounded memory summaries from original source ranges and relevant receipts. Topic/identity indexes can link them; revisions must not recursively summarize the last summary as the only surviving evidence. No gameplay chapter or required narrative arc is introduced.
- Promote identities and threads when later continuity needs them. Use stable IDs and explicit alias associations. A passing crowd does not require a folder full of permanent biographies.
- Preserve distinctive lived details: a damaged shutter, the way a favor was offered, a recurring joke. Pure state deltas are insufficient for recognizably remembered relationships.
- Separate “known then,” “claimed by X,” “currently established” and “proposed possibility.” Later knowledge supersedes a claim's present usefulness without rewriting the original speech.
- Source additions, retirements and superseding versions invalidate dependent summaries/index chunks through recorded dependencies. Invalidated derived memory is marked stale until rebuilt; it is not quietly served as current.
- A human edit creates a proposed revision and readable diff. Descriptive corrections can use document admission; a retcon that changes already-executed mechanics needs an explicit administrative operation. Editing `current.json` in an export never changes live currency.
- A Storyteller's scratchpad may preserve short nonbinding leads or maintenance tasks, but not hidden chain-of-thought transcripts. Speculation is labelled and cannot become evidence merely because it survived a restart.

## Publication across files and the execution ledger

Implementation design: immutable content objects plus a manifest; PostgreSQL atomically selects the published manifest root alongside affected game state. The manifest owns the file namespace. Small database references coordinate execution; they do not duplicate editable lore bodies.

For a turn that establishes required narrative canon:

1. Validate a proposed change set against captured sources, document revisions and allowed content/mechanics. Build new immutable document objects and a candidate manifest outside the database transaction.
2. Store those immutable objects and verify their hashes/durability before publication. Never overwrite a currently published object in place. The storage adapter must define its durable-write behavior; file-close alone is not an unconditional crash-safety guarantee.
3. In one short database transaction, lock/recheck the campaign's relevant state and current document-root revision, deduplicate the operation, and commit admitted effects/publication references, the new manifest root and an indexing outbox notice. Do not perform object-store I/O or inference under that lock.
4. Index after commit. Readers resolve only objects reachable from their captured published manifest. A staged but unpublished document is never story evidence.

A crash before the transaction leaves unreachable staged objects; cleanup may remove them after a grace period and reachability check. A lost acknowledgement after commit is recovered through the saved operation/root without applying effects again. Concurrent conflicting changes fail their expected-root check; any retry rebuilds against an explicit fresh base. A background summary cannot overwrite a newer document by last-write-wins.

Reachability includes retained published history, source citations, captured tasks, pending commit leases and retained exports, not just the current root. Garbage collection must not delete an old scene still cited by a summary or an in-flight request. Retention/deletion policy can deliberately retire history, but ordinary cleanup cannot silently destroy it.

Required narrative content unavailable in storage means its publication remains held. Already committed mechanical work and pending consequence receipts remain intact. Optional episode extraction can lag through a durable maintenance intent: use original committed evidence and show the gap. Quiet activity receipts can be exported asynchronously because the ledger remains their authority; a later task must include the unexported relevant tail or explicitly hold, never pretend file coverage is complete.

For the first slice, expose a read-only file view of existing committed scenes/receipts with coverage clearly labelled as a projection. In the next connected slice, move admitted narrative bodies to immutable objects and retain SQL publication metadata/references. Remove the superseded body-writing path when ownership moves. This staged implementation preserves reviewable boundaries without making the projection the permanent endpoint.

Object-store conditional writes can protect individual objects or heads; they do not themselves create an atomic transaction spanning a bucket and PostgreSQL. Using a database manifest pointer is an intentional coordination choice. A wholly file-based engine would need its own transaction journal, concurrency, recovery and accounting design; it is a separate proposal with no demonstrated gameplay advantage here.

## Recovery, inspection and portability

First adapter recommendation: ignored local `data/` storage shared by API and worker, with a storage contract that can later support a bucket. MinIO is not a semantic or canonicality requirement: it becomes useful when separately deployed processes cannot share one durable filesystem, when bucket operations need realistic rehearsal, or when the chosen deployment needs S3-compatible operational tooling. Introducing it earlier would change the adapter and deployment topology, not the document/read/admission contract. Export materializes friendly `.md` paths plus manifest, immutable versions/source links and checksums. Live campaign content never enters this source repository by default. Example documents checked into tests must be invented/public fixtures.

Deleting and rebuilding the search index must leave the campaign intact. Export/import should restore a navigable knowledge workspace with provenance. Resuming the executable game additionally needs the transactional ledger, settings, permissions, clocks and outstanding operations; a folder of prose alone is not a complete runnable save. Document this distinction in tooling rather than promising recovery it cannot perform.

Access and deletion apply to object versions, exports, search chunks, caches and saved prompts as well as current paths. Raw object listings are not exposed to the Storyteller. Scope path resolution, reject traversal and arbitrary URI fetches, and escape rendered Markdown. A secret document's title/backlink cannot leak through public search. Visibility changes invalidate old public index/cache views; authorization is checked again on read even for a pinned task.

Chamber should show the document tree, kind/authority, current version, source coverage, publication status, index status and the exact documents selected for a task. Logs record stable events such as `knowledge.commit_conflict`, `knowledge.required_document_unavailable` and `knowledge.index_lag` with campaign/operation/version correlation, never private prose. This inspection can begin as a compact developer panel.

Which documents a task selected is [What source enters this task](context-selection-and-recall.md#what-source-enters-this-task). Deleting an index still does not delete canon.

## Research informing storage

- [Amazon S3 consistency](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) and [conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) inform the immutable-object/head boundary. Adapter guarantees must be checked for the actual selected service; “S3-compatible” is not proof of every AWS guarantee.
