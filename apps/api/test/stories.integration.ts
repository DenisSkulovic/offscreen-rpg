import type { TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { checkStoryBrowser } from './stories-browser.integration.js';
import { checkStoryCore } from './stories-core.integration.js';
import { checkStoryHttp } from './stories-http.integration.js';

export async function checkStories(
  t: TestContext,
  database: Database,
  owner: string,
  origin: string,
  cookie: string,
  otherCookie: string,
  restartWorker: () => Promise<void>,
) {
  await checkStoryCore({
    t,
    database,
    owner,
    origin,
    cookie,
    otherCookie,
  });
  await checkStoryHttp({
    t,
    database,
    owner,
    origin,
    cookie,
    otherCookie,
  });
  await checkStoryBrowser({
    t,
    database,
    owner,
    origin,
    cookie,
    otherCookie,
    restartWorker,
  });
}
