# Semantic design foundation and reusable UI ownership

**State:** SELECTED **bounded implementation architecture** for the next frontend refactor, not final art direction (2026-11-17). [Product roles](../../product/experience/design-system-and-expression.md) → this owner → [existing Play source map](../../../apps/web/src/features/play/README.md), [presentation V1](presentation-runtime.md), [Living Book POC](living-book-poc.md). [Phase 3 design dossier](https://github.com/DenisSkulovic/offscreen-rpg/blob/7694d4124e6227e7b6b5092ada4067a63df4b4fb/work/designs/open/player-experience-refoundation/phase-3/01-DESIGN-FOUNDATION-AND-COMPONENT-CONTRACTS.md) retains unapproved aesthetics and library alternatives.

## Audited starting facts (source `main@4e42bd76028ebf13458b799016446cc3f9dae38f`)

`apps/web/app/style.css` owns global selectors (including bare `main`, `p`, `h1`, `button`) and hardcoded colors; `src/features/stories/stories-library.css` owns distinct `--sl-*` roles; Play's `story-frame.css` owns `--sf-*` roles and page overrides. `StoryFrame`, `NarrativePassage`, `IntentionChoice`, `SceneMedia`, `StoryHistoryView`, and Storybook are useful real components/fixtures but not a shared design-system catalogue. React 19/Next 16/Storybook 10 are installed; no common `src/shared/ui` or `packages/ui` directory existed at source inspection. Recheck HEAD before code edits.

## Ownership and CSS architecture

Keep the foundation inside `apps/web` initially, not a new workspace package. Candidate structure (implementation may refine names but must retain roles):

~~~text
apps/web/src/shared/design/
  tokens.css        /* raw scales + semantic platform roles */
  contracts.ts      /* type-level variants only if they prevent drift */
apps/web/src/shared/ui/
  action.tsx / action.css
  system-notice.tsx / ...
  reader-surface.tsx / ...
apps/web/src/features/play/
  ui/                /* book composition / current action / Journal owners */
  presentation/      /* validates and resolves optional scene V1 */
~~~

**Do not replace** TanStack Query, story snapshots, React Hook Form, or current action mutation hooks. Shared UI components receive **presentation and already-authorized event handlers**, not story IDs or server mutation ownership. Native semantic HTML is default; a low-level accessible primitive library can be adopted only for one demonstrated complex need, as a narrow dependency decision with tests. Scene decoration cannot recolor system status or commands. [Visual hierarchy and ownership](../../product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership) keeps the reader and the system UI separate from scene-driven decoration.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| Ownership and CSS architecture | constrained-by | [Visual hierarchy and ownership](../../product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership) | A scene field cannot recolor errors, selection, or commands; those stay platform and reader roles |

### Tokens: primitive scales and semantic roles, not a hardcoded genre palette

Define scale names for spacing, font size, leading, reading measure, focus ring, surface elevation, borders, radius, and restrained durations. Establish **semantic roles** below and map local existing values without an unapproved wholesale reskin:

| Immutable system/platform | Reader/book | Creative scene, optional |
| --- | --- | --- |
| `--ui-canvas`, `--ui-ink`, `--ui-muted`, `--ui-focus` | `--reader-paper`, `--reader-ink`, `--reader-muted`, `--reader-measure` | `--scene-backdrop`, `--scene-accent`, `--scene-light-strength` |
| `--ui-border`, `--ui-action`, `--ui-action-ink` | `--reader-edge`, `--reader-shadow`, `--reader-spacing` | `--scene-motion`, `--scene-vignette`, `--scene-texture` |
| `--ui-danger`, `--ui-attention`, `--ui-success` | `--reader-serif`, `--reader-line-height` | `--scene-media-slot` (strict renderer, not CSS string) |

These are **illustrative role names approved as architecture direction**, not a frozen names registry; implement names once, document and test them. Never set system success/error/disabled colors from scene mood. A creative scene style does not change a command or an error state. Those stay on the platform roles above. Normalize supplied hex/gradient only through the existing V1 resolver. User/OS overrides apply last (forced-colors, zoom, reduced motion, text selection, no-art). A Storyteller cannot inject CSS selectors, image URLs or arbitrary custom properties.

**Safe cascade:** default platform role → consistent Book role → validated scene-specific decoration → platform safety/interaction. A shared button in an error state cannot inherit a red danger meaning from the cave's lighting.

**Implemented registry (UI01, fixture-tested):** the role names in the table are the registry in `apps/web/src/shared/design/tokens.css`, loaded once from `apps/web/app/style.css`. `:root` copies the existing app-chrome and book-paper values. `.story-frame` and `.stories-library` redefine a role only where that surface already used a different hex, then point the local `--sf-*` or `--sl-*` name at it. A resolved scene may set `--sf-chrome-*`, `--sf-stage`, `--sf-option-*`, `--sf-vignette`, and `--sf-texture` on `.story-viewport`. It does not assign `--ui-danger`, `--ui-focus`, `--ui-action`, `--ui-action-ink`, `--ui-attention`, `--ui-success`, `--reader-ink`, `--sf-ink`, `--sf-focus`, `--sf-action`, or `--sf-status-attention`. `--ui-danger` and `--ui-success` are painted only by `SystemNotice` and the critical `Action` variant. A scene still cannot assign them. This records the cascade that source now enforces. It does not accept a final palette.

### Component criteria

A component becomes shared only if it has a stable semantic responsibility and either two real consumers or avoids reimplementing a difficult accessible behavior. No giant `Box`/`Card`/polymorphic-API museum.

1. **Action control (UI02, implemented):** `apps/web/src/shared/ui/action.tsx` is `kind="link"` or `kind="button"`. Variants are primary, secondary, quiet, and critical. `pending` disables the button and sets `aria-busy`. There is no spinner. A `data-surface` value cannot clear `disabled`.
2. **System notice (UI02, implemented):** `apps/web/src/shared/ui/system-notice.tsx` is always text. `error` uses `role="alert"`. `attention` and `success` use `role="status"`. `neutral` has no live role. The caller supplies any retry. Intention choice, frozen retry, and resolution submit stay outside this control.
3. **Surface / Reader surface (UI03, implemented):** `apps/web/src/features/play/ui/book-surface.tsx` is one flowing book leaf. It has no query and no choice callback. Desktop and mobile both extend that leaf. There is no page count and no second column.
4. **Contents/menu (UI04, implemented):** `apps/web/src/features/play/ui/book-contents.tsx` is a button-controlled menu for Stories, Now, and Journal. Closed items are not mounted. Escape and an outside click close it, and Escape returns focus to the trigger. No menu package was added. The quiet Details disclosure stays separate.
5. **Narrative/Decision grouping (UI03, implemented):** `narrative-flow.tsx` renders the published paragraphs in order. `decision-group.tsx` renders the current option ids. `history.tsx` does not mount that group.
6. **Stories library (UI05, implemented):** `live-story-list.tsx` and `draft-list.tsx` use `Action` for enter, continue, preview, and pagination, and `SystemNotice` for loading, end, and load failure. The library stays a list. Story titles stay source text in title links. Quiet and panel colors stay local.
7. **Welcome and creation (UI06, implemented):** the public entrance and `draft-editor.tsx` use `Action` for the primary, secondary, and quiet journey controls, and `SystemNotice` for the save message. Field labels, descriptions, and field alerts stay native. Sign-in stays its own button. The global `button` rule does not match `.action`.
8. **Media slot**: source-authorized placement and alt/role, optional graceful failure, not an image generator.

Prefer `StoryFrame` composition with narrow reusable helpers over a wholesale rewrite. Keep simple JSX where no shared component improves readability or testing. Every shared public API requires Storybook examples and at least focused RTL/a11y coverage.

### Motion and dependency policy

CSS transitions and native scrolling first. Motion for React may be evaluated **later**, only for interaction that cannot be achieved cleanly with existing CSS, with reduced-motion, focus, bundle/perf and removal proof. For complex dialogs/menus only, test an unstyled primitive (Radix or React Aria) before implementing custom focus trap; **do not** adopt a full branded theme package, Tailwind replatform or global animation library by default. Do not turn theme presets named cave/space/microbe into code.

**UI08 motion (fixture-tested):** the platform cue duration is `--motion-arrive`. Contents open uses `sf-menu-open`. A Now or Journal link inside the book sets `data-read-view="enter"`; a hash change without that click does not. The passage mark turns on only when the published id changes and the command is not held. First paint, a same-id refresh, and `intentionsDisabled` leave it off. `prefers-reduced-motion: reduce` sets `animation: none` on those cues and on scene drift and choice pulse. No motion package was added. A choice stays enabled while a cue runs.

### Regression and evidence gates

Source/markup, current command handlers, one history infinite query, and V1 appearance semantics are unchanged by token migration. Detect duplicate token roles via targeted static source tests where justified; Storybook demonstrates states at 320/375/768/1440, large type, light/dark stage, reduced motion and forced colors. Measure component reuse and deletion of copied CSS, not "component count". Test cases include six choices at 200% text and long prose: no clipping, hidden focus, nested scroll traps or changed original words. All meaningful platform statuses remain legible independent of backdrop.

**UI07 evidence (fixture-tested, not a final palette):** [design-system-evidence.test.tsx](../../../apps/web/src/stories/design-system-evidence.test.tsx) renders the book under the existing presentation fixtures, a pending Action, and an error notice. A malformed direction leaves the same option ids enabled and does not call fetch. The human gaps, including the absent screenshot corpus, are listed in [design-system-inventory.md](../../../apps/web/src/stories/design-system-inventory.md). Storybook a11y remains `todo`; that inventory is not art approval.

**Implementation order:** semantic tokens → first shared controls/notices → Book composition → on-demand book navigation → Stories/entry/create reuse → Storybook quality and motion → art-direction bridge. Actual Changes are in [Phase 3 queue](https://github.com/DenisSkulovic/offscreen-rpg/blob/7694d4124e6227e7b6b5092ada4067a63df4b4fb/work/designs/open/player-experience-refoundation/phase-3/README.md). No code is authorized by a target without a selected Change.