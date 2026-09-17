# What we need to decide next

The product is concrete enough to begin technical design. These choices remain open; do not silently settle them by choosing a database schema or a scheduling library.

The [technical design](technical/architecture.md) now supplies implementation recommendations. In particular, [shared decisions](technical/client-and-identity.md), [timing](technical/execution.md) and [notifications](technical/notifications.md) contain concrete proposals for discussion, not assumed answers to the product choices below.

## Settle before implementing the affected behavior

1. **Shared decisions:** how are individual intentions collected and conflicting actions resolved? Who can start, pause and resume the group story? Begin with one shared situation and an invited pair; choose the supported group limit.
2. **Agency:** contextual choices are central. Does the first version also allow free-text intentions, and when can someone interrupt a quiet interval? Define commitment and frequency limits without reducing interaction to endless regeneration.
3. **Pace and deadlines:** how does selected pace map fictional duration to real waiting while allowing immediate exchanges? Does a decision window hold the situation or allow danger to progress? What happens to active waits when pace changes?
4. **Autonomy:** which consequential choices can a character make without its player? What should happen when the available fallback exceeds permission or a player is absent for a long time?
5. **Rules and possessions:** which abilities, chance checks and counted resources are necessary for the first coherent experience? Keep contextual judgment while making actual outcomes and transfers consistent.
6. **Spending:** what are the initial generation and ongoing budgets, who funds a shared story, and what does the player see when the limit is reached? Choose bounded behavior for model failure as well as exhaustion.
7. **Notifications:** which first channel reaches someone away from the browser, and does it link back or support decisions directly? A workplace messaging integration is a candidate, not a selected dependency.
8. **Endings:** does the first experience offer a finite adventure, a continuing life, or both? Does ending an adventure end the playable character's story?

## Refine through the first experience

Exact storyteller presets, initial example premises, image frequency and the placement of sign-in can be tested without postponing the whole technical design. Reusable custom storytellers and separate simultaneous party adventures do not need to be designed now.
