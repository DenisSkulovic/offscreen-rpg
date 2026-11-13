# Cursor first-wave handoff | implement one approved UX result at a time

**Status: DESIGN HANDOFF PREPARED, NOT CODE-AUTHORIZED.** 2026-11-13. First candidate **UX01**, followed by **UX02** only after an actual rendered critique. Permanent [experience index](../README.md) → [selected Living Stage anatomy](../spaces/living-stage-blueprint.md) → [UX01 Change](../../changes/2026-11-13--ux-story-shell/CHANGE.md). Current change remains **none** until owner selects/authorizes code.

## One paragraph for the owner

The game interface destination is **one living situation stage** rather than the current subsystem-first two-column page. The target is already designed: compact story identity and current status, readable published prose, one contextual memory strip when important, structurally separated live intentions, and on-demand history/settings. The player should feel present in a life; only verified earned work, actual decisions and sourced history may occupy the stage. **Cursor implements layout and components; it does not decide the experience.** Visual screenshots come back to the design reviewer for critique before the next Change.

## The precise first executor prompt (use only after explicit authorization)

```text
ROLE: Cursor implementation executor. One approved bounded Change, no product redesign.

GOAL: Implement UX01, a player-only, accessible Living Situation Stage frame
with compact story navigation, a single readable stage, scoped tokens/styles,
and a responsive 375px/1440px StoryFrame fixture. This is a foundation,
not the complete Play UI migration.

PRODUCT AUTHORITY:
- docs/experience/spaces/living-stage-blueprint.md
  #stage-anatomy-and-default-order
  #target-desktop-layout-current-scene-with-decision
  #small-screen-deliberate-reflow-not-desktop-compression
- docs/experience/spaces/information-architecture.md

CHANGE:
- docs/changes/2026-11-13--ux-story-shell/CHANGE.md
  Read full first-screen brief, acceptance and exclusions.

ENGINEERING AUTHORITY:
- docs/engineering/targets/react-next.md
  #1-desired-data-and-rendering-topology
- docs/technical/client-and-identity.md (relevant owner section only)

CURRENT SOURCE ENTRY:
- apps/web/app/README.md
- apps/web/app/style.css (existing global selectors)
- apps/web/app/(authenticated)/layout.tsx (auth/Query provider; preserve)
- apps/web/src/features/play/view.tsx (PlayScene composition)
- existing Storybook/RTL pattern closest to a player presentation fixture

DO:
- Reinspect current branch/worktree and source owners before editing.
- Implement one new, single-stage, player-only frame and semantic tokens.
- Keep narrative measures and mobile reading hierarchy from blueprint.
- Scope style changes so the demo, creation flow and Chamber stay unaffected.
- Use existing architecture; plain semantic HTML/CSS; only justified primitives.
- Implement/verify exactly one representative StoryFrame fixture and its
  keyboard/375px/1440px behavior.
- Return an actual screenshot of narrow and wide examples, plus test results.
- Record visual questions for the architect; do not improvise a new screen paradigm.

DO NOT:
- Modify game rules, time, cost, backend or database.
- Move the authenticated Query provider or create a new client store.
- Add a permanent sidebar, generic SaaS cards or chat-bubble layout.
- Display unverified story title, status or earned progress.
- Add a dead Journal/World/You link. If Journal isn't functional until UX07,
  don't invent a route: either link the existing working history or defer.
- Rebuild Choice/Activity/Settings/Journal content under UX01; UX02–UX12 own them.
- Touch Chamber developer UI or spend providers.
- Run destructive tests or deploy; don't commit/push without owner instruction.

PROVE:
- One scene with short and long narrative content fits the stage.
- No accidental changes to public demo, creation or Chamber CSS.
- Keyboard focus and 375px/1440px visual layout are acceptable.
- Story identity switch cannot render A as B; all private SSR/Query boundaries remain.
- pnpm --filter @offscreen/web test:fast (or narrowly scoped tests first)
  with actual result; no assertion of unrun tests.

RETURN:
- Changed file paths and source diff.
- Exact tests performed and pass/fail output; unproved items separately.
- Screenshots of rendered desktop and mobile with useful content.
- Any missing source/public data and what UX01 could not deliver.
- Explicitly state UX02 is not yet implemented or authorized.
```

This is a *template prepared for owner approval*, not a command already dispatched. The executor may choose local JSX/class names but must obey the chosen player experience.

## Why UX01 is deliberately small

The current `PlayScene` manages verified Query snapshots, SSE refresh, immutable Play commands, a legacy journey wait and a mechanically backed `CampaignPlay`. Trying to remake all of that, the creation wizard, history and Storyteller settings in one Cursor prompt recreates the same failure mode the user is trying to escape: a coding model makes hundreds of unreviewed UX decisions while solving source ownership.

UX01 establishes the screen **anatomy** and safe style ownership; **UX02** moves actual published narrative, current status and existing sidebar content into that anatomy. They are separate because the first has CSS/layout scope and the second has data, focus, RHF dirty-edit and Query update scope. Both can be independently tested.

The first screenshot might not yet look like the entire final game. That is **expected**. The design reviewer evaluates the foundation against its selected composition, not falsely marks the whole UX program Done.

## Current source caveats confirmed by inspection

- `apps/web/app/style.css` currently contains global body/main styles plus `.play-layout` grid and `.play-sidebar` sticky behavior. A broad CSS rewrite could damage multiple pages.
- `apps/web/app/(authenticated)/layout.tsx` performs `requireViewer()` and wraps all authenticated routes in `AuthenticatedQueryProvider`. No player-specific StoryFrame should automatically replace that cross-app container.
- `apps/web/app/(authenticated)/play/[id]/page.tsx` server-reads the authenticated Nest story, seeds a request-scoped Query client and hydrates `PlayScene`. **Keep it.**
- `PlayScene` currently shows Storyteller/world-time header, scene title/prose, legacy waiting/choices, `CampaignPlay`, History, Settings and Technical IDs. UX02 will recompose these carefully; **UX01 need not destroy them**.
- `CampaignSettingsEditor` has React Hook Form dirty drafts; moving it into a conditional drawer may lose data if unmounted without a lifecycle plan.
- No dedicated Journal route exists in the inspected App Router map. A visible Journal link must work, or be withheld until UX07.
- `StorySnapshot` does not necessarily supply a persistent public story title. Do not derive one from revision numbers.
- Existing `/demo` is a scripted client-only preview, not a live backend. Its presentation must not inherit unwanted private app chrome.

**Reinspection gate:** these observations were inspected on `main` in November 2026 and can change. Stop and reconcile any contradictory current source before editing.

## Exit review for UX01

The designer (ChatGPT) should receive *actual rendered images or browser evidence* and critique:
1. **Hierarchy:** did the stage beat subsystem chrome?
2. **Attention:** can one immediately tell whether a choice is waiting?
3. **Reading:** do prose width/typography and long content work?
4. **World-neutrality:** can a microbe/open-ended fiction fit with no forced HUD?
5. **Navigation:** no inert Journal/Details button.
6. **Technical integrity:** private auth/SSR preserved, public demo/Chamber untouched.
7. **Visual identity:** does it feel more game-like than a neutral document app without relying on fake ornate parchment?

If UX01 fails any major dimension, adjust the frame *within UX01* before accepting the next packet. Do not let a sequence of future Changes entrench a poor layout.

## UX02 preview (do not authorize together by accident)

**UX02** will:
- put existing current prose and actual stage state in the chosen frame;
- remove permanent History/Settings/Technical ID prominence **without removing functionality**;
- preserve settings dirty drafts when disclosure closes;
- handle incoming SSE, pending/uncertain commands and old passage scroll;
- make clear current scene/action separation while leaving UX03's full choice language for the next slice.

Use [UX02 dossier](../../changes/2026-11-13--ux-narrative-stage/CHANGE.md) only after UX01 has a reviewed render. Then keep UX03/UX04/UX12/UX09 as later bounded outcomes.

## Source branch and write-safety policy

The UX design was authored on a separate documentation branch while `main` changed rapidly with Chamber and frontend work. **Do not implement player UI against a stale parent commit** or merge older index metadata over newer `main` claims.

A handoff branch built **from the latest main code** with only the UX Markdown added is preferable. It will allow Cursor to inspect current code and the correct design in one checkout. The documentation branch itself is not an authority to overwrite `main`. The user should explicitly decide when to select UX01 and whether/where Cursor may commit or push.

## Follow-up release sequence

1. UX01 StoryFrame → screenshot critique.
2. UX02 narrative stage and safe secondary access → screenshot/interaction critique.
3. UX03 offered choices and action semantics → test real intent/outcome distinction.
4. UX04 time/holds and interruption → verify earned vs predicted state.
5. UX12 bounded plan handoff → remove raw successor-path/horizon form from play.
6. UX09 original scripted public preview → portfolio first contact.
7. UX05/UX06/UX07/UX08 libraries, creation, Journal and contextual details, in dependency-ready bounded slices.
8. UX10 motion after truth; UX11 UX evidence incrementally from the first Change.
9. GM01–GM07 and original first-playable group/notifications in **separate accepted domain programs**.

This is an **execution preference**, not a rule that every downstream packet must be done numerically or in this order. The defining playable proof is still one life with an action, earned time, interruption and return.
