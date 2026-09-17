type Closable = {
  close(): Promise<void>;
};

type Stoppable = {
  stop(): Promise<void>;
};

type KillableProcess = {
  exitCode: number | null;
  kill(): void;
};

/** Release launcher resources independently so one close failure cannot strand the rest. */
export async function stopChamberResources(resources: {
  browser: Closable | undefined;
  runtime: Stoppable | undefined;
  web: KillableProcess | undefined;
  webExit: Promise<unknown> | undefined;
  app: Closable;
  database: Closable;
}) {
  const failures: unknown[] = [];
  const attempt = async (step: () => void | Promise<void>) => {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  };

  await attempt(async () => {
    await resources.browser?.close();
  });
  await attempt(async () => {
    await resources.runtime?.stop();
  });
  await attempt(async () => {
    if (resources.web && resources.web.exitCode === null) {
      resources.web.kill();
    }
    await resources.webExit;
  });
  await attempt(async () => {
    await resources.app.close();
  });
  await attempt(async () => {
    await resources.database.close();
  });

  if (failures.length === 0) {
    return;
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  throw new AggregateError(failures, 'Chamber resource cleanup failed');
}
