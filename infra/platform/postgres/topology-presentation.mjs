/** Pure human presentation for PostgreSQL topology CLI receipts. */

/** @typedef {'plan' | 'ensure' | 'status'} TopologyCommand */

const REFUSAL_REASON_LABELS = Object.freeze({
  'target-unverified': 'selected kubectl target could not be verified',
  'unreadable-observation': 'cluster observation was unreadable',
  'wrong-context': 'live context does not match selected profile',
  'postgres-namespace-owner-mismatch':
    'postgres namespace owner labels mismatch',
  'postgres-namespace-uid-missing': 'postgres namespace uid missing',
  'crd-absent': 'CNPG Cluster CRD is absent',
  'operator-absent': 'CNPG operator is absent',
  'operator-image-mismatch': 'CNPG operator image does not match pin',
  'operator-not-available': 'CNPG operator is not Available',
  'cluster-identity-mismatch': 'live cluster identity does not match expected',
  'cluster-absent': 'baseline cluster is absent',
  'cluster-uid-missing': 'cluster uid missing',
  'cluster-resource-version-missing': 'cluster resourceVersion missing',
  'confirm-context-mismatch': 'ensure requires matching --confirm-context',
  'scale-down-not-allowed': 'scale-down requires --allow-scale-down',
  'live-memory-limit-unreadable': 'live memory limit could not be parsed',
  'insufficient-memory': 'host memory budget refuses the instance delta',
  'unhealthy-starting-topology': 'starting topology is not healthy for resize',
  'fence-changed-before-patch': 'target identity changed before patch',
  'fence-owned-namespace-drift':
    'owned namespace identity drifted before write',
  'patch-failed': 'instances patch failed',
  'patch-result-uncertain': 'instances patch result is uncertain',
  'readiness-timeout': 'desired topology readiness was not reached',
  'owned-namespace-foreign': 'owned namespace is foreign to this owner',
  'owned-namespace-uid-missing': 'owned namespace uid missing',
  'namespace-create-failed': 'owned namespace create failed',
  'namespace-create-unreadable': 'owned namespace create was unreadable',
  'cluster-create-unreadable': 'owned cluster create was unreadable',
  'create-conflict': 'owned create refused on conflict (no adopt)',
  'cluster-name-conflict': 'owned cluster name conflicts with existing object',
  'cluster-name-reserved': 'cluster name is reserved for baseline',
  'baseline-owner': 'baseline ownership labels mismatch',
  'baseline-uid': 'baseline uid missing',
  'baseline-namespace': 'baseline namespace mismatch',
});

const ALLOWED_REFUSAL_IDS = new Set(Object.keys(REFUSAL_REASON_LABELS));

/**
 * @param {TopologyCommand | undefined} [focusedCommand]
 * @returns {string}
 */
export function buildTopologyCliHelp(focusedCommand) {
  /** @type {string[]} */
  const lines = [
    'OFFSCREEN POSTGRES TOPOLOGY',
    '',
    'usage: pnpm infra:postgres <plan|ensure|status> [options]',
    '       node infra/platform/postgres/topology-cli.mjs <plan|ensure|status> [options]',
    '',
    'commands:',
    '  plan    read-only preview of current vs desired instances and budgets',
    '  status  read-only observation of readiness and resource budget',
    '  ensure  mutate instances (or create owned cluster) after context confirm',
    '',
    'options:',
    '  --env dev|release              target profile (required except --help)',
    '  --cluster NAME                 baseline or owned cluster name (required)',
    '  --instances N                  desired positive instance count (required)',
    '  --owner RUN_ID                 required for non-baseline cluster names',
    '  --confirm-context CONTEXT      required for ensure (operational auth)',
    '  --allow-scale-down             required when decreasing instance count',
    '  --json                         single JSON receipt on stdout',
    '  --human                        plain multi-line summary (default)',
    '  --no-color                     accepted with human output only',
    '  --help                         show this help and exit (no host access)',
    '',
    'profiles:',
    '  dev      baseline cluster dev-pg, context kind-offscreen-dev',
    '  release  baseline cluster lab-pg, context kind-offscreen-release',
    '',
    'modes:',
    '  baseline  --cluster matches profile baseline; refuses --owner',
    '  owned     non-baseline --cluster requires --owner (namespace offscreen-pg-<owner>)',
    '',
    'read-only vs mutating:',
    '  plan and status never mutate Kubernetes objects',
    '  ensure may patch baseline instances or create owned namespace/cluster',
    '',
    'output:',
    '  default  human text (instances, budgets, readiness, refusals)',
    '  --json   one JSON object; same fields and exit codes as before',
    '',
    'examples:',
    '  pnpm infra:postgres plan --env release --cluster lab-pg --instances 2',
    '  pnpm infra:postgres status --env release --cluster lab-pg --instances 2',
    '  pnpm infra:postgres ensure --env release --cluster lab-pg --instances 2 \\',
    '    --confirm-context kind-offscreen-release',
    '  pnpm infra:postgres ensure --env release --cluster lab-pg --instances 1 \\',
    '    --confirm-context kind-offscreen-release --allow-scale-down',
    '  pnpm infra:postgres plan --env release --owner RUN_ID --cluster pg-repl-a --instances 2',
    '  pnpm infra:postgres ensure --env release --owner RUN_ID --cluster pg-repl-a --instances 2 \\',
    '    --confirm-context kind-offscreen-release',
    '  pnpm infra:postgres status --env release --owner RUN_ID --cluster pg-repl-a --instances 2 --json',
  ];
  if (focusedCommand) {
    lines.splice(
      2,
      0,
      '',
      `focused: ${focusedCommand} (${focusedCommand === 'ensure' ? 'mutating' : 'read-only'})`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {unknown} refusals
 * @returns {{ id: string, reason: string }[]}
 */
function allowlistedRefusals(refusals) {
  if (!Array.isArray(refusals)) {
    return [];
  }
  /** @type {{ id: string, reason: string }[]} */
  const items = [];
  for (const item of refusals) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const id = /** @type {{ id?: unknown }} */ (item).id;
    if (typeof id !== 'string' || !ALLOWED_REFUSAL_IDS.has(id)) {
      continue;
    }
    items.push({
      id,
      reason: REFUSAL_REASON_LABELS[id] ?? id,
    });
  }
  return items;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatInstances(value) {
  if (value === null || value === undefined) {
    return 'UNKNOWN';
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value);
  }
  return 'UNKNOWN';
}

/**
 * @param {Record<string, unknown>} resources
 * @returns {string[]}
 */
function formatResourceBudget(resources) {
  /** @type {string[]} */
  const lines = ['budget:'];
  const current =
    resources.current && typeof resources.current === 'object'
      ? /** @type {Record<string, unknown>} */ (resources.current)
      : null;
  const target =
    resources.target && typeof resources.target === 'object'
      ? /** @type {Record<string, unknown>} */ (resources.target)
      : null;
  const delta =
    resources.delta && typeof resources.delta === 'object'
      ? /** @type {Record<string, unknown>} */ (resources.delta)
      : null;

  if (current) {
    lines.push(
      `  current instances ${formatInstances(current.instances)} mem-limit/inst ${String(current.memoryLimitPerInstanceMiB ?? 'UNKNOWN')}MiB mem-req/inst ${String(current.memoryRequestPerInstanceMiB ?? 'UNKNOWN')}MiB cpu-limit/inst ${String(current.cpuLimitPerInstance ?? 'UNKNOWN')} storage/inst ${String(current.storagePerInstance ?? 'UNKNOWN')}`,
    );
  } else {
    lines.push('  current UNKNOWN');
  }

  if (target) {
    lines.push(
      `  desired instances ${formatInstances(target.instances)} mem-limit-total ${String(target.memoryLimitTotalMiB ?? 'UNKNOWN')}MiB mem-req-total ${String(target.memoryRequestTotalMiB ?? 'UNKNOWN')}MiB cpu-limit/inst ${String(target.cpuLimitPerInstance ?? 'UNKNOWN')} storage/inst ${String(target.storagePerInstance ?? 'UNKNOWN')}`,
    );
  } else {
    lines.push('  desired UNKNOWN');
  }

  if (delta) {
    const sign =
      typeof delta.instances === 'number' && delta.instances > 0 ? '+' : '';
    lines.push(
      `  delta instances ${sign}${formatInstances(delta.instances)} mem-limit ${sign}${String(delta.memoryLimitMiB ?? 'UNKNOWN')}MiB mem-req ${sign}${String(delta.memoryRequestMiB ?? 'UNKNOWN')}MiB`,
    );
  }

  return lines;
}

/**
 * @param {Record<string, unknown>} receipt
 * @returns {string[]}
 */
function formatReadiness(receipt) {
  /** @type {string[]} */
  const lines = [];
  if (receipt.ok === true && receipt.command === 'plan') {
    lines.push('readiness: not observed (plan is read-only preview)');
  } else if (receipt.ok === true && receipt.command === 'status') {
    lines.push('readiness: observation complete');
  } else if (
    receipt.ok === true &&
    receipt.command === 'ensure' &&
    receipt.complete === true
  ) {
    lines.push('readiness: READY');
  } else if (
    Array.isArray(receipt.refusals) &&
    receipt.refusals.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        /** @type {{ id?: string }} */ (item).id === 'readiness-timeout',
    )
  ) {
    lines.push('readiness: NOT READY');
  } else if (receipt.ok === false) {
    lines.push('readiness: BLOCKED');
  } else {
    lines.push('readiness: UNKNOWN');
  }

  if (typeof receipt.currentPrimary === 'string' && receipt.currentPrimary) {
    lines.push(`primary: ${receipt.currentPrimary}`);
  }
  if (receipt.mutated === true) {
    lines.push('mutated: yes');
  } else if (receipt.mutated === false) {
    lines.push('mutated: no');
  }
  if (receipt.complete === true) {
    lines.push('complete: yes');
  } else if (receipt.complete === false) {
    lines.push('complete: no');
  }
  return lines;
}

/**
 * Format a redacted topology receipt for human operators.
 * @param {unknown} receipt
 * @returns {string}
 */
export function formatTopologyResult(receipt) {
  /** @type {string[]} */
  const lines = ['OFFSCREEN', 'POSTGRES TOPOLOGY'];

  if (!receipt || typeof receipt !== 'object') {
    lines.push('result: UNKNOWN');
    lines.push('detail: omitted');
    return `${lines.join('\n')}\n`;
  }

  const record = /** @type {Record<string, unknown>} */ (receipt);
  const command =
    record.command === 'plan' ||
    record.command === 'ensure' ||
    record.command === 'status'
      ? record.command
      : 'UNKNOWN';
  lines.push(`cmd: ${command}`);
  lines.push(
    `env: ${typeof record.env === 'string' && record.env.length > 0 ? record.env : 'UNKNOWN'}`,
  );

  if (record.mode === 'owned') {
    lines.push('mode: owned');
    if (typeof record.ownerId === 'string' && record.ownerId.length > 0) {
      lines.push(`owner: ${record.ownerId}`);
    }
    if (
      typeof record.clusterName === 'string' &&
      record.clusterName.length > 0
    ) {
      lines.push(`cluster: ${record.clusterName}`);
    }
    if (typeof record.namespace === 'string' && record.namespace.length > 0) {
      lines.push(`namespace: ${record.namespace}`);
    }
  } else if (
    typeof record.baselineCluster === 'string' &&
    record.baselineCluster.length > 0
  ) {
    lines.push('mode: baseline');
    lines.push(`cluster: ${record.baselineCluster}`);
  } else if (
    typeof record.clusterName === 'string' &&
    record.clusterName.length > 0
  ) {
    lines.push(`cluster: ${record.clusterName}`);
  }

  lines.push('');

  const refusals = allowlistedRefusals(record.refusals);
  if (record.ok === true) {
    lines.push('result: OK');
  } else if (refusals.length > 0) {
    lines.push('result: REFUSED');
  } else if (record.ok === false) {
    lines.push('result: FAILURE');
  } else {
    lines.push('result: UNKNOWN');
  }

  if (record.readOnly === true) {
    lines.push('access: read-only');
  } else if (record.readOnly === false) {
    lines.push('access: mutating');
  }

  lines.push(
    `instances: current ${formatInstances(record.currentInstances)} desired ${formatInstances(record.targetInstances)}`,
  );

  if (record.resources && typeof record.resources === 'object') {
    lines.push(
      ...formatResourceBudget(
        /** @type {Record<string, unknown>} */ (record.resources),
      ),
    );
  } else {
    lines.push('budget: unavailable');
  }

  lines.push(...formatReadiness(record));

  if (refusals.length > 0) {
    lines.push('refusals:');
    for (const item of refusals) {
      lines.push(`  ${item.id}: ${item.reason}`);
    }
  } else {
    lines.push('refusals: none');
  }

  if (
    record.endpoints &&
    typeof record.endpoints === 'object' &&
    !Array.isArray(record.endpoints)
  ) {
    const endpoints = /** @type {Record<string, unknown>} */ (record.endpoints);
    if (typeof endpoints.readWrite === 'string') {
      lines.push(`endpoint-rw: ${endpoints.readWrite}`);
    }
    if (typeof endpoints.readOnly === 'string') {
      lines.push(`endpoint-ro: ${endpoints.readOnly}`);
    }
  }

  lines.push('');
  lines.push(
    'next: pnpm infra:postgres status --env <env> --cluster <name> --instances <n> [--owner <id>]',
  );

  return `${lines.join('\n')}\n`;
}
