import assert from 'node:assert/strict';
import { claimImpactFindings, scanDocuments } from './content-health.mjs';
import { classifyKnowledgeBoundary } from './model.mjs';

const codes = (issues, code) => issues.filter((item) => item.code === code);

export function runContentHealthSelfTest() {
  const found = scanDocuments(
    [
      {
        path: 'docs/technical/example/proposed.md',
        text: '# Proposed stack\n\n**Status:** proposal only. Not installed or authorized.\n\n## Detail\n\nStill a proposal.\n',
      },
      {
        path: 'docs/runbooks/stale.md',
        text: '# Local\n\n**Planned, not yet implemented:** W20 adds a Turbo `test:fast` task. Do not invoke it.\n\nUse the [chosen frontend execution playbook](../../research/legacy-engineering/frontend-execution-playbook.md) by heading.\n',
      },
      {
        path: 'docs/runbooks/current.md',
        text: '# Local\n\n`test:fast` exists. A script name is not a passing test run. The old playbook is dated evidence, not the current executor.\n\n```bash\n# not yet implemented\ntest:fast\n```\n\nSee `scripts/missing-tool.mjs` for a removed helper.\n',
      },
      {
        path: 'docs/technical/huge.md',
        text: `# Huge\n\n## Block\n\n${'word '.repeat(4000)}\n`,
      },
      {
        path: 'docs/technical/copy-a.md',
        text: `# A\n\n${'Same long instructional paragraph about authority. '.repeat(6)}\n`,
      },
      {
        path: 'docs/technical/copy-b.md',
        text: `# B\n\n${'Same long instructional paragraph about authority. '.repeat(6)}\n`,
      },
    ],
    {
      scripts: ['test:fast', 'test:watch'],
      exists: (rel) => rel !== 'scripts/missing-tool.mjs',
    },
  );
  assert.equal(found.schema, 'wiki.content-health.v1');
  assert.equal(codes(found.issues, 'unratified-canonical').length, 1);
  assert.equal(codes(found.issues, 'stale-unimplemented-script').length, 1);
  assert.equal(codes(found.issues, 'stale-unimplemented-script')[0].path, 'docs/runbooks/stale.md');
  assert.equal(codes(found.issues, 'historical-default').length, 1);
  assert.equal(codes(found.issues, 'large-section').length, 1);
  assert.equal(codes(found.issues, 'duplicate-paragraph').length, 1);
  assert.equal(codes(found.issues, 'missing-path').length, 1);
  assert.equal(codes(found.issues, 'missing-path')[0].path, 'docs/runbooks/current.md');
  const quiet = `
The goblin must offer an apple. Shared play could be a dream. Solo mechanics are source-observed.
The Book UX is selected. Cognee was rejected. This prose is not a claim-impact table.
`;
  assert.deepEqual(claimImpactFindings(quiet), []);
  const table = `# Example

## Claim impact | claim-impact.v1

| Claim | Disposition | Evidence |
| --- | --- | --- |
| Every world uses a selected cube map | promoted | |
| The goblin offers an apple | illustrative | |
| Shared play stays parked | parked | |
| Solo accepted execution is in source | source-observed | |
| The Book reader shell is a selected experience | selected-experience | |
| Cognee becomes game memory | promoted | research/agent-practice/COGNEE-EVALUATION-2026-11-17.md |
| Cognee stays a developer-agent trial | rejected | research/agent-practice/COGNEE-EVALUATION-2026-11-17.md |
`;
  const impact = claimImpactFindings(table);
  assert.equal(impact.filter((item) => item.code === 'missing-evidence-route').length, 1);
  assert.equal(impact.filter((item) => item.code === 'rejected-research-promoted').length, 1);
  assert.equal(impact.length, 2);
  const groupedManifest = classifyKnowledgeBoundary(
    'packages/platform/leaf/package.json',
    JSON.stringify({ exports: { '.': './src/index.ts' } }),
  );
  assert.equal(groupedManifest?.kind, 'package-exported-contract');
  const groupedBarrel = classifyKnowledgeBoundary(
    'packages/ai/leaf/src/index.ts',
    'export const grouped = 1;\n',
  );
  assert.equal(groupedBarrel?.kind, 'package-exported-contract');
  const groupedCommand = classifyKnowledgeBoundary(
    'packages/domain/leaf/src/orders.ts',
    'export const PlaceOrderCommand = z.object({\n  id: z.string(),\n});\n',
  );
  assert.equal(groupedCommand?.kind, 'command-authority');
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/not-a-family/leaf/package.json',
      JSON.stringify({ exports: { '.': './src/index.ts' } }),
    ),
    null,
  );
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/platform/leaf/src/orders.test.ts',
      'export const PlaceOrderCommand = z.object({});\n',
    ),
    null,
  );
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/identity-persistence/src/auth.ts',
      'export const users = pgTable("users", {});\n',
    )?.kind,
    'persisted-entity',
  );
  console.log(
    'Content-health self-test passed: proposal page, stale script, fenced snippet, legacy default, dated exception, large section, duplicate, missing path, claim-impact negatives.',
  );
  return 0;
}
