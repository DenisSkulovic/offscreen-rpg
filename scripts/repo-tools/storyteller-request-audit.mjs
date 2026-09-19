import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createStorytellerRequestAudit,
  formatStorytellerRequestAudit,
} from '../../packages/storyteller/dist/src/providers/request-audit.js';
import {
  createRequestAuditFixtureCases,
  requestAuditCaseIds,
} from '../../packages/storyteller/dist/src/providers/request-audit-fixtures.js';

const option = (name) =>
  process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
const requested = option('--cases');
const caseIds = requested ? requested.split(',') : requestAuditCaseIds;
for (const id of caseIds) {
  if (!requestAuditCaseIds.includes(id))
    throw new Error(`Unknown audit case: ${id}`);
}
const profileId = option('--profile') ?? 'quiet-eerie-mystery';
const cases = createRequestAuditFixtureCases({
  caseIds,
  profile: { id: profileId, revision: 1 },
});
const audit = createStorytellerRequestAudit(cases);
const directory = join(
  tmpdir(),
  'offscreen-rpg-request-audit',
  `${Date.now()}-${randomUUID()}`,
);
await mkdir(directory, { recursive: true });
await Promise.all([
  writeFile(
    join(directory, 'manifest.json'),
    `${JSON.stringify(audit, null, 2)}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'comparison.txt'),
    formatStorytellerRequestAudit(audit),
    { flag: 'wx' },
  ),
]);
process.stdout.write(
  `Storyteller request audit saved to ${directory}\nProvider transport: none; model spend: $0\n`,
);
