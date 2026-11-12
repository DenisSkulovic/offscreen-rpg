# Change W09 | Immutable opening-generation and Start retry/reconciliation

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W02. May start independently of W04 because creation commands have different backend semantics.

## Outcome and authority

**Code-bearing outcome:** An opening generation attempt and a Start operation have distinct, immutable identities; losing Start acknowledgement, editing campaign options or reloading cannot accidentally issue a changed request under a reused story UUID.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F3 F5 F8 F11**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G11 G19 G12**.

**Relevant source owners:** `apps/web/src/features/stories/opening-preview.tsx`, `apps/web/app/stories/[id]/preview/page.tsx`, `apps/api/src/modules/drafts/openings-controller.ts` and `apps/api/src/modules/stories/controller.ts` (read), `packages/contracts/src/openings.ts` and `stories.ts` (read).

## Proposed engineering contract

**Start is a frozen envelope**, not a button that reconstructs payload. Capture exactly once: `draftId`, `storyId`, `candidateId`, `expectedDraftRevision`, `campaign {mechanics,locked,pace,startPackage}`. Display current form changes as *new proposed intent*, never silently alter an uncertain captured one. Preserve the visible URL `?story=UUID` as the safe existing recovery anchor. For robust same-payload reload recovery, store only this minimal nonsecret versioned envelope in **sessionStorage**, scoped by authenticated viewer/draft/story and short-lived; never store session tokens or private narrative text. On page entry, reauthorize via SSR, GET `/api/stories/:storyId` before displaying a recovered success or offering explicit same-envelope retry; never auto-POST/PUT on mount. If the server cannot establish same viewer/operation linkage, storage is missing/corrupt or the saved candidate differs, **do not manufacture a new Start**; show a truthful reconciliation/blocked state and let the user intentionally start a new intent only after safe review. Clear recovered envelope after confirmed success/terminal decision, on logout/session switch and after expiry. Opening generation remains its **separate** PUT-202 UUID and pending polling; no automatic paid call after uncertain result.

## Intended bounded code/test delta

1. Introduce typed captured Start envelope and pure validate/serialize/compare logic; separate generation attempt from Start intent state.
2. Refactor Start handler/URL recovery with server GET-first path, session-scoped minimal recovery record and explicit user-triggered exact retry. Ensure form changes while uncertain cannot alter the captured body.
3. Add controlled tests for commit-before-lost-ACK, altered locked/pace, reload with/without session record, different viewer, invalid UUID, 409 candidate change, pending generation and no mount dispatch.
4. Verify API's same-ID different-body semantics with a narrow provider-free integration test before claiming idempotency beyond the frontend.

## Acceptance and meaningful rejection

- **Normal:** A successful preview starts exactly the reviewed candidate, navigates to the persisted story, and reload discovers that same committed story without generation or duplication.
- **Adversarial negative:** After lost Start ACK, changing pace/lock and clicking Retry sends exactly frozen bytes or GET-reconciles; switch viewer or lose operation record and no automatic or mismatched Start occurs.
- **Cheapest truthful verification:** Web unit/component fault-injection and existing Start browser/API integration with fake provider only if explicitly authorized; no live inference. Confirm sessionStorage key/privacy/expiry cleanup.
- **Result evidence:** Captured envelope fields, storage lifetime, GET-first/retry diagram, normal/reversed-order tests and actual backend idempotency evidence limit.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No paid retry after uncertain generation, no new backend endpoints unless separately approved, no private draft prose persisted, no redesign of opening UI/gameplay, no generic localStorage mutation queue.
- **Main risk:** SessionStorage is convenience state, not authority or proof of committed Start. A 404 during truly in-flight mutation is not proof no effect can still land; no auto-new UUID. Preserve creation's actual 202/200 distinction.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
