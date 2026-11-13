# PW01 | Wire published optional appearance into live Play, without generation

**State: Done (2026-11-14).** Optional published `current.appearance` projects into live Play through the existing PX resolver. **Authority:** [live published-scene contract](../../experience/system/live-presentation-projection.md), [V1 presentation grammar](../../experience/system/presentation-language.md), [media/asset isolation](../../experience/system/presentation-media-and-motion.md), existing [React/Next Query](../../engineering/targets/react-next.md).

## Cursor first-screen

> **Outcome:** the real authenticated `/play/:id` receives an **optional server-authored, passage-bound** visual directive with its approved asset catalog and renders it through the existing PX01–PX07 resolver. No inference/model/image calls on render, no changed command payloads, zero appearance remains the same field-journal stage.
>
> **Backend contract owners (coordination needed):** `packages/contracts/src/stories.ts::storySnapshotSchema`, `packages/application/src/stories/reads.ts::createStoryReads`, actual canonical passage publication (`stories/continuation.ts` / `storyteller/publication.ts`). Optional appearance is committed by passage identity, not arbitrary client theme.
>
> **Frontend owners:** `apps/web/src/features/play/view.tsx::PlayScene`, `src/features/play/presentation/{parse,resolve,types}.ts`, `ui/story-frame.tsx` and `ui/campaign-play.tsx` / `ui/campaign-offer.tsx` to pass matched treatments. Reuse existing Query SSR/hydration and `@offscreen/contracts` Zod.
>
> **Do not:** generate style from prose, install CSS library, mutate game action authorities, read private CAS directly in browser, add a new LLM/prompt/image provider, bill user, or rewrite W-series Query/SSR.

## Exact public DTO and propagation

Add an optional `StorySnapshot.current.appearance` equivalent to the selected `PublicSceneAppearanceV1`:
- server-set `source.storyId` and `source.passageId` must match current scene; include exact current `interactionId` / `campaignOfferId` when applicable;
- `directive` is the closed version-1 V1 input document; validate with a **separate forgiving optional parser** so corrupt decoration can't fail the whole story snapshot;
- `assets` is a bounded authorized public asset catalog for the same passage (opaque refs + safe rendition metadata), empty in the initial no-art integration; never direct CAS hashes/credentialled arbitrary URLs;
- only **published** passage may carry it, not an opening candidate or incomplete generation. If absent/unknown version, do not style.

**Producer dependency:** use a disposable explicitly authored/persisted presentation fixture bound to a real published test passage for the end-to-end proof. **Do not hardcode its cave/harbor content into generic source**, and do not add production magic CSS selected by story title. Live production may still have no appearance until a later production authoring design exists.

**SSR:** same owner-scoped snapshot read, same Query identity, same response; no second endpoint or state store. Derive actual `PresentationScope` in PlayScene from verified `current.id`, `current.interaction` or campaign offer and full available paths; ensure stale/not-yet-eligible choices aren't styled. Resolve once per eligible scene/snapshot identity with the existing safe pure V1 resolver and trusted catalog, then pass to StoryFrame and **CampaignPlay** so campaign option treatments don't disappear.

**Compatibility:** existing stories with no appearance and old generation records stay readable, no migration of old story content required. A→B story switch cancels/ignores stale media; new passage gets new appearance only from its own publication, double SSE no entrance replay, no reveal of hidden future art.

## Acceptance / negative cases

**Positive:** server-authorized test passage carries a V1 directive (without model generation); real Play renders themed atmosphere and exact *current* campaign/legacy option treatment while original command stays unchanged. Old story without directive renders baseline. SSR content available before JS and media failure nonblocking.

**Negatives:** wrong passage/offer ID, stale/unknown V1, malformed color/illegal URL, other-owner/ref, extra art, empty catalog, delayed render, duplicate SSE, stale Query response, collapsed/disabled option, signed-out browser/history-back: no cross-account/leaked art, no client-generated eligible action, no paid call, no fatal story parse. Art decoration cannot turn read-only Journal into live offers. A new scene never inherits old color.

**Proof:** Zod/public projection schema tests, authenticated owner/wrong-viewer Nest read integration **only on explicitly approved disposable DB**, no-provider unit/RTL StoryFrame/campaign path, SSR hydration/Query identity and browser Storybook/Play proof using local authored fixtures. Record exact version/asset URL validation and rendered screenshot evidence. Do not use production DB, real image generator or provider money.

## Exclusions and permissions

This is a **small cross-team read/publication contract plus renderer wiring**, not engine Storyteller art-direction generation. Coordinate backend read-model ownership before making `@offscreen/contracts` changes. If backend parallel program won't own the new public field yet, do not implement a fake live client coupling; leave this Change unselected and provider-free PX lab as-is.

**Proof (2026-11-14):** migration `0002_fair_magus.sql` (`story_passage.appearance`); forgiving `readOptionalSceneAppearance`; snapshot projection; `PlayScene` → `resolveLivePresentation` → StoryFrame/CampaignOffer. Checks: `pw01-appearance-projection.live.test.mjs`; web Vitest live-presentation + existing presentation RTL. No paid generation; empty assets OK; corrupt decoration dropped. Production authoring/Storyteller art still out of scope.

**Next:** none for PW01. Later producer/authoring of appearance remains a separate program.
