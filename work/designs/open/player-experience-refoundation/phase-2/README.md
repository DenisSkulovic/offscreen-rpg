# Phase 2 | Visual-direction competition

**Status:** OPEN DESIGN, visual concepts not selected or ratified. **Date:** 2026-11-17. **Implementation permission:** none.

## View first, read second

Open [the standalone visual laboratory](design-lab.html) in a browser. Select among **A / Living Codex**, **B / Responsive Stage**, and **C / Field Edition**, then switch identical design fixtures: Now, Waiting, Journal, Reader, Abstract, Quiet, Recovery. The prototype is dependency-free HTML/CSS/JS. It is **not** production React, a gameplay feature, a real Storyteller pipeline or an implementation request.

All UI prose for its primary passages comes from [Phase 1's fixed specimens](../phase-1/06-FIXED-DESIGN-SPECIMENS.md). Small choice clarifiers and technical labels are explanatory UI-only fixture copy. Original vector artwork is illustrative, not retained historical scene art or real Storyteller output.

## Documents

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

**Do not select a winner yet.** The current leading **platform-identity hypothesis** is C's portable, consistent editorial grammar, but its headline weight and red accent can overpower contemplative scenes. B yields the richest Now atmosphere but lacks a durable visual identity in Journal and can be overly image-dependent. A has the most naturally cohesive reader but looks too locked to manuscript/historical fiction. The next iteration should test a more deliberate *shared* typographic grid across a restrained Stage and excellent Journal, rather than simply glue three different skins together.

The user (product owner) has not reviewed or accepted these alternatives. No production code should be changed from this directory.

## Source and lifecycle

The accepted primary navigation is already [Now / Journal](../../../../../docs/product/experience/navigation-and-stories.md), and the existing product rules reject mandatory chapters, maps or physical bodies. The [Phase 1 architecture](../phase-1/README.md) and [design process](../DESIGN-PROCESS.md) define promotion gates. Experimental renderings remain under `work/designs/open/`; do not clone these files into canonical product/technical specs until a specific reviewed decision is ratified. There are **no `work/changes/` packets** here.
