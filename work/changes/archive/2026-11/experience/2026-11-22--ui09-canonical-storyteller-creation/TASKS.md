# UI09 | bounded Composer T01–T03

**Target:** `undertaking/storyteller-workshop`, exact current HEAD at dispatch. Create mandatory linked worktree/`change/ui09-canonical-storyteller-creation`; run `node scripts/repo-tools/change-branch-guard.mjs --change UI09 --target undertaking/storyteller-workshop` before edits. Parent may implement now but should not integrate into the undertaking while TURN03 is actively exercising the old live route surface.

## T01 | make `/stories/new` the one canonical creation door

**Read first:**

- `apps/web/app/(authenticated)/stories/new/page.tsx`
- `apps/web/app/(authenticated)/stories/launch/page.tsx`
- `apps/web/app/(authenticated)/stories/page.tsx`
- `apps/web/src/features/stories/stories-home-actions.tsx`
- `apps/web/src/server/story-launch-capability.ts`

**Write:** those route/home files and focused home/capability tests only.

**Do:**

1. `/stories/new` authenticates and renders `StoryLaunchForm`; remove new-draft UUID allocation, draft probe/catalogue fetch and `DraftEditor` from this route.
2. `/stories/launch` becomes compatibility redirect to `/stories/new`.
3. Stories home/nav has one creation CTA to `/stories/new`; remove conditional duplicate launch CTA.
4. If latest-head grep confirms the launch capability gate has no separate consumer, remove `story-launch-capability.ts` + test.

**Positive proof:** route/home component tests or focused Web tests demonstrate one canonical `/stories/new` creation link and no launch feature gate.  
**Negative proof:** saved-draft `/stories/[id]` source still imports/renders `DraftEditor`; no draft storage/schema files changed.  
**Stop:** current HEAD added a materially different Story Launch route owner or a distinct required consumer of `STORY_LAUNCH_ENABLED`.

## T02 | Play-first prepared mode + one Story Prompt custom mode

**Read first:**

- `apps/web/src/features/stories/story-launch-form.tsx`
- `apps/web/src/features/stories/use-story-launch.ts`
- `apps/web/src/features/stories/story-launch-status.tsx`
- `apps/web/src/features/stories/story-launch-form.test.tsx`
- `packages/contracts/src/story-launch.ts` (read-only)

**Write:** `story-launch-form.tsx`, `story-launch.css`, `story-launch-form.test.tsx`; only touch `use-story-launch.ts` if a focused failing test proves a local integration defect and preserve its public semantics.

**Do:**

1. Custom mode: one freeform Story Prompt, no title/character/role/review; primary creation action.
2. Move optional world-invention control under accessible **Customize** disclosure; no invented mandatory settings.
3. Prepared mode when `presets` exist: render Play-first card/action per exact preset. `Play` works with empty prompt. Optional Customize can add a custom prompt/hints before the same single launch.
4. Lock the interaction once submission/status recovery begins; preserve existing durable operation behavior.
5. With `presets=[]`, show no fake prepared experience.

**Positive proof:** tests cover (a) custom one-prompt launch, (b) preset-only Play with empty prompt and exact id/root, (c) optional preset customization.  
**Negative proof:** no title/character/progress/review UI; duplicate click yields one PUT; uncertain check uses GET only; prompt absent from session storage; malformed/empty custom prompt without preset is rejected.  
**Stop:** implementation would require changing Story Launch contract/API/provider policy or fabricating a preset root.

## T03 | regression, docs and closure

**Read first:**

- `apps/web/src/features/stories/README.md`
- `apps/web/app/README.md`
- `docs/product/experience/entry-and-onboarding.md` current-POC section
- `docs/technical/engine/lifecycle-and-compatibility.md` target/current compatibility paragraphs
- `apps/web/src/features/stories/draft-editor.test.tsx`

**Write:** focused README/current-reality reconciliation plus normal Change closure files. Do not rewrite product target behavior; it is already ratified.

**Run:** focused Story Launch/home/draft tests, Web typecheck/build if available, changed-file Prettier/quality checks, `pnpm repo:code-health --base undertaking/storyteller-workshop` as required at code-bearing closure. Record PASS/FAIL/NOT RUN exactly.

**Positive proof:** canonical route/form tests green and saved draft compatibility test still green.  
**Negative proof:** grep confirms no default-off Story Launch gate or `/stories/new` → `DraftEditor` route; no API/GA/Worker/contracts diff.  
**Close:** after TURN03 integration-surface use is finished, reconcile current undertaking HEAD, squash-integrate into `undertaking/storyteller-workshop`, update ledger/STATUS/overview only as warranted, archive UI09, retire temporary branch/worktree. Do not start a prepared-catalogue or provider Change automatically.
