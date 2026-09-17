type Closable = {
  close(): Promise<void>;
};

/** Close Temporal connections independently so one failure cannot strand the other. */
export async function closeWorkerConnections(args: {
  native: Closable | undefined;
  connection: Closable;
}) {
  const failures: unknown[] = [];
  if (args.native) {
    try {
      await args.native.close();
    } catch (error) {
      failures.push(error);
    }
  }
  try {
    await args.connection.close();
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 0) {
    return;
  }
  if (failures.length === 1) {
    throw failures[0];
  }
  throw new AggregateError(failures, 'Worker connection cleanup failed');
}
