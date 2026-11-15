# Presentation language | frontend-owned V1 vocabulary and resolution contract

**Status: selected design contract, 2026-11-13; design-only.** Parent: [presentation runtime](presentation-runtime.md). Media and motion rules: [media/motion](presentation-media-and-motion.md). Initial renderer is a **frontend-only, fixture-fed capability**. This is **not** permission to alter `StorySnapshot`, Nest or any LLM schema.

## Purpose and ownership

Define a small, strict, expressive, versioned *declarative language* for rendering fictional atmosphere. It is neither serialized React nor raw style text. A future backend can emit its public equivalent only in a separate design/contract Change after the frontend is proven. Runtime validation is mandatory even when TypeScript appears to guarantee shapes.

**Two representations, never confused:**
- **Input document** (potentially untrusted): concise optional creative directions. Absent and invalid fields are normal.
- **ResolvedPresentation** (trusted pure output): complete, safe semantic tokens/asset placements/verified option treatments that renderers consume. Only this form becomes CSS properties and component variants.

Every renderer must work from safe defaults. The input document cannot set focus/disabled styles, control labels, DOM structure, z-index, user permissions, command payloads, layout reorder, system status colors or arbitrary HTML/CSS.

## V1 envelope and conceptual types

The schema naming below is a **normative design sketch**. Cursor may name TypeScript interfaces idiomatically but not change allowed capabilities/meaning without a design update. Use Zod 4 or the existing frontend runtime parser style. The wire-facing name can be chosen in a later backend contract Change; do not add a shared contracts dependency now.

~~~ts
type ScenePresentationV1 = {
  schemaVersion: 1;
  storyStyle?: StoryVisualIdentity;    // persistent defaults, fixture now
  scene?: SceneArtDirection;           // temporary overrides
  choices?: ChoiceTreatment[];        // exact public offer targets
};

type StoryVisualIdentity = {
  palette?: Partial<PaletteIntent>;
  typography?: 'editorial' | 'restrained' | 'technical';
  texture?: 'none' | 'grain-soft' | 'organic-soft' | 'geometric-soft';
};

type SceneArtDirection = {
  palette?: Partial<PaletteIntent>;
  atmosphere?: {
    lighting?: 'neutral' | 'dim' | 'diffuse' | 'radiant';
    vignette?: number;       // 0..1, resolved with limits
    textureIntensity?: number; // 0..1
  };
  stage?: 'open' | 'quiet-surface' | 'translucent-surface';
  media?: MediaPlacement[];
  motion?: {
    ambient?: 'still' | 'drift-soft' | 'shimmer-soft';
    passageArrival?: 'none' | 'fade' | 'rise-subtle';
  };
};

type PaletteIntent = {
  backdrop: Color | BackdropGradient;
  accent: Color;
  surfaceTint: Color;
};

type BackdropGradient = {
  kind: 'linear' | 'radial';
  stops: { position: number; color: Color }[]; // 2..4; 0..100, increasing
  angleDegrees?: number;   // 0..360, only linear
  center?: { x: number; y: number }; // 0..100, only radial
};

type ChoiceTreatment = {
  target: ChoiceTarget;
  surface?: 'quiet' | 'outline' | 'filled' | 'luminous';
  accent?: Color;
  emphasis?: number;  // 0..1, bounded; never changes eligibility
  effect?: 'none' | 'glow-soft' | 'pulse-soft';
};

// Mutually exclusive identities. Matching is against current authorized public data.
type ChoiceTarget =
  | { kind: 'legacy'; interactionId: string; optionId: string }
  | { kind: 'campaign'; offerId: string; path: string[] };
~~~

`Color` is a **validated opaque RGB value**, suggested input `#RRGGBB` only. No alpha in the input, CSS functional strings, named CSS colors, variable names or hexadecimal shorthand. The renderer derives alpha/translucency as required. A solid backdrop can be a `Color` string; a gradient must be a valid structured object. Numeric positions and intensity are clamped or rejected according to each field's documented behavior. Never interpolate an unparsed color or value into CSS.

**Do not turn this sketch into a mandatory single giant JSX prop.** The resolver can accept the validated envelope and authoritative current scene/offer identity; composed components consume only the resolved pieces they need.

### Required scope context

Presentation input is not allowed to establish canonical truth about the current story. The integration adapter supplies an authoritative scope:

~~~ts
type PresentationScope = {
  storyId: string;
  passageId: string;       // verified current published passage
  interactionId?: string;  // legacy, when present
  campaignOfferId?: string;
  validCampaignPaths?: readonly (readonly string[])[];
  validLegacyOptionIds?: readonly string[];
};
~~~

For V1 frontend fixtures, that scope comes from the corresponding verified fixture. In real Play, scope comes from existing `StorySnapshot`/campaign read models and is **never inferred from presentation JSON**.

Choice matching must be exact on kind + interaction/offer identity + full path; not label, position, partial path, single `node.id`, or array index. Duplicate treatments targeting the same choice are invalid for that target (fallback to the safe default, with sanitized dev-only diagnostics). A treatment for an old, hidden, ineligible or absent option is ignored. A presentational target cannot add a new option.

### MediaPlacement (V1)

Media is resolved through the [media and motion design](presentation-media-and-motion.md) and intentionally uses **references, not URL strings**.

~~~ts
type MediaPlacement = {
  id: string; // unique within published scene presentation
  assetRef: string; // registry-approved; never direct HTTP(S) from input
  slot:
    | { kind: 'backdrop' }
    | { kind: 'before-passage' }
    | { kind: 'after-paragraph'; index: number }
    | { kind: 'after-passage' };
  crop?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number }; // percentages, 0..100
  role?: 'decorative' | 'supplemental';
  scale?: 'inset' | 'wide'; // inline figures only; backdrop ignores it
};
~~~

**Asset-reference ownership:** `assetRef` is an **opaque content identifier**, not an enum of known scenery and not inherently a `fixture:` URI. The frontend input parser checks syntactic bounds and rejects dangerous raw URL/CSS syntax; asset existence, viewer authorization and rendition metadata are checked against a **trusted catalog supplied by the consuming host**. The pure resolver must not import a fixed map of named story assets, require Storybook-specific prefixes, or know words such as cave/harbor/castle. A Storybook scenario may inject a test catalog with recognizable fixture IDs; that catalog belongs in test/story content, never the general renderer. An unknown, stale or unauthorized reference resolves to absent media without affecting prose/actions. See [asset boundary](presentation-media-and-motion.md#asset-boundary-references-not-generated-urls).

The role is only a display classification; actual alt/caption truth comes from **approved asset metadata/public narration**, not untrusted art-direction prose. Decorative media uses empty alt/aria-hidden. Supplemental illustrations require an accessible approved description. No artist-generated hidden clue may become player-visible merely through alt text. A failed/unresolved reference drops that media placement only.

**Initial limits:** at most one backdrop and two inline illustrations; valid paragraph index is 0 to paragraph count minus one; at most one inserted illustration per anchor for the first implementation. Additional media is ignored with a safe diagnostic. These are **V1 renderer budgets**, not a promise that the final product can never show more art. Expanding limits requires a measured change and updated tests.

## Presentation resolution algorithm

Implementation should be a series of pure functions, independent of React/Next/browser globals:

1. **Parse version and structure.** Unknown `schemaVersion` → full safe default. V1 unknown optional keys are ignored/reported in development, not applied. A malformed optional scene field is dropped in isolation where possible.
2. **Start from baseline semantic tokens.** Preserve current player dark-field-journal default for no input. The platform owns readable body ink, focus, status, disabled and interactive affordance rules.
3. **Apply story visual identity.** Optional palette/type/texture defaults; no theme side effects outside the story presentation subtree.
4. **Apply scene overrides.** Valid structured backdrop, accent, lighting, treatment and scoped media; missing fields inherit.
5. **Resolve contrast and media safety.** Compute sufficient foreground/surface separation; constrain surface transparency, brightness, blur and contrast. A background image does **not** supply stable measured contrast. Keep a reliable narrative reading layer. User/browser accessibility and motion preferences override decorative settings.
6. **Select exact choice treatments.** Bind only to currently authorized current-offer targets. Build presentation lookup by authoritative target, not by ambiguous labels.
7. **Emit immutable resolved output.** Stable object semantics on unchanged canonical scene inputs; no random colors, current timestamps, animation side effects, asset fetches or command state.

**Fallback granularity:** invalid vignette → default vignette; invalid choice target → that choice stays default; invalid media asset → slot omitted; invalid gradient → inherit valid story/baseline backdrop. It must *not* make the whole passage disappear. Structural/version failure may reject the whole presentation, never the underlying story.

### Foreground and text contrast

Creative input may propose **accent/backdrop/surface tint**, but **not arbitrary narrative text color**. Resolve safe `ink`, `muted`, `quiet`, control ink, focus/active and semantic status colors from vetted platform roles. Test actual contrast against the *composited reading surface*; if imagery/translucency prevents guaranteed contrast, make the reading surface sufficiently opaque or apply a controlled scrim, not a guess based on average image brightness.

Normal text aims for at least 4.5:1; large text 3:1; essential non-text controls/focus 3:1 where applicable. Disabled-state semantics remain understandable without relying on a single opacity. In forced-colors mode ignore/degrade decorative palette and keep native/system color roles.

### Typed effect registry

- CSS variables carry values (e.g. resolved backdrop, accent, stage surface); **classes/data attributes carry effect identity** (`luminous`, `pulse-soft`).
- Register a new effect by implementing it in owned component CSS/behavior, updating the accepted schema and adding accessibility/performance/fallback fixtures. Unknown effect ⇒ `none`.
- Effects are not universally applied to all buttons: only explicitly matched fictional choices or their scene, never system recovery/permission/technical controls.
- Animation *style* may be suggested; event *occurrence* is supplied by existing verified game/command state. No generic on-mount animation for every Query refresh.
- Never compute option authority from color: `danger` is not an inferred eligibility category and `red` does not mean error.

## Validation and debugging requirements

**Provider-free:** deterministic unit tests for parser, resolver, contrast/fallback, exact target matching and identity switch; RTL tests for visible/protected controls; Storybook for visual proof. No live provider or DB required.

Keep a developer-only explain view or debugable pure-result snapshot showing source layers, normalized values, rejected fields/reasons and renderer capabilities. It must redact raw player/story prose and asset URLs in structured logs and must not become an omniscient player HUD. Test that invalid input never changes a command's ID, path, body, retry or eligibility.

Avoid destructive schema coercion: an untrusted string of CSS is invalid; `0.9` numeric strings should not silently become numbers. Bounds should be explicit; e.g. `emphasis: 2` is rejected or clamped by a documented rule, not accidentally interpreted as 200% opacity. Prefer rejection for wrong types/invalid structure, clamping only already-valid finite numeric values.

## Version policy and downstream engine handoff

V1 fields are additive and conservative. A breaking change creates V2 with an explicit adapter/fallback. New renderer capabilities should be advertised through a documented registry/capability list; a future backend should not request treatment names the deployed client cannot render.

**Deferred engine choices to decide separately:** creation time (precompute vs per-passage), publication atomicity with passage, persistent world identity, asset consent/cost/storage, fallback when generation is delayed, revision of appearance after publication, public-projection versioning and client capability negotiation. The frontend V1 is **not** a command for LLM output now.

## Decision examples and negative cases

- **Cave:** nearly black/violet structured gradient, low diffuse lighting, optional approved backdrop, one luminous violet deceit choice, one red-emphasis aggressive choice. Both still submit their original authorized command or no command when blocked.
- **Harbor:** cold sea-glass and warm lantern accent with quiet typography, faint static texture. Same components and layout, different presentation input.
- **Microbe / bodiless mind:** abstract color field, no literal photograph, perhaps technical heading treatment; absent `location` and absent `inventory` remain absent.
- **Blank presentation / unknown version:** canonical story and original-looking options remain.
- **Two passages with the same title:** distinct published passage IDs select different intended scene states and event transitions; title text alone is not identity.
- **Stale choice decoration:** old offer ID/path cannot modify newly authorized choices; update of accent cannot submit a command, and retries reuse the frozen request as before.
