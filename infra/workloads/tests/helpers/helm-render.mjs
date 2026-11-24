import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const workloadsRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const chartPath = join(workloadsRoot, 'chart');

export function helmTemplate({ profile, overlay = {} }) {
  const profilePath = join(workloadsRoot, 'profiles', `${profile}.yaml`);
  const stdin = `${JSON.stringify(overlay)}\n`;
  const result = spawnSync(
    'helm',
    ['template', 'offscreen-app', chartPath, '-f', profilePath, '-f', '-'],
    { input: stdin, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  return result;
}

export function parseHelmJsonDocuments(output) {
  const docs = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') || trimmed.includes('#')) continue;
    const parsed = JSON.parse(trimmed);
    if (parsed?.Error) throw new Error(`helm emitted Error field: ${parsed.Error}`);
    docs.push(parsed);
  }
  return docs;
}

export function documentKey(doc) {
  return `${doc.kind}/${doc.metadata?.namespace ?? '-'}/${doc.metadata?.name ?? '-'}`;
}