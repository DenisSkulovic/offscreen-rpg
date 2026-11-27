# Living Book | Reader continuity when the world changes

**State:** OPEN DESIGN, **not** a selected game-client implementation contract. Source basis: [13 Narrative Document Compositor](13-NARRATIVE-DOCUMENT-COMPOSITOR.md), accepted `docs/product/experience/{play-and-decisions,return-and-journal,navigation-and-stories}.md`, selected `docs/technical/client/state-and-server-boundary.md`, source ZIP `9e821c6e15bb`. No implementation Change authorized.

## 1. Separate three clocks/positions

1. **Game truth:** which snapshot/viewVersion and current authorized passage/offer the server has committed. This may change while a user is elsewhere in the book.
2. **Reader location:** the passage/paragraph being examined. This should not automatically teleport on every poll, image load, page recomposition or animation frame.
3. **Animation state:** temporary page-turn progress. It owns no game commands, story identity, read acknowledgements, or durable reader position.

**Design stance:** pin the visible source while the user is deliberately reading it. When a newer authoritative publication arrives, give an unobtrusive **“New page available”** affordance, but don't change the selected leaf under the reader's finger. At a current decision, old offer options must become unmistakably stale/disabled as soon as the newer authoritative offer is established. The player can navigate to the new Now. Reading a historical passage never reopens its old options.

## 2. Reader state separation (conceptual, not public API)

| State | Logical key | Lifetime | Authority |
| --- | --- | --- | --- |
| Live source | `viewerId/storyId + viewVersion + passageId` | Remote query cache (viewer-scoped) | Server |
| Live offer | `storyId + offer identity + authorized option IDs` | Current snapshot only | Server |
| Reader cursor | `passageId + semantic source anchor` | Reader preference/in-session state | Reader, permission checked |
| Page layout | source anchor + font/viewport/art fingerprint | Discard on reflow | Pure compositor |
| Animation | from/to transient leaf plan | Only during transition | Disposable effect driver |
| Journal open source | viewer-scoped original passage | While authorized history is accessible | Server read model |

These must not share a single `currentPage` integer or conflate `viewVersion` with book page number. A page-turn completion event never becomes a choice acceptance event or a foreground-read acknowledgement by itself.

## 3. Race scenarios we must deliberately support

| Scenario | Required player result | Forbidden behavior |
| --- | --- | --- |
| New published passage while user reads earlier Now leaf | Keep original readable; signal newer source; allow explicit jump. On that jump, restore a safe anchor and newest verified offer | Teleporting, inserting future words into old passage, reusing prior offer |
| Offer replaced while decision sheet open | Mark old options stale/disable; show current authoritative offer only after projection reconciliation | Submit a stale option because it remains a visible DOM button |
| Command response was lost (uncertain admission) | Reconcile frozen intent and authoritative receipt/status; preserve last committed narration | Second paid attempt/reroll triggered by page refresh |
| Font enlargement while on paragraph 8 | Capture source anchor, cancel old pagination, reflow, restore that paragraph/position | Jumping to “page 8” in the new layout |
| Illustration resolves after reader navigated away | Ignore stale source asset for current leaf; optionally reflow correct anchored historical passage if reopened | Applying old cave image or lighting to an unrelated current passage |
| Reader switches story A → story B | Clear A's private leaf/pagination/offer state from B's active UI; enforce viewer scope | Exposing A's text or firing A's option in B |
| Viewer revoked / signed out | Remove private source and derived marks from visible reader and caches | Leaving a readable cached open page after revocation |
| Journal → Now after long absence | Preserve Journal source location; obtain current authorized snapshot independently | Treat latest historical cursor as current playable state |
| Source history unavailable | Show intelligible authorized partial history/read recovery | Manufacture missing passages, source IDs or events |
| Animation canceled by resize/update | Settle to one stable semantic anchor; restore focus where possible | Double-turn, duplicate DOM choices, phantom read ACK |

## 4. Practical UI policy, not another dashboard

- One discreet index/bookmark exposes **Now**, **Journal** and contextual destinations. No fixed left tabs or an engineering inspector.
- If a decision is due while the reader is reviewing prior prose, a low-noise **“Decision available: 6 intentions”** jump remains discoverable. It never claims that six is a universal count.
- During a critical ambiguous command, status must be understandable even if atmosphere is dark and the physical book is mid-turn. A real blocked operation cannot be disguised by the fiction.
- A pending new publication is not a current passage. We do not turn the page on `202 accepted`, a timer reaching zero, model tokens streaming, or an image finishing loading.
- For Journal, page-turn, next/previous *reading*, and **Back to Now** are distinct user actions. Browser Back retraces the actual navigation route when implemented.
- Avoid an artificial full-screen forced recap after return; present a source-scoped prelude while keeping the current decision accessible.

## 5. Design harness requirements (next round)

A disposable lab should simulate a small server-originated sequence with monotonically increasing viewVersion and immutable passage IDs. Test: old offer button and its handler retained then newer offer published, history open during a new passage, resize during a simulated turn, late art load, lost response and switch to another story. The lab must show which source ID and offer ID are currently trusted, even though its developer-only debug overlay is not a player UI.

**No production inference:** a browser-only simulator cannot verify server exactly-once guarantees, session authority, outbox publication, billing, or actual SSE/update races. Integration proof belongs to a later technical design and selected Change.

## 6. What can be ratified before implementation

**Likely product decision:** reading continuity is anchored to immutable source, not a mutable physical leaf. New published content invites rather than forcibly interrupts the reader. **Likely technical design condition:** stale offer DOM actions cannot submit even if they survived animation; the command dispatcher must verify current authoritative offer identity and frozen intent. These are proposed design outcomes, not code changes.