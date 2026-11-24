import 'reflect-metadata';
import type { z } from 'zod';
import type {
  qaEnvironmentSchema,
  qaGitStateSchema,
} from '@offscreen/lab-interface/qa';
import type { Database } from '@offscreen/db';
import {
  chamberAllowsResponse,
  createChamber,
  createLabWorkbenchService,
  createQaJourneys,
  type ChamberStorytellerControl,
} from '@offscreen/lab-support';
import { createApp, type CreateAppOptions } from '@offscreen/api/app';
import type { Auth } from '@offscreen/api/auth';
import {
  CHAMBER,
  ChamberStoriesController,
  ChamberToolsController,
} from './chamber-tools-controller.js';
import { CHAMBER_LAB, ChamberLabController } from './chamber-lab-controller.js';
import { QA_JOURNEYS, QaJourneysController } from './qa-journeys-controller.js';

export type LabAppOptions = Omit<CreateAppOptions, 'optionalExtension'> & {
  chamberStorytellerControl?: ChamberStorytellerControl;
  qaContext?: {
    git: z.infer<typeof qaGitStateSchema>;
    environment: z.infer<typeof qaEnvironmentSchema>;
  };
};

/**
 * One Nest application: the production API host plus the four developer
 * controllers. API Lab depends on the API; the API does not depend on this package.
 */
export async function createLabApp(
  database: Database,
  auth: Auth,
  origin: string,
  options: LabAppOptions = {},
) {
  const { chamberStorytellerControl, qaContext, ...hostOptions } = options;
  const qa = qaContext ?? {
    git: { commit: 'unrecorded', dirty: true },
    environment: { identity: 'local-test' },
  };
  return createApp(database, auth, origin, {
    ...hostOptions,
    optionalExtension: {
      fixtureSourceCanRespond: chamberAllowsResponse,
      controllers: [
        ChamberStoriesController,
        ChamberToolsController,
        ChamberLabController,
        QaJourneysController,
      ],
      providers: [
        {
          provide: CHAMBER,
          useValue: createChamber(database, {
            ...(options.documentStore
              ? { documentStore: options.documentStore }
              : {}),
            ...(options.readCache ? { cache: options.readCache } : {}),
            ...(options.onCacheIncident
              ? { onCacheIncident: options.onCacheIncident }
              : {}),
            ...(chamberStorytellerControl
              ? { storytellerControl: chamberStorytellerControl }
              : {}),
          }),
        },
        {
          provide: QA_JOURNEYS,
          useValue: createQaJourneys(database, qa),
        },
        {
          provide: CHAMBER_LAB,
          useValue: createLabWorkbenchService({
            gitCommit: qa.git.commit,
            dirty: qa.git.dirty,
          }),
        },
      ],
    },
  });
}
