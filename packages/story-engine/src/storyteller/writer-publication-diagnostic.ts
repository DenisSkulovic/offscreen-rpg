const SAFE_TOKEN = /^[a-z0-9_-]{1,80}$/;

export type WriterPublicationFailureIds = {
  missionId: string;
  generationId: string;
  storyId: string;
};

export type WriterPublicationHeld = {
  status: 'held';
  reason: 'publication_failed';
};

function safeToken(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_TOKEN.test(value) ? value : undefined;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return safeToken(error.code);
}

function errorReason(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('reason' in error)) {
    return undefined;
  }
  return safeToken(error.reason);
}

/** First source frame only. Error messages are not diagnostic fields. */
export function writerPublicationStackFrame(error: unknown): string | undefined {
  if (!(error instanceof Error) || typeof error.stack !== 'string') {
    return undefined;
  }
  const match = error.stack.match(/([A-Za-z0-9._-]+\.ts:\d+:\d+)/);
  return match?.[1];
}

export function attachWriterPublicationStage(error: unknown, stage: string): void {
  const token = safeToken(stage);
  if (!token || typeof error !== 'object' || error === null) {
    return;
  }
  const record = error as { publicationStage?: unknown };
  if (record.publicationStage === undefined) {
    record.publicationStage = token;
  }
}

export function writerPublicationStage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('publicationStage' in error)) {
    return undefined;
  }
  return safeToken(
    (error as { publicationStage?: unknown }).publicationStage,
  );
}

/**
 * Internal rollback record. The public result stays publication_failed.
 * Only ids, a stage token, an error class, and token-shaped code/reason are written.
 */
export function recordWriterPublicationFailure(
  error: unknown,
  ids: WriterPublicationFailureIds,
  write: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
): WriterPublicationHeld {
  const correlation: Record<string, string> = {
    missionId: ids.missionId,
    generationId: ids.generationId,
    storyId: ids.storyId,
  };
  const stage = writerPublicationStage(error);
  const code = errorCode(error);
  const reason = errorReason(error);
  const stackFrame = writerPublicationStackFrame(error);
  if (stage) correlation.publicationStage = stage;
  if (code) correlation.code = code;
  if (reason) correlation.reason = reason;
  if (stackFrame) correlation.stackFrame = stackFrame;
  write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'writer-scene.publication-failed',
      message: 'Writer scene publication rolled back.',
      service: 'worker',
      errorKind: error instanceof Error && error.name ? error.name : 'UnknownError',
      correlation,
    }),
  );
  return { status: 'held', reason: 'publication_failed' };
}
