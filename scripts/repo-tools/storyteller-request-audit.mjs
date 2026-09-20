import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createStorytellerRequestAudit,
  formatStorytellerRequestAudit,
  selectStorytellerRequestSections,
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
const requestedSections = option('--sections');
const maxSelectedBytes = Number(option('--max-selected-bytes') ?? 32768);
const cases = createRequestAuditFixtureCases({
  caseIds,
  profile: { id: profileId, revision: 1 },
});
const audit = createStorytellerRequestAudit(cases);
const selection = requestedSections
  ? selectStorytellerRequestSections(
      cases,
      requestedSections.split(',').map((selector) => {
        const separator = selector.indexOf(':');
        if (separator < 1 || separator === selector.length - 1) {
          throw new Error(
            `Invalid section selector: ${selector}; expected case-id:section-key`,
          );
        }
        return {
          caseId: selector.slice(0, separator),
          sectionKey: selector.slice(separator + 1),
        };
      }),
      maxSelectedBytes,
    )
  : null;
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
  ...(selection
    ? [
        writeFile(
          join(directory, 'selected-sections.json'),
          `${JSON.stringify(selection, null, 2)}\n`,
          { flag: 'wx' },
        ),
      ]
    : []),
]);
process.stdout.write(
  `Storyteller request audit saved to ${directory}\nSelected section content: ${selection ? `${selection.selectedBytes} bytes in selected-sections.json` : 'not requested'}\nProvider transport: none; model spend: $0\n`,
);
