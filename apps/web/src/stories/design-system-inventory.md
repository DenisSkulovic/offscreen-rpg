# Design-system usage inventory

This is a source inventory for the shared player UI. It is **not a final art approval**. Visual taste, a physical keyboard pass, and stored viewport pictures remain human review. There is **no screenshot corpus**.

## Shared controls

| Role | Source | Used by |
| --- | --- | --- |
| Platform color roles | `apps/web/src/shared/design/tokens.css` | Loaded once from `apps/web/app/style.css`. Play and Stories alias the roles they already used. |
| Action | `apps/web/src/shared/ui/action.tsx` | Public entrance, draft journey, Stories enter/continue/pagination, opening generate/start, Play snapshot refresh. |
| SystemNotice | `apps/web/src/shared/ui/system-notice.tsx` | Save message, list loading/end/failure, opening status. |
| Book leaf, passage, choices | `book-surface.tsx`, `narrative-flow.tsx`, `decision-group.tsx` | Play now-leaf. History does not mount the choice group. |
| BookContents | `apps/web/src/features/play/ui/book-contents.tsx` | Stories, Now, and Journal. Closed items are not mounted. |

## Three surfaces

| Surface | Storybook | What the automated matrix checks |
| --- | --- | --- |
| Book | `Experience/Design system matrix` and `Experience/StoryFrame` | Six option ids stay enabled. Passage words stay. A closed Contents menu has no Journal link. |
| Stories | `Platform/Stories library` | The matrix story mounts `LiveStoryList` with the existing local handler. |
| Create | `Platform/Entry and create status` | The matrix story shows the native Story title label, a disabled pending Action, and an error notice. `DraftEditor` remains the real form. |

## Fixture directions in source

Harbor, cave, abstract, quiet, malformed, and unknown-version fixtures live in `apps/web/src/features/play/presentation/fixtures.ts`. There is no separate ship fixture. Cave, abstract, and quiet are presentation fixtures, not new game genres.

## Duplication that is still real

- `apps/web/app/style.css` still paints `button:not(.action)`. Intention choices, sign-in, Admin, and Chamber keep their own buttons.
- Stories quiet and panel colors stay local hex values.
- The public entrance keeps its own display font. Its primary actions are Actions.
- Storybook's a11y setting is still `todo` in `apps/web/.storybook/preview.tsx`. The runnable check is `design-system-evidence.test.tsx` plus the older axe tests. That is not a claim that every story is axe-clean.

## Human gaps

- Reduced motion and forced colors are in `story-frame.css`. The test checks that those queries do not hide `.story-frame__intention`. It does not turn on a forced-colors browser.
- 320, 375, 768, and 1440 screenshots are not stored. Earlier UI checks measured a 320px document scroll width for the landing and the shared specimen. That measurement is not repeated as a picture.
- A physical keyboard focus ring is not an automated result.
- Do not read a green test as approval of the palette.
