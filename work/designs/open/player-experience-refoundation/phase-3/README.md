# Phase 3 | Real design-system foundation and expressively directed book

**State:** owner-requested design work and **prepared** implementation program, 2026-11-17. Phase 2's book-only POC is in source; final visual polish and Storyteller creative production are not. This page is the **initiative navigation and change sequencing**, not a second product/technical authority. [Source audit](../phase-2/16-POST-BOOK-UI-AND-DIRECTION-GAP-AUDIT.md).

## Design authority first

1. [01 · Foundation and component contracts](01-DESIGN-FOUNDATION-AND-COMPONENT-CONTRACTS.md) explains semantic design foundations and which actual components deserve shared contracts.
2. [02 · Scene direction author/publisher quality gates](02-ART-DIRECTION-PRODUCER-AND-QUALITY-GATES.md) separates the existing optional read bridge from the missing production writer.
3. [03 · Library and motion decision](03-LIBRARY-AND-MOTION-EVALUATION.md) compares unstyled primitives, native controls, CSS motion, optional Motion and page-turn engines. None is unconditionally installed.

**Canonical product:** [design system and expressive worlds](../../../../../docs/product/experience/design-system-and-expression.md).
**Canonical client architecture:** [semantic foundation](../../../../../docs/technical/client/semantic-design-foundation.md) and [conditional appearance producer](../../../../../docs/technical/client/scene-direction-production.md). Source truth/status still belongs to [STATUS](../../../../../STATUS.md).

## Prepared Change sequence (no automatic selection)

| Order | Change | Status | Dependency | Bounded code outcome |
| --- | --- | --- | --- | --- |
| 1 | [UI01](../../../../changes/archive/2026-11/other/2026-11-17--ui01-semantic-tokens/CHANGE.md) | Done | none | Semantic design tokens and baseline migration |
| 2 | [UI02](../../../../changes/archive/2026-11/other/2026-11-17--ui02-accessible-primitives/CHANGE.md) | Done | UI01 | Small tested Action/Notice primitives |
| 3 | [UI03](../../../../changes/open/2026-11-17--ui03-book-composition/CHANGE.md) | Ready after UI02 | UI02 | Book-specific composition boundaries |
| 4 | [UI04](../../../../changes/open/2026-11-17--ui04-book-contents-navigation/CHANGE.md) | Ready after UI03 | UI03 | Low-chrome accessible book contents |
| 5 | [UI05](../../../../changes/open/2026-11-17--ui05-stories-library-unification/CHANGE.md) | Ready after UI02 | UI02 | Stories style/use shared controls |
| 6 | [UI06](../../../../changes/open/2026-11-17--ui06-entry-create-unification/CHANGE.md) | Ready after UI05 | UI05 | Entry/Create shared visual foundation |
| 7 | [UI07](../../../../changes/open/2026-11-17--ui07-design-system-evidence/CHANGE.md) | Ready after UI03/UI05/UI06 | UI03+UI05+UI06 | Storybook and visual/a11y evidence |
| 8 | [UI08](../../../../changes/open/2026-11-17--ui08-motion-language/CHANGE.md) | Conditional | UI07 review | Meaningful restrained motion; no gratuitous package |
| 9 | [DIR01](../../../../changes/open/2026-11-17--dir01-appearance-roundtrip-proof/CHANGE.md) | Ready after UI03 | UI03 | Test the existing saved appearance read path end to end |
| 10 | [DIR02](../../../../changes/open/2026-11-17--dir02-validated-publication-attachment/CHANGE.md) | Conditional | DIR01 + exact publisher audit | Source-bound deterministic appearance publication |
| 11 | [DIR03](../../../../changes/open/2026-11-17--dir03-storyteller-art-direction-author/CHANGE.md) | Blocked / conditional | DIR02 + spend/quality acceptance | Optional Storyteller-proposed V1 direction |

**Cursor execution policy:** one packet at a time, refreshed HEAD/dirty state and `pnpm repo:brief --json`; all follow the Change standard and each has a negative test. A “Ready after...” packet is still **not current**. UI01 and UI02 are archived. UI03 is not selected by that fact. The queue remains `Current change: none` until the owner selects one.

**Critical stop points:** UI07 is a design quality checkpoint, not permission to certify the final visual style. DIR01 is deterministic no-provider proof. DIR02 must first prove the actual source/settlement write seam. DIR03 **cannot** run live creative generation without a separate spend gate and measured story-quality baseline. An audit returning “not safely feasible” can be a valid finding but cannot be falsely closed as a code implementation; update packet status accordingly.

## Explicitly out of this wave

No named cave/space/microbe theme presets, raw generated HTML/CSS, automatic generated illustrations, user-arbitrary historical forks, book page-curl dependency, V2 rich narrative score, full Journal random seek, large App-wide style replacement, final approved high-fidelity skins, or giant generic component framework.

**Closing criterion:** platform controls are coherent, reusable and testable; the living book is built from stable semantically owned components; the current V1 appearance read path is demonstrably correct; automatic Storyteller art direction is only adopted if the source, validation, cost and creative-quality gates pass. Otherwise keep the useful foundation and explicitly park the expensive extension.