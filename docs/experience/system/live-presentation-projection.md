# Live Play presentation projection | atomic published scene, not client-generated art direction

**Status: selected cross-boundary design proposal, 2026-11-13; not implemented or code-authorized.** Frontend PX01–PX07 is complete as a fixture-fed validated renderer. This contract specifies its **first possible live input** without authorizing image/model generation. Separate [wire-up Change](../../changes/2026-11-13--live-scene-presentation-wire/CHANGE.md), [presentation vocabulary](presentation-language.md), [media boundary](presentation-media-and-motion.md) and existing [Next/Query truth](../../engineering/targets/react-next.md) remain authoritative.

## Decision

**Published presentation is immutable/authorized scene data, atomically associated with one committed passage and its admitted offer.** Do not have React derive “cave” colors from passage prose, guess the setting from story title, or call an LLM/image provider at render time. No presentation document is part of the current story truth until a backend/public contract explicitly publishes it.

**Public V1 envelope (one optional field, versioned):**

~~~ts
type PublicSceneAppearanceV1 = {
  source: {
    storyId: UUID;             // must equal StorySnapshot.id
    passageId: UUID;           // must equal StorySnapshot.current.id
    interactionId?: string;    // only if current legacy interaction exists
    campaignOfferId?: UUID;    // only if current authorized offer exists
  };
  directive: ScenePresentationV1; // closed frontend-owned vocabulary, version 1
  assets?: Record<OpaqueAssetId, {
    src: string; width: number; height: number;
    description: string | null;
  }>;
};
type StorySnapshot = {
  current: {
    id: UUID;
    content: PassageContent;
    interaction: Interaction | null;
    appearance?: PublicSceneAppearanceV1 | null;
  };
  // ... existing fields unchanged
};
~~~

Naming is illustrative; semantics binding. The optional field is **absent by default for existing stories** and requires no client upgrade for conventional text-only stories. Strict schema parsing protects received JSON; other StorySnapshot fields must remain available when appearance data are malformed (avoid making the whole story unreadable merely because an optional art directive is invalid). Keep a separate appearance schema with defensive parsing/fallback rather than relaxing unrelated game DTO validation.

**Authoritative target selectors:** The server captures the actual published `storyId/passageId` and current `interactionId` or `campaign.offer.id`, if present. The client derives `PresentationScope` from its already validated public `StorySnapshot` and authorized current option IDs / **complete current campaign paths**. A presentation choice must match one exact current interaction/offer/path; unknown, hidden or stale style is ignored. **No new action IDs or eligibility** from appearance.

**Asset isolation:** `assets` is an authorized public rendition catalog for this scene only, not raw canonical document CAS hashes or arbitrary LLM URLs. Backend controls ownership, provenance, object access, image host/rendition and privacy. The client resolves opaque refs with existing injected catalog and approved URL-origin policy. Initial wire-up accepts empty catalog and **does not generate/store images**. Do not make fixture SVGs or `fixture:` prefixes production defaults.

## Publication and lifecycle

- **Producer:** for first integration, a separately authorized server-side fixture/saved published presentation may be used in a disposable test only; do not fabricate engine-generated art direction in production. Later Storyteller prompt/validation/asset generation is a different program.
- **Commit fence:** appearance is attached only when a scene/passage is canonically published, with provenance `passageId` and offer/interaction scope captured at the same boundary. An opening draft candidate, failed generation or uncommitted document update **cannot** change current appearance.
- **Snapshot read:** owner-authorized Now snapshot projects this presentation alongside existing text. Same request/SSR Query key and validated Zod shape; **no second fetch, no extra client state store, no independent speculative theme cache**.
- **SSR and hydration:** initial server HTML includes readable passage before JS. If appearance is valid, Next may render it with existing StoryFrame client hydration. Invalid/missing appearance yields safe default, not full route failure or blank page.
- **Scene change:** A→B story or passage version updates drop old palette/images/choice treatments. Same published passage repeated via SSE/GET does not replay entrance or re-fetch arbitrary assets. Avoid mixing old new `story.current` and `campaign.offer` across separate Query versions.
- **Costs:** reading/rendering an appearance never invokes paid providers or mutates an operation. Generation of images/creative JSON later needs distinct captured server funding + latency/rights/ownership design. User cannot request model spending through CSS/snapshot fields.
- **Media delay:** if art is not yet approved/available at publication, omit the asset and keep prose/actions. Delayed future art must be bound to exact passage version and explicitly published as a new authorized presentation revision (separate later design), never retroactively overwrite current scene after switching stories.
- **Outage:** private story remains readable when decoration schema invalid or art fails. A missing source asset doesn't block ability to choose; deleted/revoked story never exposes image access via stale client cache.

## Compatibility and rollout

1. **Phase 0 (current):** Live Play passes no presentation; Storybook tests pure renderer.
2. **Phase 1 (one selected wire-up):** add optional server-owned published appearance projection and strict public contract; frontend derives scope from StorySnapshot and calls `resolvePresentation(input,scope,authorizedAssets)` in pure memoized render. For normal live stories, absent appearance means today's field journal. Controlled disposable fixture proves one published directive and stale/offline fallback; no model provider.
3. **Phase 2 (later producer):** independently decide how authoring/LLM creates art direction, how it is validated/committed, whether identity persists at story level, source rights, images/cost/backoff, cancellation and user preferences. Does **not** emerge from this Change by implication.

**Cross-team note:** Phase 1 necessarily includes a small `@offscreen/contracts` + application/Nest authorized projection. Coordinate with the parallel backend owner before selecting; frontend alone cannot populate the public field. If backend producer not yet implemented, return a self-contained mock/read-model requirement to that owner rather than adding a fake React parser that reads narrative prose.

## Normal and negative proof

**Positive:** known stored test scene has V1 violet/bright art direction and exact authorized offer accents; server projects it in owner-scoped `StorySnapshot.current.appearance`; SSR/Query renders from this source without prompt; actions/campaign commands byte-identical to before. Another scene without appearance renders original field journal. No assets case fully works.

**Negative:** wrong story/passage/offer/option/path appearance can't style or authorize a control; unknown version, malformed optional palette or unauthorized asset degrades appearance locally while story text remains; publication before candidate accepted never leaks art; story A→B theme isolation; duplicate SSE/refetch doesn't reanimate; viewer B can't read A's appearance/assets; no paid model/image generation/network fetching for read; no prehydration blank screen.

## What this is not

Not a freeform UI DSL, no model-selected React markup, no autogenerated UI components, no local inference of location, no image generation, no marketing theme, no global source-of-truth store, no new alternate story renderer, no Storyteller prompts, no billing grant or asset storage deployment. The frontend is a renderer of authorized **published content**.
