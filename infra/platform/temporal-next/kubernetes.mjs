import { assertPlatformTarget, runPlatformCommand } from '../common/commands.mjs';
import { OWNER_KEY } from './deployment.mjs';

const FIELD_MANAGER = 'offscreen-temporal-next';

export function kubernetes(config, run = runPlatformCommand) {
  function command(args, options) {
    const result = run('kubectl', ['--context', config.context, '-n', config.namespace, ...args], options);
    if (result?.ok !== true) throw new Error('kubectl operation failed: ' + args.slice(0, 2).join(' '));
    return result.stdout;
  }

  function read(kind, name) {
    const output = command(['get', kind, name, '--ignore-not-found', '-o', 'json']);
    if (!output.trim()) return null;
    const object = JSON.parse(output);
    if (object.metadata?.name !== name ||
        (kind !== 'Namespace' && object.metadata?.namespace !== config.namespace) ||
        !object.metadata?.uid) throw new Error('resource identity mismatch: ' + name);
    return object;
  }

  function requireOwned(object, name) {
    if (!object || object.metadata.labels?.[OWNER_KEY] !== config.owner) {
      throw new Error('resource not owned: ' + name);
    }
  }

  function apply(object) {
    const existing = read(object.kind, object.metadata.name);
    if (existing) {
      requireOwned(existing, object.metadata.name);
      // SSA does not force conflicts or overwrite foreign field ownership.
      command(['apply', '--server-side', '--field-manager=' + FIELD_MANAGER, '-f', '-'], { input: JSON.stringify(object) });
    } else {
      // Create, not apply, so a racing foreign creation fails.
      command(['create', '-f', '-'], { input: JSON.stringify(object) });
    }
  }

  function assertTarget() {
    const target = assertPlatformTarget(config.profileId, { run });
    if (target.contextName !== config.context) throw new Error('context mismatch');
  }

  function requireNamespace() {
    requireOwned(read('Namespace', config.namespace), config.namespace);
  }

  return { command, read, apply, assertTarget, requireNamespace, requireOwned };
}
