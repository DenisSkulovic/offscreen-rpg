# Phase 2 | Browser render QA, defects, gaps and the next approval gate

**Status:** open design evidence. Verified only against locally authored static design lab, not the production Next.js frontend.

## Reproducible artifact

- `design-lab.html`: single self-contained HTML/CSS/JS prototype, same fixture text, switchable visual direction and scenario. No network requests, fonts, libraries, image URLs, local storage, permission or model calls.
- Optional local `capture.py`: creates static screenshots with Playwright/Chromium by loading HTML using `page.set_content`, clicking direction/state controls, and saving output PNGs.
- Optional local `qa.py`: checks horizontal overflow and expected choice count for 84 combinations (3 concept × 4 viewport widths × 7 state variants).
- Original SVG compositions are embedded in the HTML. They are stylized concept imagery, not licensed competitor assets or source-backed gameplay illustration.

## What passed (17 November 2026)

| Check | Dimensions / scope | Result | Limits |
| --- | --- | --- | --- |
| Desktop visual captures | 3 directions × Now / Waiting / Journal / Reader / Abstract / Quiet / Recovery at 1440×900 | 21 captures inspected via contact sheet; full images available in review package | Artistic review remains author-only and synthetic |
| Mobile visual captures | 3 directions × Now / Journal / Reader / Abstract at 375×812 | 12 captures; focused Now inspection on all 3 | Other mobile states rendered in QA but not exported |
| Overflow sanity | 3 × 4 viewport widths (320, 375, 768, 1440) × 7 modes | 84 / 84 with no document horizontal overflow | Does not certify no internal component collision or localization safety |
| Fixture selection | Now and Abstract should offer three choices; Quiet zero | Expected options present in tested viewport cases | No real command semantics, costs, admission, server data or interaction limits |
| Click-through smoke | Choice → simulation notice; Journal → original passage; Reader → Now | Worked locally | Does not verify real browser History/deep-link acceptance or focus semantics |
| Reduced motion baseline | CSS `prefers-reduced-motion` suppression present | Implementation rule visible in source | Did not inspect actual OS reduced-motion rendering or auditory feedback |

## Defects found during review

1. **Quiet scene width collapse:** `.scene-quiet` was accidentally used as a generic caption selector and applied `max-width:450px` to a whole scene. This created a broken thin column on Stage and Field. Fixed by renaming that style to `.quiet-caption`, which is not used as a scene class.
2. **Stage header contrast:** inactive navigation was inheriting a default dark text color on a dark surface. Fixed by explicitly inheriting color for header buttons and utility.
3. **Phone headline density:** Field Edition headline consumed too much width near 320–375px. Changed mobile size to a fluid clamp; visible critique still required.

The fact that these slipped into first-pass CSS demonstrates why this program requires actual rendered coverage beyond a single hero screenshot.

## Unproven and known risks

- Extremely long narrative prose, dozens of decisions, and paragraphs in non-Latin scripts are **not** included in the 84 basic frames.
- Scene status panels use some absolute positioning; longer text could overlap under nonstandard zoom or localization.
- Environmental illustration contrast and foreground color need measured WCAG checks and screen-reader/keyboard audits.
- The prototype's navigation changes content with JavaScript and query parameters but does not implement full accessible focus restoration and history semantics.
- The journal previews three source fixtures only. No 2,000-passage seeking, search, bookmarks or source-link authorization exists. This is intentionally unimplemented.
- The Stage has image-dependence and costly real-art implications; the vector study understates the work required of an illustrator or real dynamic scene pipeline.
- Full production storyboard motion is specified in the motion document, but not built. No package adoption is justified by these static frames.
- No real users, no independent UX critic, no actual app screenshot baseline and no production cross-browser/mobile-device check.

## Revisions required before Phase 2 closes

1. Review three actual compositions with the owner, *especially* the story prose and choice hierarchy, and allow outright rejection.
2. Choose which design qualities to retain for a second-round coherent identity, not a color-palette vote.
3. Create at least two new variations of the **leading direction** including no-art active scenes and a deliberately calm quiet mode.
4. Test long prose, 1/20/2,000 Journal scale, six actual options, broken image, delayed history, offline pending command, text-size increase and long Cyrillic/RTL examples.
5. Design motion keyframes with explicit triggers, cancellation, reduced-motion fallbacks and source authority, then inspect rendered sequence rather than just documenting durations.
6. Only then consider brand type/logo directions, component extraction, design tokens and high-fidelity landing/Stories/Create screens; they should be designed from approved visual grammar.
7. Once the product owner selects a visual direction, reconcile only accepted decisions into the canonical docs. Still no Cursor packet until the full design system and target screens reach their respective gates.

## Approval status

No art direction approved. No design system finalized. No frontend or Storyteller code changed. No `work/changes` created. The Phase 1 experience architecture remains an open reviewable design too, though these exploratory comparisons do not alter it.
