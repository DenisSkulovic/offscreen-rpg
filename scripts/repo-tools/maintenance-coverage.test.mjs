import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { healthSummary } from './brief.mjs';
import { scanMaintenance } from './maintenance-core.mjs';
import { classifyKnowledgeBoundary, reviewKnowledgeCoverage } from './wiki-core/model.mjs';

const endpoint = 'apps/api/src/modules/widgets/controller.ts';
const helper = 'packages/engine/src/internal/add.ts';
const endpointText = `import { Controller, Get } from '@nestjs/common';

@Controller('widgets')
export class WidgetsController {
  @Get('list')
  list() {
    return [];
  }
}
`;
const helperText = `export function add(left, right) {
  return left + right;
}
`;

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'wiki17-'));
  const files = new Map();
  function add(rel, text) {
    const abs = path.join(root, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    files.set(rel, text);
  }
  return {
    root,
    add,
    files() {
      return [...files.keys()];
    },
    readText(rel) {
      if (!files.has(rel)) throw new Error(`missing ${rel}`);
      return files.get(rel);
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function seed(fx, status = '# Status\n\nPure addition lives in `packages/engine/src/internal/add.ts`.\n') {
  fx.add('README.md', '# Repo\n');
  fx.add('STATUS.md', status);
  fx.add('docs/README.md', '# Docs\n\n[Product](product/README.md)\n');
  fx.add(
    'docs/product/README.md',
    '# Product\n\n[Time](time.md)\n\nEvery older product page is reachable.\n',
  );
  fx.add('docs/product/time.md', '# Time\n\nThe clock stays here.\n');
  fx.add('docs/technical/platform/http.md', '# HTTP\n\nSee `apps/api/README.md`.\n');
  fx.add('apps/api/README.md', '# API\n\nRoute list lives here.\n');
  fx.add('work/changes/README.md', '# Change catalog\n');
  fx.add('work/QUEUE.md', '# Work queue\n\nCurrent work: none\n\n[Changes](changes/README.md)\n');
  fx.add(endpoint, endpointText);
  fx.add(helper, helperText);
}

function scan(fx, history) {
  return scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: 'abc', dirty: true },
    history,
    now: '2026-11-18T00:00:00Z',
  });
}

function commitsFor(paths) {
  const commits = {};
  for (const rel of paths) commits[rel] = { sha: 'owner111', at: '2026-11-01T00:00:00Z' };
  return commits;
}

test('classifies only the five bounded source boundaries', () => {
  assert.equal(classifyKnowledgeBoundary(endpoint, endpointText).kind, 'public-api-route');
  assert.match(classifyKnowledgeBoundary(endpoint, endpointText).why, /@Get\('list'\)/);
  assert.equal(
    classifyKnowledgeBoundary('apps/api/src/modules/widgets/controller.test.ts', endpointText),
    null,
  );
  assert.equal(classifyKnowledgeBoundary(helper, helperText), null);
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/engine/src/internal/note.ts',
      '// @Get(\'list\') is only a comment\nexport function add(left, right) { return left + right; }\n',
    ),
    null,
  );

  const manifest = 'packages/widgets/package.json';
  const manifestText = '{"name":"@offscreen/widgets","exports":{".":"./dist/index.js"}}\n';
  assert.equal(classifyKnowledgeBoundary(manifest, manifestText).kind, 'package-exported-contract');
  assert.equal(classifyKnowledgeBoundary(manifest, '{"name":"@offscreen/widgets"}\n'), null);
  assert.equal(
    classifyKnowledgeBoundary('packages/widgets/src/index.ts', 'export { Widget } from "./widget.js";\n').kind,
    'package-exported-contract',
  );
  assert.equal(classifyKnowledgeBoundary('packages/widgets/src/index.ts', 'export {}\n'), null);

  const persistedFixtures = [
    ['packages/identity-persistence/src/auth.ts', 'export const user = pgTable("user", {});\n'],
    [
      'packages/identity-persistence/src/terminal-auth.ts',
      'export const terminalDevicePairing = pgTable("terminal_device_pairing", {});\n',
    ],
    ['packages/story-persistence/src/stories.ts', 'export const story = pgTable("story", {});\n'],
    [
      'packages/story-persistence/src/storyteller/writer.ts',
      'export const storytellerRun = pgTable("storyteller_run", {});\n',
    ],
    [
      'packages/admin/src/persistence/schema.ts',
      'export const adminStaffPrincipal = pgTable("admin_staff_principal", {});\n',
    ],
    [
      'packages/lab-support/src/persistence/schema.ts',
      'export const labQaRun = pgTable("lab_qa_run", {});\n',
    ],
    ['packages/outbox/src/schema.ts', 'export const outbox = pgTable("outbox", {});\n'],
  ];
  for (const [rel, text] of persistedFixtures) {
    assert.equal(classifyKnowledgeBoundary(rel, text).kind, 'persisted-entity', rel);
  }
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/story-persistence/src/storyteller.ts',
      'export { storytellerRun } from "./storyteller/writer.js";\n',
    ),
    null,
  );
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/db/src/schema/widget.ts',
      'export const widget = pgTable("widget", {});\n',
    ),
    null,
  );
  assert.equal(
    classifyKnowledgeBoundary(
      'packages/db/src/read.ts',
      'import { eq } from "drizzle-orm";\nexport function readRow() { return eq; }\n',
    ),
    null,
  );

  const content = 'content/starts/example/start-package.json';
  const contentText = JSON.stringify({
    format: 'offscreen.start-package-source.v1',
    documents: [{ path: 'START.md', kind: 'widget-orientation' }],
  });
  assert.equal(classifyKnowledgeBoundary(content, contentText).kind, 'content-package-kind');
  assert.match(classifyKnowledgeBoundary(content, contentText).why, /widget-orientation/);
  assert.equal(classifyKnowledgeBoundary('content/worlds/example/WORLD.md', '# World\n'), null);

  const command = 'packages/story-interface/src/widget.ts';
  const commandText = 'export const widgetCommandSchema = z.strictObject({ kind: z.literal("widget") });\n';
  assert.equal(classifyKnowledgeBoundary(command, commandText).kind, 'command-authority');
  assert.equal(
    classifyKnowledgeBoundary(command, 'export const widgetViewSchema = z.object({ id: z.string() });\n'),
    null,
  );
});

test('review records a disposition and never treats code as the product bible', () => {
  const command = 'packages/story-interface/src/widget.ts';
  const commandText = 'export const widgetCommandSchema = z\n  .strictObject({ kind: z.literal("widget") });\n';
  const unowned = reviewKnowledgeCoverage([{ path: command, text: commandText, owners: [] }], '');
  assert.equal(unowned.status, 'unknown review needed');
  assert.equal(unowned.productBible, 'unchanged');
  assert.equal(unowned.canon, false);
  assert.equal(unowned.candidates[0].canon, false);
  assert.match(unowned.candidates[0].why, new RegExp(command.replaceAll('/', '\\/')));
  assert.match(unowned.candidates[0].message, /cannot change the product bible/);
  assert.equal(unowned.candidates[0].dispositions.includes('create authoritative owner'), true);
  assert.match(unowned.candidates[0].suggestion, /Do not auto-create a spec page/);

  const owned = reviewKnowledgeCoverage(
    [{ path: command, text: commandText, owners: ['docs/technical/platform/http.md'] }],
    '',
  );
  assert.equal(owned.status, 'reviewed');
  assert.equal(owned.candidates.length, 0);
  assert.equal(owned.reviewed[0].disposition, 'already owned heading');
  assert.equal(owned.reviewed[0].source, 'docs/technical/platform/http.md');

  const helperReview = reviewKnowledgeCoverage(
    [{ path: helper, text: helperText, owners: ['STATUS.md'] }],
    `documented no-op: \`${helper}\` because the pure helper has no new reader question.\n`,
  );
  assert.equal(helperReview.status, 'no-new-boundary');
  assert.equal(helperReview.candidates.length, 0);

  const missingReason = reviewKnowledgeCoverage(
    [{ path: endpoint, text: endpointText, owners: [] }],
    `documented no-op: \`${endpoint}\` because todo\nadd section: \`${endpoint}\` later\n`,
  );
  assert.equal(missingReason.status, 'unknown review needed');
  assert.match(missingReason.candidates[0].message, /lacked an exact source or an admission reason/);

  const accepted = reviewKnowledgeCoverage(
    [{ path: endpoint, text: endpointText, owners: [] }],
    `already owned heading: \`${endpoint}\` docs/technical/platform/http.md#routes\n`,
  );
  assert.equal(accepted.status, 'reviewed');
  assert.equal(accepted.reviewed[0].source, 'docs/technical/platform/http.md#routes');
  assert.equal(accepted.candidates.length, 0);
});

test('a new public endpoint with no linked owner is unknown review needed', () => {
  const fx = fixture();
  seed(fx);
  const product = fx.readText('docs/product/README.md');
  const before = fx.files().slice().sort();
  const report = scan(fx, {
    available: true,
    commits: {
      ...commitsFor([
        'README.md',
        'STATUS.md',
        'docs/README.md',
        'docs/product/README.md',
        'docs/product/time.md',
        'docs/technical/platform/http.md',
        'apps/api/README.md',
        'work/changes/README.md',
        helper,
      ]),
    },
    dirty: [endpoint, helper],
    uncited: [endpoint],
    present: (rel) => fx.files().includes(rel),
  });
  assert.equal(fx.readText('docs/product/README.md'), product);
  assert.deepEqual(fx.files().slice().sort(), before);
  const hits = report.candidates.filter((item) => item.code === 'unknown-review-needed');
  assert.deepEqual(hits.map((item) => item.path), [endpoint]);
  assert.equal(hits[0].boundary, 'public-api-route');
  assert.match(hits[0].why, /apps\/api\/src\/modules\/widgets\/controller\.ts/);
  assert.match(hits[0].why, /@Get\('list'\)/);
  assert.match(hits[0].message, /unknown review needed/);
  assert.match(hits[0].message, /not new canon/);
  assert.equal(hits[0].canon, false);
  assert.equal(report.coverage.status, 'unknown review needed');
  assert.notEqual(report.coverage.status, 'complete');
  assert.equal(report.coverage.productBible, 'unchanged');
  assert.equal(
    report.candidates.some((item) => item.code === 'unknown-review-needed' && item.path === helper),
    false,
  );
  const summary = healthSummary(report);
  assert.match(summary, /coverage: unknown review needed\s+apps\/api\/src\/modules\/widgets\/controller\.ts/);
  assert.match(summary, /unknown-review-needed\s+apps\/api\/src\/modules\/widgets\/controller\.ts/);
  fx.cleanup();
});

test('an owned helper and a reasoned no-op do not demand a new page', () => {
  const fx = fixture();
  seed(fx, '# Status\n\nNo helper citation here.\n');
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    [
      '# Leaf',
      '',
      '**State:** Ready for close.',
      '',
      `documented no-op: \`${endpoint}\` because this route adds no new reader question beyond the existing health probe.`,
      `documented no-op: \`${helper}\` because the pure sum has no new reader question and does not need a page.`,
      '',
    ].join('\n'),
  );
  const report = scan(fx, {
    available: true,
    commits: commitsFor([
      'README.md',
      'STATUS.md',
      'docs/README.md',
      'docs/product/README.md',
      'docs/product/time.md',
      'docs/technical/platform/http.md',
      'apps/api/README.md',
      'work/changes/README.md',
      'work/changes/open/leaf/CHANGE.md',
    ]),
    dirty: [endpoint, helper],
    uncited: [endpoint, helper],
    present: (rel) => fx.files().includes(rel),
  });
  fx.cleanup();
  assert.equal(report.coverage.status, 'reviewed');
  assert.notEqual(report.coverage.status, 'complete');
  assert.equal(report.candidates.some((item) => item.code === 'unknown-review-needed'), false);
  assert.equal(
    report.coverage.reviewed.some(
      (item) => item.path === endpoint && item.disposition === 'documented no-op' && item.source.startsWith('because '),
    ),
    true,
  );
  assert.equal(
    report.candidates.some((item) => item.path === helper && /new page|unknown review needed/i.test(item.message)),
    false,
  );
  const blind = report.candidates.find((item) => item.code === 'no-known-route' && item.path === helper);
  assert.equal(blind == null || !/unknown review needed/.test(blind.message), true);
});
