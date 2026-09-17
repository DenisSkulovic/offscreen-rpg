import { test } from 'node:test';
import { withAppIntegration } from './helpers/app-integration.js';
import { checkStoryStart } from './story-start.integration.js';
import { checkGeneratedResolution } from './story-resolution.integration.js';
import { checkStoryBrowser } from './stories-browser.integration.js';
import { checkStoryCore } from './stories-core.integration.js';
import { checkStoryHttp } from './stories-http.integration.js';

test(
  'story integration through HTTP, database and browser',
  { timeout: 180000 },
  async (t) => {
    await withAppIntegration(async (context) => {
      await context.restartWorker();
      const shared = {
        t,
        database: context.database,
        owner: context.ownerId,
        origin: context.origin,
        cookie: context.cookie,
        otherCookie: context.otherCookie,
      };
      await checkStoryCore(shared);
      await checkStoryHttp(shared);
      await checkStoryStart(shared);
      await checkGeneratedResolution({
        ...shared,
        restartWorker: context.restartWorker,
      });
      await checkStoryBrowser({
        ...shared,
        restartWorker: context.restartWorker,
      });
    });
  },
);
