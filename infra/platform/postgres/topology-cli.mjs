#!/usr/bin/env node
import process from 'node:process';
import {
  parseTopologyCliArgs,
  redactTopologyReceipt,
  runCnpgTopologyControl,
} from './topology.mjs';

function main() {
  let parsed;
  try {
    parsed = parseTopologyCliArgs(process.argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'topology argument parse failed';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  const receipt = runCnpgTopologyControl(parsed);
  process.stdout.write(`${JSON.stringify(redactTopologyReceipt(receipt))}\n`);
  if (!receipt.ok) {
    process.exit(1);
  }
}

main();
