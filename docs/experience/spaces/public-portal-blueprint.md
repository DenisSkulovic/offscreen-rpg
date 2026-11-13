# Public portal | from unknown visitor to first meaningful choice

**Design status: proposed product/UX target, 2026-11-13. No source changes or implementation authorization.** Parent: [platform ecosystem](../platform-ecosystem.md). Companion: [preview-to-play journey](../flows/preview-to-play.md); [authenticated player home](player-home-blueprint.md). This file owns the public **/ homepage visual/interaction contract**, not backend marketing policy, game rules, the demo's story canon, or its generated images. Existing [portfolio first-contact](../flows/portfolio-first-contact.md) supplies the experiential promise; [Living Stage](living-stage-blueprint.md) owns actual game presentation.

## Decision: a playable doorway, not a SaaS landing page

A newcomer should understand within one glance that this is a game about **intention, consequential time and remembered continuity**, then have a safe action to explore. The conversion strategy is *demonstration before persuasion*. Neither a list of 18 features nor glossy “AI changes everything” claims can substitute for a genuine player decision.

Two audiences share one public entry:
- **Curious player:** wants intriguing fiction and a clear path to a saved life, may have no interest in source code.
- **Time-constrained engineer/recruiter:** needs a truthful 60–120-second product proof, a link to source and a small trustworthy technical explanation without creating an account.

A public scripted preview is the **default primary action for an anonymous visitor**, always zero paid provider usage and usable when private backend features are down. Persistent play is an honest secondary route, only described as immediately available if actual account/entitlement/service policy permits it.

**Candidate editorial promise** (not obligatory text to hardcode): “A story that remembers your choices.” Supporting copy: “Choose what your character attempts. Commit to work that takes time. Leave, then return to the consequences actually earned.” This is more precise than implying an unbounded continuously simulating world. Use these words as testable hypotheses, not approved marketing truth before human review.

## Above-the-fold composition

**Visual direction:** original editorial fantasy of *a life continuing beyond the screen*, not default dark startup gradients or fantasy parchment. The page may use restrained original illustration, typography and one authentic-looking *clearly labeled preview excerpt*. Its look must not force all future worlds into one genre. Reuse platform tokens and accessible controls; public composition is not required to look like the same rectangular stage as Now.

**Desktop 1440+ conceptual layout** (regions, not pixel specs):

~~~text
  OFFSCREEN RPG            How it works    Try preview      GitHub / My stories
  ──────────────────────────────────────────────────────────────────────────
             [kicker: A game about consequence]

   A STORY THAT REMEMBERS          [editorial scene glimpse]
   WHAT YOU CHOSE.                  [place + atmospheric passage]
                                     A stranger has arrived...
   A short grounded explanation     [two authentic-looking options]
   of intention, earned time,
   return and limits.              [Preview · scripted, no AI calls]

   [Try an interactive preview]   [Start a real story]  [View source & proof]
   No account · ~2-minute sample (editorial estimate, no guaranteed duration)

  ──────────────────────────────────────────────────────────────────────────
   01  Make an intention    02  Time actually matters    03  Return to the result
   One short connected journey/example, not three equal SaaS feature cards.

   [evidence: the difference between accepted work, interruption, return]
   [small truthful modes: Scripted preview vs real persistent play]
   [final contextual preview/creation invitation]   [footer/legal/credits]
~~~

**Critical hierarchy:** one obvious primary CTA (Try interactive preview), one quieter persistent-story CTA when supported, one lightweight engineering link. Do not render all three as identical filled buttons. Header keeps a clear Stories/Sign-in entry but does not replace the primary editorial pitch.

**The scene glimpse on home must not impersonate live AI gameplay.** It is an editorial teaser or self-contained controlled snippet, linked to the honest demo. It may visually preview a choice, but if clickable it must either navigate to the preview or behave exactly as a scripted non-paying interaction with explicit scope. Avoid a fake button that looks as though it has submitted a real game intention.

### Why not auto-play a full game in the hero?

An entire interactive StoryFrame embedded above the fold competes with copy, loading order and accessibility; it also duplicates /demo. Prefer a memorable fragment or very small *optional preview* that leads immediately to the full no-account scripted experience. The independent /demo remains the canonical place for the actual interaction sequence. An inline interactive hero can be a later tested alternative, not the default architecture.

### The homepage sections

1. **Header:** brand identity, optional How it works anchor, working Preview link, Source/Evidence link, and Sign in / Your stories based on verified viewer state where available. No permanently exposed “Pricing” or “Community” tab before those routes actually exist.
2. **Hero:** precise product promise, one large action and a visual invitation that introduces a specific fictional situation. No contrived badge counts, fake user quotes or feature icons.
3. **The earned-time explanation:** one connected mini-timeline of a character's choice → admitted action → interruption or settled consequence → return. Distinguish simulation on this public page from genuine persisted mechanics. A concise diagram or editorial scene is acceptable; avoid a sprawling infographic.
4. **Trustful choice between modes:** “Try the scripted preview: no account, no AI calls, resets on refresh” versus “Create a persistent story: sign-in and actual authorized usage required.” The latter is shown as available only if the backend can actually admit trials.
5. **Technical door:** a modest genuine GitHub link (and later an engineering proof page only if it has real source-backed contents). No internal Chamber, DB screenshots, model selector, fake metrics or raw API logs inside marketing.
6. **Footer:** rules/credits/art provenance, privacy/terms when published, contact/support only if functional. No placeholder or broken navigation.

Design the page to feel **complete with zero promotional artwork**, but allow an authored editorial asset to enrich the hero. Do not ship a page that has a blank hero media rectangle when art fails.

## CTA policy and personalization

| Visitor context | Header account destination | Primary hero CTA | Secondary action / explanation |
| --- | --- | --- | --- |
| Anonymous, public no-cost preview enabled | Sign in | **Try interactive preview** → /demo | Start a persistent story → safe sign-in continuation only when authorized/available |
| Already signed in | Your stories → /stories | Preview remains available, but offer meaningful **Return to your stories** prominently | Create a story if account is eligible |
| Private backend unavailable | Sign-in/live entry truthfully unavailable/degraded | Preview still works | What happened / Try real play when available; no pretend success |
| Trial access closed | Sign in to view any existing access; don't promise free generation | Preview still works | “Live trial access is limited” if actual policy says so |
| Screen reader / reduced motion / no artwork | Same semantic nav links | Real native link/button, visible focus | Complete textual promise; no autoplay gate |

Do not require a session GET or private backend read to render and navigate the public hero. If later contextual “Your stories” is added, obtain identity safely without making the public route depend on a private session or a hydration-driven blank page. A signed-in user may still visit public home intentionally; no forced redirect to /stories.

**Language:** “Try preview” is distinct from “Start real story.” Do not label the no-cost script as an unrestricted free live AI game. “No card required” is allowed only if literally true for the displayed path. Don't announce a free dollar grant until policy has actually issued one.

## Mobile and accessibility first

**375/320px conceptual reflow:**

~~~text
  Offscreen RPG                          [Sign in / Stories]

  A story that
  remembers your choices.

  [short premise in 2–4 lines]

  [Try interactive preview]   (first usable action without deep scrolling)
  No account, scripted, ~two-minute taste

  [optional cropped editorial excerpt, NOT above the CTA]
  [Start real story]  [See how it works]
  [one vertical earned-time illustration]
  [engineering link / legal/footer]
~~~

- No hamburger menu holding the only Try action hostage. Ensure one primary link is visible immediately after the short introductory paragraph at 375px; don't let a 700px illustration precede it.
- No forced minimum heights, image-only headings, auto-animated typewriter or delayed first action. Use native links, real focus styles, semantic heading order and reduced-motion.
- Keep text measure comfortable on wide desktop and font scaling/high zoom without horizontal scroll; protect controls against global main/h1/p/button styles that currently affect many unrelated pages.
- The public layout may be prerendered/server-rendered and must communicate promise and links even without JavaScript. Demo's interactive runtime can load separately.
- Respect language/script diversity in real examples; no dependence on a fantasy display font missing Cyrillic glyphs.

## Public homepage versus other shells

**Public** is an editorial invitation. **Stories** is the signed-in player's re-entry place. **Now** is private narrative immersion. **Operator** is a privileged operational console. They share a product identity and selected accessible primitives, *not identical headers and dashboard layouts*. Do not sprinkle “Your account”/“Buy credits”/admin analytics in the hero.

A world or example art direction is content owned by the editorial demo/marketing fixture; generic stage components must not import assets based on a specific story name. Public hero imagery is not an in-game authoritative fact.

## What exists today, and what the target changes

As inspected 2026-11-13: **apps/web/app/page.tsx** has a short dark hero, “Enter Offscreen RPG” → /stories as first CTA, and small “Try a short scripted story” as secondary. It has no complete public navigation, strong editorial proof or explicit distinction up front between free script and account-backed live play. **apps/web/app/style.css** has global main padding-top: 20svh and broad h1/p/button rules; a new public composition should be scoped, with no blind global rewrite harming Play, creation or Storybook.

We **keep** the truthful existing premise, functional routes and demo. We **change** hierarchy and behavior to let an anonymous visitor experience something before needing to authenticate. Avoid an entire new route framework merely for homepage sections.

## Competing design alternatives and judgment

| Alternative | Benefit | Why selected/rejected |
| --- | --- | --- |
| Conventional SaaS hero + feature grid + “Sign up” | Fast implementation, familiar | **Reject**: does not communicate fiction, competes with generic LLM products |
| Fully playable AI session on homepage | Real generator proof | **Reject for now**: paid abuse exposure, latency, forced auth and safety unclear |
| Entire multi-step demo embedded in hero | Immediate interactive content | **Defer**: high DOM/UX complexity, duplicates /demo, distracting on mobile |
| **Editorial promise → no-cost authored preview** | Reliable, low friction, demonstrable agency, works during outage | **Selected** public entry for POC and later long-term use |
| Auto-redirect signed-in users away from / | Speed to library | **Reject as universal rule**: public page remains useful as sharable discovery, but link to Stories becomes prominent |

## Content and proof criteria

- Two real alternate editorial hero variants should be reviewed: A. text + authentic excerpt, B. text + restrained atmospheric artwork. Human designer judges which improves comprehension without false game claims.
- One original/licensed preview story should be presented consistently across hero and /demo without hardcoded “harbor” renderer dependencies.
- Manual first-contact tests with unfamiliar users: can they tell what the product *does*, what is scripted, where to try it and where to continue? Our provisional target is first meaningful preview action within ~45 seconds.
- Browser scenarios: public works with Nest provider down; 1440, 768, 375, 320px; 200/400% zoom; keyboard/screen reader/reduced motion; missing illustration; external GitHub link real and working; no dead “Pricing”/“Community”.
- Inspect actual hero and fold at a normal laptop viewport; a perfect mobile screenshot is not evidence of a good desktop arrival.
- Code/test implementation requires a separate **Proposed** Change and explicit later authorization, never from this design page alone.

**Definition of success:** an unfamiliar visitor wants to click into fiction because the page makes the unusual promise intelligible. An engineer can find proof without going through registration. A public user does not accidentally spend provider money by discovering the game.
