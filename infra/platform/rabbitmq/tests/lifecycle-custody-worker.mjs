import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

/**
 * Acquires a rabbitmq context lock and starts a child that inherits fd 3.
 * Parent exits immediately; child holds inherited flock until holdMs.
 */
function parentWithInheritedChild(commonDir, contextName, holdMs) {
  const lockDirectory = join(commonDir, '.offscreen', 'platform-locks');
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const lockPath = join(lockDirectory, `${contextName}-rabbitmq.lock`);
  const fd = openSync(
    lockPath,
    constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
    0o600,
  );
  try {
    const stat = fstatSync(fd);
    const pathStat = lstatSync(lockPath);
    if (stat.ino !== pathStat.ino || stat.dev !== pathStat.dev) {
      throw new Error('lock identity mismatch');
    }
    const acquire = spawnSync('flock', ['--exclusive', '--wait', '5', '3'], {
      stdio: ['ignore', 'ignore', 'ignore', fd],
    });
    if (acquire.error || acquire.status !== 0) {
      throw new Error('helper could not acquire rabbitmq lock');
    }
    const sleeper = spawn(
      process.execPath,
      ['-e', `setTimeout(() => {}, ${holdMs})`],
      { stdio: ['ignore', 'ignore', 'ignore', fd], detached: false },
    );
    sleeper.unref();
  } finally {
    closeSync(fd);
  }
}

const [commonDir, contextName, holdMs = '400'] = process.argv.slice(2);
if (!commonDir || !contextName) {
  process.stderr.write(
    'usage: lifecycle-custody-worker.mjs <commonDir> <contextName> [holdMs]\n',
  );
  process.exitCode = 2;
} else {
  try {
    parentWithInheritedChild(commonDir, contextName, Number(holdMs));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'helper failed'}\n`,
    );
    process.exitCode = 1;
  }
}
