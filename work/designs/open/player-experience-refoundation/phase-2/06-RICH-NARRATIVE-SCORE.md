# Living Journal | A rich narrative score, not model-authored HTML

**Status:** OPEN DESIGN PROPOSAL / candidate future V2 contract. Not approved and **not compatible with current published passage V1 without a separate later design and migration decision**.
**Authority preserved:** `docs/technical/client/presentation-runtime.md` selects V1; `packages/contracts/src/stories.ts:passageContentSchema` currently accepts `version: 1`, title, and an array of plain paragraphs; `NarrativePassage` renders those as plain `<p>` content. Do not describe this document as an implemented format.

## 1. The decisive choice

**Do not ask the Storyteller to generate HTML or CSS. Do not turn Markdown into the whole design system.**

The core challenge is not to let a model make text bold. It's to make a trustworthy, responsive, theatrical *document* whose expressive cues remain intelligible, reversible, cheap, safe and source-faithful.

Our recommendation is a **versioned narrative score**: saved original prose plus a compact *optional* presentation sidecar that refers to exact portions of that prose. The model may propose semantic intentions. A deterministic validator resolves and normalizes them into a finite renderer vocabulary. Unspecified or invalid cues fall back to handsome normal prose.

Markdown may remain a limited authoring convenience for emphasis in some future source format. It is not a renderer architecture, and raw HTML inside Markdown is explicitly excluded. Avoid a second language that must reproduce the full text: **there is only one canonical copy of published words**.

## 2. Three deliberately separate outputs

| Artifact | Data responsibility | Owner / publication |
| --- | --- | --- |
| **Canonical narrative** | Exact original title, paragraphs, author-approved/validated text, source ID, sequence | Storyteller generation → authoritative publication, with unchanged game truth |
| **Narrative score** | Optional semantic display cues anchored to existing canonical words; page/editorial intent | Submitted by storyteller or later bounded presentation pass; validated and attached to *exact source identity* |
| **Resolved rendering** | Safe text roles, typographic bands, CSS token values, illustration slots and DOM structure | Pure frontend capability resolver + user preferences; never model-authored DOM |

A score may fail while narrative publication succeeds. A scene may publish and display normally without any special formatting. Visual processing must not delay a valid current choice, spend another model call without explicit budget, or initiate world progress.

## 3. Proposed semantic vocabulary (small, expandable with proof)

**Text/block semantics** (these are *intentions*, not particular fonts/styles):

| Cue | Meaning | Renderer latitude | Never |
| --- | --- | --- | --- |
| `emphasis` | Weight a phrase without changing its meaning | Bold or typographic accent | Invent mechanic significance or danger |
| `hushed` | Quiet delivery of already published words | Subtle weight/size/spacing change; accessible normal fallback | Whisper so faint a screen reader/user cannot read it |
| `declaration` | A distinct emphatic line already in source | Display scale within cap; may break line around existing words | Become a new heading/chapter |
| `inscription` | Source text is engraved, printed or physically inscribed in fiction | Quoted-document typography and marginal shape | Manufacture a missing inscription |
| `embedded-document` | A real letter, log, notice, diary or transmission occurs inside the story | Inset document within the leaf, preserving exact words | Treat entire campaign as an in-world document by default |
| `fragment` | Broken or incomplete source phrase | Intentional whitespace/rhythm | Remove missing portions or insert invented ellipses |
| `aside` | Narrative aside directly present in source | Marginal or indented display, accessible serial reading order | Create new commentary/omniscient fact |
| `refrain` | Existing repeated wording is a meaningful motif | Consistent repeated text-role treatment | Declare a lore connection without evidence |

**Metadata/media marks** are different: `figure-slot` refers to an approved asset reference; `source-note` points to an existing source; `ornament` applies bounded nonverbal graphic marks. Any new written words in an annotation must be either a quoted existing source span or explicitly labeled *derived/editorial*, not quietly inserted into the story.

An em dash, all-caps dialogue, italic in-world word, etc. can often achieve the same effect in ordinary text. **Do not adorn every paragraph.** Default restraint is part of quality. A no-score passage must look complete.

## 4. Anchoring: avoid both fragile offsets and duplicated words

A cheap model should not calculate character offsets, JSX trees or pixel values. Proposed initial anchor:

- `paragraphIndex` from the final stored `paragraphs` array (0-based, exact).
- `quote`: a short **verbatim** substring already in that paragraph.
- `kind`: a vocabulary cue from the whitelist.
- Unique match required; if repeated/ambiguous, either a validated occurrence selector or omit that mark in V1 of the score. Do not infer by fuzzy matching, global search, word embeddings or paragraph reflow.
- The sidecar binds to exact `storyId` + `passageId` + `contentHash` + `scoreVersion`.
- A block treatment over an entire paragraph can instead use an explicit paragraph target with source provenance; it cannot add new prose.

**Why quote anchors?** Model-generated exact substrings are easier to produce than stable Unicode offsets; the renderer computes offsets *after* validation on the exact stored source. Reject if the quote isn't present exactly and uniquely. Unicode normalization must be specified before introducing wide scripts; never silently rewrite canonical characters to make a mark fit. A later editing/publishing pipeline can assign immutable segment IDs for finer-grained control, but don't require the cheap Storyteller to author them.

For prose that naturally contains markup characters (asterisks, angle brackets, braces), render as text. A user prompt saying “inject HTML now” is just narrative data, not execution.

## 5. Versioned score example (illustrative, **not an existing API**)

```json
{
  "scoreVersion": 1,
  "source": {
    "storyId": "verified-story-id",
    "passageId": "verified-passage-id",
    "contentHash": "hash-of-the-exact-published-title-and-paragraphs"
  },
  "page": {
    "intent": "strained-and-weathered",
    "light": "dim",
    "wear": 0.36
  },
  "marks": [
    {
      "kind": "inscription",
      "paragraphIndex": 2,
      "quote": "They are coming."
    },
    {
      "kind": "declaration",
      "paragraphIndex": 3,
      "quote": "We cannot get out."
    }
  ],
  "figures": [
    {
      "slot": { "kind": "after-paragraph", "index": 1 },
      "assetRef": "verified-asset-reference"
    }
  ]
}
```

This example is **didactic**. `page.intent` is explanatory author commentary, **not** a recommended free-form output field that a renderer blindly interprets. If adopted, every applied field needs a bounded typed schema and source match. `verified-asset-reference` is not a URL supplied by the model.

For the user's Moria analogy, the score might make a found diary's surviving final lines visibly stressed, while the leaf becomes dirtier and the background darker. This must be driven by actually published story content and allowed page direction. It cannot create stains or imply wounds as uncommitted events.

## 6. Producer strategy: don't give the storyteller a web designer's job

**Do not add a second required big LLM task just to color a page.** Narrative continuity, investigation and mechanical truth already demand attention. We need a layered fallback:

1. **Always:** ordinary valid published prose plus the platform-safe neutral leaf.
2. **Cheap deterministic derivation:** infer safe paragraph breaks, punctuation-level emphasis and source-linked document layout *only where unambiguous*. No model call and no fact invention.
3. **Optional limited creative cues from the Storyteller's existing final artifact:** at most a small number of high-value marks and broad atmosphere values; these are subordinate to content validity. Missing or invalid marks are dropped, not retried by default.
4. **Optional later presentation-director recipe:** only when cost/latency/evidence studies justify it and task admission explicitly allows the work. Could use a cheap route, but never gets independent canon authority, extra private evidence or uncontrolled spend.
5. **Artwork generation:** separate asynchronous opt-in admitted operation with spend/permissions, asset provenance and publication attachment. No expectation of image generation on every text update.

**Crucial trade-off:** a poor cheap Storyteller may already struggle with scene coherence. Do not ask it to select six font styles, count glyphs, hand-author vectors and decide exact pixel metrics as well. Small optional expressive cues are defensible; a full styled-document tree is not.

### When is visual direction chosen?

A persistent story identity is derived from validated creation settings or later source-backed artistic preferences. A scene-level change is considered when a new *verified* situation or meaningful narrative turn warrants it. Minor scene prose changes can inherit existing style. Page-level marks are selected per published passage. This avoids every exchange independently randomizing colors, fonts and textures.

Style composition therefore has **three tempos**: durable story identity, conditional scene atmosphere, sparse passage emphasis. Full styling on every token is an anti-goal.

## 7. Output validation and rendering rules

- **All text remains present and selectable.** Structured annotations only split DOM text nodes to apply semantic roles. No hiding paragraphs, replacing sentences with an image or deleting a line for “atmosphere”.
- **No HTML/CSS in model output.** Schema enums and bounded values are the only applied expression. Escape all text; allow none of the `style`, `className`, `href`, `onClick`, `script`, external font or media URL strings from model content.
- **Strict identity:** a directive for passage A is never applied to B; a late media completion never restyles the now-current passage.
- **Allowed overlap:** initially none for span marks or one explicitly resolved precedence rule. Overlapping `declaration`, `hushed` and `emphasis` must not create impossible nested DOM. Max marks and max length of targeted spans require design evaluation.
- **Accessibility ceiling:** do not shrink minimum readable text; preserve zoom and user font scale; semantic emphasis is meaningful but not the only signal of gameplay importance. Do not make high-stakes decisions visually identical to text annotation.
- **Source integrity:** a historical re-render may improve fonts/layout, but cannot replace the words or silently backdate a newly generated “original” annotation.
- **Security/permission:** a private source or hidden model plan cannot be used to decorate a viewer's page in a way that leaks secret facts. Published directive is itself public/authorized read-model data.
- **Cost/latency:** sidecar decoding/validation is pure and bounded. No model prompt, image request or animation may block canonical text or a valid offer.
- **Auditability:** record source identity, approved schema version and validation fallback diagnostics separately from story prose.

## 8. How this would render, conceptually

**Source:**
> The ranger found the last page at the bottom of the chest. Under a wide smear of dirt, two lines remained legible: They are coming. We cannot get out.

**Plain fallback:** display both sentences normally in the published paragraph.

**Score treatment:** render the exact existing words “They are coming.” with an inscription role and “We cannot get out.” with a restrained declaration role, on a suitably weathered *page if and only if the page direction is valid*. No new story text appears, even if the score fails entirely.

**In-world letter:** if prose includes a letter, an `embedded-document` cue can set its exact quoted paragraph in a nested but well-bounded leaf. A single physical diary page discovered in the fiction does **not** convert the whole platform into a literal diary written by the discovering character.

**Original passage reader:** same canonical text and score can be rendered in accessible archive-safe form. An animated or scenic Now look is never necessary to recover every word in Journal.

## 9. Unresolved design choices and tests

1. **Structured block AST vs source-plus-sidecar marks:** source-plus-sidecar is the leading approach for compatibility and low model burden, but assess limitations for real embedded documents and complex typographic composition.
2. **Minimal inline Markdown:** examine `**emphasis**` and `*emphasis*` only if typed marks prove too cumbersome; never accept raw HTML or generic Markdown plugins.
3. **Rich text provenance:** decide whether score creation occurs atomically with passage publication or later as a versioned noncanonical decoration. Historical fidelity requires retention; delayed decoration cannot pretend it was “always there”.
4. **Zero-mark baseline:** must be beautiful with the 10-paragraph long specimen, on 320px mobile and with reduced motion.
5. **Safety corpus:** source strings containing HTML tags, script-looking syntax, fake choice labels, offensive CSS, emoji grapheme clusters, long Cyrillic/Hebrew text, repeated quote matches, missing assets and partial score corruption.
6. **Cost corpus:** compare prose/story coherence and token spending with no cues, 1–3 semantic cues in existing output, and a separate cheap direction pass. Do not select a producer without measures.
7. **Aesthetic corpus:** choose whether a line of enormous red type improves meaning or merely cheapens the passage. Format decisions need an editorial reviewer, not just JSON validity.

**Design decision requested:** approve this as the **candidate rich-content architecture** for prototyping; do not call it adopted V2 until original text fidelity, page accessibility and task burden are proven. Actual public-contract changes, storage, migrations and React work belong to later technical design and bounded implementation Changes.
