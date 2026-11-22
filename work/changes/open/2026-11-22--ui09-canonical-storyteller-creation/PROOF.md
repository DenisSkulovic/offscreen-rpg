# UI09 proof matrix | distinguish canonical creation from a prettier wizard

No funded provider call is required or authorized. UI09 proves Web route/interaction behavior using focused component/route tests and source reconciliation.

| Case | Expected observation | Failure caught |
| --- | --- | --- |
| New story route | `/stories/new` renders canonical Launch surface | legacy wizard still default |
| Home primary CTA | one Create-a-story path → `/stories/new` | duplicate competing IA |
| Legacy launch URL | `/stories/launch` redirects `/stories/new` | two canonical entrypoints |
| Custom minimal input | Story Prompt visible; no title/character/role/progress/review | job-application funnel survives |
| Custom submit | one PUT with `source.kind=prompt` | draft save/preview ceremony or duplicate submit |
| Empty custom prompt | client rejects without PUT | invalid custom launch admitted |
| Prepared Play | supplied preset can Play with empty prompt; exact id/root in one PUT | HTML-required prompt blocks Play-first contract |
| Prepared Customize | optional prompt/hints included only after explicit customization | customization becomes mandatory or mutates request silently |
| No catalogue | `presets=[]` creates no fake prepared card/root | fabricated product content |
| Ambiguous PUT | one PUT then GET-only recovery | duplicate operation/spend risk |
| Uncertain status | Check status issues GET, never replacement PUT | resend after uncertainty |
| Storage privacy | session storage pointer omits raw Story Prompt | prompt leakage |
| Ready status | validated `/play/:storyId` link appears | premature playable navigation |
| Saved draft compatibility | `/stories/[id]` still uses DraftEditor; focused draft test green | destructive legacy migration |
| Gate retirement | no canonical creation branch depends on `STORY_LAUNCH_ENABLED` | new UX remains secretly default-off |
| Ownership | diff contains no API/GA/Worker/contracts/DB/K8s changes | packet scope escape |

## Focused commands

Use repository package scripts from the current HEAD rather than inventing a new runner. At minimum run the existing focused Web test command covering:

- `story-launch-form.test.tsx`
- `use-story-launch.test.tsx`
- `stories-home-actions.test.tsx`
- `draft-editor.test.tsx`

Then run Web typecheck/build and changed-file formatting/quality checks available on current HEAD. If a command name has drifted, parent may inspect `apps/web/package.json` / root scripts and use the exact current equivalent; this is execution routing, not product redesign.

## Manual browser smoke (optional, provider-free only)

If a disposable local/lab Web+API stack is already available **without funded provider dispatch**, verify:

1. sign in;
2. `/stories` → Create a story;
3. `/stories/new` shows one Story Prompt and no numbered wizard;
4. browser refresh during a held/pending scripted launch recovers the same operation;
5. an existing saved draft still opens its legacy editor.

If the available launch mode would make a funded provider call, do **not** press the launch action for UI09. Record browser submit proof `NOT RUN`; component/integration tests remain the acceptance mechanism for this Change.
