# UI09 execution design | one creation door, two honest modes

## 1. Route ownership

### `/stories/new`

Server component:

1. authenticate with existing `requireViewer()`;
2. render canonical creation shell and `StoryLaunchForm viewerId={viewer.user.id}`;
3. do not mint a draft UUID, fetch the draft opening catalogue, or instantiate `DraftEditor`.

If a future/current authoritative prepared-preset reader already exists on the execution HEAD and returns the exact `StoryLaunchPreset` contract, it may be passed to `StoryLaunchForm`. **Do not invent one or repurpose mechanical draft content.** Absence of such a reader is not a blocker to removing the legacy wizard from the default new-story route.

### `/stories/launch`

Keep the route only as a compatibility shim: authenticated or unconditional Next redirect to `/stories/new` according to existing safe route conventions. Do not maintain a second independent launch page.

### Stories home

Remove `isStoryLaunchEnabled()` branching. Navigation and primary action should expose only `/stories/new` for creation. Existing `/demo`, live stories, drafts, account UI stay unchanged.

## 2. Canonical StoryLaunchForm interaction

The form owns two conceptual modes, not wizard steps.

### Prepared experience

When `presets.length > 0`, render a prepared-experience section with one card/action per preset.

Each card has:

- authoritative display label (and optional description if the local `StoryLaunchPreset` type is extended within Web only);
- primary **Play** action which invokes `beginLaunch({ prompt: '', preset })` once;
- optional **Customize** action/disclosure which selects that preset and reveals only supported optional customization: custom Story Prompt and existing hints. No title/character/review.

A preset-only Play must work with no prompt. Do not leave HTML `required` semantics on a prompt field that is optional for preset source.

If there are no authoritative presets, do not render pretend cards or disabled examples. The custom Story Prompt remains the canonical usable path.

### Custom story

Render one dominant Story Prompt textarea with explanatory copy that it may be one word, a sentence or a paragraph. One primary action creates the story. Exact button wording may be `Create story` / `Enter story`; do not call it a “Save” or make it look like a draft-review ceremony.

Customization is secondary, under a `<details>`/disclosure labelled **Customize** (or equivalent accessible disclosure). Only controls already represented by `StoryLaunchRequest.hints` may appear. The current world-invention selector can live here; it must default unset. Do not add invented storyteller profile choices without an authoritative source.

### Launch state

Once submission begins, freeze the selected mode/preset/prompt/customization together. Current `useStoryLaunch` already owns idempotency and recovery; UI09 must preserve:

- no second PUT while pending/polling;
- no second PUT after uncertain/ambiguous response;
- GET-only status recovery;
- session storage pointer without raw prompt;
- status-specific held/failed/uncertain copy;
- ready link only after schema-validated story identity.

Do not add automatic navigation that can hide an uncertain/held state unless current target docs explicitly require it.

## 3. Legacy draft compatibility

Do not delete `DraftEditor`, `draft-content.ts`, opening preview, saved draft transport, or `/stories/[id]` behavior. Existing DraftList links continue to `/stories/[id]`.

The old four-stage editor becomes a compatibility surface for already-saved drafts only. UI09 does not create new draft migrations or convert draft rows to launch operations.

## 4. Feature-gate retirement

After routes/home are updated, grep for `isStoryLaunchEnabled` / `STORY_LAUNCH_ENABLED` under Web.

If only the old creation-path gate remains, delete:

- `apps/web/src/server/story-launch-capability.ts`
- its focused test
- stale README references.

If current HEAD has gained a distinct, legitimate non-creation consumer, stop and report that exact consumer rather than deleting its policy blindly.

## 5. Styling

Reuse the existing semantic design tokens and `Action` / `SystemNotice`. Refactor `story-launch.css` into a calm creation surface consistent with Stories/reader presentation. Do not introduce a new design system, global CSS overrides or novelty motion.

Visual hierarchy should read, without interaction, as:

1. “Create a story” / product promise;
2. prepared Play cards when available;
3. **or** one Story Prompt;
4. optional Customize;
5. launch status/recovery.

The old numbered progress strip must not appear on `/stories/new`.

## 6. Reconciliation

After tests:

- update Stories README/app route table to say `/stories/new` is canonical Launch and `/stories/launch` is redirect;
- update current-runtime honesty text that says the gate is default-off / staged editor is the default;
- preserve historical statements about legacy saved-draft compatibility;
- record actual proof only. UI09 does not claim live provider quality, prepared catalogue population, or Storyteller backend completion.
