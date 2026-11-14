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
import {
  formatStorytellerOperationTrace,
  serializeStorytellerOperationTrace,
} from '../../packages/storyteller/dist/src/providers/operation-trace.js';
import {
  createOperationTraceFixtureTraces,
  operationTraceScenarioIds,
} from '../../packages/storyteller/dist/src/providers/operation-trace-fixtures.js';
import {
  formatStorytellerEvidenceLineage,
} from '../../packages/storyteller/dist/src/providers/evidence-lineage.js';
import {
  createEvidenceLineageFixtures,
  evidenceLineageScenarioIds,
} from '../../packages/storyteller/dist/src/providers/evidence-lineage-fixtures.js';
import {
  formatModelRoutePacketReport,
} from '../../packages/storyteller/dist/src/providers/model-route-capabilities.js';
import {
  createModelRouteCapabilityFixtures,
  modelRouteCapabilityScenarioIds,
} from '../../packages/storyteller/dist/src/providers/model-route-capability-fixtures.js';

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
const requestedTraces = option('--traces');
const traceIds = requestedTraces
  ? requestedTraces.split(',')
  : [...operationTraceScenarioIds];
for (const id of traceIds) {
  if (!operationTraceScenarioIds.includes(id))
    throw new Error(`Unknown operation-trace scenario: ${id}`);
}
const requestedLineages = option('--lineages');
const lineageIds = requestedLineages
  ? requestedLineages.split(',')
  : evidenceLineageScenarioIds.filter((id) => id !== 'false-citation-rejected');
for (const id of lineageIds) {
  if (!evidenceLineageScenarioIds.includes(id))
    throw new Error(`Unknown evidence-lineage scenario: ${id}`);
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
const operationTraces = createOperationTraceFixtureTraces({
  scenarioIds: traceIds,
});
const evidenceLineages = createEvidenceLineageFixtures({
  scenarioIds: lineageIds,
}).filter((entry) => entry.lineage);
const requestedRoutes = option('--routes');
const routeIds = requestedRoutes
  ? requestedRoutes.split(',')
  : [...modelRouteCapabilityScenarioIds];
for (const id of routeIds) {
  if (!modelRouteCapabilityScenarioIds.includes(id))
    throw new Error(`Unknown model-route scenario: ${id}`);
}
const routeCapabilityFixtures = createModelRouteCapabilityFixtures({
  scenarioIds: routeIds,
});
const directory = join(
  tmpdir(),
  'offscreen-rpg-request-audit',
  `${Date.now()}-${randomUUID()}`,
);
const tracesDirectory = join(directory, 'operation-traces');
const lineagesDirectory = join(directory, 'evidence-lineages');
const routesDirectory = join(directory, 'route-capabilities');
await mkdir(tracesDirectory, { recursive: true });
await mkdir(lineagesDirectory, { recursive: true });
await mkdir(routesDirectory, { recursive: true });
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
  writeFile(
    join(directory, 'operation-traces.json'),
    `${JSON.stringify(
      operationTraces.map(({ id, trace }) => ({ id, trace })),
      null,
      2,
    )}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'operation-traces.md'),
    operationTraces
      .map(({ trace }) => formatStorytellerOperationTrace(trace))
      .join('\n'),
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'evidence-lineages.json'),
    `${JSON.stringify(
      evidenceLineages.map(({ id, lineage }) => ({ id, lineage })),
      null,
      2,
    )}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'evidence-lineages.md'),
    evidenceLineages
      .map(({ lineage }) => formatStorytellerEvidenceLineage(lineage))
      .join('\n'),
    { flag: 'wx' },
  ),
  ...operationTraces.map(({ id, trace }) =>
    writeFile(
      join(tracesDirectory, `${id}.json`),
      serializeStorytellerOperationTrace(trace),
      { flag: 'wx' },
    ),
  ),
  ...evidenceLineages.map(({ id, lineage }) =>
    writeFile(
      join(lineagesDirectory, `${id}.json`),
      `${JSON.stringify(lineage, null, 2)}\n`,
      { flag: 'wx' },
    ),
  ),
  writeFile(
    join(directory, 'route-capabilities.json'),
    `${JSON.stringify(routeCapabilityFixtures, null, 2)}\n`,
    { flag: 'wx' },
  ),
  writeFile(
    join(directory, 'route-capabilities.md'),
    routeCapabilityFixtures
      .map((entry) => {
        if (entry.rejected) {
          return `# Model route scenario ${entry.id}\n\n- rejected: ${entry.errorCode}\n`;
        }
        const reports = [entry.cold, entry.warm, entry.report].filter(Boolean);
        return reports.map((report) => formatModelRoutePacketReport(report)).join('\n');
      })
      .join('\n'),
    { flag: 'wx' },
  ),
  ...routeCapabilityFixtures.flatMap((entry) => {
    const writes = [];
    if (entry.cold) {
      writes.push(
        writeFile(
          join(routesDirectory, `${entry.id}-cold.json`),
          `${JSON.stringify(entry.cold, null, 2)}\n`,
          { flag: 'wx' },
        ),
      );
    }
    if (entry.warm) {
      writes.push(
        writeFile(
          join(routesDirectory, `${entry.id}-warm.json`),
          `${JSON.stringify(entry.warm, null, 2)}\n`,
          { flag: 'wx' },
        ),
      );
    }
    if (entry.report) {
      writes.push(
        writeFile(
          join(routesDirectory, `${entry.id}.json`),
          `${JSON.stringify(entry.report, null, 2)}\n`,
          { flag: 'wx' },
        ),
      );
    }
    if (entry.rejected) {
      writes.push(
        writeFile(
          join(routesDirectory, `${entry.id}.json`),
          `${JSON.stringify({ id: entry.id, rejected: true, errorCode: entry.errorCode }, null, 2)}\n`,
          { flag: 'wx' },
        ),
      );
    }
    return writes;
  }),
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
  `Storyteller request audit saved to ${directory}\nSelected section content: ${selection ? `${selection.selectedBytes} bytes in selected-sections.json` : 'not requested'}\nOperation traces: ${operationTraces.length} (${traceIds.join(', ')})\nEvidence lineages: ${evidenceLineages.length} (${lineageIds.join(', ')})\nRoute capabilities: ${routeCapabilityFixtures.length} (${routeIds.join(', ')})\nProvider transport: none; model spend: $0\n`,
);
