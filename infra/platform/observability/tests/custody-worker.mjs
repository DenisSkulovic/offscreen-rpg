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

import { custodyPaths } from '../custody.mjs';

function assertOwnerOnly(stat, directory) {
  if (directory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('unsafe observability custody path type');
  }
  if (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) {
    throw new Error('unsafe observability custody path permissions');
  }
}

/**
 * Acquires the context lock, starts a sleeper that inherits the open lock fd as descriptor 3,
 * then closes and exits so contenders prove the inherited description stays locked.
 */
function parentDeath(stateRoot, contextName, holdMs) {
  const { lockDirectory, lockPath } = custodyPaths(stateRoot, contextName);
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  assertOwnerOnly(lstatSync(lockDirectory), true);
  const fd = openSync(
    lockPath,
    constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
    0o600,
  );
  try {
    const stat = fstatSync(fd);
    assertOwnerOnly(stat, false);
    const pathStat = lstatSync(lockPath);
    if (
      stat.ino !== pathStat.ino ||
      stat.dev !== pathStat.dev ||
      pathStat.nlink !== 1
    ) {
      throw new Error('lock identity mismatch');
    }
    const acquire = spawnSync('flock', ['--exclusive', '--wait', '5', '3'], {
      stdio: ['ignore', 'ignore', 'ignore', fd],
    });
    if (acquire.error || acquire.status !== 0) {
      throw new Error('helper could not acquire observability lock');
    }

    const script = `setTimeout(() => {}, ${holdMs})`;
    const sleeper = spawn(process.execPath, ['-e', script], {
      stdio: ['ignore', 'ignore', 'ignore', fd],
      detached: false,
    });
    sleeper.unref();
  } finally {
    closeSync(fd);
  }
}

const [stateRoot, contextName, holdMs = '500'] = process.argv.slice(2);
if (!stateRoot || !contextName) {
  process.stderr.write(
    'usage: custody-worker.mjs <stateRoot> <contextName> [holdMs]\n',
  );
  process.exitCode = 2;
} else {
  try {
    parentDeath(stateRoot, contextName, Number(holdMs));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'helper failed'}\n`,
    );
    process.exitCode = 1;
  }
}
