# Phase 1 | Space architecture and navigation contracts

**State:** OPEN DESIGN. Proposed experiential structure, not approved route names or React component plan.
**Reconciles:** `docs/product/experience/navigation-and-stories.md`, `entry-and-onboarding.md`, `principles.md`. These accepted documents take precedence where this proposal is undecided.

## 1. A home for lives, then two principal ways of inhabiting one

```text
PUBLIC CONTEXT
Welcome ── Try Demo (scripted, explicitly temporary)
    │
    └── Sign in ── Your Stories ── Create (draft)
                       │               ├─ foundation
                       │               ├─ role / starting situation
                       │               ├─ Storyteller / pace / risk / cost
                       │               └─ review → explicit generate/start
                       │
                       └── Story [id]
                              ├── NOW (default)
                              │    ├─ current passage / situation
                              │    ├─ active choice / admitted action / quiet hold
                              │    ├─ return prelude (conditional)
                              │    └─ contextual details
                              └── JOURNAL
                                   ├─ overview / moment index
                                   └─ original passage reader
                              [World / You — contextual, only if meaningful]
                              [Story settings — out-of-fiction utility]
ACCOUNT CONTEXT: identity, preferences, notifications and safety/usage settings
STAFF / CHAMBER CONTEXT: separate from player navigation and authority
```

Arrows are journeys and parent-child relationships, **not** prescribed routes or screen count. `Now` and `Journal` are primary labeled story destinations, consistent with the existing selected navigation contract. The nested reading modes can share a destination and preserve local context or use stable deep links; that is a later interaction/technical choice.

## 2. Surface specifications: player job → first visual priority → controls → anti-pattern

| Surface | First visual priority | Key behavior and content | Deliberate omission |
| --- | --- | --- | --- |
| **Welcome** | Example of a life in motion, one visible meaningful choice | Honest taste + one clear demo/continue path; secondary explanation | Generic SaaS “features/pricing” cards as the hero |
| **Demo** | Representative situation and credible consequence | Explicit scripted/temporary badge; manual stepping labeled; explore without account | Fake backend countdown or “saved” claims |
| **Stories** | One recognizable life with the thing that matters **now** | Continue, inspect others, create; drafts separated; attention states source-backed | Equal-sized metric tiles, story ID/status-code tables |
| **Create** | One creative decision per dependent step | Foundation → role → Storyteller/direction/pace → review/consent; recoverable draft | Giant form, omniscient lore catalog, silent regeneration |
| **Now** | Current verified passage and action/hold contract | Perceive → consider → commit/leave/continue; status remains honest | Chat transcript or cockpit of technical panels |
| **Journal overview** | Shape of the lived history, navigation anchors | Scan sourced “moments”, return to reader/Now, search/filter when supported | One expanded full passage per row by default |
| **Passage reader** | Original prose at humane line length | Stable previous/next, original/source identity, return to overview/Now | Active old choice buttons, fake chapters |
| **World** | Known context relevant to this life | People, places, relationships or durable facts **only when backed** | Required world map/entire simulated population |
| **You** | What the player can actually use or understand | Applicable ability/condition/identity; relevance to current choice | Empty humanoid inventory/HP panels for abstract characters |
| **Story settings** | Safe explicit adjustment with consequences | Existing creative settings, consent boundaries and valid changes | Decorations masquerading as game decisions |
| **Account** | Identity and platform controls | Session, notifications, accessibility, spending visibility | Mixing story fiction into security and billing |
| **Error/recovery** | What was saved, what is uncertain, what action is safe | Explicit retry/refresh/re-auth pathways bound to receipts | Decorative “try again” that repeats spend or dice |

## 3. Stories shelf: not a dashboard

**Candidate hierarchy:** one **resume story** prominent by recognizable premise and current *verified* situation; secondary lives in a variable-density shelf; unfinished drafts visually separate. The shelf can prioritize attention using explicit server statuses and unread evidence, but cannot infer “nothing happened” from a stale client cache.

Suggested honest status families (copy category, not a DB enum):
- **Needs your decision** (server says eligible action exists).
- **Continuing an accepted action** (active execution; separate from generation).
- **Paused / awaiting consent** (supported control or hold; no progression implied).
- **Preparing a continuation** (pending provider/publication; last committed prose remains).
- **Needs recovery** (uncertain/blocked/failed; do not claim completion).
- **Quiet** (no new actionable state, no fake timer).
- **Ended** (only if there is an authoritative end state).
- **Draft** (never styled as a progressing story).

Every story tile must explain **what the user can do next**, not expose revision counters. A story with no image remains a fully designed tile, not a blank placeholder with a gradient.

For first-time users: one clear Start action, optional demo reference and draft continuation. The empty shelf is deliberately composed, not a dead “No records” dashboard.

## 4. Within a story: a persistent, lightweight orientation frame

The in-story shell communicates:
- which life the player is in;
- one current status in plain language;
- stable `Now` and `Journal` affordances;
- an easy return to the Stories shelf;
- out-of-fiction settings available but visually quieter;
- context links only when useful; they never take over the main reading plane.

**Desktop hypothesis:** one primary narrative region and a **conditional** context rail. A rail is absent or substantially quiet when there's nothing to inspect. Available viewport space may create atmosphere or typographic breathing room instead of dashboards.

**Mobile hypothesis:** narrative and current action remain within a single reading flow; a compact persistent context header and deliberate bottom action treatment when warranted. Journal is a visible destination, not buried in an overflow of six icons. Context opens as distinct, dismissible destinations or panels; no “all panes stacked” pseudo-desktop page.

**Tablet hypothesis:** adaptive composition, not merely scaling desktop. If the reader is in Journal, reading surface earns width before decorative side panels.

The platform keeps focus, contrast, disabled/error states and the meanings of controls consistent. Fictional style does not replace these affordances.

## 5. Navigation and preservation contracts (proposals)

| Transition | Preserve | Reset or re-evaluate | Forbidden |
| --- | --- | --- | --- |
| Stories → Now | story identity, current authoritative state | refresh via owner-scoped projection; restore no stale foreign story | show previous story while loading new ID |
| Now → Journal | Now source passage ID and scroll/focus return anchor | Journal's own reading position if previously visited | mutate visit checkpoint or game time merely by history read |
| Journal overview → passage | passage ID, overview position/filter, origin context | authorized source and visibility | treat past choice as command |
| Passage → next/previous | reader typography, sensible focus/scroll | load exact adjacent authorized passage | invent intervening scene/time |
| Journal → Now | present situation, optional interrupted reading bookmark | get latest authoritative snapshot | “resume” past snapshot as live gameplay |
| Now → World/You | which story/current situation opened the contextual space | recheck applicability and visibility | assume all stories have bodies/maps |
| Context → origin | originating destination and sensible focus | refresh only needed source | break back navigation or lose unsaved settings |
| Story A → Story B | no story-private UI state beyond viewer-scoped safe keys | clear old choice path, command view and context | reuse A's offer id/frozen command in B |
| Logout/revoke/delete | no private content retained in shared cache | access policy and cache cleared | display stale private history after loss of access |

**Deep linking:** the intended ability to open a saved original passage by stable ID is a product need, not a claim that a route or permission policy exists. URLs must be owner/viewer checked, free of untrusted “current result” data, and not bypass creation consent or historical visibility. A link that is no longer accessible yields a meaningful denied/unavailable state, never an unrelated passage.

**Back behavior:** browser Back should retrace the actual reading journey. “Back to Now” is also an explicit affordance because a deeply browsing reader may have dozens of history entries. When moving between reading and playing, preserve reader position locally without making that private bookmark part of game truth.

**Foreground/read acknowledgement:** opening a story list, background prefetch, passive Journal read or push notification must not claim the player has seen the newest scene. Existing GM06 foreground-ACK semantics remain protected; a future Journal route must be a distinct read path.

## 6. Avoid dead or deceptive navigation

- Never show World or You as fully enabled tabs if no meaningful source-backed surface exists.
- Never expose Storyteller generation history, internal worker state, command operation IDs or raw model economics as a *peer story space*. Honest cost/recovery can be accessible when needed, but not treated as fiction.
- In an abstract story, “location” may be a phenomenon or nothing. The shell must not fill the empty label with fabricated coordinates.
- “Details” may contain contextual records, but must not be the sole home of the primary Journal.
- No mandatory map, portrait, equipment grid, number-of-chapters counter or universal dialog panel.

## 7. Open design decisions for visual/interaction phases

1. Whether Journal Overview and Reader are two explicit URL states or one URL plus keyed selection. **Requirement either way:** stable passage addressability, restoration, a11y and safe permissions.
2. Whether the Stories shelf uses a full-bleed editorial hero for the most recent life or a more restrained library metaphor. Compare high-fidelity specimens with empty, one and many stories.
3. Whether Now's contextual links are a rail, drawer, or scene-embedded anchors in different viewport sizes. Do not select before testing concrete passages and action states.
4. Whether a reader's private place/bookmark survives device changes. This is a preference persistence question, not something source history alone authorizes.

**Gate:** a person can identify what is live, what is historical, what is an inspection action, what is a game commitment and how to get back without being taught the repository's internal naming.
