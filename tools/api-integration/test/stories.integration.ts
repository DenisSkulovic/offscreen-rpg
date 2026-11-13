import { test } from 'node:test';
import { withAppIntegration } from './helpers/app-integration.js';
import { requireCookie } from './helpers/require.js';
import { checkStoryStart } from './story-start.integration.js';
import { checkGeneratedResolution } from './story-resolution.integration.js';
import { checkStoryBrowser } from './stories-browser.integration.js';
import { checkStoryCore } from './stories-core.integration.js';
import { checkStoryHttp } from './stories-http.integration.js';
import { checkPrivateRouteEvidence } from './private-route-evidence.integration.js';

test(
  'story integration through HTTP, database and browser',
  { timeout: 240000 },
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
      await checkPrivateRouteEvidence({
        ...shared,
        login: async () => {
          const session = await context.helpers.login({
            userId: context.user.id,
          });
          return { cookie: requireCookie(session.headers) };
        },
      });
      await checkStoryBrowser({
        ...shared,
        restartWorker: context.restartWorker,
      });
    });
  },
);
