import { runPlatformCommand } from '../common/commands.mjs';
import { collectProjectedBaseline } from './bootstrap/projection.mjs';

export function runCnpgReadOnly(command, args, timeoutMs = 15000) {
  return { command, ...runPlatformCommand(command, args, { timeoutMs }) };
}

export function collectDevCnpgProbe(deps = {}) {
  const run = deps.run
    ? (command, args, options = {}) => deps.run(command, args, options.timeoutMs ?? 15000)
    : runPlatformCommand;
  return collectProjectedBaseline('dev', { ...deps, run });
}
