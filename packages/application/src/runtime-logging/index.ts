export type RuntimeLogLevel = 'info' | 'warn' | 'error';

export type RuntimeLogRecord = {
  level: RuntimeLogLevel;
  event: string;
  message: string;
  service: 'api' | 'worker';
  timestamp: string;
  correlation?: Readonly<Record<string, string>>;
  errorKind?: string;
};

type RuntimeLogInput = Omit<RuntimeLogRecord, 'timestamp'>;

/**
 * Process logs accept only deliberately selected public fields. Game history,
 * provider content, SQL and arbitrary Error messages belong in their owning
 * stores, never in this diagnostic stream by accident.
 */
export function writeRuntimeLog(
  input: RuntimeLogInput,
  write: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
) {
  write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...input,
    } satisfies RuntimeLogRecord),
  );
}

export function classifyRuntimeError(error: unknown) {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}
