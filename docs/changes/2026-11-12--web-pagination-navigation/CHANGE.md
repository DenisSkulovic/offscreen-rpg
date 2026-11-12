# Change W10 | Identity-safe story, draft and chronology paging

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W02; W03 for shared story identity boundary.

## Outcome and authority

**Code-bearing outcome:** All paged readers make resource/query/cursor identity explicit, reject late responses and handle duplicate/end pages consistently while preserving the existing visible controls.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F3 F12 F11**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G20 G17**.

**Relevant source owners:** `apps/web/src/features/stories/live-story-list.tsx`, `apps/web/src/features/stories/draft-list.tsx`, `apps/web/src/features/play/history.tsx`, `apps/web/src/features/developer-tools/chamber/history.tsx` (read), `packages/contracts/src/stories.ts`, `apps/web/app/stories/page.tsx`.

## Proposed engineering contract

Keep the different server cursor contracts: story list `nextBefore` UUID, drafts `nextCursor` string, chronology `nextBefore` number. Encode URL cursor, schema-validate response, use one in-flight request per reader and abort/ignore on identity change or unmount. A page is valid only for the viewer/resource/query epoch that launched it. Decide the existing user-visible accumulation contract explicitly: story/draft lists should retain previously visible items when requesting older entries; chronology should retain already inspected passages if pagination is implemented as older-in-sequence load. Deduplicate by stable ID with stable ordering; if actual existing UI intentionally uses replace-only pages, preserve that behavior instead and write a negative accessibility/navigation test demonstrating that every page remains reachable. Do not turn this into a generic paginated resource framework; a small shared pure cursor/merge function is enough if actually identical.

## Intended bounded code/test delta

1. Add focused tests that expose current replace/append asymmetry, late A→B page and duplicate cursor entries; record observed intended list behavior.
2. Implement entity/viewer scoped reader state and deferred-request guards in story list, draft list and read-only chronology with their specific wire types.
3. Preserve page labels/controls and absence/empty/end states; ensure story history is never interactive past choices and routes/soft refresh reset correctly.

## Acceptance and meaningful rejection

- **Normal:** Loading older stories/drafts/history retains a coherent accessible sequence and correct next cursor; current entries don't disappear unexpectedly.
- **Adversarial negative:** Late older page after viewer/story/route switch, duplicated ID, empty or invalid cursor and rapid double click cannot insert wrong records or create an infinite paging loop.
- **Cheapest truthful verification:** Web pure/page component tests and targeted provider-free existing browser chronology/list flow when permitted; no DB reset without explicit acknowledgement.
- **Result evidence:** Document selected per-reader page semantics and two negative identity/pagination cases plus actual test results.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No infinite-scroll UI redesign, generic query framework, server pagination change or new product feature.
- **Main risk:** Do not assume the three server cursors are interchangeable; if changing replace→append affects product intent, elevate that specific policy decision rather than improvising new UX.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
