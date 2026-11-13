# Portfolio first contact | sell the experience, then prove the engineering

**Status:** product/portfolio UX target, not a hosted deployment or growth-marketing requirement. The game has two audiences: **the person who wants to play**, and **the engineer or employer who may inspect how it works**. We must serve both without corrupting the game to fit a recruiter's short visit. Related: [experience thesis](../foundations/experience-thesis.md), [public demo script](../prototypes/public-demo-script.md), [evidence standards](../evidence/validation-plan.md).

## A visitor's 90-second question

“I clicked this project from GitHub. What is it, why is it interesting, and can I experience something real without creating an account or entering a credit card?”

The first screen should **not** lead with:
- a database tutorial, an architecture chart or a list of frameworks;
- six equally prominent cards describing future features;
- a giant “Create Account” gate before any interaction;
- a debug Chamber console advertised as gameplay;
- a fake claim that the browser-only preview is a persistent AI-driven world.

**The product statement:** “Your character's life can continue through the commitments you make, even when you're away. Return to real accumulated consequences.”

The implementation must later substantiate the promise with actual supported mechanics; do not present a conceptual sentence as verified production reliability.

## Public entry structure

### Above the fold

1. A distinctive name/identity **Offscreen RPG**.
2. One specific memorable premise in plain language (not “AI-powered next-generation multimodal agentic platform”).
3. One very short explanation of **intention → time → consequence → return**.
4. One primary **Try an interactive preview** action that requires no account.
5. One secondary **Explore the real project** action to GitHub/technical evidence.
6. A quieter **Create your own story** action if actual account creation and backend play are available.

No numerical success badges (“Thousands of AI-generated worlds”) without measurement. No immediate model provider selector.

### The preview route

The demo is a **scripted, explicitly simulated** example. It should give a meaningful choice and demonstrate the distinction between starting/finishing work plus one remembered fact in ~60–120 seconds of optional reading/interaction. It resets on refresh. See [the original Greywake script](../prototypes/public-demo-script.md).

**Suggested visible copy near demo entry:** “Interactive preview · time simulated here · resets when refreshed.” The text is not a liability disclaimer tucked in the footer; it is part of the game's honesty.

### After the preview

Offer two natural paths:
- **I want to create a persistent story** → genuine supported creation flow (if usable/hosted).
- **I want to see how this works** → concise engineering showcase (repository and evidence).

A player who enjoys the fiction shouldn't be forced through tech stack slides. An employer who wants architecture shouldn't have to complete a 10-hour journey.

## Technical showcase for a skeptical engineering reviewer

Keep public product UX separate from a technical explanation that can be linked from GitHub. A concise walkthrough may show:
- Why deterministic rules own time, dice and effects rather than model prose.
- How immutable command IDs and receipts prevent double actions.
- What was proven in authenticated connected tests versus scripted demo fixtures.
- How the Chamber reproduces rare game states and where its lanes are blocked.
- Why the Storyteller context is rebuilt from canonical evidence rather than an endless chat.
- How the Next/React side preserves authorized server state and recovers uncertain operations.

**Every proof claim must identify an actual evidence class.** It is impressive to say “A deterministic 30-minute work shift pays once in our tested fixture.” It is unwise to imply “unlimited AI worlds autonomously run forever” when that remains design ambition.

## Two honest product paths, no bait-and-switch

| Path | What can be experienced | What it proves |
| --- | --- | --- |
| **Public scripted preview** | Authored scene, branches, simulated waiting/interruption/return | The UX concept and original interaction design |
| **Authenticated persistent story** | Actual supported creations, admitted actions, saved history and background commitments | The runtime features that have been exercised with authoritative integration evidence |

The preview is not an inferior second-class experience; it can be visually polished and charming. It simply should not claim the production runtime powers each branch.

A bounded sponsored trial or guest story, if introduced, requires separate provider spending, abuse prevention, privacy, data-retention and product authorization. **Do not put a live-model button on the homepage before that work exists.**

## A first-time visitor's task path

1. **Entry:** understand the unique promise from one sentence and one image/typographic stage. No giant product comparison.
2. **Try:** make one action in an original story without registration.
3. **Observe:** see a genuine *scripted* difference between intent, earned work and world consequence, with clear timing disclaimer.
4. **Return:** visit a simulated saved-moment digest and see the small choice-dependent memory payoff.
5. **Choose:** create a persistent story if available, or inspect code/evidence and try later.

Provisional acceptance: **within ~45 seconds**, an unfamiliar visitor can interact meaningfully. This is a test target, not a claim of achieved conversion.

## What "feels premium" means here

- Typographic clarity and readable long fiction, not default SaaS gradients.
- A deliberate emotional/visual thesis: a living situation with instruments for time.
- Clear, quiet but satisfying feedback when a real outcome is committed.
- Original or properly licensed imagery; no randomly scraped franchise asset as permanent hero art.
- No mandatory startup animation, data loading spinners or social-login form before a sample scene.
- Keyboard, phone and reduced-motion support.
- A sense that the designer **removed** unnecessary controls rather than styling them.

A beautiful page that makes a visitor wait for a paid provider call or presents a confusing “Plan horizon: 10,080 fictional seconds” field fails the portfolio purpose.

## GitHub companion: the README must tell the same truth

Eventually, the project README should explain:
- the current demonstrated boundary in a single first-screen overview;
- one image/gif or short video from the **actual running public experience** when available and permitted;
- how to run the no-cost scripted demo and, separately, the authorized local story mode;
- a link to architecture/testing evidence;
- a small roadmap distinguishing implemented functionality from UX targets and speculative mechanics.

**Do not update the README's product claims merely because a Markdown design dossier is written.** A project screenshot is proof of pixels, not proof of months-long autonomous play. A video of a simulated demo should be labeled as such.

## Trust, privacy and support behavior

- Public preview doesn't leak private story data via hydration or other account contexts.
- Unauthenticated first visit should work independently of paid providers and ideally independently of backend API.
- If backend/account functionality is temporarily unavailable, the preview remains playable and the real-play entry explains the outage.
- A recruiter can review the game in browser without providing billing details; no extra paid generation is silently triggered.
- Legal/public-domain/original rights for any included art, lore and fonts are checked before showcase.
- External GitHub link is authentic and leads to the right repository, not a fabricated “how it works” placeholder.

## Reviewer acceptance scenarios

**A. Busy recruiter:** opens from GitHub, makes a meaningful choice without sign-in, grasps the loop, can reach the code/proof in one click.  
**B. Fiction enthusiast:** ignores technical details, enjoys the small scene and understands what a real saved story would do.  
**C. Skeptic:** intentionally reloads the demo, sees it resets as disclosed, and does not perceive deception.  
**D. Mobile user:** 375px wide, reads and chooses without squeezed columns.  
**E. No-motion reader:** still comprehends event and progress without animation.  
**F. Outage:** public preview works while private backend/provider is unavailable; real account entry provides honest recovery.

## Unresolved before the public visual build

- Is a hosted persistent trial actually available and affordable? If not, don't put it above the fold.
- Which original story theme best communicates *life and earned consequence* in under two minutes? The Greywake beacon is the current proposed editorial choice, not mandatory final lore.
- How much art is worth producing for the public preview without creating a visual obligation for every arbitrary world?
- What is the smallest genuine engineering proof clip that shows exactly-once mechanics and the Chamber without overwhelming players?

**Recommendation:** the public homepage should be a short inviting *portal to one memorable choice*. Keep the architecture behind a clear secondary door. Let the game itself carry the argument.
