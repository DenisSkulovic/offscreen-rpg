import { baselineCnpgClusterName } from '../config.mjs';
import {
  assertOwnedPostgresClusterName,
  assertOwnedPostgresDnsLabel,
  parseCanonicalPositiveInteger,
} from './model.mjs';

/** @typedef {'plan' | 'ensure' | 'status'} TopologyCommand */
/** @typedef {'dev' | 'release'} TopologyEnv */

/**
 * @typedef {{
 *   command: TopologyCommand,
 *   env: TopologyEnv,
 *   clusterName: string,
 *   instances: number,
 *   confirmContext?: string,
 *   allowScaleDown: boolean,
 *   ownerId?: string,
 *   outputMode: 'human' | 'json',
 *   noColor: boolean,
 * }} ParsedTopologyCli
 *
 * @typedef {{ help: true, command?: TopologyCommand }} ParsedTopologyCliHelp
 */

/**
 * @param {string[]} argv
 * @returns {ParsedTopologyCli | ParsedTopologyCliHelp}
 */
export function parseTopologyCliArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    throw new Error('topology command is required');
  }

  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    return { help: true };
  }

  const command = args[0];
  if (command === '--help' || command === '-h') {
    return { help: true };
  }
  if (command !== 'plan' && command !== 'ensure' && command !== 'status') {
    throw new Error('topology command must be plan, ensure, or status');
  }

  /** @type {Partial<ParsedTopologyCli>} */
  const parsed = {
    command,
    allowScaleDown: false,
    outputMode: 'human',
    noColor: false,
  };
  const seen = new Set();
  let help = false;
  let humanSeen = false;
  let jsonSeen = false;

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${token}`);
    }
    if (seen.has(token)) {
      throw new Error(`duplicate flag: ${token}`);
    }
    seen.add(token);

    if (token === '--help' || token === '-h') {
      // Normalize -h and --help as the same help request.
      if (token === '-h') {
        if (seen.has('--help')) {
          throw new Error('duplicate flag: --help');
        }
        seen.add('--help');
      } else if (seen.has('-h')) {
        throw new Error('duplicate flag: --help');
      }
      help = true;
      continue;
    }
    if (token === '--allow-scale-down') {
      parsed.allowScaleDown = true;
      continue;
    }
    if (token === '--human') {
      if (jsonSeen) {
        throw new Error('conflicting options: --human and --json');
      }
      humanSeen = true;
      parsed.outputMode = 'human';
      continue;
    }
    if (token === '--json') {
      if (humanSeen) {
        throw new Error('conflicting options: --human and --json');
      }
      jsonSeen = true;
      parsed.outputMode = 'json';
      continue;
    }
    if (token === '--no-color') {
      parsed.noColor = true;
      continue;
    }

    const next = args[index + 1];
    if (next == null || next.startsWith('--')) {
      throw new Error(`flag ${token} requires a value`);
    }

    if (token === '--env') {
      if (next !== 'dev' && next !== 'release') {
        throw new Error('env must be dev or release');
      }
      parsed.env = next;
      index += 1;
      continue;
    }
    if (token === '--cluster') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('cluster name is required');
      }
      parsed.clusterName = next;
      index += 1;
      continue;
    }
    if (token === '--owner') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('owner id is required');
      }
      parsed.ownerId = next;
      index += 1;
      continue;
    }
    if (token === '--instances') {
      parsed.instances = parseCanonicalPositiveInteger(next);
      index += 1;
      continue;
    }
    if (token === '--confirm-context') {
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('confirm-context value is required');
      }
      parsed.confirmContext = next;
      index += 1;
      continue;
    }

    throw new Error(`unknown flag: ${token}`);
  }

  if (help) {
    return { help: true, command };
  }

  if (parsed.noColor === true && parsed.outputMode !== 'human') {
    throw new Error('--no-color requires human output');
  }

  if (parsed.env == null) {
    throw new Error('--env is required');
  }
  if (parsed.clusterName == null) {
    throw new Error('--cluster is required');
  }
  if (parsed.instances == null) {
    throw new Error('--instances is required');
  }
  if (command === 'ensure' && parsed.confirmContext == null) {
    throw new Error('ensure requires --confirm-context');
  }

  const baselineName = baselineCnpgClusterName(parsed.env);
  const isBaselineCluster = parsed.clusterName === baselineName;
  if (parsed.ownerId != null) {
    assertOwnedPostgresDnsLabel(parsed.ownerId, 'ownerId', 1, 24);
    if (isBaselineCluster) {
      throw new Error('baseline cluster name cannot be used with --owner');
    }
    assertOwnedPostgresClusterName(parsed.env, parsed.clusterName);
  } else if (!isBaselineCluster) {
    throw new Error('--owner is required for non-baseline cluster names');
  }

  return /** @type {ParsedTopologyCli} */ (parsed);
}

/**
 * @param {ParsedTopologyCli} request
 */
export function isOwnedTopologyRequest(request) {
  return request.ownerId != null;
}
