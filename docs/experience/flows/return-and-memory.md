# Return, Journal and continuity | memory the player can feel

**Status:** desired experience, not proof that the current runtime can build a rich sourced digest. Product source: [continuity](../../continuity-and-consequences.md) and [reading a long life](../../player-experience.md#reading-a-long-life).

A character's history is Offscreen RPG's most valuable asset. Its interface should make a month of earned, ordinary living feel rich instead of burying the player in a feed of ticks, dice and generated prose.

## Return is a distinct flow, not a permanent modal

On opening Now after meaningful absence or published changes, show **Since you last visited** as a compact, dismissible digest *above or beside* the current situation, depending on size and urgency. It should answer:
- What **actually** changed (completed work, lost possession, new relationship, event)?
- What **did not** happen (unaccepted future plan, suspended routine, unearned wages)?
- What **needs** me now, and why?
- Can I inspect the original passage or receipt behind a statement?

The digest is factual by default. A literary retelling may be offered if supported and separately budgeted; it must not invent changes that records cannot support.

### Example: work interrupted

**While you were away**  
- The beacon repair reached **3 of 5 earned units**.  
- A stranger arrived and work stopped.  
- Your repair progress is preserved. No payment or completion was recorded.  
**Now:** The stranger is asking a question. [Return to the scene] [See details]

No “Three interesting things happened!” headline if nothing did. No gratuitous fireworks.

### Example: no accepted activity

**Nothing progressed while you were away.** Your character was waiting for your next instruction. **Now:** Choose how to spend time.

This is a *feature of deliberate time*, not a bug to conceal with pulsing animations.

### Example: quiet accepted routine

**Since your last visit:** Two shifts were completed and their recorded wages are available. Your accepted itinerary has ended. **Now:** Choose your next intention. The Journal offers the individual verified reports if desired.

Do not retroactively claim a relationship changed because the generated recap wants a story beat.

## Reliable “since last visit”

A digest needs a safe, versioned baseline of what the authenticated viewer last actually saw. If reliable last-seen data are unavailable, label the scope **Recent developments** instead of falsely claiming exact absence. A stored “last opened at” timestamp is not automatically a proof of what was read, and different devices may have different reading positions. A minimal MVP could use a small bounded “recent committed changes” list until a proper seen cursor is defined.

When multiple users share a story, baseline and attention are viewer-specific; the shared world still has one authoritative history.

## Journal information architecture

**Level 1: the life in brief.** A short overview of relevant ongoing threads, recent meaningful changes, relationships or routines that actually have source evidence. Not a generated biography that replaces canon.

**Level 2: chronological history.** Ordered passages and committed events with dates/cycles if supported. Quiet intervals can be grouped compactly without deleting their underlying events. Grouping by time period is a navigational convenience, **not** chapters.

**Level 3: detail/provenance.** Original prose, mechanical check and effect where public, source sequence, associated people/places and full activity events when requested.

A player may search or filter by known person, place, item, intention or date. These are navigation aids over existing evidence; do not require creation of an exhaustive world registry.

## World and You contextual spaces

**World:** known places, significant people/other entities, remembered relationships, events/threads and optionally a suitable map for a spatial premise. All entries trace to established evidence. Unknown NPCs do not appear as locked spoilers in a global directory.

**You:** actual applicable capabilities, relevant conditions, significant items and commitments. A microbe can have sensing capabilities and none of the usual human sheet. If the character lacks a currency or physical inventory, omit those groups rather than show empty generic placeholders.

**Context shelf on Now:** relevant one-to-three bits of this information only. The shelf is a doorway into deeper context, not a comprehensive character HUD.

## Relevance without rewriting history

Original passages and receipts remain fixed. Later events may make a previously ordinary patron or tool newly significant. The overview/search ranking can change to highlight that source, but must not edit old facts, falsely invent dialogue or claim deterministic certainty from a speculative narrative inference.

Labels matter:
- **Recorded:** a committed, sourced event or item fact.
- **Summary:** derived, source-linked description of events.
- **Uncertain / remembered imperfectly:** a character belief or disputed information, not canonical truth.
- **Planned:** a future intention, not something that has already happened.

The journal may contain player-perceived unreliable narration without revealing hidden DM truth. Source links go to **visible, authorized passages**, not secret plans or provider logs.

## Reading ergonomics

- Comfortable prose column, clear paragraph boundaries, stable scroll position on new updates.
- A visible path back to **Now** and its current decision; journal navigation doesn't take fictional time.
- Keyboard and screen reader access to date/entry headings, expandable receipts and search.
- Dense histories use pagination/virtualization where justified, preserving deep-link and focus behavior.
- Returning to a bookmarked old passage does not resurrect its choices.
- No notification or badge count for every background check; only meaningful events/attention.

## Negative tests

- An old notification opens the **current** scene, not a dead decision button.
- A generated recap fails: committed outcomes remain visible; no ghost history is inserted.
- No activity was accepted: no elapsed fictional hours in a “while away” digest.
- Later relevance highlights a past ordinary action but leaves its source unchanged.
- In a nonhuman story, no default “inventory 0/40,” humanoid health bar or map.
- A second device reads a newer passage; the first device cannot silently submit a stale offer.
- Secret encounter rolls and private future direction never leak into search results.
