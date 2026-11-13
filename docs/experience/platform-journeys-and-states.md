# Platform journey and state atlas | from first click to return visit and operator control

**Status: proposed frontend UX contract, 2026-11-13; for owner critique. No code, backend or policy changes authorized.** Parent [platform ecosystem](platform-ecosystem.md). Reuse [inside-story information architecture](spaces/information-architecture.md), [portfolio first-contact](flows/portfolio-first-contact.md), [creation](flows/creation-and-first-run.md), [return](flows/return-and-memory.md), [notifications](flows/notifications-and-reentry.md), [usage authority](../technical/usage-policy.md), [auth](../technical/client-and-identity.md).

## How to use this atlas

Design each path from **the human's entry intent, the currently verified situation and the next possible action**, not from current React component names. It is a scenario/state model, not a proposal to invent one enormous global TypeScript enum.

**Important distinction:** navigating a page, reading a scripted demonstration, creating an unsaved draft, requesting charged generation, starting an accepted story and entering an already-running story are different commitments. The UI must not silently cross those boundaries.

Every journey has:
- **Entry and person:** anonymous visitor, recruiter, authenticated new/returning player, restricted user or operator;
- **Preconditions:** authenticated session, authorization/allowance, current persisted story/draft/operation state, system health;
- **Visible result:** who am I, where am I, what can I do now, what remains true if service fails;
- **Negative path:** offline, lost ACK, exhaustion, unauthenticated/unauthorized, stale offer, permission revoked, background processing;
- **Next destination:** intentional back/continue/deep-link, never accidental route loss or silent spending.

## The three product funnels that must not be conflated

~~~text
A. Public / no-cost:
GitHub or shared link -> Welcome -> Scripted preview -> Real-play CTA or engineering proof
                                      (never calls a model)

B. First real story:
Sign-in / return to intended action -> authorized Stories
       -> Prepared or custom beginning -> saved draft -> generate opening
       -> review opening -> Start -> current Now -> choose / commit
       -> leave -> return to current Now / Journal

C. Existing life:
Bookmark / notification / Stories -> session check
       -> story authorization + current public snapshot
       -> factual return context (only if supported)
       -> Now / ongoing activity / decision / paused / hold
       -> one authorized next action or read-only inspection

D. Operator (distinct):
privileged entry -> operator session + server authorization
       -> overview -> search account/usage/operation
       -> inspect proof -> only permitted, audited bounded intervention
~~~

A user may enter at any supported deep link; the funnel is not a compulsory sequence through every page.

## Journey J-P01: skeptical employer in 90 seconds

**Entry:** public `/` from GitHub/README or application; no session, no willingness to pay or sign up.

**Visible:** Offscreen RPG's particular premise, one atmospheric/story-led editorial example and a prominent **Try preview**. A secondary direct GitHub/technical explanation is available, not hidden after registration.

**Experience:** begin scripted demo immediately, make one meaningful intention, see modeled time/commitment/return (explicitly marked as a **simulation**) and choose between seeing actual source/evidence and beginning a real persistent story where available.

**Must never:** misrepresent no-model scripted path as real provider AI, demand OAuth before tasting fiction, imply autonomous 24/7 simulation, call a charged provider, require a 10-hour real wait, or make the technical reviewer find a hidden admin/debug page.

**Negative:** production API unavailable -> public home/demo still works. No JS/hydration -> homepage still communicates premise and route; demo has clear fallback. Mobile/reduced-motion -> same understandable decision.

## Journey J-P02: curious visitor wants real play

**Entry:** homepage “Start a real story” or end of demo. May be anonymous. Server eligibility/cost status unknown until account exists.

**Target:** show truthful entry expectation (“Sign in to save and play a persistent story”, and only if true, “Sponsored trial available under limits”). Authenticate using supported provider (GitHub currently; other providers future), return to the **intended safe** destination, then evaluate actual effective account/grant state *before* charged generation.

**If eligible:** continue into meaningful prepared/custom creation. **If not:** explain whether trial is unavailable, invite required, provider down, platform sponsorship paused or account lacks grant; keep no-cost preview and engineering path accessible. Do not dead-end on a generic `403`.

**Negative:** sign-in cancelled/failed -> retry without losing entry context; invitation expired -> precise safe route, no automatic paid action; OAuth succeeded but grant absent -> account remains usable for whatever reading/demo functionality is actually authorized. Never interpret successful login as permission to spend.

**Current gap evidenced:** `apps/web/src/features/session/sign-in-button.tsx` uses fixed `callbackURL: '/stories'`, and `requireViewer` redirects unauthenticated private requests to `/sign-in` without retaining intended destination. The existing demo CTA targets `/stories/new`. This currently loses *which* page the visitor wanted after login. Future fix requires a safe return mechanism, not free-form redirect input.

## Journey J-P03: new authenticated player has zero stories

**Entry:** player lobby `/stories` after authenticating or direct safe navigation. Account entitlement and grant may be valid, restricted or unknown.

**Visible:** no fake “Continue” card, one clear Create a story action, at most a small number of curated beginnings and a custom-premise alternative, optional no-cost demo. Distinguish “you have no stories” from “we couldn't load your stories.”

**Flow:** prepared or custom idea -> review perspective/rules/storyteller direction -> save versioned draft -> conscious Generate opening request -> read actual opening -> conscious Start -> Now. No mandatory explanation of Nest, LLM provider, JSON task recipe or developer Chamber.

**Negative:** draft save conflict preserves edits; opening generation pending does not start game time; stale opening must be regenerated/reviewed deliberately; lost Start ACK reconciles before any retry; account grant exhausted between review and generation -> hold creation with preserved inputs. If prepared choice not authorized, don't display a clickable fake start.

## Journey J-P04: returning player has multiple stories

**Entry:** `/stories` from homepage, bookmark or account resume. One life needs decision, one has accepted activity, one is paused and one draft unfinished.

**Visible:** prominent *actual* attention/return item if the public projection supports it; stories grouped meaningfully, not by raw DB status string. Drafts clearly separate from live stories. No false “new since last visit” without seen cursor.

**Flow:** choose story -> current Now (perhaps concise verified recent developments) -> relevant decision or work state -> Journal/World/You only if needed -> safely back to Stories. Opening Journal should not cost resources or change game time.

**Negative:** an apparently expired/ended story or removed membership cannot still expose private passage on navigation; SSR/Query must not flash one viewer's data for another. A list query failure shows a recoverable state, not a false empty list. A story with no actual progress shows quiet appropriately.

## Journey J-P05: returning directly through a notification

**Entry:** optional future notification deep link to current story. User may be signed out, story changed, target decision already resolved, access revoked or provider down.

**Visible:** sign-in if needed, safe deep-link restoration, current authorized story, then factual context. “That decision has passed” if applicable; no stale active button. If notification contains a spoiler or personal text, respect preview-privacy preference and permission.

**Negative:** an old notification cannot recreate a stale current offer, reexecute a command or leak story content to an unrelated signed-in account.

## Journey J-P06: sponsored allowance exhausted mid-life

**Entry:** user has a valid story, but a future required model dispatch is not permitted due to funding/account/window or platform restriction. Distinguish why; window reset may be unknown.

**Visible:** verified last scene remains; known running/settled mechanics are accurately represented; which actions cannot run and what is safe to read is clear. A generic “Buy more turns” is forbidden without commercial policy, and user-paid overage never silently begins.

**If renewable window and server supplies eligibility time:** show estimated next availability with honest scope. **If funding exhausted or operator stopped sponsorship:** indicate grant unavailable and applicable next action. **If account restriction:** explain only what is safe, with support/appeal where supported. **If service outage:** do not misclassify as user spending.

**Negative:** browser clock cannot grant allowance; “Retry” cannot silently issue a fresh charge while prior provider attempt is uncertain; reading Journal, Settings and Stories never consumes paid model inference merely for navigation.

## Journey J-P07: provider latency, lost ACK, or intermittent failure

**Entry:** opening generation or live action already submitted, network response lost, provider slow or story publication blocked.

**Visible:** distinguish request sent versus accepted, generating versus settled, and unknown result versus confirmed failure. Show safe status-check actions reading durable server receipt, never repeat paid operation automatically.

**Negative:** reload/back/forward/auth refresh cannot lead to duplicate provider cost or falsely mark success. Preserve verified content and forms; loading affordance does not consume fictional time by itself.

## Journey J-P08: owner plays the real game locally

**Entry:** owner starts the full platform in an authorized local/connected environment and signs in. Wants genuine creation, start, commands, waits, history and return, not only Storybook controls.

**Visible:** same player UX as a normal user. Developer inspection is available through explicit locally gated tooling, not baked into each fictional choice. Can create a small self-contained story and leave/reenter later. Provider spending remains consciously enabled and bounded.

**Negative:** no fake “always active” background life; service startup without connected model/database should show explicit unavailable real play while the free scripted demo still works. Browser refresh never invents progress; diagnostics aren't player-facing jargon.

## Journey J-P09: operator sees unusual spending or stuck jobs

**Entry:** authenticated privileged operator-only route, optionally alerted by external telemetry. Reads server-validated account/usage/operation projections.

**Visible:** settled/reserved/uncertain spend separately, total budget/caps, account and operation linkages, provider errors, eligibility reasons, effective policies and last successful update. First version may be read-only. High-risk control (e.g. pause sponsored generation) only when backed by a separately authorized and auditable endpoint.

**Negative:** staff/player cannot access by changing URL; stale dashboard metrics never claim global budget is safe; absent telemetry is *unknown*, not zero. No “retry all” for uncertain paid jobs. Private narrative/profiles are not displayed unless specifically authorized and required for support.

## Orthogonal state axes (not one `PlatformStatus` mega-enum)

| State axis | Examples of source-backed states | Visible impact and owner |
| --- | --- | --- |
| **Identity/session** | anonymous, authenticating, authenticated, expired, forbidden | Sign-in/return; session owned by auth backend, not localStorage |
| **Entry context** | home, demo, create, invitation, story deep link, notification | Safe intended destination/return path; URL owns navigable resource |
| **Account authorization** | eligible, invite required, revoked/disabled, insufficient role | Whether access is allowed; server decides |
| **Entitlement/funding** | sponsored active, restricted, exhausted, uncertain reservation, future funded mode | Operation admission and account usage representation; server policy |
| **Platform/provider health** | available, degraded, unavailable, maintenance, global sponsored pause | Service messaging; should not erase last verified story |
| **Story lifecycle** | no story, draft, candidate pending/ready/stale, started, ended | Lobby/create/Now composition; existing story authority |
| **Current story attention** | choose, committed work, paused, quiet, blocked, return digest | Now and Stories headline; only grounded public projections |
| **Operation status** | idle, admitted, running, settled, failed, blocked, uncertain/lost ACK | Correct recovery/no duplicate paid or game effect |
| **Notification/read state** | unread meaningful event, seen, unknown, disabled | Only after viewer-specific baseline and channel policy exist |
| **Operator permission** | not admin, read-only operator, privileged change permission | Separate server-side authorizations and audit |

**Precedence:** identity and data authorization gate access to private pages; current verifiable story truth stays readable whenever permitted; critical system errors/holds are visible above decorative fiction; a budget message must not pretend an action already settled; the platform must not automatically turn a recoverable paid uncertainty into a new user action.

**Derived UI state is a projection of independent axes, not an authority.** Missing data means narrow honest copy or loading/unknown, never a fabricated balance, profile or status.

### Example combinations to test

| Combined situation | User-visible reaction |
| --- | --- |
| Anonymous + public preview + provider outage | Preview playable; optional banner real live play unavailable |
| Anonymous + create CTA | Sign-in explanation; no generation; intent to create preserved safely |
| Signed in + no stories + sponsored eligible | Real first-story creation CTA |
| Signed in + no stories + invite required | No fake Start; explain eligibility and keep preview |
| Signed in + active story + allowance exhausted | Read current story/Journal and understand only blocked operations |
| Signed in + waiting activity + provider outage | Last verified work/status shown; no false instant completion |
| Signed in + uncertain paid dispatch + refresh | Check original receipt; never auto-spend again |
| Signed in + stale deep link after membership revoked | 403/owner-safe denial; no private cached content |
| Operator + metrics unavailable | Show unknown/degraded state, not zero spending |
| User switches account A→B | No story A data, theme, Query cache, draft or pending command leak into B |

## Common navigation invariants

1. Public shell and signed-in player shell have distinct editorial goals; **do not** show the player a fixed admin dashboard/menu.
2. `/stories` is the authenticated home. Do not add a competing `/dashboard` unless it solves a distinct actual task.
3. Inside story has **Now + Journal** as stable context; World/You are conditional contextual destinations, not five peer tabs. Always provide Back to Stories.
4. Visitor/demo/creation entry preserves a safe return destination through sign-in; don't treat sign-in itself as the completed goal.
5. A safe link is not automatic permission to POST. On return after OAuth, check latest public state and show the action again if still eligible.
6. Public demo has no private server dependency. A backend outage does not turn the homepage into an unavailable page.
7. Costs and error copy are outside fiction, regardless of the current visual theme. Operator controls never appear as dramatic in-world options.
8. Pre-creation and profile UI must work without generated artwork. Never block story prose while an image downloads.
9. No recurring notification or badge count derived merely from elapsed time; only verified events and viewer-specific read state.
10. Every “Continue” CTA specifies *what* continues when ambiguity matters: saved draft, real story, prepared opening or simulated preview.

## Acceptance and measurement plan for future design reviews

Before implementation, a human should be able to point to the first action, expected destination and fallback for every Journey J-P01–J-P09. During implementation, derive small provider-free fixtures for the key states, then test browser routes/SSR/privacy in the established architecture.

**Suggested product-level gates:**
- **First impression:** unfamiliar recruiter can experience a meaningful *scripted* choice quickly without signup or cost.
- **First real play:** eligible signed-in user can create, generate/review, Start and perform first real action without understanding internal architecture.
- **Continuity:** after leaving, user can find the correct current story and distinguish genuine progress from inactivity.
- **Trust:** sponsored exhaustion, lost ACK, expiry and outage are comprehensible and do not create duplicate paid/game effects.
- **Privacy:** different accounts and revoked membership never leak story/usage via SSR/hydration/breadcrumbs.
- **Operations:** operator can determine whether exposure is within real limits and what remains uncertain; no fake zero states.

**No exact conversion or retention numbers are asserted** until actual user observation. For a POC, aim for a small, credible public path and one genuine end-to-end paid-provider-backed story under strict operating limits rather than a large empty menu of imaginary features.

## Decisions not to sneak into frontend code

- Public live trial sponsorship amount, policy grant and identity risk strategy.
- GitHub versus Google/other provider auth and onboarding/claim linking.
- Commercial tiers, top-ups, payment processor and refund/accounting policy.
- Standing autonomy, multiplayer invites, free-form player intention admission and notification delivery.
- New public read-model fields for story attention, allowance, usage/alerts, admin data and seen cursor.
- Operator privileges and safe mutation endpoints.
- Legal wording and data retention for live commercial deployment.

These are legitimate parallel design/backend decisions. For this frontend discussion, record the required *visible states* and acceptance, not imaginary payload shapes or code.
