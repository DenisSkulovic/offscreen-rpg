#!/usr/bin/env node
import process from 'node:process';
import {
  parseTopologyCliArgs,
  redactTopologyReceipt,
  runCnpgTopologyControl,
} from './topology.mjs';
import {
  buildTopologyCliHelp,
  formatTopologyResult,
} from './topology-presentation.mjs';

/**
 * @param {string[]} argv
 * @param {{
 *   runControl?: typeof runCnpgTopologyControl,
 *   write?: (chunk: string) => void,
 *   writeError?: (chunk: string) => void,
 * }} [deps]
 */
export function runTopologyCliArgv(argv, deps = {}) {
  const write = deps.write ?? ((chunk) => process.stdout.write(chunk));
  const writeError =
    deps.writeError ?? ((chunk) => process.stderr.write(chunk));
  const runControl = deps.runControl ?? runCnpgTopologyControl;

  let parsed;
  try {
    parsed = parseTopologyCliArgs(argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'topology argument parse failed';
    writeError(`${message}\n`);
    return { exitCode: 1 };
  }

  if ('help' in parsed && parsed.help) {
    write(buildTopologyCliHelp(parsed.command));
    return { exitCode: 0, wroteHelp: true };
  }

  const receipt = runControl(parsed);
  const redacted = redactTopologyReceipt(receipt);
  if (parsed.outputMode === 'json') {
    write(`${JSON.stringify(redacted)}\n`);
  } else {
    write(formatTopologyResult(redacted));
  }
  return { exitCode: receipt.ok ? 0 : 1 };
}

function main() {
  const result = runTopologyCliArgv(process.argv);
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('topology-cli.mjs');
if (isMain) {
  main();
}
