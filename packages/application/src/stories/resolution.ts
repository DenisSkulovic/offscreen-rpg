import { prepareStorytellerResolution } from '../storyteller/admission';
import { createStoryResolutionCore } from './resolution-core';
import type { Database } from '@offscreen/db';
import type { DocumentStore } from '@offscreen/documents';

export function createStoryResolution(
  database: Database,
  documentStore?: DocumentStore,
) {
  return createStoryResolutionCore(database, documentStore, {
    prepareStorytellerResolution,
  });
}
