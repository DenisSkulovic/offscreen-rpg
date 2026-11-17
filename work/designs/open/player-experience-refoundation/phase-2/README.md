# Phase 2 | Visual-direction competition

**Status:** OPEN DESIGN. Three earlier directions, a newer Living Journal thesis and a rendered adaptive-leaf laboratory. No visual or technical contract ratified. **Date:** 2026-11-17. **Implementation permission:** none.

## View first, read second

Open [the standalone visual laboratory](design-lab.html) in a browser. Select among **A / Living Codex**, **B / Responsive Stage**, and **C / Field Edition**, then switch identical design fixtures: Now, Waiting, Journal, Reader, Abstract, Quiet, Recovery. The prototype is dependency-free HTML/CSS/JS. It is **not** production React, a gameplay feature, a real Storyteller pipeline or an implementation request.

All UI prose for its primary passages comes from [Phase 1's fixed specimens](../phase-1/06-FIXED-DESIGN-SPECIMENS.md). Small choice clarifiers and technical labels are explanatory UI-only fixture copy. Original vector artwork is illustrative, not retained historical scene art or real Storyteller output.

## New integrative direction: Living Journal (owner hypothesis, November 17)

Following review of A/B/C, the owner proposed **one recurring reading leaf whose material, surrounding atmosphere, local typography, art slots and bounded decorations are Storyteller-directed**, rather than any fixed medieval/cave/space skins. The leaf is conceptually a page but not necessarily physical paper. The renderer, source text and safety controls remain stable. **This direction now has a [separate inspectable adaptive-leaf visual lab](adaptive-leaf-lab/README.md), still not ratified.**

Read in order:

- [05 · Living Journal art-direction thesis](05-LIVING-JOURNAL-THESIS.md) for the invariant leaf, adaptive layers, and why a journal metaphor does not require a diary-writing character.
- [06 · Rich narrative score](06-RICH-NARRATIVE-SCORE.md) for source-faithful expressive text without model-authored HTML, Markdown as a limited supplement, and a bounded optional score with exact quote anchors.
- [07 · History, finished volumes and forks](07-EDITION-HISTORY-AND-FORKS.md) for retained page appearance, explicit end state, independent lineage and the hard current limitation on arbitrary historical forking.
- [08 · Adaptive-page review gates](08-ADAPTIVE-PAGE-REVIEW-GATES.md) for visual specimens, art-direction falsifiers, accessibility/cost tests and the decisions still awaiting owner approval.
- [10 · Reader's book and adaptive story world](10-READER-BOOK-AND-STORY-WORLD.md): **latest owner clarification**, correcting an earlier over-expansion of the page-material thesis; the book remains a consistent extradiegetic object while the world/lighting and optional source artwork change. Tests single leaf vs two-page spread without mandatory illustration.
- [09 · Book engine dependency boundary](09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md) for the page-turn library risk assessment, internal shell recommendation, logical vs physical pagination, and engine-replacement proof.

The [Adaptive Leaf design laboratory](adaptive-leaf-lab/README.md) offers one self-contained renderer and four bounded fixture documents, plus rich-mark/figure toggles, Now/Journal/Reader/ongoing/ended/branch examples, qualitative critique and Chromium evidence. Its [interactive HTML](adaptive-leaf-lab/index.html) is **not production React or a functioning Storyteller**.

These V2 proposals **extend beyond the already selected V1 presentation runtime**. Their commit here does not override its authority, edit the passage schema or authorize an implementation Change.

## Earlier Phase 2 competition documents

1. [Visual research board](01-REFERENCE-STUDY.md): 12 annotated references and explicit constraints on borrowing.
2. [Concept review](02-CONCEPT-REVIEW.md): composition systems, strengths, disconfirming cases, preliminary ranking and revision ideas.
3. [Motion and adaptive stage](03-MOTION-AND-PRESENTATION.md): cinematic transitions, state language, accessible fallback and source authority boundary.
4. [Render QA and design gates](04-RENDER-QA-AND-NEXT-GATES.md): precisely what was rendered/tested and what remains unverified.

## What this phase actually produced

- Three original, compositionally different **desktop and responsive** visual systems of the same current scene.
- For each: choices, waiting, three-item Journal, source passage reader, abstract-world scene, quiet scene and recovery state, with functional design-lab navigation.
- Browser captures for all seven modes at 1440px and four principal modes at 375px (the full screenshot package is a separate review artifact, not required for running the HTML prototype).
- Automated browser sanity pass at widths 320/375/768/1440 for 3 directions × 7 states = **84 cases**. Zero horizontal overflow findings after correcting the quiet-scene selector collision. A click-through smoke test verified a choice opens a nonfunctional-prototype notice, Journal opens source reader, and Back to Now returns to the present specimen.

## What these prototypes do not prove

- No user interviews, professional art-direction peer review or Figma handoff.
- No long-prose, localization, screen-reader, real keyboard journey, contrast measurement, speed, memory, low-end phone or GPU stress certification.
- No production-quality environmental artwork: the illustrations are original lightweight **vector studies** designed to keep comparison consistent. A human illustrator/art director would radically improve them if the direction were selected.
- No functioning scene history search/index, bookmarks, user persistence, Storyteller-provided appearance, motion engine or historical Replay.
- No actual domain/route designs, Story shelf, create flow, landing hero or marketing brand approval; these follow experience-level visual direction review.
- Design-lab controls are *not* part of game chrome; screenshots deliberately retain them for provenance.
- Screenshot/render checks are not proof of product quality or authoring correctness.

## Preliminary finding

**No art-direction winner has been selected.** The original C platform-identity hypothesis remains a useful historical assessment of those three prototypes, but the newly proposed **adaptive Living Journal** is the current leading *unrendered* synthesis. It keeps editorial leaf continuity, borrows atmosphere from Stage and navigational discipline from Field without adopting any genre theme. Test it rather than rubber-stamping it. All earlier A/B/C visual critiques and design-lab artifacts remain available for comparison.

The user (product owner) has not reviewed or accepted these alternatives. No production code should be changed from this directory.

## Source and lifecycle

The accepted primary navigation is already [Now / Journal](../../../../../docs/product/experience/navigation-and-stories.md), and the existing product rules reject mandatory chapters, maps or physical bodies. The [Phase 1 architecture](../phase-1/README.md) and [design process](../DESIGN-PROCESS.md) define promotion gates. Experimental renderings remain under `work/designs/open/`; do not clone these files into canonical product/technical specs until a specific reviewed decision is ratified. There are **no `work/changes/` packets** here.
