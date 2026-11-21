# CQ03 | make Play scene orchestration understandable

**State:** Ready for owner commission, provided WR08/other active client ownership is disjoint at launch. **Kind:** implementation, behavior-preserving readability/typing. **Priority:** P1. **Branch:** `change/cq03-play-surface-readability`; **target:** `undertaking/storyteller-workshop`. Can run alongside CQ01/CQ04 if the browser worktree is not simultaneously owned by WR08.

**Baseline:** Static inspection of `undertaking/storyteller-workshop` at `c13d64ee450ad6b2b1da75dddf0a3de8331efa1a` (2026-11-21). New source/doc planning landed later; no code has been run by ChatGPT. Before implementation, confirm names and neighboring active work in the *dedicated linked worktree*. No unrelated changes or speculative style rewrite.

**Git:** Branch from actual `undertaking/storyteller-workshop` HEAD into this Change's own linked worktree; do not switch user's primary checkout. Parent dispatches small ready T-IDs and owns focused proof, closure and integration via the named custodian. Never auto-commission siblings or spend paid provider budget.

**Observed:** `apps/web/src/features/play/view.tsx:PlayScene` mixes query/live subscriptions, frozen action/recovery commands, derived presentational status, legacy offers, journey controls, journal/details JSX. It has a non-null assertion `offer!` after deriving `showLegacyOffer` as a Boolean, which loses TS narrowing. Roughly 414 lines are not by themselves a defect, but the component owns too many visual responsibilities and the cast makes correctness harder to review.

**Selected behavior-preserving outcome:** Extract pure text/status determination to the existing `model/` area, compute a genuinely narrowed `legacyOffer` rather than relying on `offer!`, and extract the self-contained journey timing notice JSX to `ui/` with **explicit callback/data props**, not a second Query or command hook. Keep query cache identity, SSE invalidation, resolution/control frozen intent, focus/Journal behavior, and no automatic POST exactly unchanged.

**Out of scope:** UX redesign, typography/theme, changing disabled rules, new React state machine/context, browser auth, server contracts, WR08 new features. No product doc change: current intended behavior remains the same; source-adjacent Play map may be updated for new helpers.

**Done:** user interactions, state labels, no-request-on-Journal, disabled choices, safe retries and reduced-mount behavior remain covered. Changed-file format/quality lint + web typecheck + focused Vitest run; clearly state NOT RUN for anything unavailable. ## Planned-impact.v1 (before implementation)

| Owner | Disposition |
| --- | --- |
| Product | No user-visible change; Play navigation and choices identical. |
| Technical | Existing browser Query/command boundary unchanged. |
| Code and tests | PlayScene pure status + journey UI extraction, narrowed offer, focused UI tests. |
| Related status, maps and evidence | Play source README after ownership movement; no invented UI acceptance. |

This is **planning**, not the post-implementation affected-claim closure ledger. The parent records actual outcomes and NOT RUN gaps at acceptance.

[Source](SOURCE-MAP.md) · [Algorithm](EXECUTION.md) · [Proof](PROOF.md) · [Tasks](TASKS.md).
