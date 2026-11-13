# Preview to persistent play | one continuous invitation, two truthful runtimes

**Status: proposed first-contact flow design, 2026-11-13; no code authorization.** Parent [platform ecosystem](../platform-ecosystem.md), [journey atlas](../platform-journeys-and-states.md). Public composition: [portal blueprint](../spaces/public-portal-blueprint.md). Existing [portfolio flow](portfolio-first-contact.md), [creation](creation-and-first-run.md) and [auth identity](../../technical/client-and-identity.md) remain authorities for their areas.

## Product decision

A person should be allowed to make a meaningful fictional decision *before* registration. But anonymous first contact must not automatically become an uncontrolled LLM billing mechanism. We therefore maintain **two explicit modes**:

| Mode | Entry | Authority/meaning | Persistence and cost |
| --- | --- | --- | --- |
| **Scripted preview** | /demo, public | Authored branching demonstration; simulated time and memory; not a live model, not a durable campaign | Local browser state; resets on refresh/restart; zero provider charges |
| **Persistent story** | Existing signed-in creation and /play routes | Authoritative story/draft IDs, admitted actions, verified progress; actual model work only when server allows | Private viewer-scoped durable data; metered and quota-bound when model used |

The preview does not have to look cheap or robotic. It should be the **most immediately compelling** experience for a time-constrained visitor. The mode disclosure is honest but visually secondary.

## Source-grounded issue: first interaction comes too late

Current **apps/web/app/demo/content/script.json** begins with a travelling wizard in state `road`, marked `phase: waiting`; the player has no choice and must click **Advance demo time** to reach a goblin/apple encounter. The goblin's branches are charming, but they primarily communicate whimsical authored branching, not the project's distinctive difference between **admitted long commitment, interruption and return to remembered consequences**.

We already have a much more relevant authored source at [Greywake original demo design](../prototypes/public-demo-script.md). **Selected editorial direction for the main launch preview:** use Greywake's compact original harbor-lantern/notice scenario, with one meaningful action visible immediately and a scripted time-skip/return that changes according to earlier decisions. This is a *content choice*, not renderer-specific cave/harbor code. Keep the existing wizard/goblin story as optional archival/secondary fiction only if editorially justified later, not two competing main first-contact demos.

No game engine/canon adoption is implied: the scripted demo remains visibly simulated, with all branches and facts local authored fixtures. A passage about a lantern is content data, not an architectural asset registry key. Art is optional and approved; the demo still works with no images.

## Target experiential sequence

~~~text
Public homepage
     |
     v
Try an interactive preview (no account)
     |
     v
D0: one situational excerpt + meaningful choice immediately
     |-------------------------------------|
     v                                     v
D1: inspect a notice                 D1: commit to repairing
     |                                     |
     +------------------+------------------+
                        v
D2: scripted transition to a verified-for-this-script event
    (repair 3/9 only if the selected authored branch actually earned it)
                        |
                        v
D3: interruption / encounter; previous knowledge affects available response
                        |
                        v
D4: 'Preview returning later' (explicit simulated time jump)
                        |
                        v
Scripted return digest + relevant current situation
     |---------------------------|------------------------|
     v                           v                        v
Create persistent story       Replay preview          View source/proof
     |
     v
Supported auth if needed -> verify eligibility -> existing creation wizard
     -> Generate opening (separate authorization) -> Review -> Start -> Now
~~~

Do not force every reader to step through exactly five dialogs or see every branch. The goal is an understandable **story**, not a tutorial slideshow. One genuine decision in the first viewport, another consequence that refers to that decision, and one readable return summary are enough.

### Entry frame D0

The frame has an authentic situation and two options with different meanings: read the sealed notice (knowledge before work) and begin repairing the beacon (admit sustained time). The exact prose/content belongs in the authored script file and is already proposed in Greywake. No generic wizard/class selector at this point. A first-time user should know what each option attempts, not be forced to scroll through ten paragraphs before the first choice.

Persistent small label near story chrome: **“Scripted preview · simulated time · resets when refreshed”**. An optional Details/How-this-works note can expand, but don't duplicate the disclaimer as a large notice after every action. The visitor should not confuse a “3/9 earned” scripted fixture with a real recorded engine roll; label the mode clearly.

### Scripted commitment, interruption and return

On an authored work choice, show the *attempt*, then **scripted accepted work** and an intentionally triggered “Jump to next moment in preview” control. Do not run a countdown that claims 3/9 progress on the basis of wall-clock time. When an interruption is authored, prior work becomes held and saved *inside this demonstration's local script state*.

A reading-first branch should actually change a later option or response. The final digest must explicitly distinguish:
- what was known from the earlier notice;
- what was earned only if work was chosen;
- whether a decision currently awaits;
- what did not progress because it was never accepted.

No fake automatic wages, no forced reward. The return frame should invite people into persistent play because they have just seen continuity matter, not because a big CTA magically appears at a dead end.

### Completion / exit state

At a natural stopping point, offer:
- **Create a persistent story** (only if signed-in real creation is supported/available; otherwise “Explore live access” or suitable truthful explanation);
- **Replay preview** (safe local restart);
- **See how this is built** (actual GitHub/source-backed explanation).

Never silently carry a simulated Greywake story into a paid canonical campaign. A future "Continue this exact story" migration would require a separate supported backend materialization contract; until then the CTA begins a **new persistent creation**. Explicitly communicate this if a visitor might reasonably assume their scripted decisions are saved.

A user may leave the preview at any point; header/secondary CTA always offer an accessible exit to home/real play without losing browser controls. Refresh-reset truth is visible, but Back navigation within the script must not masquerade as undoing committed story history.

## The auth handoff: keep the user's original purpose

**Observed source gap:** `apps/web/src/features/session/sign-in-button.tsx` currently hardcodes GitHub `callbackURL: '/stories'`; server-side `requireViewer()` redirects anonymous private navigation to `/sign-in` without carrying the destination. A visitor who clicked Create from /demo is returned to Stories instead of creation.

**Desired outcome:** safe **intent-preserving navigation** across login. This is not auto-posting the previous action.

Accepted intent classes:
- create/continue own story (e.g. /stories/new or owner-scoped draft URL);
- view own Stories;
- return to an authorized bookmarked story /play/:id;
- future invitation/notification only with an explicitly authorized flow.

All destinations must be local, canonical, allowlisted or server-authorized; no arbitrary external callback URL, protocol-relative URL, credential-bearing URL, unvalidated nested redirect, leaked invite token, free-form POST body, or auto-submission of a charge. Store only minimal safe intent if a signed-in callback requires continuity. When no valid intent exists, default to /stories. On return, revalidate session, viewer, resource permission and current eligibility.

**If user already signed in:** bypass unnecessary sign-in and continue to the same destination where authorized. **If provider consent cancelled or failed:** preserve a safe Try-again route and why they came; offer Back to preview. **If session expires mid-creation:** preserve draft/unsaved input according to existing RHF/session policy, reauthenticate and reload current authoritative state, never start generation automatically.

Currently **GitHub** is the only evidenced OAuth provider. Adding Google or another provider requires an explicit identity/backend decision, not simply a new button visual. A credential is not a sponsored usage grant. A signed-in user still needs effective policy/eligibility before spending.

## What if real play is unavailable?

| Situation | Honest UI and next safe action |
| --- | --- |
| Anonymous and real access open | Sign in for persistent play; preserve creation intent |
| Anonymous and real access invite-controlled | Preview remains playable; explain controlled access and supported sign-in/invite steps |
| Auth succeeded but no sponsored grant | Stories/reading if authorized; don't show Create/Generate as freely chargeable; explain restricted live access |
| Backend/provider temporarily unavailable | No-cost demo remains; live entry explains outage and lets visitor retry later if meaningful |
| Usage exhausted during opening | Preserve draft and verified candidate, show source-backed funding/renewal explanation |
| Generation ACK lost | Resume/status check existing operation; never auto-spend again |
| Already signed-in player with stories | Direct Your stories action, not mandatory demo loop |
| Unknown account eligibility (no read model yet) | Avoid asserting free credits; use neutral invitation and recheck at the gated action |

Do not invent pricing, signup reward, number of turns, trial reset time or successful provider generation. The parallel backend owner supplies the actual effective grant and admission contract later.

## First-person comprehension tests

Ask a newcomer without coaching:
1. What do you think this game does that a branching novel doesn't?
2. Is the preview AI-generated now, saved, and running while closed?
3. Which of your decisions changed the next moment and why?
4. How could you begin a real story?
5. Will signing in silently start spending money?

**Success expectation:** player describes intent/earned time/remembered change, correctly recognizes preview's simulation and knows that persistence requires a separate authenticated action.

**Negative tests:** first choice without time-skip barrier; both Greywake paths; no-image/reduced-motion; double click; refresh resets script; /demo independent of Nest; enter Create and cancel auth; sign-in callback with hostile return target; already-authenticated create, invite-only denial and backend outage. Accessible keyboard and 320–375px layout required. Don't require a real external provider to test scripted browser flow.

## Implementation boundary and evidence

A frontend-only Change may author a clear script and its local state and recompose the demo. A separate navigation/identity Change may maintain safe sign-in destination using the existing auth stack **only after** the backend/session ownership is confirmed; it must not change Nest identity provider policy or security without coordination. Live allowance display and real paid operations are separate backend public-read-model dependencies, not this preview work.

Source anchors (Nov 13): `apps/web/app/demo/story-demo.tsx`, `scene-view.tsx`, `content/script.json`, `script.ts`, `apps/web/app/page.tsx`, `apps/web/src/features/session/sign-in-button.tsx`, `apps/web/src/server/viewer.ts`.

**Product gate before release:** a human can experience one authored commitment, its interruption and its consequence, then intentionally choose real persistent play. No invented autonomous AI behavior, no unbounded usage, no wrong-account deep link. Cursor may implement later only against a separately selected bounded Change.
