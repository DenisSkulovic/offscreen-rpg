# Client interaction contracts

**Owns:** how a player intention, a wait and a draft edit behave on the wire and in client state. **Product honesty** of what the player should understand is [play and decisions](../../product/experience/play-and-decisions.md) and [entry](../../product/experience/entry-and-onboarding.md). This page owns the client mechanism.

**Status (authority):** selected with the [React/Next architecture](architecture.md). Source-observed realization facts are labeled as such under their heading and never promote the target to demonstrated human UX.

**Selected interaction contract**

- Creation is prepared **Play / optional Customize** or one Story Prompt. The client may display queued, running and uncertain launch state, but does not require a generated preview or a Start ceremony. No mandatory preview.
- History controls operate on immutable published scene identities. Forking names the selected scene and never pretends that reading history itself mutates the live branch.
- Free-text gameplay actions are not a selected interaction.

## Intention

The player selects an offered intention. The client freezes that envelope and submits it once. While the result is being prepared, the choice is not left looking freely clickable in a way that would invite a second distinct action. Repeated clicks resend the same operation identity and payload. They do not roll again and do not create a second effect. A stale snapshot does not restore a retired choice. That boundary is [Commands and hints](state-and-server-boundary.md#commands-and-hints).

Immediate consequences and started intervals are different server results. An interval shows the saved server deadline. Reload does not restart it. Pause and Resume, when the interval is controllable, are explicit commands against that saved wait, not local timers pretending to be authority.

Generation is an explicit new request or a repeat of an already admitted attempt. An existing `202` and an uncertain provider charge do not dispatch a second model call by themselves.

## Drafts and forms

Draft creation, campaign settings and private presets use React Hook Form with Zod. `defaultValues` belong to the editing entity. A newer query response must not become reactive values that erase unsaved edits. On explicit acceptance of a newer saved revision, reset under control. Keep expected revision, frozen submit body, dirty fields and server revision separate.

Draft saves use a revision fence. On an ambiguous response, GET the latest draft and preserve dirty edits. Draft save is not a charged Storyteller command. There is no autosave and no local private-draft persistence unless a later product decision says so.

Start keeps `?story=` as the recovery anchor. The frozen candidate id, draft revision, locked flag, speed and optional start package are what may be retried, and only after a GET shows the story is not settled.

### Current launch realization (dated, source-observed; no human-UX proof)

Mirrored with provenance from [product entry, Current POC honesty](../../product/experience/entry-and-onboarding.md#current-poc-honesty); the product text stays in place and still owns what the player should understand. Source reads: `apps/web/app/(authenticated)/stories/new/page.tsx`, `stories/launch/page.tsx`, `src/features/stories/launch/use-story-launch.ts`, `packages/story-engine/src/storyteller/launch-publication.ts`.

- **`/stories/new`** (Stories home, Create story) renders one Story Prompt through `StoryLaunchForm`. There is no env-gated alternate launch route. **`/stories/launch`** is a compatibility entry that redirects to `/stories/new`.
- **Server presets only.** The prepared catalogue is shown only when the server supplies presets. An empty list must not fake one. At this source reading the route passes `presets={[]}`, so no catalogue appears.
- **Legacy drafts.** Saved drafts remain on the legacy staged creator at `/stories/[id]`. The Draft and Start contracts above still govern that path.
- **Launch recovery.** The launch hook freezes the request body, submits it as a `PUT` keyed by operation ID, and reads status by that ID. A 404 on reload means the launch was not submitted. The client returns to a needs-input state and sends nothing automatically.
- **Scripted opening and continuation.** A published launch opening can carry one server-scripted `observe` choice and no character sheet. Choosing it uses the existing campaign action API. A later scene is a scripted Writer continuation, not a live model evaluation. This is source-observed scripted behavior, not live Storyteller or provider proof.

## Wait honesty

The client must be able to show: received, accepted and still running, published, failed, uncertain, and blocked. Model processing time is not fictional progress. A generic waiting label does not imply that a retry, a regeneration or a successful publication happened.

**Negative:** mounting a screen does not submit an intention. Reconnection does not resume a paused mutation. A conflict does not discard the player's unsaved draft text. Developer Chamber controls are not part of the player command surface.
