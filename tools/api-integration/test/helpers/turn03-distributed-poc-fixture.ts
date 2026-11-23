import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  importRulePackageDirectory,
  importStartPackageDirectory,
} from '@offscreen/content-packages';
import type {
  DocumentStore,
  RulePackageReference,
  StartPackageReference,
} from '@offscreen/documents';

const rulesPackageSource = resolve(
  process.cwd(),
  '../../content/rules/srd-5.2.1-subset',
);

/** Authored expectations for the provider-free distributed POC opening turn. */
export const turn03DistributedPocAuthorship = {
  draft: {
    title: 'Turn03 distributed POC harbor',
    premise: 'SpongeBob wakes in the pineapple with Gary.',
    storytellingDirection: 'Keep the delivery question unresolved at first.',
    storyteller: { id: 'absurd-action-comedy', revision: 1 as const },
    expectedRevision: 1,
  },
  scene1: {
    title: 'Morning in the pineapple',
    visibleChoice: {
      id: 'ask',
      label: 'Ask Gary about the delivery',
    },
  },
  scene2: {
    title: 'Gary\u2019s promise',
  },
  startPackage: {
    title: 'Harbor watch',
    orientationMarkdown:
      '# Harbor watch\n\nA still morning above the reef. Neutral ground for a pinned distributed-turn proof.',
  },
} as const;

export type Turn03DistributedPocRoots = Readonly<{
  rules: RulePackageReference;
  start: StartPackageReference;
  startPackageId: string;
}>;

export type Turn03DistributedPocFixture = Readonly<{
  roots: Turn03DistributedPocRoots;
  defaultRules: RulePackageReference;
}>;

/** Import pinned rule and start packages; IDs and root hashes are runtime-derived. */
export async function provisionTurn03DistributedPocFixture(
  storage: DocumentStore,
): Promise<Turn03DistributedPocFixture> {
  const rules = await importRulePackageDirectory(storage, rulesPackageSource);
  const defaultRules: RulePackageReference = {
    ruleSetId: rules.manifest.ruleSetId,
    rootHash: rules.rootHash,
    revision: rules.manifest.revision,
    engine: rules.manifest.engine,
  };
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), 'offscreen-turn03-poc-fixture-'),
  );
  const source = join(fixtureRoot, 'harbor-start');
  await mkdir(source, { recursive: true });
  await writeFile(
    join(source, 'START.md'),
    turn03DistributedPocAuthorship.startPackage.orientationMarkdown,
  );
  const startPackageId = randomUUID();
  await writeFile(
    join(source, 'start-package.json'),
    JSON.stringify({
      format: 'offscreen.start-package-source.v1',
      startPackageId,
      authorOperationId: randomUUID(),
      title: turn03DistributedPocAuthorship.startPackage.title,
      worlds: [],
      rules: defaultRules,
      documents: [
        {
          path: 'START.md',
          kind: 'orientation',
          activation: 'initial-canon',
          authority: 'canon',
          visibility: 'player-known',
        },
      ],
    }),
  );
  const imported = await importStartPackageDirectory(storage, source);
  const startReference: StartPackageReference = {
    startPackageId,
    rootHash: imported.rootHash,
    revision: imported.manifest.revision,
  };
  return {
    defaultRules,
    roots: {
      rules: defaultRules,
      start: startReference,
      startPackageId,
    },
  };
}
