# DIR02 | Exact-source publication appearance writer implementation blueprint

**Decision (2026-11-18):** implement the optional **single-publication-transaction** V1 scene-direction seam, with only a safe deterministic **server-created fixture** in tests. Do not hire a model, style all real stories by arbitrary default, change game mechanics, or add a production UI endpoint. This is the missing code between DIR01's existing stored-value **reader** and DIR03's proposed optional **author**.

## Actual source contract at `92ed12ba2884...`

| Owner | Source fact | Required delta |
| --- | --- | --- |
| `packages/db/src/schema/stories.ts` | `storyPassage.appearance` nullable JSONB exists | No migration for DIR02 |
| `packages/application/src/stories/persistence.ts` | `insertContinuationPassage` allocates `args.passageId ?? randomUUID()`, inserts passage, currently omits appearance | Add optional `appearance` to the same INSERT. Preserve other callers' null/default behavior |
| `packages/application/src/storyteller/publication.ts` | `publishStorytellerResult` locks owner story, tests publication state/revision, creates `plannedOffer` and calls passage insert | Use the **exact locked, non-stale** insertion branch and pass a trusted, validated optional appearance |
| `packages/application/src/stories/passage-documents.ts` | `publicationPassageId(id)` produces stable generated passage ID; staged documents already use it | Choose the final published passage ID **before** building the appearance, both with and without staged documents. Do not bind to a provisional or random different UUID |
| `packages/contracts/src/stories.ts` | `publicSceneAppearanceV1Schema` checks source IDs but defines `directive: z.unknown()`; asset URLs may include https | A successful public schema parse is **not** a server-side aesthetic/safety parse. Reject unbounded/untrusted directive rather than storing it |
| `apps/web/src/features/play/presentation/parse.ts` and `resolve.ts` | Actual finite client V1 parser and renderer | Reuse its **meaning** for the server-selected finite subset; do not import web-only frontend modules into application |
| `packages/storyteller/src/tasks/task-contracts.ts` | `storytellerResultSchema` is strict; result has no scene appearance | Do not quietly attach a new provider field in DIR02 or cause `validateStorytellerResult` to fail narration. DIR03 later owns optional output authoring |
| `packages/application/src/stories/reads.ts` | `projectStoredSceneAppearance` source-matches story/passage for current snapshot | No new read API; verify persisted row projects to existing Play resolver |

## Exact selected protocol

1. **Admission:** after the existing original-generation and story-revision fences, allocate `publishedPassageId = stagedDocuments?.passageId ?? publicationPassageId(generationId)` in the **same Storyteller publication branch**. Ensure this is the ID inserted and ultimately published in events. Check no other call site assumes a random ID.
2. **Optional trusted producer boundary:** define a small internal pure `makeValidatedAppearanceForPublication({storyId, passageId, offerId?, candidate})` returning either `PublicSceneAppearanceV1` or `undefined`. Candidate comes from an **internal deterministic fixture in provider-free integration tests**. Normal production invocation has **no candidate**, hence leaves appearance absent. Avoid a writable public request parameter, a global mock flag, an `UPDATE latest` endpoint, or a detached test-only persistence path. The fixture should exercise the real publisher seam, not just the lower-level insert helper.
3. **Finite first subset:** accept only `{schemaVersion:1, scene:{palette:{backdrop:'#HEXRGB'}, atmosphere:{lighting:'neutral'|'dim'|'diffuse'|'radiant'}}}` with optional values and strictly bounded key set, or an equivalent even smaller subset. No `choices`, `media`, external `assets`, arbitrary URL, HTML, CSS or unrelated `storyStyle`. Check parsed color using a strict six-digit hex parser, finite lengths and unknown-field refusal; the selected value must result in an actual visible difference from neutral in the client test. Keep a single shared portable server subset contract rather than duplicating permissive frontend parse semantics. Reject unsupported optional fields **without failing a valid narrative publication**.
4. **Provenance:** build `source: {storyId: current.id, passageId: publishedPassageId}` **only on the server** after its own story/revision checks. No caller may supply/change source identity. Omit `interactionId` and `campaignOfferId` for the first scene-only fixture; `plannedOffer.id` is allocated later in the same branch and does not need fabricated linkage. If later styling choices, require the exact committed offer/path identity in DIR03.
5. **Write:** pass the optional appearance to `insertContinuationPassage` as a typed optional argument, include in the existing insert values. Do **not** increment story revision separately, publish an extra event, alter command resolution, or write after commit. Missing/invalid decoration means null/omitted as before.
6. **Source-consistent duplicate behavior:** duplicate publication returns before INSERT, preserving original persisted appearance. A concurrent stale generation may neither attach to nor restyle the newer Now. Failure of optional validation only records a safe rejection marker, never new provider spend or replay.
7. **No hidden schema widening:** keep DIR01's current read bridge. If strict type ownership requires moving a pure subset validator to `@offscreen/contracts`, move only finite validation and test it; don't create circular imports from application into web. DIR03 can widen the proposal contract deliberately later, with fail-soft handling for invalid style independent of narration validation.

## Required provider-free acceptance matrix

| Case | Required observation |
| --- | --- |
| Valid internal scene fixture, direct Storyteller publication | Exactly one committed `story_passage` row with style and original unchanged content, sequence, plannedOffer and effects |
| Reload current snapshot then render Play | Source IDs match, selected backdrop/lighting resolves and text/choices unchanged |
| Invalid field, CSS, remote URL, wrong story or wrong passage | Valid narration still publishes; no appearance persists and no extra cost/attempt |
| Publication already `published` | No second insert, no replacement of original appearance |
| Concurrent newer story revision and stale generation | Same stale refusal as before; the newer Now is unchanged |
| Staged vs non-staged passage-document branch | One exact ID in appearance source, stored row, published event and current read |
| Absent optional fixture (normal production baseline) | Exactly previous behavior; no auto-generated theme, no new provider result requirement |
| Existing other passage insert callers | Compatible optional field: no style unless explicitly trusted and validated |

Run small pure validator tests first. Then targeted publication and current-read integration **only against the documented disposable test DB**; test the web resolver with component fixtures separately. Do not claim a SQL roundtrip from a mocked row. Capture command, environment, result and failure paths. No external media or provider requests.

## Result expected from Cursor

A complete source→publish→reload→render **deterministic proof** plus a canonical technical owner reconciliation entry. Then archive DIR02 Done. DIR03's optional creative producer/strict-result changes are the next separately selected packet. If fixture injection needs an internal seam, choose dependency injection in an internal test-facing module that cannot be reached via public API or production environment flags. Do not make a test-only exception that permits caller-selected source identity.
