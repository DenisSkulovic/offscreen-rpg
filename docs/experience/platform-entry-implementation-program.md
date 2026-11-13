# Public entry and player home | frontend implementation program PF01–PF05

**Status: owner-authorized frontend program, 2026-11-13. PF01–PF04 Done; PF05 Proposed.** Parent [platform ecosystem](platform-ecosystem.md); precise targets: [public portal](spaces/public-portal-blueprint.md), [preview-to-play](flows/preview-to-play.md), [player home](spaces/player-home-blueprint.md), [journey/state atlas](platform-journeys-and-states.md). Inside-story UX, account/allowance backend semantics and operator portal are separate concerns.

## One measurable outcome

A visitor unfamiliar with Offscreen RPG should be able to understand and try one meaningful no-cost scripted action, distinguish preview from persistent play, begin an authenticated story without losing their chosen purpose, and later return via **Your stories** to a genuinely saved life. All of this must be understandable on laptop/mobile with or without artwork, while existing live Play remains safe and no model is called just to view a page.

The program **does not** implement public money-backed access, identity-provider expansion, account billing, operator console, notifications, runtime generated visual directives or new backend story read models. Those require separate owner/backend design. A complete front-door to a *restricted* POC is achievable without commercializing the entire system.

## Change queue and dependency reality

| Packet | Code-bearing frontend outcome | Dependencies | Independent proof |
| --- | --- | --- | --- |
| [PF01 public portal](../changes/2026-11-13--pf-public-portal/CHANGE.md) | Proper public shell/hero/links and honest preview-first page, mobile/SSR, no new auth gate | Existing homepage and product direction; none of PF02–04 | 1440/375/320, provider outage, navigation/copy |
| [PF02 preview experience](../changes/2026-11-13--pf-scripted-preview/CHANGE.md) | Replace “advance time before first choice” with original authored intention→work→interruption→return scripted experience; coherent preview exit CTA | Existing /demo engine and content graph; can parallel PF01 with source ownership | Multiple branches and simulated return, no provider/DB |
| [PF03 auth-intent return](../changes/2026-11-13--pf-entry-continuity/CHANGE.md) | Preserve *safe* intended destination through existing GitHub sign-in and private-entry deep links; no auto paid action | Need confirmation of existing Better Auth/Nest/Next callback and ownership; PF01/PF02 CTA names stable. **Readiness blocked on auth ownership review**, not code permission | Anonymous Create -> sign in -> correct verified creation; hostile redirect denied |
| [PF04 player home](../changes/2026-11-13--pf-player-home/CHANGE.md) | Authenticated /stories becomes state-aware personal re-entry surface with valid empty/one/many/draft/error states; current public data only | Existing Story/Draft SSR, Query and UX05; can parallel PF01 if no shared CSS conflicts | Appropriate 0/1/many render, no fabricated status, Query identity |
| [PF05 entry journey proof](../changes/2026-11-13--pf-journey-proof/CHANGE.md) | Deterministic Storybook/browser journeys across public/demo/auth/lobby, including negative cases | PF01–PF04 applicable accepted; actual restricted live integration when authorized | Link/redirect/fixture/viewport/keyboard/private-state proof |

**Dependency graph:** PF01 and PF02 are independent code owners (coordinate public CSS only); PF04 can be done separately after source recheck. PF03 is meaningful after entry CTAs are stable and auth flow can be safely inspected. PF05 consolidates. One active Change at a time by default. There is **no universal rule that numerical order implies readiness**.

**No code ticket for the operator portal or commercial billing yet.** The [ecosystem](platform-ecosystem.md) defines operator duties and user allowance states, but their server-owned reads/permissions and commercial policy are not yet agreed; making fake admin UI would produce exactly the speculative surface sprawl we want to avoid.

## What Cursor may and must not decide

**Cursor can choose:** exact React component extraction, scoped CSS organization, accessible semantic markup, local scripted demo shape, deterministic testing details when they honor the selected goals.

**Cursor may not choose:** changing gameplay rules/time; granting free provider dollars; adding a second auth provider; inventing backend account/usage APIs; renaming all game routes; installing a broad styled library; creating fake pricing or “features”; directly accessing Nest from public homepage for decoration; introducing arbitrary generated assets; building admin pages in player layout.

The visual design should be reviewed against **actual rendered alternatives**, not by assuming the current template is authoritative. No speculative generic component catalogs or hardcoded worlds in shared UI.

## Architecture and ownership boundaries

- **Public:** Next / page and /demo outside private Query provider; independent of paid provider health. Use actual anchor/link semantics, scoped layouts and CSS so existing create/Play/Chamber aren't inadvertently restyled.
- **Authentication:** Better Auth/GitHub and Next server boundary remain intact. Safe return target must be validated/allowlisted and resource-authorized after session. No open redirect, no raw OAuth URLs or client-side token caches. A frontend-only proposal with backend/server auth implications needs explicit cross-team coordination.
- **Player home:** existing /stories server auth, owner-scoped Nest reads, request-scoped Query SSR hydration, viewer-keyed TanStack Query, infinite pagination. No new client store, no made-up attention badges or client-clock completions.
- **Creation:** current draft editor/preview/generation/Start immutable intent flows are *protected*. A preview CTA to “Create” may navigate into existing flow; it cannot generate an opening or start a story automatically.
- **Content:** demo script and marketing excerpts are editorial data. Generic StoryFrame/presentation components must not import “Greywake,” “goblin” or corresponding art by name. A named script asset may live under a story/content fixture with explicit ownership.
- **Account and usage:** no wallet/allowance graph until a trustworthy public read model exists; use honest restricted/unknown text where supported, with sign-in/creation boundaries enforcing server policy.

## Data gaps to hand to parallel backend team, but NOT implement here

| Needed claim | Already demonstrated? | Frontend decision until supported |
| --- | --- | --- |
| Public preview can run without auth and paid models | Yes, scripted /demo | Keep independent of private APIs |
| Sign-in completed and viewer identity | GitHub session current | Preserve safe entry purpose within existing auth |
| New user entitled to free credit | **No validated account grant shown** | Never advertise cash/turn balance or assert permission |
| Story needs a specific current decision in list | List coarse status; comprehensive attention projection not evidenced | Neutral Enter story without invented urgency |
| Verified last situation or last viewed timestamp | Not reliably supplied by list in inspected source | Omit from cards or show only actual fields |
| True trial exhausted/renewal time | Story usage and policy internals exist, not full player grant projection | Display only when server supplies effective grant/blocker |
| Full administrative user spend audit | Not in current frontend | Separate future operator/backend integration |

A future read-model request must state owner/visibility, authoritative meaning, freshness, privacy, negative states and version semantics. Do not fabricate a DTO to make Storybook green.

## POC milestones and launch gates

**M0 design selection:** owner critiques the hero architecture, demo editorial choice, signed-in lobby and auth intent. Clarify what is merely proposal versus already supported.

**M1 provider-free front door:** PF01+PF02 complete. A recruiter can arrive, read, interact, restart and inspect source with *zero* account or inference, including during backend outage.

**M2 signed-in continuity:** PF03+PF04 complete where existing auth/API permit. A real account can use Create and return to known drafts/stories, without getting thrown to a generic homepage or seeing fabricated status.

**M3 integrated evidence:** PF05; wide/mobile/keyboard, identity and denial negative cases, safe redirects and no extra POSTs are tested. Humans judge emotional/cognitive quality separately.

**M4 restricted live proof:** separately authorized backend usage/security/ops work plus one connected real story from entry → opening → Start → commit → leave/return. **Not achieved** by PF01–05 and not automatically authorized by this program.

**Failure condition:** marketing feels “premium” but cannot explain real time and scripted preview; account entry destroys intent; Stories page fabricates progress; demo calls provider; current real Play commands are changed by a styling refactor; library lists private data across account identity.

## End-state workbench fixtures

Keep a small reusable set of deterministic **page and journey** fixtures:
- anonymous, signed-in and session expired homepage;
- preview first decision, work accepted, interruption, return, replay and no art;
- signed-in zero stories + zero drafts, one story + draft, several distinct verified statuses, story list error but draft list succeeds;
- Create click → sign-in → safe intended URL; malicious return destination; signed-in already; OAuth cancelled; access refused;
- provider degraded / sponsored live restricted while public preview works.

For each: verify text/copy, source identity, safe links, responsive layout, keyboard focus and effect on paid/network operations. Prefer existing Vitest/RTL/MSW/Storybook/Playwright setup over a parallel harness. Avoid opening costly external providers in automated tests.

## Select and execute

No PF packet is active. `docs/changes/README.md` must retain **Current change: none** until the owner explicitly selects a packet, reconfirms source and authorizes bounded code. Cursor should read exactly its packet, one closest owner map, and 2–5 source files; not this full initiative and all product docs on every edit.

**Suggested first implementation after owner design acceptance:** PF01 for public readability and hierarchy; PF02 next to make the product proof real. Human critique after each. PF03 and PF04 may be brought forward for a local owner-play POC if a live authenticated journey is more urgent than recruiter marketing.

The completion of this design document is **not** implementation permission or evidence of deployed behavior.
