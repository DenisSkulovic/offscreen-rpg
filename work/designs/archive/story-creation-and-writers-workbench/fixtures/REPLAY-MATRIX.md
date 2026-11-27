# Replay and rejection matrix | source-verified constraints + proposed behavior

**Status:** proposed provider-free acceptance vectors, not executed tests or accepted implementation specifications. Read [Fixture lab](README.md) and [pre-play Workdesk protocol](../PREPLAY-WORKDESK-PROTOCOL.md).

## Common model

- `L`: launch owner + idempotency key + exact prompt/preset/profile/clock/permission/budget snapshot. **Committed control receipt**.
- `P`: immutable source materials and optional *operation-local* Workdesk stage, **not** the story's published root.
- `O`: normalized opening delivery and bounded creative/document proposals, with exact provider attempt/settlement identity if paid.
- `A`: final admitted publication selector: root + passage 1 + truthful optional checkpoint/gameplay state.
- `V`: viewer sees the first playable situation. Player-visible receipt of scene 1 is *not* the same thing as `A`.

These are **conceptual symbols**, not proposed DB enum names. A single task can combine P/O, but errors must still be attributable to the failed boundary.

## Failure cuts

| Cut point | What is durable? | Expected same-ID retry | Forbidden behavior |
| --- | --- | --- | --- |
| After `L`, before any model dispatch | Frozen launch intent, no spend | Resume same captured inputs | Snapshot a different preset/profile |
| After deterministic source resolution | Exact referenced package/root hashes | Recreate identical Workdesk view | Pick newly updated files by name |
| After provider request marked dispatched, no known delivery | Uncertain paid attempt | Report **uncertain/held** according to custody; approved repair only | Blind automatic re-dispatch and double-bill |
| After settled preparation response, before stage pointer | Saved normalized delivery | Deterministically materialize identical proposed documents/root | Re-invoke model because the stage pointer was lost |
| After staged Workdesk selected, before opening | Captured stage root/permission | Open from **same** source and stage | Read other campaigns' private notes |
| After opening delivery, before activation | Validated saved O | Re-stage and publish from same response | Spend on another scene 1 |
| After immutable document writes, SQL transaction fails | Orphan/unselected CAS objects, frozen source | Retry fenced SQL publication | Expose orphan blobs as player canon |
| After A, before HTTP response | One published story/passage/root, potentially a checkpoint | Return same scene and story ID | Create duplicate passage/story/obligation |
| After A, before first visible scene `V` | Story exists, player's arrival is unconfirmed | Deliver existing scene without extra cost | Invisibly run consequential timers as if user were already playing |
| After first scene, source package revised | Pinned original root still matters | All in-flight tasks remain pinned; next task follows accepted revision policy | Mix new preset lore with old scene |

**Design challenge surfaced by this pass:** The user has removed the opening-review step. A one-click experience needs a product/technical **arrival and clock-activation policy**. The cleanest initial candidate is that mere generation/publication of scene 1 does *not* schedule a running consequential interval; the clock progresses only after an admitted player action or explicit supported autonomous activity. The exact implementation and handling of offscreen life remain **unaccepted**. Do not introduce an invisible second “Start” click to avoid this question.

## Collision/rejection vectors

| Input | Reject or hold? | Why |
| --- | --- | --- |
| Two different `STORYTELLER_PROFILE.md` documents at equal effective precedence | Hold source-resolution conflict | Filename does not decide authority or priority |
| Profile wrong document kind | Reject package or explicit profile role | A `lore` file is not creative instruction |
| Profile asks for arbitrary SQL/shell/spend | Do not grant; preserve as untrusted creative data if otherwise valid | Markdown cannot elevate operational permission |
| Player edits after launch was captured | Keep old launch stable; new launch requires explicit revision/id | No mutation of in-flight provider prompt |
| Same idempotency ID with different user/prompt | Reject collision | Prevent cross-user or cross-intent replay |
| `BAH` after authenticated Play, absent title/character | Admit under future custom-world policy | One-word prompt should not require form fields |
| Empty string (no text) | **Undecided product choice**; do not quietly treat as `BAH` | Avoid implying user consent to invent any story |
| Three-page prompt within declared limits | Preserve and inject as admitted; route or hold if provider cannot fit | No 6,000-character silent truncation |
| Long prompt past admitted context/resource limits | Hold with clear size/budget guidance | User can store longer draft; engine cannot fake injection |
| Galaxy's first choice “move a star” with no admitted capability | Reject mechanical interpretation or treat only as a conditional attempted narrative intention when supported | No model-generated superpowers |
| Private possibility that a future leader is immortal | Keep private, noncanonical | Future idea is not settled world truth |
| Prepared source requires rule package, abstract no-rules bundle is submitted | Reject under current schema; target product needs explicit no-rules path | Don't disguise a broken adapter as a default |
| Two simultaneous launches from same draft | Define policy: distinct operations with distinct story IDs or a visible conflict | Never silently share mutable Workdesk |

## Proof levels

**Static source audit** (possible now): inspect existing fixture inputs and current validation contracts. **Provider-free harness proof** (not yet built): enforce capture, scoped manifest resolution, deterministic stage roots, failures, retries and exact publication using scripted proposals and disposable database/storage. **Paid creative-quality trial** (later, requires separate permission): measure whether separate preparation improves the first two scenes for BAH and galaxy at a justified cost.

No amount of static Markdown auditing proves a DB transaction survives kill -9, provider uncertainty is settled exactly once, or a future fork has a valid checkpoint. Those are implementation acceptance tests, not paper confidence.

## Unresolved questions for owner acceptance

1. Should opening work **always** publish proposed descriptive files with the first scene, or may the first Library contain only prompt/profile/orientation and passage? Prefer *no required additional documents*.
2. How does the Storyteller say “no preparation necessary” without inventing an extra model turn? For ready presets, skip prep deterministically based on an authored readiness contract.
3. Should creative-profile authoring use one required short core section or a content-size ceiling with bounded automatic compaction? Avoid an uncharged model call to summarize its own profile.
4. How will prompt-invention limits be selected for `BAH` without an explicit form? A simple product default must be chosen and recorded.
5. Is a passive, observational narrative choice sufficiently playable when there is no mechanical actor? Test human engagement, not just schema validity.
6. What exact condition opens **clock accrual** after A but before V? A player may be disconnected or have multiple clients.
7. What are acceptable launch startup latency and cost budgets per route? Without these, choosing recipe A versus B is arbitrary.
8. Which initial scenes lack checkpoints and therefore cannot yet be independently forked? Do not make false product promises.
