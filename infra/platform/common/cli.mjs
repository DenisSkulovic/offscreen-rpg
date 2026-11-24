import process from 'node:process';
import { assertPlatformTarget } from './commands.mjs';
import {
  assertPlatformRenderRequest,
  renderPlatformDocuments,
  renderPlatformYaml,
} from './render.mjs';

function usage() {
  process.stderr.write(
    'usage: node infra/platform/common/cli.mjs render <service> <dev|release> <section>\n' +
      '       node infra/platform/common/cli.mjs target <dev|release>\n',
  );
}

function runRenderCli(service, profile, section) {
  try {
    assertPlatformRenderRequest(service, profile, section);
    const documents = renderPlatformDocuments({ service, profile, section });
    process.stdout.write(renderPlatformYaml(documents));
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
  const cmd = process.argv[2];
  if (cmd === 'render') {
    const service = process.argv[3];
    const profile = process.argv[4];
    const section = process.argv[5] ?? 'all';
    if (!service || !profile || !section) {
      usage();
      process.exit(1);
    }
    if (profile !== 'dev' && profile !== 'release') {
      process.stderr.write(`unsupported profile: ${profile}\n`);
      process.exit(1);
    }
    runRenderCli(service, profile, section);
    return;
  }
  if (cmd === 'target') {
    const profile = process.argv[3];
    if (profile !== 'dev' && profile !== 'release') {
      process.stderr.write(`unsupported profile: ${profile}\n`);
      process.exit(1);
    }
    runTargetCli(profile);
    return;
  }
  usage();
  process.exit(1);
}

main();
