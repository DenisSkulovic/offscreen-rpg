# PF01 | Public homepage becomes a playable invitation

**State: Done (2026-11-13).** Scoped `PublicPortal` on `/` with preview-first CTA hierarchy, editorial glimpse, how-it-works journey, honest mode split and GitHub proof. Parent: [entry program](../../experience/platform-entry-implementation-program.md). PF02 can proceed separately; coordinate shared public CSS.

## Cursor first-screen brief

> **Goal:** replace the skeletal public / page with an original, SSR-accessible editorial portal whose first action leads to the free scripted preview, while the real-story path and genuine GitHub evidence remain clear.
>
> **Authority:** [public blueprint](../../experience/spaces/public-portal-blueprint.md), [platform ecosystem](../../experience/platform-ecosystem.md), [portfolio first contact](../../experience/flows/portfolio-first-contact.md), [accessibility](../../experience/system/accessibility-and-voice.md).
>
> **Source:** `apps/web/app/page.tsx`, `apps/web/app/style.css`, `apps/web/app/layout.tsx`, existing `/demo` and `/sign-in` route owners, then one closest web page test/Storybook pattern. Do not scan/rebuild the game.
>
> **Keep:** /demo public/no-provider, /stories authenticated, existing Next SSR and data boundary; protect creation/Chamber/Play from broad global CSS.

## Code-bearing outcome

One high-quality **public entrance**, not an auth-gated hero or five generic SaaS feature cards. Visible original brand/premise, one unmistakable Try interactive preview CTA, quieter Start real story where real creation is supported, a genuine source/evidence link, concise earned-time explanation and truthful scripted-vs-live differentiation.

Implement an editorial page shell scoped to public route. Show a genuine authored scene glimpse or robust illustration-free alternative, not a hardcoded gameplay fixture inside a generic component. The homepage can remain static/public independent of Nest; do not add a blocking account/session request just to vary a navbar label. If signed-in personalization can't be done without backend dependency, show a working neutral Stories link and defer dynamic header changes rather than inventing state.

Use candidate copy only after scrutinizing what actual game rules/POC prove. No fake quote, fake player numbers, “unlimited worlds” promise, invented paid tier, free $3 claim, empty How-it-works route or unlicensed sample art.

## Exact scope

- Public header/hero/section hierarchy and responsive styling, real links, honest preview description, optional responsive illustration/content asset with proven provenance.
- One connected intention → earned time → consequence explanation presented editorially, not a backend simulator or a new gameplay state machine.
- Maintain strong CTA hierarchy on 1440, 768, 375 and 320px, typography and focus, no full-screen art before the first button on phone.
- Protect missing-asset behavior and reduce motion. Page should communicate content and navigation with JS disabled; no mandatory model-generated images.
- Add provider-free markup/navigation tests and actual browser screenshots, not just asserting text exists.

## Exclusions

No Google OAuth installation, wallet/balance banner, account-level read model, commercial checkout, admin portal, new auth callbacks, game mechanics, engine StorySnapshot or provider calls. Do not replace the existing StoryFrame or add a global CSS framework. No production import of named Greywake images in generic UI.

## Acceptance / negative proof

**Normal:** anonymous visitor understands the product and reaches /demo from a visible first CTA; can also find actual source and real story entry. Hero and link hierarchy work without art. Content distinguishes script from paid persistent story.

**Negative:** private API down -> public page still renders and /demo link works; no session -> no mandatory sign-in modal; no JS -> promise and links remain; 320px/400% zoom -> no horizontal overflow/hidden CTA; default global main styles cannot make the first action require absurd scrolling; screen reader can navigate brand/headings/links. Dead destinations are not rendered.

**Verify:** targeted RTL/Next smoke, accessibility audit using existing tools, desktop/mobile screenshots and real link checks. No model calls, destructive tests, new framework dependencies or deploy. Report exact checks and human visual questions.

**Handoff:** after owner selects PF01 Ready, re-read source/current HEAD and implement this one bounded public UI. Return diff, screenshots (two real hero alternatives if feasible), tests and the observed first-action visibility. Stop for critique before PF02 is assumed accepted.
