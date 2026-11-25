import process from 'node:process';
import { assertPlatformTarget } from './commands.mjs';
import { formatManifestDocuments } from './manifest-output.mjs';
import {
  assertPlatformRenderRequest,
  renderPlatformDocuments,
} from './render.mjs';

const ACCEPTED_FORMATS = new Set(['yaml', 'json', 'legacy']);

function usage() {
  process.stderr.write(
    'usage: node infra/platform/common/cli.mjs render <service> <dev|release> [section]\n' +
      '       node infra/platform/common/cli.mjs target <dev|release>\n' +
      '       node infra/platform/common/cli.mjs --help\n',
  );
}

function printTopHelp() {
  process.stdout.write(
    'Platform common CLI\n\n' +
      'Commands:\n' +
      '  render  Render Helm platform manifests to stdout\n' +
      '  target  Verify kubectl context for a profile\n\n' +
      'Examples:\n' +
      '  node infra/platform/common/cli.mjs render postgres dev namespace\n' +
      '  node infra/platform/common/cli.mjs render --format yaml redis release all\n' +
      '  node infra/platform/common/cli.mjs target dev\n' +
      '  node infra/platform/common/cli.mjs render --help\n',
  );
}

function printRenderHelp() {
  process.stdout.write(
    'Render platform manifests\n\n' +
      'usage: node infra/platform/common/cli.mjs render [options] <service> <dev|release> [section]\n\n' +
      'Options:\n' +
      '  --format <yaml|json|legacy>  output format (default: legacy)\n' +
      '  --help                       show this help\n\n' +
      'Examples:\n' +
      '  node infra/platform/common/cli.mjs render postgres dev\n' +
      '  node infra/platform/common/cli.mjs render postgres dev namespace --format yaml\n' +
      '  node infra/platform/common/cli.mjs render --format json redis release all\n',
  );
}

function printTargetHelp() {
  process.stdout.write(
    'Verify platform target context\n\n' +
      'usage: node infra/platform/common/cli.mjs target <dev|release>\n\n' +
      'Options:\n' +
      '  --help  show this help\n\n' +
      'Examples:\n' +
      '  node infra/platform/common/cli.mjs target dev\n' +
      '  node infra/platform/common/cli.mjs target release\n',
  );
}

/**
 * @param {string[]} args arguments after the render subcommand
 * @returns {{ kind: 'help' } | { kind: 'render', service: string, profile: string, section: string, format: 'yaml' | 'json' | 'legacy' }}
 */
function parseRenderArgv(args) {
  let format = /** @type {'yaml' | 'json' | 'legacy'} */ ('legacy');
  let help = false;
  /** @type {string[]} */
  const positionals = [];
  const seen = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help') {
      if (seen.has('--help')) {
        throw new Error('duplicate flag: --help');
      }
      seen.add('--help');
      help = true;
      continue;
    }
    if (token === '--format') {
      if (seen.has('--format')) {
        throw new Error('duplicate flag: --format');
      }
      seen.add('--format');
      const value = args[index + 1];
      if (value == null || value.startsWith('--')) {
        throw new Error('flag --format requires a value');
      }
      if (!ACCEPTED_FORMATS.has(value)) {
        throw new Error(`unsupported manifest format: ${value}`);
      }
      format = /** @type {'yaml' | 'json' | 'legacy'} */ (value);
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`unknown flag: ${token}`);
    }
    positionals.push(token);
  }

  if (help) {
    return { kind: 'help' };
  }

  if (positionals.length < 2 || positionals.length > 3) {
    throw new Error(
      'render requires <service> <dev|release> and an optional [section]',
    );
  }

  const [service, profile, section = 'all'] = positionals;
  if (profile !== 'dev' && profile !== 'release') {
    throw new Error(`unsupported profile: ${profile}`);
  }

  return { kind: 'render', service, profile, section, format };
}

/**
 * @param {string[]} args arguments after the target subcommand
 * @returns {{ kind: 'help' } | { kind: 'target', profile: 'dev' | 'release' }}
 */
function parseTargetArgv(args) {
  const seen = new Set();

  for (const token of args) {
    if (token === '--help') {
      if (seen.has('--help')) {
        throw new Error('duplicate flag: --help');
      }
      seen.add('--help');
      if (args.length !== 1) {
        throw new Error('target --help does not accept additional arguments');
      }
      return { kind: 'help' };
    }
    if (token.startsWith('--')) {
      throw new Error(`unknown flag: ${token}`);
    }
  }

  if (args.length === 0) {
    throw new Error('target requires <dev|release>');
  }
  if (args.length > 1) {
    throw new Error(`unexpected argument: ${args[1]}`);
  }

  const profile = args[0];
  if (profile !== 'dev' && profile !== 'release') {
    throw new Error(`unsupported profile: ${profile}`);
  }

  return { kind: 'target', profile };
}

/**
 * @param {string[]} argv full process argv
 */
function parsePlatformCliArgv(argv) {
  const args = argv.slice(2);

  if (args.length === 1 && args[0] === '--help') {
    return { kind: 'help', scope: 'top' };
  }

  if (args.length === 0) {
    return { kind: 'usage-error' };
  }

  const command = args[0];
  if (command === 'render') {
    const parsed = parseRenderArgv(args.slice(1));
    if (parsed.kind === 'help') {
      return { kind: 'help', scope: 'render' };
    }
    return parsed;
  }

  if (command === 'target') {
    const parsed = parseTargetArgv(args.slice(1));
    if (parsed.kind === 'help') {
      return { kind: 'help', scope: 'target' };
    }
    return parsed;
  }

  return { kind: 'usage-error' };
}

function runRenderCli(service, profile, section, format) {
  try {
    assertPlatformRenderRequest(service, profile, section);
    const documents = renderPlatformDocuments({ service, profile, section });
    process.stdout.write(formatManifestDocuments(documents, format));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'render failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

function runTargetCli(profile) {
  try {
    assertPlatformTarget(profile);
    process.stdout.write(`target ok: ${profile}\n`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'target verification failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

function main() {
  let parsed;
  try {
    parsed = parsePlatformCliArgv(process.argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'invalid arguments';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  if (parsed.kind === 'usage-error') {
    usage();
    process.exit(1);
  }

  if (parsed.kind === 'help') {
    if (parsed.scope === 'top') {
      printTopHelp();
    } else if (parsed.scope === 'render') {
      printRenderHelp();
    } else {
      printTargetHelp();
    }
    return;
  }

  if (parsed.kind === 'render') {
    runRenderCli(parsed.service, parsed.profile, parsed.section, parsed.format);
    return;
  }

  if (parsed.kind === 'target') {
    runTargetCli(parsed.profile);
  }
}

main();
