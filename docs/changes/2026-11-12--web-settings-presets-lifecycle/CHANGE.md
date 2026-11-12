# Change W11 | Settings edit session, preset and history lifetimes

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no app source edits, CLI/DB reset, browser test service, provider spend, deployment or migration authorized by this packet.  
**Audited source baseline:** `470a5df069470bf758eb1a560c515846ce781637`; inspect live branch/worktree first. **Dependencies:** W01 + W04 command typing; can review W02 browser contract helpers.

## Outcome and authority

**Code-bearing outcome:** A change of server settings revision does not silently destroy a user's unsaved editing; presets/history are separately scoped reads and frozen intent saves with deterministic conflict and unknown-result feedback.

**Destination:** [React/Next F1–F15](../../engineering/targets/react-next.md) criteria **F3 F8 F11 F7**; **evidence:** [November 12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md) findings **G22 G16 G17**.

**Relevant source owners:** `apps/web/src/features/play/campaign-settings.tsx`, `apps/web/src/features/play/view.tsx` (parent key), `apps/web/src/features/play/use-campaign-command.ts`, `packages/contracts/src/campaign.ts`, `apps/api/src/modules/stories/controller.ts` (read).

## Proposed engineering contract

Key the whole editor by **story/viewer identity**, not `campaign.settings.revision`. Hold last confirmed settings revision and editable `creative` separately; on a newer revision, update read-only effective values and mark dirty local edits stale/conflicting until the user intentionally adopts or resubmits against the new revision. Preserve locked-state restrictions. W04 typed command envelopes own setting PUT ID/payload; preset saves use their own frozen ID/name/creative snapshot and distinguish retrying old capture from starting a new save. Catalogue and history requests use abort/request epoch guards; avoid treating 401 as a generic missing preset. Keep current form controls/appearance; extract preset/history reader only if lifetimes or tests materially improve.

## Intended bounded code/test delta

1. Replace revision-based remount with an explicit same-story draft/revision reconciliation contract.
2. Separate setting command status from preset save status; preserve frozen payload on uncertainty and accurate visible “retry captured preset” affordance.
3. Guard concurrent catalogue/history reads on story/viewer changes and add tests for dirty revision update, 409, lock state, changed preset input after timeout, session switch.

## Acceptance and meaningful rejection

- **Normal:** Edit creative tags and save against an admitted revision, or save a private preset, without losing local work during normal snapshot refresh.
- **Adversarial negative:** Another tab updates settings while form is dirty; UI must not silently reset user's fields. A preset retry after name/tags changed cannot send new contents under prior ID; late history from story A cannot appear under B.
- **Cheapest truthful verification:** React component tests with controlled revision update and promise ordering plus narrow provider-free API test if justified.
- **Result evidence:** Record dirty/prior/current revision semantics, exact old/new retry body comparison and real tests run.

## Constraints, alternatives and abort gate

- **Explicit exclusions:** No new creative/game rules, new form toolkit, general config state machine for every feature, visual editor redesign, backend settings schema change.
- **Main risk:** Never make React draft state authoritative for applied settings; after 409 user must see rebase/adopt decision rather than blind overwrite.
- **Option zero:** retain the working boundary and add one targeted check if source/test evidence proves the presumed implementation gap does not exist. A library or abstraction is not an outcome.
- **Stop condition:** any new backend/public policy, payment, data schema or UI/UX redesign decision is referred to the owner and permanent spec; do not improvise one inside Cursor. Permission remains Proposed until revalidated, reviewed and owner-selected.

## Cursor handoff (after approval only)

Use the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), the named F criteria and G findings, and the 2–5 owning paths above. Implement only the specified delta, preserve behavior, verify a normal **and** discriminating negative case, and return: diff/paths, commands actually run, pass/fail, limits and next recommended packet. Do not automatically execute or expand into unrelated cleanups.
