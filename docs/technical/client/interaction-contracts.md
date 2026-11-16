# Client interaction contracts

**Owns:** how a player intention, a wait and a draft edit behave on the wire and in client state.  
**Product honesty** of what the player should understand is [play and decisions](../../product/experience/play-and-decisions.md) and [entry](../../product/experience/entry-and-onboarding.md). This page owns the client mechanism.  
**Status:** selected with the [React/Next architecture](architecture.md). Free-text gameplay actions are not a selected interaction.

## Intention

The player selects an offered intention. The client freezes that envelope and submits it once. While the result is being prepared, the choice is not left looking freely clickable in a way that would invite a second distinct action. Repeated clicks resend the same operation identity and payload. They do not roll again and do not create a second effect.

Immediate consequences and started intervals are different server results. An interval shows the saved server deadline. Reload does not restart it. Pause and Resume, when the interval is controllable, are explicit commands against that saved wait, not local timers pretending to be authority.

Generation is an explicit new request or a repeat of an already admitted attempt. An existing `202` and an uncertain provider charge do not dispatch a second model call by themselves.

## Drafts and forms

Draft creation, campaign settings and private presets use React Hook Form with Zod. `defaultValues` belong to the editing entity. A newer query response must not become reactive values that erase unsaved edits. On explicit acceptance of a newer saved revision, reset under control. Keep expected revision, frozen submit body, dirty fields and server revision separate.

Draft saves use a revision fence. On an ambiguous response, GET the latest draft and preserve dirty edits. Draft save is not a charged Storyteller command. There is no autosave and no local private-draft persistence unless a later product decision says so.

Start keeps `?story=` as the recovery anchor. The frozen candidate id, draft revision, locked flag, speed and optional start package are what may be retried, and only after a GET shows the story is not settled.

## Wait honesty

The client must be able to show: received, accepted and still running, published, failed, uncertain, and blocked. Model processing time is not fictional progress. A generic waiting label does not imply that a retry, a regeneration or a successful publication happened.

**Negative:** mounting a screen does not submit an intention. Reconnection does not resume a paused mutation. A conflict does not discard the player's unsaved draft text. Developer Chamber controls are not part of the player command surface.
