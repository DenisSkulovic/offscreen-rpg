# CQ03 | Composer tasks
**Ready when no WR08/other client session owns `apps/web/src/features/play/view.tsx`.** Branch `change/cq03-play-surface-readability`, own linked worktree, target Undertaking. Run `pnpm repo:change-branch --change CQ03 --target undertaking/storyteller-workshop` first. T01 → T02 → T03 → T04.

## T01 | Isolate pure status strings | PLANNER-READY
Read `view.tsx:resolutionMessage/stageStatusLabel`, `model/live-presentation.ts`, `view.test.tsx`. Write `model/play-status.ts`, `model/play-status.test.ts`, updated imports in view.tsx. **Positive:** exact status precedence preserved; **negative:** uncertain provider outcome never labeled settled. **Stop:** changed StorySnapshot states require planner decision. Receipt: tested source paths/results.

## T02 | Remove non-null option assertion | PLANNER-READY AFTER T01
Read `view.tsx:PlayScene` offer derivation and StoryFrame intentions/onIntentionSelect; `@offscreen/contracts/stories` StorySnapshot. Write view.tsx and focused view test. Use nullable narrowed legacyOffer and preserve disabled checks. **Positive:** clicking valid option issues same submitted fields; **negative:** no offer or campaign character yields no option/action, no `!`. **Stop:** changed type of Interaction contract.

## T03 | Extract journey view-only component | PLANNER-READY AFTER T02
Read `view.tsx` journey timing section, `use-control-command.ts`, `view.test.tsx`. Write `ui/journey-timing-notice.tsx`, view.tsx and focused tests. Explicit data + onControl callback only; no hooks/request code moved to child. **Positive:** active/paused button continues to send same control; **negative:** pending/frozen disables, no POST on mount. **Stop:** unexpected change in scene/operation identity.

## T04 | Changed-file craft gate and source map | PLANNER-READY AFTER T03
Run focused Vitest, typecheck, Prettier and quality ESLint; inspect component boundaries and SSR/hydration. Update `src/features/play/README.md` owner links if needed; record docs unchanged rationale. **Stop:** visible behavior changed, restore identical semantics before Done. Parent receipt + join via custodian; no unrelated UI polish.
