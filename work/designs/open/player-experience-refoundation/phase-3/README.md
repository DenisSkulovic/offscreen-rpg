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
| 3 | [UI03](../../../../changes/archive/2026-11/other/2026-11-17--ui03-book-composition/CHANGE.md) | Done | UI02 | Book-specific composition boundaries |
| 4 | [UI04](../../../../changes/archive/2026-11/other/2026-11-17--ui04-book-contents-navigation/CHANGE.md) | Done | UI03 | Low-chrome accessible book contents |
| 5 | [UI05](../../../../changes/archive/2026-11/other/2026-11-17--ui05-stories-library-unification/CHANGE.md) | Done | UI02 | Stories style/use shared controls |
| 6 | [UI06](../../../../changes/archive/2026-11/other/2026-11-17--ui06-entry-create-unification/CHANGE.md) | Done | UI05 | Entry/Create shared visual foundation |
| 7 | [UI07](../../../../changes/archive/2026-11/other/2026-11-17--ui07-design-system-evidence/CHANGE.md) | Done | UI03+UI05+UI06 | Storybook and visual/a11y evidence |
| 8 | [UI08](../../../../changes/archive/2026-11/other/2026-11-17--ui08-motion-language/CHANGE.md) | Done | UI07 review | Meaningful restrained motion; no gratuitous package |
| 9 | [DIR01](../../../../changes/archive/2026-11/other/2026-11-17--dir01-appearance-roundtrip-proof/CHANGE.md) | Done | UI03 | Test the existing saved appearance read path end to end |
| 10 | [DIR02](../../../../changes/open/2026-11-17--dir02-validated-publication-attachment/CHANGE.md) | Ready | DIR01 + exact publisher audit | Write optional validated appearance in same non-stale passage INSERT; no paid model |
| 11 | [DIR03](../../../../changes/open/2026-11-17--dir03-storyteller-art-direction-author/CHANGE.md) | Ready offline; live gated | DIR02 writer | Optional V1 provider-free author sidecar; paid creative adoption requires later authorization |

**Cursor execution policy:** one packet at a time, refreshed HEAD/dirty state and `pnpm repo:brief --json`; all follow the Change standard and each has a negative test. A “Ready after...” packet is still **not current**. UI01 through UI08 and DIR01 are archived. DIR02 is blocked: the publication insert does not write appearance. DIR03 is blocked on that missing writer and on unapproved spend and quality. The DIR series is parked. It is not the selected program.

**Critical stop points:** UI07 is a design quality checkpoint, not permission to certify the final visual style. DIR01 is deterministic no-provider proof. DIR02's audit found that the passage insert does not write appearance, and no writer was added. DIR03 **cannot** run live creative generation without that writer, a separate spend gate, and a measured story-quality baseline. An audit returning “not safely feasible” can be a valid finding but cannot be falsely closed as a code implementation; update packet status accordingly.

## Explicitly out of this wave

No named cave/space/microbe theme presets, raw generated HTML/CSS, automatic generated illustrations, user-arbitrary historical forks, book page-curl dependency, V2 rich narrative score, full Journal random seek, large App-wide style replacement, final approved high-fidelity skins, or giant generic component framework.

**Closing criterion:** platform controls are coherent, reusable and testable; the living book is built from stable semantically owned components; the current V1 appearance read path is demonstrably correct; automatic Storyteller art direction is only adopted if the source, validation, cost and creative-quality gates pass. Otherwise keep the useful foundation and explicitly park the expensive extension.

**2026-11-18 design override:** [Backlog convergence decision](../../backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md) selects DIR02's existing-column deterministic writer and DIR03's provider-free optional-output protocol. The earlier blocked/parked narrative above is historical, not a current veto on safe work. No live model dispatch is selected.
