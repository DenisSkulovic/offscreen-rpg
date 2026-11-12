# Daily repository session minutes

**Purpose:** Preserve the owner's consequential technical thoughts, intent, constraints, doubts, decisions and next steps across model context limits, chat switches and coding-agent handoffs. **Scope:** ChatGPT, Claude Code, Cursor and any other agent helping develop this repository. This is the durable **conversation/decision history**, not another technical specification, a code Change, or permission to implement.

## Trigger: capture substantive work while it happens

For **each local day (Europe/Vilnius) with meaningful repository work or planning**, maintain exactly one `docs/minutes/YYYY-MM-DD.md`. The date is the local date of the discussion, not the commit date if those differ. On a new workday create that day's file; on subsequent exchanges on the same date **append** new chronological entries rather than generating a second minutes file.

**Do not wait until a chat is almost full.** After a significant user message, decision, changed priority, accepted/rejected architecture, design objection, investigation discovery, implementation outcome or meaningful unresolved problem, update the day's minutes at the next safe documentation-edit opportunity. At an interruption, tool/agent handoff, end of a substantial session or new-chat transition, perform a final continuity pass. There is no need to log a greeting, typo fix, every tool call or an empty day.

When the owner gives a long, stream-of-consciousness request, **extract every materially different point** rather than summarizing away its qualifications. Especially retain negative constraints ("not now", "not this way"), the owner's _reason_ for a choice, proposed future work even if not chosen, concerns about agent behavior, and the difference between near-term and long-term goals. Record useful disagreements and rejected alternatives as well as final agreements. Preserve a short exact phrase when wording carries a distinctive requirement; don't paste a full conversation.

## What an entry records

- **Owner input and rationale:** what the user actually requested or argued, separated from an agent's interpretation or recommendation.
- **Decision state:** `Owner direction`, `Agreed`, `Proposed`, `Rejected`, `Deferred`, `Superseded`, or `Open`; name who owns any pending decision. An agent recommendation is not owner approval.
- **Engineering substance:** target end state, significant design alternatives/trade-offs, risks or constraints, relevant paths/sections and which work is explicitly excluded.
- **Action and evidence:** links to documents, Changes and commits actually created; tests **actually run**, with revision and limits. If no test was run, say so; don't claim an agent-only source read is runtime proof.
- **Next handoff:** what a fresh agent should do or deliberately avoid, and the smallest meaningful next question.

Use one `###` heading per meaningful episode (a short numbered/chronological entry). Times are optional; never invent precise timestamps. A day may have many entries when decisions are substantial. Prefer **useful detail over artificially short minutes**, but concise linking over duplicating full technical contracts.

## Authority and freshness rules

**Minutes record history, not authority.** Active user directions, authoritative product/technical standards, approved design targets, `docs/changes/README.md`, actual source and current proof retain their respective roles. The presence of an idea in minutes never authorizes coding, provider calls, paid tools, migration, release or deployments. Proposed/refuted options do not become requirements because an agent wrote them down.

When the owner _accepts_ a long-lived rule, specification or code Change, update the **owning permanent document or execution packet as well**; minutes retain the rationale and link. Do not make future agents extract binding invariants from hundreds of minutes. If a later discussion reverses yesterday's choice, **append a supersession/correction entry** and link the new authority; don't quietly erase history. Label reconstructed minutes and their source/uncertainty; don't manufacture quotations or pretend reconstructed notes were recorded in real time.

Don't write credentials, tokens, private provider payloads, unredacted personal data, unrelated life context or full chat transcripts into Git. Keep notes about repository engineering. Respect the working tree and any conflicting edits.

## Access and fresh-session behavior

- **At a fresh substantial repository session:** read the [minutes index](../../docs/minutes/README.md), the **latest relevant date** and the current [roadmap](../../TODO.md) / [Change queue](../../docs/changes/README.md) as needed. For a focused known task, use the current owner/Change and read minutes only when earlier intent or rationale matters. Do **not** preload the entire archive by default.
- **During work:** append the active day's entries when repository documentation edits and Git writes are authorized. Keep the index's newest-date link current. Do not silently push an unrelated change or override an uncommitted file.
- **When read-only or without write access:** supply a concrete proposed minutes entry in the handoff and state clearly it was **not persisted**; the next authorized agent should apply it. A rule cannot grant missing tool permissions.
- **Before changing chat/agent:** ensure the important owner directions, decisions, unresolved items and artifact links reached the day's minutes, or explicitly tell the owner what remains unrecorded.

**Discoverability:** root `AGENTS.md` points to this rule and the latest minutes. `docs/README.md` and `docs/minutes/README.md` route fresh contexts. Log all meaningful work, not just work that produced a `CHANGE.md`.
