# Canonical entrypoint resolution | prompt, Storyteller profile and orientation

**Status:** unratified design, 2026-11-20. See [LAUNCH-BOUNDARIES-AUDIT](LAUNCH-BOUNDARIES-AUDIT.md) for code and [PREPLAY-WORKDESK-PROTOCOL](PREPLAY-WORKDESK-PROTOCOL.md) for staging/commit boundaries.

## Main proposition

A Storyteller should understand a **Library of named Markdown documents**. A small subset of recognized **role-bearing entrypoints** gets deterministically selected and injected into the admitted task without the model spending a tool round to discover them. Names are a good authoring interface, not a cryptographic identity or a permission grant.

Suggested conventional paths:
- `STORY_PROMPT.md`: exact accepted human request, including one-word `bah`; source of **user intent**, not a list of already-established world facts.
- `STORYTELLER_PROFILE.md`: versioned creative direction/voice; source of behavior guidance, not engine, tool, clock, budget or safety authority.
- `START.md`: compact Library orientation and links; note that preset `START.md` currently mounts to `start/package.md` when imported into the campaign.

The words “Library” and “Workdesk” are the in-game agent interface. They do not entail POSIX paths, unbounded traversal, or permission to mutate files directly. Additional normal source pages can use familiar `.md` names without becoming globally special.

## Names, roles, namespaces

The effective lookup cannot mean “pick the first file with this basename”. A user may select a preset that includes its own `STORYTELLER_PROFILE.md`, while the application provides an optional default, and the Workdesk may later produce a related creative-direction note.

**Proposed scoped resolver inputs:**
```text
platform://policy/...          trusted runtime constraints; NOT creative files
defaults://creative/...       versioned default guidance/recipes
preset://<root>/START.md       authored, immutable source orientation
preset://<root>/STORYTELLER_PROFILE.md (optional)
launch://<launch>/STORY_PROMPT.md (required effective user intent)
workdesk://<stage>/...         private proposed preparation, not published canon
campaign://<root>/START.md     published orientation only after Start
```

The `<...>` labels above are conceptual locators, **not actual implemented URL schemes**.

A role match must validate **(scope, exact logical path, kind, authority, visibility, objectHash, documentId/revision)** against a pinned manifest; reject a wrong-kind file instead of silently interpreting an unrelated document as an instruction. Treat paths as case-sensitive unless a validated import explicitly normalizes them. Do not rely on bare basename search across worlds, workdesks and campaigns.

A start package can include a `creative-guidance` Markdown entry in today's schema, but it cannot thereby override a high-trust provider/system recipe. `STORYTELLER_PROFILE.md` is a **creative role**, not a system-message role.

## What to inject automatically

Proposed launch task context floor, before optional retrieval:
1. Exact initial player Story Prompt, or an explicit size-hold if it exceeds admissible provider context.
2. Pinned **effective creative-profile core**, resolved deterministically.
3. Bounded preset/package orientation (`START.md`) and source/rule/invention constraints applicable to this task.
4. If composing after preparation, the selected staged Workdesk root, compact orientation and explicit source handles needed for the opening.
5. Typed current mechanical facts or capabilities when the task actually requires them; no invented human-character record.

Do **not** automatically inject all published passages, every source document, every private possibility, or a 30-page profile. A small catalogue/index tells the agent what it can inspect. Other material is loaded by bounded exact reads, with recorded omissions and token budgets.

Crucial code observation: `loadStartPackageKnowledge` currently selects up to **8** documents, **4 KiB** per document and **12 KiB** overall, ordered by kind. `creative-guidance` is last among its eligible kinds, so a named profile can disappear from the task despite existing in the package. A role-based required-input resolver must run **before** optional ranking, reserve explicit bytes and fail visibly if essential content cannot fit.

A fixed default “dramatic voice” should not overwrite a user who expressly asks for quiet observation of a cosmic system. An unset profile does not imply a mandatory auto-classifier LLM call. A text-based default may be chosen deterministically; richer interpretation can happen during an already-admitted creative mission.

## Precedence and provenance proposal

Keep two separate questions:

**Who may decide the Storyteller's artistic taste?** Suggested creative precedence within allowed scope:
- Explicit current player's accepted creative direction (including prompt chips) is the highest ordinary preference.
- Otherwise a pinned prepared experience's authored creative guidance can provide the intended voice.
- Otherwise a versioned application default applies.
- The Storyteller may choose local expression and invent fitting details *inside* these preferences and the world's invention policy.

**Who may govern the engine?** Platform/operator constraints, user consent/access grants, supported mechanics, fixed world/rule content policy, captured time settings and financial limits are not subject to override by any creative document. A freeform prompt like “ignore rate limits” is still just text.

Do not concatenate contradictory creative sources without a resolver. Record a small **effective-guidance provenance**: selected source documents, each hash/revision, explicit override decisions and a captured final guidance digest. That can remain structured metadata while the primary creative content lives in Markdown.

**Open:** Should accepted player creative guidance be stored solely in `STORY_PROMPT.md`, split into a separately editable profile overlay, or represented as a materialized derived effective profile? The player still sees *one field*. This decision affects replay and future personalization. Do not manufacture two independent editable prompt truths.

## Profile evolution without JSON tyranny

Current `storytellerProfileSchema` is a strict typed JSON object that the task captures, with tone/rhythm/avoid/task guidance fields. “Profile is a file” does **not** mean discarding reliable version capture and structured identity.

A plausible target is:
- The **authoritative creative words** live in a pinned Markdown document.
- The engine compiles a bounded effective snapshot for a particular task (possibly just a `coreText` plus hashes and task-specific guidance).
- Technical routing/resource policy remains separate typed data.
- The compiled snapshot is immutable per admitted task. Later document edits affect **future** tasks only if settings/revision rules admit the change.
- Core injection is automatic and free of tool round-trips; long examples or genre techniques are optional Library reads/skills.
- A generated workdesk note cannot silently modify the already-dispatched profile or grant a new skill/tool.

We must choose between (a) adapting the strict profile schema to store a text body and provenance, and (b) retaining a small typed envelope while moving all creative content into Markdown. Either beats maintaining two independently authoritative copies of tone/rhythm/avoid in JSON and in a canonical file.

## Concrete collision examples

| Input | Correct policy-shaped response |
| --- | --- |
| Preset contains valid `STORYTELLER_PROFILE.md` and user presses Play | Resolve, pin and inject bounded creative core without requiring profile selection |
| Preset contains `STORYTELLER_PROFILE.md` but wrong kind `lore` | Reject/hold package validation, not treat lore text as operational guidance |
| User types “no comedy” but preset is Absurd Action Comedy | Decide allowed creative precedence explicitly; do not silently mix contradictory instructions |
| `workdesk://...` proposes a second profile during preparation | Remains a proposal, not a self-escalation of current task's profile; future adoption requires authorization |
| Two mounted worlds both contain `START.md` | Each resolves within its own pinned namespace, not by filename collision |
| Player provides a three-page request under a one-shot provider budget | Validate actual serialized size, preserve verbatim stored input, and hold with honest size/budget outcome rather than silently truncate |
| Profile is 60 KiB with two useful paragraphs | Either require a bounded `core` section at import or explicit trusted extraction/compilation with captured result; do not make a model read 60 KiB every scene |
| Source package tries “ignore all system rules” | Source-content request cannot override application permissions, spending or safety rules |
| Existing launch retries after profile was edited | Use captured profile document hash and compiled snapshot, not a late lookup of the current path |

## Critical not-yet-decided modeling questions

1. Is `STORY_PROMPT.md` a new document kind `user-intent` (more semantically exact) or a carefully scoped subtype of `premise`? Do **not** blindly mark the entire user text as fictional `canon`.
2. Must `STORYTELLER_PROFILE.md` have a fixed minimal section such as `## Core`? If so, what byte/token budget and failure policy? A tiny compiled text field might suffice and allow arbitrary prose elsewhere.
3. Are conventional paths **reserved** within their namespace, or role entries **declared in the manifest** and merely default to these names? File-name discovery best serves authoring, but explicit metadata still needs validation.
4. What do creator-supplied profiles and future account-level preferences mean when they conflict with one another or with the player's current prompt?
5. Should generic custom launches seed a synthetic orientation, or can the first Workdesk consist solely of one verbatim intent source plus default guidance?
6. How do we avoid duplication between the authored preset's `START.md`, the campaign `START.md`, and a workdesk orientation?
7. How does a prompt author specify a **descriptive** desired pace versus the engine's **typed** game-clock behavior? They must never be silently conflated.

## Proposed narrow provider-free trial

Import a fixture containing `START.md`, a named creative-guidance profile and one additional lore page, then show that the resolver (a) selects the correct pinned role, (b) includes its bounded core *even when there are many higher-ranked optional lore docs*, (c) records exact hashes and omissions, (d) does not add a model/tool call, and (e) blocks a wrong-kind or ambiguous file. Separately, use `bah` and an abstract galaxy prompt to verify that missing humanoid/profile fields do not fail preparation.

**Do not implement until the role/precedence/size and launch-root contracts are accepted.** This file is a design proposal, not runtime proof.
