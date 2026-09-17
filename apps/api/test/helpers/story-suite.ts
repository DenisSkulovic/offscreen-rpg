import { pathToFileURL } from 'node:url';
import { test, type TestContext } from 'node:test';
import type { Database } from '@offscreen/db';
import { withAppIntegration } from './app-integration.js';

export type StoryConcernArgs = {
  t: TestContext;
  database: Database;
  owner: string;
  origin: string;
  cookie: string;
  otherCookie: string;
  restartWorker: () => Promise<void>;
};

/** Register a selectable story concern when this module is the node:test entry. */
export function registerStoryConcern(
  moduleUrl: string,
  name: string,
  check: (args: StoryConcernArgs) => Promise<void>,
) {
  const entry = process.argv[1]
    ? pathToFileURL(process.argv[1]).href
    : undefined;
  if (entry !== moduleUrl) {
    return;
  }
  test(name, { timeout: 180000 }, async (t) => {
    await withAppIntegration(async (context) => {
      await context.restartWorker();
      await check({
        t,
        database: context.database,
        owner: context.ownerId,
        origin: context.origin,
        cookie: context.cookie,
        otherCookie: context.otherCookie,
        restartWorker: context.restartWorker,
      });
    });
  });
}
