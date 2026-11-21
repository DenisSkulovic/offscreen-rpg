# MA05C | deterministic utility edit + single parent proof

**Reference:** `undertaking/storyteller-workshop` source HEAD `22e8af7e38ade6cf6797e6446702d2203074a439`; update only on isolated `change/ma05c-direct-db-outbox-imports` worktree after actual branch guard. **Goal:** replace only exact old outbox module specifiers in exactly 46 source files. [Source Map](SOURCE-MAP.md) supplies the audited 46-path ownership list. **DAG:** T01 → T02, serial. **Model:** T01 can use the budget policy's *Auto utility* context-isolation route, or parent may execute the deterministic script directly if spawning a child costs more. Do not assign four Composer workers to four trivial text-edit cohorts. T02 is parent VERIFY.

## T01 | Exact guarded import substitution | PLANNER-READY
DEPTH=PATCH, bounded mechanical utility; **no code/design choices**. **Allowed writes:** exactly the 46 paths enumerated in SOURCE-MAP.md, no manifest/lockfile/test/SQL runtime edits. **Read anchors:** `packages/db/src/outbox.ts:enqueue,Transaction,Notice`, `packages/application/src/outbox/index.ts` compatibility reexport, `packages/application/src/campaign/follow-up-intents.ts`, `packages/application/src/stories/continuation.ts`, `packages/application/src/storyteller/records.ts`.
**Algorithm:** run the following from the Change worktree's *repository root*. It validates **all** target files before writing any, so missing/stale imports stop safely. Do not change types/aliases, SQL logic or namespace conventions.

```bash
node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const cohorts = {
  campaign: 'action-executions actions activities activity-lifecycle-events delegated-offer follow-up-intents holds narration persistence reports settings world-obligations',
  stories: 'continuation delegation-policy documents forks initialization persistence public-events resolution scene-checkpoint timing',
  storyteller: 'admission budget capture-materialization capture-rearm context-capture context dispatch-review execution-stages execution load-current-dispatch-authority memory openings prompt-provenance records recovery start test-revoke-current-owner-grant window-accounting writer-loop writer-mission-custody writer-workdesk',
  generations: 'openings scripted-openings',
  'developer-tools': 'chamber',
};
const before = "from '../outbox/index'";
const after = "from '@offscreen/db/outbox'";
const changes = [];
for (const [dir, filenames] of Object.entries(cohorts)) {
  for (const stem of filenames.split(' ')) {
    const file = path.join('packages/application/src', dir, stem + '.ts');
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(before)) throw Error('MA05C source drift: ' + file);
    changes.push([file, content.split(before).join(after)]);
  }
}
if (changes.length !== 46) throw Error('MA05C inventory count changed: ' + changes.length);
for (const [file, body] of changes) fs.writeFileSync(file, body);
console.log('MA05C import-only source paths updated: ' + changes.length);
NODE
```

**Proof:** output must say 46; `git diff --check`; inspect the changed-file diff mechanically to confirm exclusively the target import-literal replacement. **Negative:** a missing original import must abort **before** any source file writes; report exact stale file, do not search/replace a substitute path. No child Git staging/commits/build/provider/SQL operations.

## T02 | Whole-Change verification + integration | PLANNER-READY
DEPTH=VERIFY, parent, after T01. **Commands from root:** `pnpm --filter @offscreen/db build`, `pnpm --filter @offscreen/application build`, `pnpm --filter @offscreen/api build`, `pnpm --filter @offscreen/game-authority build`, `pnpm --filter @offscreen/worker build`, `pnpm repo:module-graph --json`. Check changed-file Prettier and quality ESLint without source-wide formatting; run `git diff --check`. **Negative:** run `rg -n -F "from '../outbox/index'" packages/application/src`; expected exit **1** / no output, and `git diff` has no behavior, test or manifest changes. MA05B's disposable SQL rollback evidence is predecessor proof; no duplicate SQL fixture for import-only edits. If a compiler failure reveals an actual signature mismatch, stop and report concrete symbol. Parent runs ordinary code-health/Change close guards, archive, squash-integrate/push into undertaking, retire clean temporary worktree/branch. No other Change automatically starts.

**Receipt:** source file count and exact edit nature; joined commands/exit; no-old-import negative; branch SHA after safe closure. A full Change commission includes the entire T01→T02 lifecycle.
