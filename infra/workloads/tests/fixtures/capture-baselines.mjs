#!/usr/bin/env node
/**
 * One-shot baseline capture from pre-chart sources. JSON snapshots only.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDevSlotAppGraph } from '../../../../tools/dev-environments/src/rendering/dev-slot-app-graph.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = join(dirname(fileURLToPath(import.meta.url)));

function loadYamlFiles(paths) {
  const script = `
import json, sys, yaml
docs = []
for path in sys.argv[1:]:
  with open(path) as fh:
    docs.extend(yaml.safe_load_all(fh.read()))
print(json.dumps(docs))
`;
  const result = spawnSync('python3', ['-c', script, ...paths], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'yaml parse failed');
  return JSON.parse(result.stdout);
}

mkdirSync(fixtures, { recursive: true });

const releasePaths = [
  join(root, 'release/edge.yaml'),
  join(root, 'release/authority.yaml'),
  join(root, 'release/workers.yaml'),
  join(root, 'release/migrate.yaml'),
];
const releaseDocs = loadYamlFiles(releasePaths);
writeFileSync(join(fixtures, 'release-baseline.json'), `${JSON.stringify(releaseDocs, null, 2)}\n`);

for (const slot of ['dev-1', 'dev-2']) {
  const graph = renderDevSlotAppGraph(slot, { schemaReady: true, ports: { game: slot === 'dev-1' ? 3100 : 3200 } });
  writeFileSync(join(fixtures, `${slot}-baseline.json`), `${JSON.stringify(graph.documents, null, 2)}\n`);
}

console.log('captured', releaseDocs.length, 'release docs and dev slot graphs');