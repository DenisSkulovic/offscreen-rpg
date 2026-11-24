import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

export const DEV_SESSION_JSON_FILE_MODE = 0o600;

/**
 * Atomic session JSON publication: temp file in the destination directory,
 * mode 0600, write-then-rename. Own temp files are removed on error.
 *
 * @param {string} filePath
 * @param {unknown} payload
 * @param {{
 *   writePayload?: (tempPath: string, body: string) => void,
 *   finalize?: (tempPath: string, filePath: string) => void,
 * }} [hooks]
 */
export function writeDevSessionJsonAtomically(filePath, payload, hooks) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const body = `${JSON.stringify(payload)}\n`;
  const tempPath = join(dir, `.${basename(filePath)}.${randomUUID()}.tmp`);
  /** @type {number | null} */
  let fd = null;
  try {
    if (hooks?.writePayload) {
      hooks.writePayload(tempPath, body);
    } else {
      fd = openSync(tempPath, 'wx', DEV_SESSION_JSON_FILE_MODE);
      writeSync(fd, body, 'utf8');
      closeSync(fd);
      fd = null;
    }
    if (hooks?.finalize) {
      hooks.finalize(tempPath, filePath);
    } else {
      renameSync(tempPath, filePath);
      chmodSync(filePath, DEV_SESSION_JSON_FILE_MODE);
    }
  } catch (error) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
    }
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    } catch {
      // ignore
    }
    throw error;
  }
}

/**
 * @param {string} filePath
 */
export function devSessionJsonFileMode(filePath) {
  return statSync(filePath).mode & 0o777;
}
