# Living Journal | Navigation, decision sheets and large-type reading

**Status:** OPEN DESIGN, evidence-backed proposal, **not selected production contract** (2026-11-17). **Implementation authorization:** none.
**Source owners:** [Phase 1 experience](../phase-1/README.md), [fixed narrative specimens](../phase-1/06-FIXED-DESIGN-SPECIMENS.md), [stable book / adaptive world](10-READER-BOOK-AND-STORY-WORLD.md), and [geometry trial](11-BOOK-GEOMETRY-AND-READING-FLOW.md). The selected game/time/choice authority and V1 presentation architecture are unchanged.

## Problem and result

The earlier book-geometry experiment showed one choice on a mobile leaf and two behind the next turn. Grouping options solved partial presentation but introduced a nested scrollbar at 150% text for a long six-option decision. That is **not acceptable**, even when the DOM retains every choice: the player could decide without realizing alternatives exist.

We built [an interactive comparison](book-interaction-lab/README.md) of two credible book interaction policies using the same ten-paragraph Greywater story, the same six offer IDs and one stable book shell. Neither policy uses a world-specific book skin, model-generated markup or a flipbook package.

| Pattern | What it does | What it solves | What remains weak |
| --- | --- | --- | --- |
| **D1: Dedicated decision folio** | Source narration occupies reading leaves. A deliberate next turn leads to one logical folio containing the entire current question and offer set. The folio **extends vertically** when text is enlarged. | All options stay grouped, natural document scrolling, strong book-like threshold; desktop can show final prose opposite the decision | A physically long folio is not compatible with a naïve fixed-height curl. Paragraph-pair scaffolding leaves excessive empty space |
| **D2: Continuous reading** | Full passage followed by current question and options within one vertically extending book plane. A quiet "Read six intentions" link jumps to the actual prompt and moves keyboard focus | Long-form/enlarged reading is reliable; no artificial pagination, no nested choice scroller | Can produce a very tall page and loses some page-turning rhythm; needs better position/index aids |

**Leading, unratified product position:** D1 is worth pursuing as the normal concise/medium scene experience, but D2 must be a fully supported long-reading/accessibility mode, not a broken fallback. Do **not** silently switch modes based on length if it disorients the reader. Test any switch and preserve a semantic source anchor. At 200% type and six options, a dedicated decision folio can be several screen-heights tall. Accept **one natural page scroll**; never require a smaller nested scroll area just to obey a visual page ratio.

## Reader interaction choreography

1. **Open Now.** Present latest committed original prose and genuine current offer/hold. Pending generation does not become an imagined page. Book identity and navigation stay recognizable, scene lighting lives behind/across it.
2. **Read.** Page turns and scroll affect only reader position, never time, dice or Storyteller spend. Prose remains selectable and source linked.
3. **Discover decision.** D1 provides "To six choices" before the decision folio; D2 uses a discreet in-book link that focuses and scrolls to the real question, without an always-on dashboard.
4. **Compare.** All current authorized intents have identical identity/eligibility to server projections, with known supporting costs/risks where genuinely available. A visible count tells the reader that six alternatives exist.
5. **Commit (later).** Only the actual current offer may submit a frozen exactly-once intent. This lab only shows a noncommittal notice on click, no command, time, or payment.
6. **Open contents.** A small book bookmark opens Now/Journal/historical reader choices in a focused dialog; it is not a permanent left sidebar. Native controls and keyboard focus are used.
7. **Journal/reader.** Historical original remains readable without active choices; this lab uses three synthetic index records, **not** actual 2,000-passage search or bookmarks.
8. **Return to Now.** Preserve the live-story reading place as a logical source location and re-fetch current authority in production, not a stale historical offer. The demo sketches location retention only.
9. **Motion reduced or absent.** All reading and decision actions remain possible without page curl, swipe or atmospheric animation.

## Layer boundaries and the geometry risk

A **choice folio is not a new scene, passage, chapter, Storyteller turn, or authorized decision point**. It is an editorial grouping derived from a current published passage and separately verified offer identity. A future active-offer replacement must invalidate stale option callbacks even if the user leaves a folio open. We have **not** tested a live replacement race in the browser yet.

A story bookmark must use exact passage identity and a stable source segment/text anchor, **not physical page number**. Page indices, spread side, and text breaks depend on viewport, font scale, image load and user preferences.

The first lab uses a deliberately **naive two-paragraph-per-leaf splitter**. This tests interaction semantics but is not acceptable production pagination: it can create massive blank space, overflow for a single long paragraph, and fails to balance visually. The D2 continuous leaf can become thousands of pixels tall. **Neither prototype is the final reading compositor.**

## Browser evidence, including failures

The initial 48-combination run (four viewport widths, two story lengths, two patterns and three font scales) found **two 320px, 200%-text heading overflow failures** in D2, and an overly strict historical-title count assertion. The CSS wrapping and assertion were corrected, but the full re-run hit the sandbox time limit. **Do not claim all 48 cells passed.**

After correction, a **targeted 12-cell regression** passed (320/375/1440px × D1/D2 × 100/200% × ten paragraphs/six choices). Each check verified: six unique current choice IDs, no horizontal document/leaf/heading overflow, no nested decision scrollbar, and a rendered decision group. No JavaScript exceptions. **Eight targeted interaction checks passed**: contents opens, Journal opens, historical passage has no live choices, return to Now, ArrowRight on a focused button does not turn, explicit Next turns, jump focuses question, and choice click cannot commit.

These are **automated DOM/geometry smoke tests**, not proof of usable book choreography, WCAG certification or perfect physical page interaction. A 200% mobile decision folio remains extremely long. We have not run screen-reader interviews, actual 400% browser zoom, RTL, touch gestures or live offer updates.

Primary standards consulted: [WCAG 2.2 reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) (includes 320 CSS-pixel equivalent at high zoom), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), and [WAI carousel interaction guidance](https://www.w3.org/WAI/tutorials/carousels/). A paper book animation is not a reason to exempt interactive software from these rules.

## Ranked design decisions, still open

| ID | Decision | Recommendation / evidence still required |
| --- | --- | --- |
| B2-01 | Default decision treatment | Test D1 as default, D2 as intentional long-form/access mode, preserving location |
| B2-02 | Extended decision folio physics | Evaluate an **unfolding sheet or non-curl turn** rather than forcing fixed-height curling |
| B2-03 | Choice discovery | Refine the in-book link/counter so it is obvious but not a permanent dashboard |
| B2-04 | New publication during reading | Test offer replacement, stale options, focus restoration, permission change |
| B2-05 | Book/index navigation | Real history deep links, browser back, keyboard, one-to-two-leaf responsive reflow, source anchor |
| B2-06 | Literary material quality | Proper book art direction, typography, natural reading scale, no empty folios or crude noise |
| B2-07 | Accessibility reality | Human keyboard, screen reader, touch and 400% zoom, multilingual/RTL, source selection |

## How much remains before Cursor?

The architectural *direction* is converging, but production contracts are not complete. To avoid past AI-slop rework, continue in **design-only** order:

1. **Document composition:** decide source block primitives and exact-source rich annotations, safe art placement, layout/reflow, and logical reading anchors on 320px plus 200% font and true browser zoom.
2. **Dynamic interaction:** test active-offer update while inspecting a decision, return after absence, Journal deep links, actual buttons/focus and touch/drag versus text selection.
3. **Art direction/design system:** define genuine book materials, typography, two-leaf geometry, mobile one-leaf, ambient lighting, motion/reduced-motion, and reusable behavior components from reviewed screens.
4. **Canonical acceptance:** explicitly ratify into existing product docs, reconcile V1 technical presentation and Storyteller publication/read models; define historical retention, performance/security, source access.
5. **Implementation Changes:** only then prepare bounded Cursor packets for book shell, reader anchors, current decision placement, Journal source reading, adaptive presentation and optional turn effects, with evidence gates.

**Stop condition:** if a library insists on clipping or hiding valid choices to make a page look physically correct, the book interaction must win and the library must go.