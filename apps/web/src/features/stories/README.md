# Stories feature map

| Question | File |
| --- | --- |
| Where is the stories home (lists + create CTA)? | `library/draft-list.tsx`, `library/live-story-list.tsx`, `library/stories-home-actions.tsx` · page: `app/(authenticated)/stories/page.tsx` · styles: `stories-library.css` |
| How do I create a story in one prompt? | `launch/story-launch-form.tsx`, `launch/use-story-launch.ts`, `launch/story-launch-status.tsx` · page: `app/(authenticated)/stories/new/page.tsx` · styles: `story-launch.css` |
| How do I edit a saved draft? | `drafts/draft-editor.tsx`, `drafts/draft-content.ts`, `drafts/use-draft-save.ts`, `drafts/storyteller-select.tsx` · page: `app/(authenticated)/stories/[id]/page.tsx` |
| How do I preview / generate / start an opening? | `opening/opening-preview.tsx`, `opening/use-opening-generate.ts`, `opening/use-start-story.ts` · page: `app/(authenticated)/stories/[id]/preview/page.tsx` |
| Where does `/stories/launch` go? | `app/(authenticated)/stories/launch/page.tsx` redirects to `/stories/new` |