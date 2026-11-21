import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createPlayabilityRunManifest,
  formatPlayabilityRunManifest,
} from '../../packages/lab-support/dist/playability-harness.js';

const directory = join(
  tmpdir(),
  'offscreen-rpg-playability',
  `${Date.now()}-${randomUUID()}`,
);
await mkdir(directory, { recursive: true });
const run = createPlayabilityRunManifest({
  id: `greywake-life-arc-${Date.now()}`,
  createdAt: new Date().toISOString(),
});
await Promise.all([
  writeFile(
    join(directory, 'playability-run.json'),
    `${JSON.stringify(run, null, 2)}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'playability-run.md'),
    formatPlayabilityRunManifest(run),
    { flag: 'wx' },
  ),
]);
process.stdout.write(
  `Playability run saved to ${directory}\nStages: ${run.stages.length}; objective ${run.allObjectiveAssertionsPassed ? 'pass' : 'fail'}; provider transport: none; model spend: $0\nCanonical: ${run.canonicalStateSha256}\n`,
);
