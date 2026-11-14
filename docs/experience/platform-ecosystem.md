# Offscreen RPG platform ecosystem | desired end-state before implementation

**Status: proposed cross-platform experience architecture, 2026-11-13. Owner review required. Documentation only, no code permission.** This document owns the *envelope around gameplay*: public discovery, activation, personal game library, account/allowance presentation and operator separation. It does **not** replace [the in-story experience](README.md), [information architecture](spaces/information-architecture.md), [creation](flows/creation-and-first-run.md), [return](flows/return-and-memory.md), or technical [identity](../technical/client-and-identity.md)/[usage-policy](../technical/usage-policy.md) authority. Detailed journey conditions and negative states live in [platform journey atlas](platform-journeys-and-states.md).

**Operator scope follow-on (proposed, 2026-11-14):** [Dedicated Admin platform product design](../admin/README.md) owns staff personas, overlapping capability packages, Player 360, delegated access, operational workflows and mature internal workspaces. This ecosystem document continues to own the public/player/operator shell separation. No Admin code or technical design is approved.

**Focused first frontend wave (proposed):** [public portal](spaces/public-portal-blueprint.md), [preview-to-play journey](flows/preview-to-play.md), [authenticated player home](spaces/player-home-blueprint.md) and [PF01–PF05 code-bearing program](platform-entry-implementation-program.md). These detail the first two product surfaces and navigation seam without changing backend/engine or authorizing implementation.

## Why a separate platform experience is required

The Offscreen RPG frontend currently has genuine Next pages for a public landing, a scripted demonstration, GitHub OAuth sign-in, authenticated Stories/Drafts, guided creation/opening preview and a Living Stage. But those are **individual reachable screens**, not yet a complete intentional public-to-player lifecycle. A successful live product must serve four contexts:

1. **Discover:** unfamiliar visitor or recruiter wants to understand the promise, try something meaningful and trust what is simulated versus real.
2. **Begin:** a person decides to sign in, gains authorized access to real model-backed play, expresses a premise and sees an opening before starting.
3. **Live:** a returning player needs a home for existing stories, readable current attention, reliable continuity, nonintrusive account/usage controls and a predictable way back into a story.
4. **Operate:** platform owner needs operational visibility and permissions to contain spend/failures/abuse without exposing administration in the fictional player interface.

The platform should feel like a complete game product, not a developer console with OAuth or a SaaS dashboard skinned as fantasy. Its primary promise: **choose what your character attempts, make an authorized commitment, leave when appropriate, and return to verified consequences.** Do not promise the world autonomously simulates every real-world minute: current mechanics include bounded committed activity and holds, not universal standing autonomy.

## Five governing product principles

- **Try before committing, but don't hide spending.** A no-account *scripted* preview is always available with zero LLM/provider cost. Real persistent sponsored play requires separate explicit authorization and server-side allowance.
- **An account is not a game.** Sign-in is a transition preserving the player's prior purpose, not a landing page or a forced first step before any sample fiction. Existing auth uses **GitHub OAuth**, not Google. Google/other providers are a future identity decision.
- **The first real story is onboarding.** Don't create an unrelated 10-screen tutorial, tool selection wizard or model control panel. Guided prepared/custom creation should lead to a reviewed opening, Start and first meaningful intent.
- **A personal life library is not an admin dashboard.** Stories is the personal lobby, showing the next *grounded* decision or return opportunity. Inside a story the fiction and its authorized controls dominate. Operator UI is completely separate.
- **Budget and failure are part of UX trust.** Every possible spending gate, permission limit, pending operation, failure, exhausted allowance, session expiry and service outage has a truthful player-facing state. The frontend cannot issue new spending authority or infer remaining grant from client clocks.

## Four distinct product shells (not four independent products)

| Shell | Primary user/question | Composition/navigation | Explicit boundary |
| --- | --- | --- | --- |
| **Public portal** | Visitor: “What is this, and may I taste it?” | Strong original hero, product promise, Try preview, sign-in/create CTA, concise How it works, GitHub evidence | Public, no private Query cache/provider, no paid model request |
| **Player lobby** | Signed-in player: “Which life should I enter or start?” | Personal story hierarchy, drafts, one Create affordance, account/usage entry, optional genuine attention | Authenticated and viewer-scoped; not an incident console |
| **Living story** | Player: “What is happening, what can I do now?” | Now/Journal, contextual World/You/Details, story settings, small exit to Stories | Stable game grammar and authoritative published data; optional presentation atmosphere |
| **Operator console** | Owner/admin: “Who spent what, what is blocked, and can I stop exposure?” | Dense operational information, searchable accounts/usage/operations, audit and guarded controls | Independent privileged route group, server authorization, least privilege, not inside player nav |

Shared foundations may include responsive typography tokens, accessibility primitives, authentication session services, safe error patterns and structured design components. **Don't force the same visual shell on marketing, narrative play and administration.** Do not make the frontend runtime invent cave/harbor-specific components to serve promotion; editorial demo content is content.

## Proposed conceptual destinations and route preservation

These are **frontend UX destinations**, not a command to create every route now:

| Destination | Candidate existing/future URL | Current source vs target |
| --- | --- | --- |
| Welcome / product promise | `/` | **Exists:** sparse hero and links; target: authentic public portal with meaningful first interaction, clear routes |
| Try an interactive preview | `/demo` | **Exists:** scripted browser-only scene with reset and no provider calls; target: complete high-quality demonstration with natural conversion/return path |
| How it works | Page section or `/how-it-works` only if content justifies separate route | **Future decision:** show intention → commitment → offscreen time → verified consequence, not AI jargon |
| Project/engineering proof | Public GitHub link and concise optional project detail | **Future editorial surface:** show verified architecture/evidence; not a second landing-page funnel |
| Sign in / continue | `/sign-in` | **Exists:** GitHub OAuth; target: purpose-preserving redirect and transparent errors; provider choice not fixed by this design |
| Personal home/library | `/stories` | **Exists:** saved lives + drafts; evolve into actual signed-in home, **not** duplicate with a new `/dashboard` |
| Create / continue draft / opening review | Existing `/stories/new`, `/stories/:id`, `/stories/:id/preview` | **Exists:** backend-backed wizard/draft, generation and Start; target: coherent user journey including allowance preflight and recovery |
| Enter real story | Existing `/play/:id` | **Exists:** staged game/Now/Journal; maintain selected Living Stage authority |
| Account, allowance, sessions, privacy | Candidate `/account` and focused subviews when justified | **Future:** one human account place, usage and safe preferences; no fabricated balances |
| Notifications / inbox | Inside lobby/account or a dedicated route only when genuinely implemented | **Future:** meaningful verified attention, never notification-per-tick |
| Operator dashboard | Candidate `/admin` isolated route group | **Future:** operator-only, not a player tab; read-only first, guarded mutations later |
| Legal/trust/service notices | Footer/trust area and required actual legal destinations | **Public-launch prerequisite:** truthful AI/content/usage/privacy disclosures rather than fake links |

Avoid route churn for aesthetics. Keep Next authenticated SSR/data identity, TanStack Query ownership, React Hook Form drafts, frozen commands and SSE/GET reconciliation. Public and operator render strategies can differ without rewriting the game engine.

## Public portal: what the first visitor experiences

**Above the fold:** original Offscreen RPG identity, concise truthful premise, a readable atmospheric scene glimpse or editorial composition, **one dominant “Try an interactive preview” CTA**, and secondary “Start your own story” / “View the project” paths where actually supported. No claim of unlimited fully autonomous lives, fabricated player counts, fake reviews, tiers or provider capabilities.

**Below the fold, deliberately sparse:**
- Show three beats: **choose an intention → commit meaningful time → return to actual consequences**. Make clear that mere browser inactivity does not create earned progress.
- One visual/interactive example of fiction and a genuine choice. Prefer a sample that demonstrates continuity, not an arbitrary LLM chat box or six abstract product cards.
- Explain real vs scripted interaction in plain words. Trust is a conversion advantage, not a hidden disclaimer.
- A clear path into account play when sponsored live trials are actually authorized, and an engineering evidence door for skeptical recruiters.
- Footer links for privacy, terms, usage/cost explanation, project/credits where applicable; no dead navigation items.

**Existing demo decision:** retain and polish the no-cost scripted `/demo` even after real gameplay launches. It is the reliable 60–120-second portfolio/evaluation entry. Clearly label it “interactive scripted preview, no AI calls, resets on refresh.” Conclude with contextual choice: create a real persistent story or inspect engineering proof. The demo does not mutate canonical accounts or grant real operations.

**Conversion must preserve intention:** if the visitor chose “Create a story” or arrived through an invitation, sign-in should return them to the *validated safe* destination after session verification. Current `SignInButton` always uses `callbackURL: '/stories'` and current `requireViewer` redirects to `/sign-in` without original destination; this is an observed journey gap, not permission to naively pass untrusted open-redirect URLs. A future auth-focused frontend Change should resolve this with backend-safe/allowlisted callback continuity. Never auto-submit a paid generation after auth.

## Player lobby: the natural place to return

A signed-in player should land in **Your stories** (existing `/stories`) unless they have an explicit safe deep link. This page is not a generic statistics dashboard.

- **No stories:** evocative, truthful invitation to prepared experience or custom premise. Optional no-cost demo. State clearly whether live creation is available to this account.
- **One or more real stories:** feature a relevant life that actually needs attention, based on authorized public state; other lives and drafts follow. Distinguish **Needs decision, Continuing an admitted activity, Paused, Idle, Blocked, Ended** only when supported read models prove each. Do not blindly feature the newest item as “needs you.”
- **Drafts:** show Continue creation with saved/unsaved semantics; never mix with already started lives.
- **Account/allowance:** compact status affordance when applicable; enough clarity before paid generation, not a permanently flashing credit HUD.
- **Notification/read-state:** meaningful developments eventually influence return order if backed by a viewer-specific seen baseline; no fake “since you were here” count.
- **Navigation:** Create, Stories, Account; optional Usage/Notifications as meaningful subviews; no permanent dashboard sidebars competing with fiction.

Inside a story, retain Now, Journal, contextual World/You and story-specific Settings. A stable **Back to Stories** action exists. The story page must not inherit a marketing navbar or admin sidebar.

## Creation and account entry

**Prepared start or custom premise**, then grounded perspective, storyteller direction, relevant constraints, reviewed opening, explicit Start. Creation is not a technological questionnaire.

The user should know **before** a charged operation whether it is available, whether it consumes an allowance and, where server policy permits, a bounded estimate/range. A pending opening is not a running life. On a loss of request acknowledgement, never silently retry a paid generation. Draft and opening state survive route navigation and refresh according to existing immutable IDs/revisions.

A visitor might optionally draft a short premise *locally* before auth, but only if an explicit privacy/lifetime/transfer design proves it won't be lost or misrepresented as saved. This is a conditional design opportunity, not a requirement to invent anonymous durable accounts.

## Usage, payment and trust from a player viewpoint

The **frontend contract** for any future account/spending surface:

- Show **current allowed mode** (scripted preview available, trial/sponsored live allowed, paid/funded allowed, restricted/paused/unavailable), its actual source when displayable and the next safe action.
- Show remaining **money budget or a truthful configured unit**, used/reserved/uncertain cost when supplied, and renewal timing only when policy defines it. Do not invent an exact number of “turns left” from variable provider costs.
- An exhausted sponsor allocation does not silently authorize user-paid overage. A future upgrade/funding route must require explicit payer consent; no automatic charge hidden behind a game choice.
- If a story already exists and model allowance is exhausted, preserve reading, Journal and verified results. Mark which actions are temporarily disabled and whether already admitted zero-inference mechanics may continue under policy.
- Separate **account entitlement**, **funding grant**, **usage window**, **task capability**, **provider health**, **story hold** and **payment status**. These dimensions are not one enum. Server policy intersects them and reports effective blockers; React displays authorized projections only.
- Payer and operator limits are server-owned. A frontend countdown, disabled button or cached “remaining balance” cannot be an admission gate.

**Initial sponsored public trial recommendation:** public scripted demo (unmetered provider-free) + identity-required restricted live access, preferably invite/grant controlled during POC, with hard per-account AND aggregate platform caps and an owner stop control before opening sign-ups. A Google/GitHub OAuth account is not proof of one person; incognito, VPN, account duplication or scripts cannot be safely handled by frontend identity alone. Do **not** promise $2–$3 per newly registered public identity without an aggregate funding policy. See [existing usage authority](../technical/usage-policy.md) rather than inventing billing rules here.

**Commercial model is undecided.** Do not create fake subscription tiers, pricing plans, checkout, wallet, coupons or payment recovery UI just to look production-ready. The shell should leave a clean account/usage boundary for when the backend commercial design is selected.

## Operator console, not a fictional game interface

**Frontend target, future dependency on server-owned privileged reads/actions.**

| Operator area | Primary question | Minimum truthful read UI |
| --- | --- | --- |
| Overview | How much has the platform actually and potentially spent? | Settled / reserved / uncertain spend, caps, recent demand, blocked requests, status |
| Accounts | Who is eligible, blocked or consuming grants? | Search/pagination by scoped identity, status, grant/entitlement and recent activity |
| Usage | Where are provider costs going? | Per-user/story/task purpose metrics, provider route, windows and limit reasons where permitted |
| Operations | Which background tasks are admitted, pending, uncertain, failed? | Operation ID, status, last verified transition, safe diagnostics and allowed recovery |
| Platform controls | Can the operator stop financial exposure and configure policy? | Bounded grants, pause sponsored generation, global limits; guarded mutation only when backed by authorized API |
| Audit | Who changed a grant/limit or performed admin action? | Source-linked immutable security/audit record with safe redaction |

**Trust/security:** no frontend-only `isAdmin` flag as authorization; server must independently validate each privileged request. Admin UI should default to minimal sensitive data, redact private story contents and provider secrets, paginate large lists and distinguish operational metrics from gameplay canon. Powerful changes require confirmation, permission checks and audit. Never add a “retry all paid jobs” button for uncertain operations.

For local development the operator may use Chamber testing, but Chamber is not the public admin system and cannot substitute for cost/identity visibility.

## Global user and service states

The [journey atlas](platform-journeys-and-states.md) defines a **product of independent state axes**, not a combinatorial mega-enum. A route can be authenticated yet sponsor-blocked; a story can remain readable while narration is unavailable; a platform outage can leave public preview fully functional. Layouts should show the most relevant truthful state without swapping all pages to generic error screens.

System-wide safety/cost communication is **literal**, while story prose can be dramatic. Never bury usage errors in the same fictional red glow that describes combat danger.

## Launch and maturity levels (not arbitrary page completion)

**L0 | Developer exploration.** Owner can locally sign in, create a real story when providers are explicitly enabled, play, leave/return, inspect progress/failures. Public page may be sparse. No uncontrolled external access.

**L1 | Public portfolio preview.** Public landing + scripted demo reliable on mobile and during backend outage; authentic GitHub/evidence path; truthful limitations and legal/art provenance. No externally funded model use needed.

**L2 | Restricted hosted live trial.** Auth/continuation, authorized invite/grant, first creation, provider allowance display, hard sponsor/platform caps, operator read visibility and ability to stop exposure; clear exhausted/uncertain states. Full end-to-end connected acceptance before opening any access.

**L3 | Broader player experience.** Return digest/notifications where backend proves them, richer profile/usage, broader safe live access and perhaps user-funded plans. Requires policy, security, support and legal decisions, not just UI screenshots.

**L4 | Commercial service.** Genuine billing/refund/privacy/account deletion, operating procedures, pricing/terms, support/recovery, capacity policy. Not assumed during POC.

**Do not treat L1 as proof of L2.** A no-cost preview can be public while real spending stays closed.

## Frontend-only scope and backend handoff discipline

This document selects **desired UI behavior** and calls out *data needs*; it does not authorize new `@offscreen/contracts`, auth-provider changes, grant APIs, usage fields, service endpoints, money-moving actions, billing, notifications or admin permissions. The parallel backend architecture work remains separate.

When a future frontend Change needs unsupported data, specify a short public read-model requirement: *who may read it, what it means, when it updates, which states are distinguishable, privacy/cache constraints, and negative behavior while absent*. Backend chat/owner resolves contract separately. UI mocks may use clearly labeled fixture states, never claim data exist live.

Frontend should preserve established Next server-only/private SSR, viewer-scoped TanStack Query, stable resource identities, frozen mutation envelopes and safe return/read scopes. A proposed account or admin shell must not become a second client auth/usage state owner.

## Proposed investigation and implementation program, NOT code tickets yet

| Track | Design/evaluation first | Later bounded code-bearing work |
| --- | --- | --- |
| **E1 public portal/preview** | Review hero premise, editorial proof, anonymous demo, CTA/deep link and browser mobile flow | Build public composition and demo exit/entry, truthful preview |
| **E2 identity/onboarding** | Decide provider/user strategy, auth return destinations, invitation + grant preflight copy | Auth continuation, gated create entry, first-story activation improvements |
| **E3 player lobby/account** | Story attention semantics, navigation hierarchy, account/usage meaning and states | Cohesive lobby shell; account/usage read UI when authoritative data exist |
| **E4 trial/budget UX** | Eligibility/allowance/exhaustion/preflight/error catalog coordinated with backend policy | Render grants/holds/errors, safe spending confirmation where needed |
| **E5 operations console** | Operator tasks, security scope, critical metrics, privileges and stop controls | Server-gated admin shell, read-only operations first, guarded writes afterward |
| **E6 end-to-end evidence** | Scripted preview vs live, identity switching, new/returning/blocked/expired/malicious cases | Deterministic Storybook + browser/integration journey proof |

These are initiatives; one product initiative may result in several code Changes, and some investigations/design reviews require no code Change. **Do not author and implement 20 speculative route tickets before the owner critiques the end-state.** Start from the umbrella target and the [state atlas](platform-journeys-and-states.md), then plan bounded frontend Changes in dependency order.

## Owner decisions pending

1. Is the first externally funded real trial invite-controlled, open to all authenticated identities with strict caps, or not enabled at all? **Recommendation: invite/grant controlled until measured.**
2. Will GitHub OAuth remain sole login for developer-facing trial, or will Google/email be added for broader players? Current implementation is GitHub, not Google.
3. What immediate real experience is the first curated story, and how much of it can be honestly shown without waiting for inference? Keep original/licensed content; sample lore is editorial content, not generic renderer code.
4. Which usage semantics are publicly displayable now? Existing story settled/reserved metrics are not equivalent to an account grant ledger.
5. What is the smallest operator visibility needed **before** allowing outsiders to consume sponsored models? **Recommendation: account ledger + platform spend/reservation/uncertainty + hard pause + audit.**
6. When do we justify notification delivery or commercial checkout? Not prerequisites for the no-cost portfolio preview.

**This document is a proposal for owner discussion, not a decision that all destinations or mechanics must be built now.** The next useful review is to walk the [journey atlas](platform-journeys-and-states.md) against actual screenshots and supported read models, then settle the outer-shell/navigation decisions before writing code packets.
