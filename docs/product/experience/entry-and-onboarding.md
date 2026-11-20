# Entry and onboarding

**Owns:** arriving, signing in, and creating a life. **Does not own:** a platform-ecosystem umbrella; that remains proposed.  
**Unsettled:** full platform-ecosystem umbrella remains proposed—do not treat as silently accepted.

## First contact

A new visitor should understand the promise quickly: choose a prepared experience and **Play**, or describe any custom story in one freeform **Story Prompt**. A representative living scene communicates the product better than a feature catalogue or character-sheet funnel.

OAuth provides a quick route to durable stories and paid generation. The UI may let a visitor type a prompt before sign-in, but it must not lose that text when authentication becomes necessary.

## Stories home

Returning users enter a Stories space showing their stories and an obvious way to create another. Each story should be recognizable by premise and current situation, with an indication whether it needs attention, is progressing, is paused or has ended (useful descriptions—not a prescribed DB status enum here).

For an empty account, lead directly toward story creation—do not strand the player on an empty dashboard.

## Creation information architecture

Creation has two primary paths, intentionally shallower than the legacy staged wizard.

### Prepared experience: Play first

A prepared experience is already a coherent authored package: Library sources, starting situation, perspective/role constraints where any exist, creative guidance, rules/capabilities where relevant and presentation metadata. Its primary action is **Play**. **Customize** is optional and exposes only supported changes; the player does not have to reconstruct the package through a world picker, character step, profile step and review screen.

### Custom experience: one Story Prompt

A custom story begins with one freeform **Story Prompt**. It may be a paragraph, a sentence or a word such as `BAH`. The prompt is retained verbatim as intent. The Storyteller may establish an original setting and perspective under the selected invention policy. The player is not required to provide a title, humanoid character, profession, D&D rules, profile or structured lore before the first scene.

### Launch and first arrival

Submitting Play or a Story Prompt creates one durable launch operation. The UI shows honest queued/running/uncertain/failed states and can reconnect after reload. Successful publication moves directly into the first playable scene. There is **no mandatory generated preview and separate Start approval** in the target flow. A saved prompt draft may exist for convenience, but opening generation is not a five-step ceremony.

Provider/model latency does not advance fictional time. Retrying after an uncertain response must recover the same launch identity rather than create duplicate stories or duplicate spend.

### Current POC honesty

The existing staged editor/preview/Start flow is legacy implementation to be replaced by this target. Retained drafts or published stories remain migration inputs; they do not define the future creation contract.

## Drafts vs playable stories

A private draft may preserve an unfinished Story Prompt or optional customization without generating a scene. It is a convenience state, not a required gate. A **playable story** begins when its first scene is admitted and published.

A launch that is still queued, running or uncertain is neither a disposable draft nor a successfully playable story. The Stories home should represent that honestly and permit recovery without duplicate generation.

## Premise, stale previews and captured openings

There is no target requirement for a human-reviewed generated preview. Launch captures the exact Story Prompt or prepared-experience revision, effective customization and authorization used for the opening mission. Later catalogue edits cannot rewrite that already-published beginning.

A prepared experience is grounded in its pinned Library. A custom Story Prompt is preserved verbatim and may authorize original-world invention according to the effective creative policy. Recognizable names do not magically grant access to proprietary or absent canon.

World setup is broader than terrain generation. An apartment, underwater town, star system, microorganism colony or abstract realm need meaningful relationships and possibilities appropriate to that fiction; they do not need shared geography, humanoid anatomy or the same rule package.

The first scene should establish only what it needs. Consequential identities and facts become durable as the story uses them; incidental background need not become a simulated census.

## Initiative, invention ceilings and progressive entities

Creation establishes how much narrative initiative the Storyteller has, independently of incident frequency and danger. The player may ask for a cultivated direction, occasional proactive developments, or an emergent ordinary life with no grand narrative. “No grand narrative” can still contain consequences. “Directed” does not promise a railroad or a particular ending.

A prepared world declares ceilings for characters, places, groups, world elements and deep lore. The story may choose stricter values and cannot exceed them. Simple presets come first. This setting governs factual authorship, not prose quality: a canon-bound Storyteller may be highly proactive using supplied material, while an open-world Storyteller may remain quiet.

When a start contains a hoped-for arc, antagonist move or reveal, preserve it as Storyteller-private noncanonical direction. Only scheduled facts that really must become due are admitted as executable obligations. The opening must not present a future possibility as already true.

Creation seeds stable records for the player and for immediate places and people whose participation is part of the selected start. Incidental mentions may remain prose until the player interacts meaningfully, a later turn depends on them, or a supported mechanic needs current state. A spoken name alone does not invent combat statistics. A nonhuman story may register organisms, signals, collectives, or nothing analogous.

Generating a playable candidate requires a selected profile. An admitted candidate captures the exact profile and execution policy. Start freezes that captured configuration onto the story. Later catalogue edits do not alter it.

Shared-story invitations, readiness and who may start remain an explicit open design. There is no requirement for public matchmaking, and those rules are not accepted by this page.
