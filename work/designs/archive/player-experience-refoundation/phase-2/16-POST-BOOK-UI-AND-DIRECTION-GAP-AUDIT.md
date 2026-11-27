# Living Book POC | Source audit and missing design-system / Storyteller-direction work

**State:** SOURCE-INSPECTED DESIGN AUDIT (2026-11-17); not a completed human visual review, code QA signoff, selected design system, or implementation Change. **Source basis:** GitHub `main@39b57514ba168e81bf7e74f3dc64eeae58576389` for BOOK01/BOOK02 code, then `main@d985ef305c1b8847ccca45e15916aef4942e19cb` after unrelated HAR10 cleanup (no Play paths in intervening diff). Do not infer a live browser run or fresh `pnpm` execution from this audit.

**Question:** Did BOOK01/BOOK02 deliver a complete reusable design system and Storyteller-directed visual authorship, or only the book restructuring? **Conclusion:** the latter, with a useful existing bounded presentation infrastructure underneath. This is deliberate POC scope, not proof the full vision was implemented.

## 1. What BOOK01/BOOK02 actually delivered

| Area | Source evidence | Assessment |
| --- | --- | --- |
| Player book | `apps/web/src/features/play/ui/story-frame.tsx`, `story-frame.css` | One centered **continuous flowing** paper leaf, subtle static book-edge shadow, top **in-book** Stories/Now/Journal text navigation, no fixed sidebar/inspector, no physical spread or curl |
| Now/Journal modes | `StoryFrame` reads `window.location.hash` via `useSyncExternalStore`; toggles `hidden`; `PlayScene` still owns current Snapshot and live action handlers | Basic navigation is real. Final unobtrusive contents/gesture/reader geometry is still not designed |
| Historical reader | `apps/web/src/features/play/history.tsx`: read-only `useInfiniteQuery`, source-only excerpts, selected exact passage, loaded-window previous/next, `Load older` | Working source code, still not advanced long-history reader, searchable index, source gists or fork UI |
| Regression coverage | `story-frame.test.tsx`, `view.test.tsx`, `history.test.tsx` and Storybook fixtures | Cursor records `pnpm test:fast` 205 passing, and web typecheck; source has matching tests. These are **claimed executor receipts**, not independently rerun here |
| Lifecycle | BOOK01 and BOOK02 still under `work/changes/open`, with latest packet marked Ready/selected rather than Done/archive | Code is pushed but Change closeout needs reconciliation and human POC review. Do not call *the full Change lifecycle* Done merely because code exists |
| Physical reading | No fitted-leaf compositor, spread/page-turn library, deep source anchors | Book POC is a paper **surface**, not yet a simulated turnable book |

## 2. Design-system audit: reusable behavior exists, unified visual foundation does not

**Existing useful primitives:** `StoryFrame`, `NarrativePassage`, `IntentionChoice`, `SceneMedia`, `CampaignOfferPanel`, `CampaignStatus`, `StoryHistoryView`, and Storybook with a11y/MSW fixtures. Those are feature-oriented components, not a formal product-wide design system. Preserve behavior and source ownership instead of throwing them away.

**Observed gaps:**
- No `apps/web/src/components/`, `apps/web/src/shared/ui/`, `packages/ui/` or `apps/web/src/styles/` design-system home in current GitHub directory listings. This does **not** prove there are no useful primitives elsewhere, only that no shared, curated visual library was found at those expected routes.
- `apps/web/app/style.css` still defines global typography/button styling and page-level rules. `apps/web/src/features/stories/stories-library.css` defines separate `--sl-*` tokens. Play's `story-frame.css` defines its own `--sf-*` family, with local paper overrides in `.story-frame__book`. There is no documented, centrally owned semantic token scale across Welcome/Stories/Book/Forms.
- Book HTML remains one `StoryFrame` with source/choice/Journaling concerns as children. There are no independently specified `BookSurface`, `BookNavigation`, `NarrativeFlow`, `DecisionFolio`, `DocumentInset`, `IllustrationFolio`, `SystemNotice`, etc. APIs or a component matrix.
- Style rules are often **selector/cascade-local**: e.g. `story-frame__book` resets paper ink, while scene/choice presentation and campaign/status markup still use `--sf-*` values. A real dynamic direction test across every option/status type is required before claiming accessibility and coherent colors.
- Storybook provides an effective **component test bench**, but it is not itself a style vocabulary, Figma-equivalent accepted art direction, reviewed spacing/typography scale, cross-space component variants or component governance.

**Design recommendation:** create a **semantic platform design foundation** before the next broad UI overhaul. It should own spacing/rhythm, text scales, radii/borders, elevation/material, interaction/focus, motion rules, semantic roles (reader ink, page paper, stage atmosphere, action, system status), responsive composition, and accessibility fallback. Do not demand a giant prefab component catalogue, CSS-in-JS replatform or new UI library. Define primitives by the product experiences that actually consume them.

## 3. Storyteller style-controllability: distinguish 3 different links

| Link | Current code | Reality |
| --- | --- | --- |
| **A. Renderer language** | `apps/web/src/features/play/presentation/{types,parse,resolve,contrast}.ts` | **Exists**: bounded `ScenePresentationV1` supports safe palette/backdrop gradients, atmosphere/lighting/vignette, story identity (limited typography/texture), stage, motion, optional approved asset placements and exact-target choice treatment; rejects invalid CSS/unknown structure |
| **B. Saved current-scene bridge** | `packages/contracts/src/stories.ts`: `current.appearance` optional; `packages/application/src/stories/reads.ts` validates a saved appearance with story/passage identity; `apps/web/src/features/play/model/live-presentation.ts` resolves it; `PlayScene` passes it to `StoryFrame` | **Exists as an optional public read path**. When matching data is stored, live Play can apply it. Historical `StoryHistory` items do **not** carry appearance. Some older technical docs claiming the public bridge is wholly future work are stale and should be corrected |
| **C. Creative author / publication** | Current Storyteller target and generation/publication documents; checked application story start/continuation/resolution/persistence paths do not show the visual-score producer in those owners | **Not established as live Storyteller behavior**. No verified automatic Storyteller-generated art direction, complete persistence guarantees, generational versioning, late-art attachment, or human quality evaluation. An optional read path is not a producer |

**Book-specific nuance:** BOOK01 deliberately gives the paper surface stable ink/material and applies dynamic V1 background/stage variables around it. It does not implement the richer authored prose cues from [06 · Rich Narrative Score](06-RICH-NARRATIVE-SCORE.md), narrative illustration generation, or historic material appearance. The future direction is **same recognizable reader's book + varying scene behind/reflected across it + sparsely accented original source text**, not preset `spaceBook`/`caveBook` components.

**Stale spec notice:** the original [presentation-runtime](../../../../../docs/technical/client/presentation-runtime.md) described the whole *public projection bridge* as future. Current source has `current.appearance` optional, source-matching read projection and front-end resolver. Distinguish **read bridge exists** from **Storyteller authoring and historical persistence not established**. Correct the narrow stale clause, do not reinterpret V1 as a completed end-to-end production pipeline.

## 4. How to progress without rebuilding the slop

**Recommended next order (design first):**

1. **DS-FOUNDATION product/UI architecture**: page/world split, platform-owned semantic token matrix and reference component specimens. Decide how the stable book and global welcome/stories/create share a visual identity, how narrative reading differs from system controls, and what is intentionally *not* a shared component. Deliver owner-reviewable design samples in Storybook or a design lab.
2. **DS-PRIMITIVES component contracts**: small audited set (book surface/navigation/folio flow, narrative passage, exact-source media slot, contextual choice, non-fiction system notice, lightweight sheet/menu) with variant rules, a11y/focus/zoom, and responsive/no-image/no-effects behavior. Retain current behavioral owners; do not rewrite server/action code.
3. **VISUAL-DIRECTION semantic authoring target**: trace exact generation/publication location that could provide V1 style direction, define which work/prompt/controller authors it and when; stable story identity → scene atmosphere → optional sparse per-source marks; test generated vs hand-authored quality/cost and continuity with unchanged story truth. Resist arbitrary HTML/CSS, fake setting-specific theme names and full-scene repaint every turn.
4. **NARRATIVE-SCORE later V2 design**: exact-source quoted spans and a limited expressive grammar after V1 direction is measured. Story source remains authoritative. Historical appearance retention needs a separate read model and upgrade strategy.
5. **Book sophistication**: physically turning leaves, responsive compositor, historic source index/bookmarks and optional generated illustrations are independent later Changes, never prerequisites for a readable POC.

**Sequence gate:** explicit product/design review → accepted docs/product behavior and docs/technical renderer semantics → bounded independently testable `work/changes/` packets → Cursor implementation → source/test/human proof + reconciliation. Merely committing this audit cannot authorize DS/VISUAL code.

## 5. Provisional acceptance tests for the upcoming design phase

- Apply **one** saved/correctly validated V1 scene appearance to the same unchanged prose under cave/ship/abstract/no-direction fixtures. Only world atmosphere and bounded literary treatments vary; the book identity and action authority remain stable.
- Exercise light/dark, forced-colors, reduced motion, font enlargement, mobile, keyboard navigation and six-choice current offer; no mode may hide the option set, silently invert system status or wash out ink.
- Render the same semantic component in Now, Journal and Stories and prove the platform token/variant split explains differences without duplicating feature CSS.
- Inspect actual Storyteller producer/cost/settlement before designing a paid art-direction pass. A runtime-only fixture is **not** proof of model authoring or persistence.
- Demonstrate the new tokens/components **reduce** duplicated CSS/class complexity and make the existing Book visually coherent. No invented component inventory just to reach an arbitrary component count.
- Carry a source-receipt table of contract vs actual code after BOOK01/02 closeout, including current selection and human view acceptance.

**Verdict:** BOOK01/BOOK02 are valuable structural improvements but only a **P0 book frame**. The high-leverage next program is a **real platform design system coupled to a bounded expressive Storyteller presentation language**, with the artistic producer as a separate data-publication concern. Do not call the two BOOK Changes a finished UI system.
