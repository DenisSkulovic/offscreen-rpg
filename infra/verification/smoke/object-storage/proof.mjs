import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const VALID_PROFILES = new Set(['dev', 'release']);
export const PROOF_NAMESPACE_PATTERN = /^offscreen-s3-proof-[0-9a-f]{32}$/;

/**
 * @param {string[]} args
 * @returns {{ ok: true, profile: string, plan: boolean, live: boolean, confirmDisposable: boolean, cleanup: boolean } | { ok: false, stderr: string }}
 */
function parseArgv(args) {
  /** @type {string | null} */
  let profile = null;
  let plan = false;
  let live = false;
  let confirmDisposable = false;
  let cleanup = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--plan') {
      plan = true;
      continue;
    }
    if (token === '--live') {
      live = true;
      continue;
    }
    if (token === '--confirm-disposable') {
      confirmDisposable = true;
      continue;
    }
    if (token === '--cleanup') {
      cleanup = true;
      continue;
    }
    if (token === '--profile') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return {
          ok: false,
          stderr: 'object-storage proof: --profile requires a value\n',
        };
      }
      profile = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--profile=')) {
      profile = token.slice('--profile='.length);
      continue;
    }
    return {
      ok: false,
      stderr: `object-storage proof: unknown argument ${token}\n`,
    };
  }

  if (profile === null) {
    return {
      ok: false,
      stderr: 'object-storage proof: --profile is required\n',
    };
  }
  if (!VALID_PROFILES.has(profile)) {
    return {
      ok: false,
      stderr: `object-storage proof: unsupported profile ${profile}\n`,
    };
  }
  if (plan === live) {
    return {
      ok: false,
      stderr: 'object-storage proof: specify exactly one of --plan or --live\n',
    };
  }
  if (plan && (confirmDisposable || cleanup)) {
    return {
      ok: false,
      stderr:
        'object-storage proof: --confirm-disposable and --cleanup require --live\n',
    };
  }

  return { ok: true, profile, plan, live, confirmDisposable, cleanup };
}

export function createProofNamespace() {
  return `offscreen-s3-proof-${randomBytes(16).toString('hex')}`;
}

/**
 * @param {string[]} args
 * @param {{ plan?: (profile: string) => void | Promise<void>, ensure?: (ctx: { profile: string, namespace: string }) => void | Promise<void>, cleanup?: (namespace: string) => void | Promise<void>, createNamespace?: () => string }} [deps]
 * @returns {Promise<{ exitCode: number, stderr: string, wrote: boolean }>}
 */
export async function runObjectStorageProof(args, deps = {}) {
  const parsed = parseArgv(args);
  if (!parsed.ok) {
    return { exitCode: 2, stderr: parsed.stderr, wrote: false };
  }

  if (parsed.live && !parsed.confirmDisposable) {
    return {
      exitCode: 2,
      stderr:
        'refusing object-storage proof mutation without --confirm-disposable\n',
      wrote: false,
    };
  }

  if (parsed.plan) {
    if (typeof deps.plan !== 'function') {
      return {
        exitCode: 2,
        stderr: 'object-storage proof plan is not wired\n',
        wrote: false,
      };
    }
    await deps.plan(parsed.profile);
    return { exitCode: 0, stderr: '', wrote: false };
  }

  const namespace =
    typeof deps.createNamespace === 'function'
      ? deps.createNamespace()
      : createProofNamespace();

  if (typeof deps.ensure !== 'function') {
    return {
      exitCode: 2,
      stderr:
        'object-storage proof live ensure is owner-operated and not wired in this entrypoint\n',
      wrote: false,
    };
  }

  try {
    await deps.ensure({ profile: parsed.profile, namespace });
  } catch {
    return { exitCode: 1, stderr: '', wrote: true };
  }

  if (parsed.cleanup && typeof deps.cleanup === 'function') {
    await deps.cleanup(namespace);
  }

  return { exitCode: 0, stderr: '', wrote: true };
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const result = await runObjectStorageProof(process.argv.slice(2));
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}
