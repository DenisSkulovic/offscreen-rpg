import { resolve } from 'node:path';
import {
  contentHashSchema,
  importRulePackageDirectory,
  rulePackageReferenceSchema,
  type DocumentStore,
  type RulePackageReference,
} from '@offscreen/documents';

const defaultRuleSourceDirectory = 'content/rules/srd-5.2.1-subset';

export async function resolveStartupDefaultRules(
  documentStore: DocumentStore | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RulePackageReference | undefined> {
  const pinnedRootHash = env['OFFSCREEN_DEFAULT_RULE_ROOT_HASH']?.trim();
  const ruleSource = env['OFFSCREEN_DEFAULT_RULE_SOURCE']?.trim();

  if (pinnedRootHash) {
    if (ruleSource) {
      throw new Error(
        'OFFSCREEN_DEFAULT_RULE_ROOT_HASH and OFFSCREEN_DEFAULT_RULE_SOURCE cannot both be set',
      );
    }
    if (!documentStore) {
      throw new Error(
        'OFFSCREEN_DEFAULT_RULE_ROOT_HASH requires a configured document store',
      );
    }
    const rootHash = contentHashSchema.parse(pinnedRootHash);
    const manifest = await documentStore.readRulePackageManifest(rootHash);
    return rulePackageReferenceSchema.parse({
      ruleSetId: manifest.ruleSetId,
      rootHash,
      revision: manifest.revision,
      engine: manifest.engine,
    });
  }

  if (!documentStore) {
    return undefined;
  }

  const imported = await importRulePackageDirectory(
    documentStore,
    resolve(ruleSource ?? defaultRuleSourceDirectory),
  );
  return rulePackageReferenceSchema.parse({
    ruleSetId: imported.manifest.ruleSetId,
    rootHash: imported.rootHash,
    revision: imported.manifest.revision,
    engine: imported.manifest.engine,
  });
}