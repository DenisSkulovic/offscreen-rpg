import assert from 'node:assert/strict';
import { scanDocuments } from './content-health.mjs';

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
  console.log(
    'Content-health self-test passed: proposal page, stale script, fenced snippet, legacy default, dated exception, large section, duplicate, missing path.',
  );
  return 0;
}
