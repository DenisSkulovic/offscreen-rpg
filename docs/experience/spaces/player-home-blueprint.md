# Player home | a library of lives, not a dashboard

**Design status: proposed authenticated-home target, 2026-11-13. No code permission.** Parent [platform ecosystem](../platform-ecosystem.md), companion [public portal](public-portal-blueprint.md) and [preview-to-play](../flows/preview-to-play.md). Existing [Stories library design](stories-library.md), [return and memory](../flows/return-and-memory.md), [Now stage](living-stage-blueprint.md), and [Next state ownership](../../engineering/targets/react-next.md) remain normative within their domains.

## Product role and chosen route

The authenticated **/stories** route is the product's **player home**. Not /dashboard, not a control console, not a subscription portal. Its dominant question is: **“Which life should I begin or return to, and does anything need my attention?”**

An account can contain no stories, one live story, several live stories, incomplete drafts and blocked/paused experiences. These are not edge cases; they are the primary layout variants of the home.

A player who chooses a live story leaves the lobby and enters the Living Stage. A player who chooses an unfinished draft enters creation at the right step. Neither action itself spends fictional time or triggers paid generation. Inspecting the list must not consume provider tokens.

## Player shell and information hierarchy

**Navigation:** Offscreen RPG identity; **Your stories** as current destination; **Create story** as one deliberate creation control; optional Account/Usage/Notifications only when an actual working destination exists; sign out remains reachable through a clear account/settings entry once implemented. **Do not** show Now/Journal as top-level lobby tabs because they belong to a selected story. Do not ship dead wallet, shop, friends, notifications or operator tabs.

**Main attention:**
1. One obvious current re-entry or first-story action;
2. list of existing saved lives with truthful state and primary Enter story;
3. unfinished drafts with Continue creation;
4. optional understated account/allowance issue if it actually affects authorized gameplay, without turning lobby into billing dashboard.

User identity belongs in a modest header (“Your stories” and optional verified display name), not a huge “Welcome, <name>” hero occupying the first viewport on every visit. The game content, not the account greeting, should dominate.

**Desktop 1440 conceptual layout** (not pixel specification):

~~~text
 OFFSCREEN RPG  /  Your stories          [Create story]   [Account]

 Your stories
 Return to the life that needs your attention.

 [ONE SELECTED LIVE STORY, if grounded]
   The beacon at Greywake                   Needs your decision
   One-line *verified* current situation / meaningful known change
   [Enter story]    [Journal, only if functional/deep-linked safely]

 Other lives
   [story name]   [verified state if available]          [Enter]
   [story name]   [verified state if available]          [Enter]
   [story name]   [verified state if available]          [Enter]

 Continue creating
   [draft title or Untitled draft] [short authored premise] [Continue creation]
   [draft title]                  [actual saved state]    [Continue creation]

 [Optional allowance/support callout if a real read model exists]
 [quiet footer and legal/diagnostic help]
~~~

Do not force a permanent 30% right sidebar with stats. On a very wide view, a small secondary account/help region is optional only if it solves a real task; the primary story list remains an inviting editorial reading surface rather than a SaaS card-grid.

## Four core lobby variants

### L0. First-time player, no stories or drafts

One composed invitation, not “No records found” plus an empty list heading:
- Briefly orient: “Every story begins with a situation. Choose one prepared beginning or imagine your own.”
- **Create a story** is the primary action if the account is eligible; the prepared/custom choice belongs to the creation step, not two parallel draft-creation implementations on the lobby.
- If live creation requires an invite/funding grant not present, give the *actual* policy reason and a safe path to the scripted preview. Do not let CTA pretend an expensive operation is available.
- A small “Try the public preview” link may remain for unfamiliar accounts; it stays script-only and does not start a real life.
- Only show curated examples that are **editorial content data** already supported by actual prepared-start inventory. No giant sample grid that hardcodes geography/genre in React.

If lists fail to load, L0 must NOT appear. “No stories” is a positive verified empty result, distinct from read failure.

### L1. Exactly one live story

Its genuine title and last verified state dominate. Do not surround it with five decorative placeholders or force a “more stories” carousel.

- Offer an unambiguous **Enter story** primary link, one optional read-only Journal secondary link only if functional.
- If public data says “Decision waiting,” make that visibly prominent. If it says “Paused,” don't label it “Continuing.”
- If only title and coarse public status exist, do **not** manufacture “Since you left,” precise work progress, date, story location or completed milestones. Display the reliable data and a neutral “Enter story”.
- Show Create another story quietly; it should not outrank returning to the only current life.

### L2. Several live stories, possibly different situations

Choose *one featured return target* only when there is a defensible deterministic ordering:
1. explicit player pin/favorite **if such a capability later exists**;
2. an actionable current decision from a verified public attention projection, when available;
3. an actual recently opened story **only if reliable viewer-specific read state exists**;
4. stable current list order with **neutral label** (e.g. “One of your stories”) when no rank semantics are available.

Do not describe the first array item as “Return here” or “Needs your attention” merely because it is first. No client-generated inference from local time or vague story status.

Rest of lives appear as concise rows or carefully balanced tiles: known title, one grounded contextual line only when supplied, honest status if supported, and an Enter action. Avoid giant game-cover art for every world; thumbnails are optional and only approved viewer-visible media. Ensure long/non-Latin and nonhuman names wrap safely.

A paused or blocked story might need attention but not necessarily deserve first position over an actual decision. When several real attention items coexist, give clear contextual labels rather than automatic “urgent” red badges.

### L3. One or more unfinished drafts, with or without live stories

Separate heading **Continue creating**. A draft is not an ongoing simulated life. Distinguish:
- saved draft needing more input;
- actual opening generation pending/uncertain, only where the draft summary contract proves this;
- reviewed ready opening, only where authorized public projection exists;
- stale opening needing regenerate/review, if known.

If the list endpoint only returns title and premise, show title and concise premise and **Continue creation**. Do not infer which step or that an opening is ready. The editor/preview route owns exact generation and Start status.

Drafts should not be buried below 20 live stories on mobile; provide a stable section anchor or simple grouping when lists are long. Do not insert a fake “Draft 20% complete” number without an actual state model.

## Semantic story card contract

A presented live story entry may contain:
- authorized stable story identity for URL; actual human title (no revision-number fallback);
- one server-grounded player status/attention, or none;
- one **last verified situation** excerpt only if privacy-safe public projection supplies it;
- the intentional Enter link, and optional working read-only Journal deep link;
- optional media/art identity only when authorized; no arbitrary client-synthesized cover.

**Never:** leak backend IDs or raw model spend in the card, invent an unresolved NPC, call a stalled story “active,” imply work is earned because the browser clock advanced, or offer a stale historical decision as a live action. Don't cross viewer cache keys or SSR dehydration across accounts.

**Status label semantics** when true public data exists:
- *Needs your decision*: current authorized decision waiting;
- *Continuing*: admitted ongoing work with actual bound, not predicted eventual success;
- *Paused*: real supported manual pause;
- *Waiting for you*: genuinely idle with no accepted activity;
- *Stopped/needs attention*: specific blocker known; not generic red alert;
- *Ended*: committed terminal status;
- if only coarse data exists: neutral status or omission, rather than constructing meaning from strings.

Presentation remains plain-language; don't show “resolution running,” “viewVersion,” “provider task pending” unless the appropriate precise user-facing explanation is needed.

## Usage and account affordances (frontend only)

Account identity and usage must not steal the stage:
- Header account control opens real supported account identity/sign-out actions; if no Account route exists yet, keep only working controls.
- A small usage message may appear when the backend provides accurate effective funding/availability. The player shouldn't need to know model provider or microusd to begin playing.
- Do not fabricate a “$3 free” banner from an assumed signup entitlement. OAuth is not grant authorization.
- If usage is exhausted, preserve access to existing verified stories/Journal where authorized, while clearly indicating actual generation restrictions at the *point of spending*.
- Platform-wide service outage should never turn a successfully cached authorized story list into a fake empty account; show what is verified and which actions are unavailable.

Operator spend/identity analytics are a separate privileged console, **not** a “Developer tools” section in Player home.

## Loading, errors, privacy and URL lifetime

| Condition | Presentation |
| --- | --- |
| Stories and drafts both verified empty | L0 invitation, not error |
| Stories present; drafts verified empty | Show stories, omit draft empty grief |
| Stories read fails; drafts succeed | Distinguish uncertain Stories list from verified draft list; never claim no stories |
| Draft read fails; stories succeed | Keep stories usable; draft section shows recoverable failure |
| Both reads pending | Stable shell and appropriately sized loading only where needed; avoid fake sample cards |
| Viewer session expired | Safe sign-in/return, no prior private story flash |
| Story removed/revoked between list and click | Server rechecks ownership; show unavailable, not stale secret content |
| User A signs out and B enters | No A Query/SSR/story art/history leakage |
| Long title, empty title from public projection, Unicode | Safe wrapping and truthful fallback; do not use UUID as an invented display title |
| Activity completed or interrupted offscreen | Reconcile latest verified status before claiming it; don't create narrative from timestamp |
| Offline with previously authorized data | Explicit stale/offline context, no irreversible submission |

Existing TanStack Query v5 viewer-keyed cache and SSR hydration remain the only owner of remote state. Use existing list queries and only derived selectors. If a new attention sorting field or per-story summary is missing, record a **public read-model requirement** for the parallel backend work, not a local “probably running” guess. Every authenticated URL still checks owner membership at the API/server.

## Mobile composition and keyboard

At 375px:

~~~text
 Offscreen RPG              [Account / sign out]

 Your stories                    [+ Create]

 [Featured, ONLY if grounded]
 Greywake
 Needs your decision
 [Enter story]

 Other lives
 [title + status + Enter]
 [title + status + Enter]

 Continue creating
 [draft summary + Continue creation]

 [supported usage status, only if relevant]
~~~

Use one column, contextual text, tap-safe focusable links and no sideways scroll at 320px or 400% zoom. Avoid a fixed footer over story actions; if many stories, natural scrolling and pagination. Link text should distinguish entering a story, continuing draft creation and opening account.

Accessibility and product quality require keyboard/screen reader navigation, error-section headings, honest disabled/blocked reasons, preference for reduced motion, optional image/no-image parity and no overloaded notification dots.

## Current implementation gap and exact starting points

As inspected 2026-11-13:
- **apps/web/app/(authenticated)/stories/page.tsx** already SSR-prefetches live stories and drafts through viewer-scoped TanStack Query with HydrationBoundary.
- **apps/web/src/features/stories/live-story-list.tsx** takes `const [featured, ...rest] = items` and labels the first item “Return here,” regardless of real viewer attention; then displays `featured.status` as a server string.
- **apps/web/src/features/stories/draft-list.tsx** owns draft pagination and Continue creation.
- **apps/web/src/features/stories/stories-library.css** is scoped but duplicates some tokens and applies a generic bordered featured panel.
- **apps/web/app/style.css** has broad global main/button/label styles; any lobby-specific refactor must preserve global UX.
- No coherent Account/Usage destination is in the currently inspected App Router. Don't create dead links or invent entitlement data to make the layout look finished.

Protect the current working Draft/Start flows, query keys, SSR privacy, immutable command recovery and sign-out. Do not replace Query with a new “homepage state store.” The room for improvement is **information hierarchy and truthful re-entry**, not another remote-state architecture rewrite.

## Acceptance and human review

Fixture and real-browser matrix:
1. zero lives/zero drafts, signed in and eligible;
2. zero lives/one saved draft;
3. one life awaiting actual decision;
4. one ongoing real commitment and paused life;
5. multiple lives plus unfinished drafts;
6. blocked provider / exhausted grant with preserved read-only access;
7. list failure in one section but not other;
8. session expiry, wrong owner and switch account A→B;
9. narrow 320/375, 1440 desktop, zoom/keyboard, Cyrillic/very long story title.

**Gate A (clarity):** a player identifies their next meaningful real action within a glance without reading engine terminology. **Gate B (truth):** every state claim is backed by public data and commands remain unaffected by reordering. **Gate C (craft):** the page feels like a doorway into lives, not a list of unfinished test fixtures or enterprise dashboard.

Start source inspection with [Stories owner map](../../../apps/web/src/features/stories/README.md) and the selected future Change, not the whole repository. Actual frontend implementation remains blocked on explicit owner authorization. Backend field gaps get a separate request, not a guessed string parser.
