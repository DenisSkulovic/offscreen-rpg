# CQ03 | make Play scene orchestration understandable

**State:** Done (2026-11-21). **Kind:** implementation, behavior-preserving readability/typing. **Priority:** P1. **Branch:** `change/cq03-play-surface-readability`; **target:** `undertaking/storyteller-workshop`. Can run alongside CQ01/CQ04 if the browser worktree is not simultaneously owned by WR08.

**Baseline:** Static inspection of `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` (2026-11-21). New source/doc planning landed later; no code has been run by ChatGPT. Before implementation, confirm names and neighboring active work in the *dedicated linked worktree*. No unrelated changes or speculative style rewrite.

**Git:** Branch from actual `undertaking/storyteller-workshop` HEAD into this Change's own linked worktree; do not switch user's primary checkout. Parent dispatches small ready T-IDs and owns focused proof, closure and integration via the named custodian. Never auto-commission siblings or spend paid provider budget.

**Observed:** `apps/web/src/features/play/view.tsx:PlayScene` mixes query/live subscriptions, frozen action/recovery commands, derived presentational status, legacy offers, journey controls, journal/details JSX. It has a non-null assertion `offer!` after deriving `showLegacyOffer` as a Boolean, which loses TS narrowing. Roughly 414 lines are not by themselves a defect, but the component owns too many visual responsibilities and the cast makes correctness harder to review.

**Selected behavior-preserving outcome:** Extract pure text/status determination to the existing `model/` area, compute a genuinely narrowed `legacyOffer` rather than relying on `offer!`, and extract the self-contained journey timing notice JSX to `ui/` with **explicit callback/data props**, not a second Query or command hook. Keep query cache identity, SSE invalidation, resolution/control frozen intent, focus/Journal behavior, and no automatic POST exactly unchanged.

**Out of scope:** UX redesign, typography/theme, changing disabled rules, new React state machine/context, browser auth, server contracts, WR08 new features. No product doc change: current intended behavior remains the same; source-adjacent Play map may be updated for new helpers.

**Done:** user interactions, state labels, no-request-on-Journal, disabled choices, safe retries and reduced-mount behavior remain covered. Changed-file format/quality lint + web typecheck + focused Vitest run; clearly state NOT RUN for anything unavailable.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | unchanged because Play navigation, choices, and journey pause/resume stay the same for the player |
| Technical | unchanged because the browser Query cache, SSE invalidation, and frozen command boundary stay in PlayScene |
| Code | changed: apps/web/src/features/play/view.tsx keeps the hooks and passes a narrowed legacy offer plus an explicit journey callback. Negative: an uncertain resolution is not labeled settled, and a missing offer does not submit a choice |
| Related | changed: apps/web/src/features/play/README.md#owner-map-question--actual-symbol names the status module and the journey notice. No product page was rewritten |

This is **planning**, not the post-implementation affected-claim closure ledger. The parent records actual outcomes and NOT RUN gaps at acceptance.

[Source](SOURCE-MAP.md) · [Algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| no product/technical behavior impacted | none | unchanged because Play choices, journey pause/resume, query identity, and frozen commands stay the same; only presentation ownership moved | apps/web/src/features/play/view.tsx, apps/web/src/features/play/model/play-status.ts, apps/web/src/features/play/ui/journey-timing-notice.tsx @ 8531e44d15ed plus this Change | fixture-tested | uncertain resolution stays "Usage uncertain" and is not the settled narration line; no offer or a campaign character yields no legacy option and no resolution PUT; journey mount sends no control PUT; a second click during the in-flight pause does not send another PUT | N/A |
| Owner map: question → actual symbol | apps/web/src/features/play/README.md#owner-map-question--actual-symbol | changed: status strings point at model/play-status.ts and the journey notice points at ui/journey-timing-notice.tsx. unchanged: PlayScene still owns the snapshot query and the control submit | apps/web/src/features/play/README.md @ 8531e44d15ed plus this Change | source-observed | the map does not claim a new player-visible rule | heading updated in place |

Closeout paths: apps/web/src/features/play/view.tsx, apps/web/src/features/play/model/play-status.ts, apps/web/src/features/play/model/play-status.test.ts, apps/web/src/features/play/ui/journey-timing-notice.tsx, apps/web/src/features/play/view.test.tsx, apps/web/src/test/story-fixtures.ts, apps/web/src/features/play/README.md, work/changes/README.md, work/changes/ledger/2026-11.md. Provider spend: no call. Browser live play NOT RUN. WR08 features untouched.
