# What we need to decide next

The product is concrete enough to begin technical design. These choices remain open; do not silently settle them by choosing a database schema or a scheduling library.

The [technical design](technical/architecture.md) now supplies implementation recommendations. In particular, [shared decisions](technical/client-and-identity.md), [timing](technical/execution.md) and [notifications](technical/notifications.md) contain concrete proposals for discussion, not assumed answers to the product choices below.

The first [scripted testing chamber](technical/delivery-and-validation.md#scripted-testing-chamber) uses explicit solo fixture rules to test persistence, choices and timing. That experiment does not require resolving every general product question below. Its policies remain visible and provisional rather than silently becoming defaults for all stories.

## Settle before implementing the affected behavior

1. **Shared decisions and membership:** how are individual intentions collected and conflicting actions resolved? Who can start, pause and resume the group story? Begin with one shared situation and an invited pair; choose the supported group limit. The technical proposal starts with joining during setup; decide what happens to a character/group when a participant leaves or the owner deletes their account.
2. **Agency:** contextual choices are central. Does the first version also allow free-text intentions, and when can someone interrupt a quiet interval? Define commitment and frequency limits without reducing interaction to endless regeneration.
3. **Pace and deadlines:** how does selected pace map fictional duration to real waiting while allowing immediate exchanges? How much fictional time passes when an interval is interrupted? Does a decision window hold the situation or allow danger to progress? What happens to active waits when pace changes?
4. **Autonomy and risk:** which choices can a character make without its player, and which permanent consequences may the storyteller introduce during absence? These are separate permissions. What should happen when the available fallback exceeds permission or a player is absent for a long time?
5. **Rules and possessions:** which abilities, chance checks and counted resources are necessary for the first coherent experience? Keep contextual judgment while making actual outcomes and transfers consistent.
6. **Spending and recovery:** what are the initial generation and ongoing budgets, and who funds a shared story? The technical proposal shows a specific blocker when progression cannot continue. Decide whether restored allowance/provider availability should automatically resume that held story or wait for the player; it must never clear a manual pause. Development uses an explicit developer-funded cap without deciding commercial tiers.
7. **Notifications:** which first channel reaches someone away from the browser, and does it link back or support decisions directly? A workplace messaging integration is a candidate, not a selected dependency.
8. **Endings:** does the first experience offer a finite adventure, a continuing life, or both? Does ending an adventure end the playable character's story?
9. **Space and movement:** what is the smallest authoritative representation of places, connections and interrupted journeys, including two characters travelling independently? Choose how duration/progress are established and how exceptional movement works before implementing travel. A uniform 3D cube grid is a candidate map format; physical scale, sparse space worlds, abstract connections and optional regional/local maps still need validation. The interactive map itself is deferred and must not force a universal geometry onto all stories. See [spatial continuity](continuity-and-consequences.md) and the [data boundary](technical/data.md).

## Refine through the first experience

Exact storyteller presets, initial example premises, image frequency and the placement of sign-in can be tested without postponing the whole technical design. Reusable custom storytellers and separate simultaneous party adventures do not need to be designed now.
