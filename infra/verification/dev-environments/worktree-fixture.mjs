/**
 * Disposable worktree byte save/restore for verification fixtures.
 * Never uses git reset; callers restore exact original bytes in finally.
 */

/**
 * @param {{
 *   readBytes: (relativePath: string) => Promise<Buffer | null>,
 *   writeBytes: (relativePath: string, bytes: Buffer) => Promise<void>,
 *   relativePath: string,
 *   transform: (original: Buffer) => Buffer,
 * }} input
 */
export async function withDisposableWorktreeEdit(input) {
  const original =
    (await input.readBytes(input.relativePath)) ?? Buffer.alloc(0);
  let restored = false;
  const restore = async () => {
    if (restored) return;
    restored = true;
    await input.writeBytes(input.relativePath, original);
  };
  try {
    const edited = input.transform(original);
    await input.writeBytes(input.relativePath, edited);
    return { ok: true, original, restore };
  } catch (error) {
    await restore();
    throw error;
  }
}

/**
 * @param {number} deadlineMs
 * @param {() => number} now
 * @param {number} intervalMs
 * @param {() => Promise<{ done: boolean, value?: unknown, reason?: string }>} probe
 */
export async function pollWithDeadline(
  deadlineMs,
  now,
  intervalMs,
  probe,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  const end = now() + deadlineMs;
  while (now() <= end) {
    const attempt = await probe();
    if (attempt.done) {
      return { ok: true, value: attempt.value ?? null };
    }
    const remaining = end - now();
    if (remaining <= 0) break;
    const waitMs = Math.min(intervalMs, remaining);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }
  return { ok: false, reason: 'poll-timeout', reasonCode: 'poll-timeout' };
}