# Presentation runtime calibration | PX05–PX07 before engine integration

**Status: designer-selected follow-up proposal, 2026-11-13. Documentation only; no code authorization.** The implemented PX01–PX04 architectural seam remains. The [post-implementation review](evidence/presentation-post-px-review-2026-11-13.md) records evidenced shortcomings in current screenshots/source. The selected permanent frontend target remains [presentation runtime](system/presentation-runtime.md), [language](system/presentation-language.md), and [media/motion](system/presentation-media-and-motion.md).

## The decision

**Do not create the next backend/public-projection/LLM presentation contract yet.** This is not a rejection of the frontend architecture; it is a decision to stabilize the **meaning of its output** before depending on it. A format that accepts instructions but silently ignores several of them, breaks legibility in bright worlds, or proves option styling by bypassing the resolver in Storybook is an unstable foundation for model-generated art direction.

The core renderer stays. No mass React rewrite. Three constrained code-bearing corrections:

| Order | Change | Independent outcome | Evidence gate |
| --- | --- | --- | --- |
| 1 | [PX05: semantic surfaces and viewport](../changes/2026-11-13--px-surface-contrast-and-viewport/CHANGE.md) | Every valid dark/light/gradient atmosphere retains readable shell, passage, controls, with full scoped canvas and no horizontal overflow | Sterile, Harbor, Cave normal+negative browser samples |
| 2 | [PX06: media composition and capability integrity](../changes/2026-11-13--px-media-composition-and-capabilities/CHANGE.md) | Media slots have meaningful bounded scale/fit; every **advertised V1 field** has an observable supported meaning or is explicitly excluded | Short/long prose with images; capabilities matrix and contrast/perf |
| 3 | [PX07: truthful workbench and scenario proof](../changes/2026-11-13--px-workbench-fidelity/CHANGE.md) | Storybook controls feed *actual untrusted V1 documents* and exact real option identities; fixtures and browser evidence prove multi-world coherence, no bypass | Authentic legacy+campaign views, real controls, 320/375/high zoom + a11y |

Dependency: **PX05 → PX06 → PX07**. One active code-bearing Change at a time. PX05's narrow tests and rendered critique must be performed before PX06; don't defer all evidence to PX07. PX07 is an actual test/workbench code change; the human evaluation itself remains a review, not a fake code ticket.

## Architecture corrections to accept before PX05

### Surface-local semantic tokens, not global text contrast

The renderer must derive typography/ink and component treatments **per visual surface**, with explicit functional meaning. For example:

~~~text
resolvedPresentation
  ambient/chrome : backdrop + safe navigation ink/metadata + optional header scrim
  reading        : stage plate + body/heading/muted/quiet + separators
  option-default : safe button surface + title/support/hover/selected/disabled/focus
  option-treated : normalized accent/surface + individually safe ink/support/focus
  system         : invariant attention/recovery/error + protected controls
~~~

Names are illustrative, boundaries normative. Do not reuse `readableInk(stageSurface)` for chrome over a different gradient or for buttons over a default dark surface. Avoid arbitrary model-defined foreground colors; derive safe combinations from supplied accents/physical surface. A default button in a light world should be coherent with the light theme; don't preserve its legacy dark background while inheriting dark text.

For highly variable image/gradient backdrops, a reliable chrome/scrim/plate can be necessary. Focus and system-state semantics may not be overridden by creative art direction. Preserve the existing field-journal baseline when no presentation exists.

### Canvas and composition ownership

An atmosphere is not a 56rem background painted behind a panel, nor a content-height gradient that stops halfway down a 100svh Storybook canvas. The outer visual plane must occupy the appropriate viewport minimum and grow with long passages. It cannot obstruct focus or create horizontal scroll even if its ambient decorative child scales/drifts. Don't fix art overflow by clipping legitimate narrative content; clip/isolate **decorative layers only**.

Narrative reading column remains constrained; media widths, paragraph insertions and stage margins are meaningful *composition contracts*, not unbounded image elements. Restrict the footprint of an illustration relative to surrounding prose; no giant figure just because asset aspect ratio is 800×480.

### Capability honesty

A syntactically valid field cannot be silently ignored while the renderer reports success. If selected V1 accepts typography, texture, vignette, lighting, choice emphasis, crop/contain, etc., define a safe perceivable effect or retire/defer that capability from the advertised vocabulary and reject/diagnose it. Future backend authors must learn actual capabilities, not aspirational schemas.

**Do not artificially exaggerate effects** just to make a screenshot different. There is room for subtly supported texture/vignette/typography. A neutral/none value may intentionally be visually invisible, but nonneutral distinct values need an implementation path and a test.

### Laboratory truth

The existing `presentation.stories.tsx` manually mutates `ResolvedPresentation.choices` for Cave to decorate legacy options even though Cave's input document targets a campaign offer. **Remove this bypass** and test actual distinct current scopes.

Narrative/prose/actions should fit their world; repeated rainy-harbor copy in a sterile laboratory or abstract organism cannot demonstrate atmospheric fitness. Author safe deterministic fiction fixtures: harbor, underground cave, bright clean room, abstract nonhuman consciousness, quiet/intimate domestic state. Do not claim these are live model results.

Add Storybook controls for supported V1 fields; every change must pass through parser/resolver to real component props. If a control tries an unsupported value, developer-visible diagnostic should explain fallback. Include normal, corrupt, missing, stale and preference overrides. Screenshot may prove beauty, but browser assertions must prove commands, focus, contrast and overflow.

## Normal/negative acceptance suite

- Dark→light→dark presets during a mounted session: chrome, stage, options and technical status remain readable; no stale background from prior scene.
- Harbor pale gradient: visible navigation/fixture label even at bright part of gradient; no unstyled dark tail of background below content.
- Sterile light stage: both default option labels/support and hover/focus/disabled readable; no dark-on-dark text.
- Cave with optional decorative art: no horizontal scrollbar; compact art does not push both intentions multiple screens away; missing/failing art does not leave a tall blank figure.
- Full scene + zero art: coherent no-image visual hierarchy, same actions.
- Distinct world scenarios: actual heading/prose/action semantics match environment; abstract worlds don't imply human inventory or map.
- Input field coverage: a simple table from accepted field → renderer output/intentional fallback → positive/negative browser fixture; no silent inert fields.
- No post-parser resolved-data injection in main Storybook proof; both legacy and current nested campaign paths verified with exact matching and stale negative.
- 320px, 375px, 1440px, 200/400% zoom, reduced-motion, forced/high-contrast, keyboard focus and computed contrast browser proof, not only happy-dom Vitest.
- No package/framework swap, Query/data/commands changes, paid provider, engine endpoint, live snapshot fields or storage changes.

## Proof semantics and sign-off

A green `test:fast` suite is expected but **insufficient** for rendered UX. Review screenshot deltas and the actual Storybook accessibility pane; enforce any resulting violations, not merely note badge counts. Cursor must return **which browser/runtime tests ran**, computed contrast of representative composited surfaces, horizontal scroll measurements, media crop examples and actual screenshots.

**Gate to engine design:** Once PX05–PX07 are reviewed and accepted, freeze an **advertised frontend presentation capability manifest** (with versioning and supported bounds). Then design public authoritative data: what is published with a passage/offer, asset provenance/rights, generated image latency, LLM cost limits, rendering on stale clients and revision/identity semantics. That engine/public-contract work is separate and requires owner decision.

## Source anchors and execution

Start with [Play source map](../../apps/web/src/features/play/README.md) and matching PX packet only. Main source reviewed 2026-11-13: `presentation/resolve.ts`, `contrast.ts`, `parse.ts`, `types.ts`, `fixtures.ts`, `ui/story-frame.tsx`, `story-frame.css`, `ui/intention-choice.tsx`, `ui/scene-media.tsx`, and `src/stories/presentation.stories.tsx`.

**Documentation-only branch convention:** this program and Change dossiers being committed does not select or authorize code. Keep `Current change: none` in `docs/changes/README.md`. Cursor should be explicitly instructed to select/execute one PX packet later, against revalidated current source; no immediate implementation.

## What not to confuse with this initiative

UX work may eventually decide different narrative layouts, stronger visual identity, and authored composition modes. PX05–PX07 fix the **renderer architecture's correctness and proof**, not every imaginable future art direction. Don't let a purple cave fixture create a new requirement for arbitrary free-form CSS or a dynamic UI layout compiler.
