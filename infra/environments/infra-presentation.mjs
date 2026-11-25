/** @typedef {'plan' | 'up' | 'status'} InfraCommand */
/** @typedef {'dev' | 'release'} InfraProfileId */

import { PLATFORM_SERVICE_CATALOG } from './platform-plan.mjs';

const ALLOWED_SERVICES = new Set(PLATFORM_SERVICE_CATALOG);

const ALLOWED_PHASE_IDS = new Set([
  'cluster-ensure',
  'cluster-verify',
  'cluster-inventory',
  'cluster-ready',
  'platform-ensure',
  'complete',
  'selection',
  'status',
  'plan',
  'cnpg',
  'postgres',
  'object-storage',
  'temporal',
  'redis',
  'gateway',
  'rabbitmq',
  'observability',
]);

const ALLOWED_PREFLIGHT = new Set([
  'target',
  'memory',
  'helm',
  'chart-render',
  'gateway-install',
]);

const ALLOWED_REFUSAL_IDS = new Set([
  'invalid-services',
  'unsupported-service',
  'context-confirmation',
  'unknown-profile',
  'unknown-command',
  'preflight',
]);

const CLUSTER_LABELS = Object.freeze({
  present: 'PRESENT',
  absent: 'ABSENT',
  unreadable: 'UNREADABLE',
  created: 'CREATED',
});

/**
 * @param {string} serviceId
 */
function allowlistedService(serviceId) {
  return typeof serviceId === 'string' && ALLOWED_SERVICES.has(serviceId)
    ? serviceId
    : null;
}

/**
 * @param {string} phaseId
 */
function allowlistedPhase(phaseId) {
  return typeof phaseId === 'string' && ALLOWED_PHASE_IDS.has(phaseId)
    ? phaseId
    : null;
}

/**
 * @param {string} step
 */
function allowlistedPreflight(step) {
  return typeof step === 'string' && ALLOWED_PREFLIGHT.has(step) ? step : null;
}

/**
 * @param {unknown} refusals
 * @returns {string[]}
 */
function refusalIds(refusals) {
  if (!Array.isArray(refusals)) {
    return [];
  }
  /** @type {string[]} */
  const ids = [];
  for (const item of refusals) {
    const id =
      item && typeof item === 'object' && 'id' in item ? item.id : null;
    if (typeof id === 'string' && ALLOWED_REFUSAL_IDS.has(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * @param {string | undefined} raw
 */
function mapServicePresentation(raw) {
  switch (raw) {
    case 'installed':
      return 'READY';
    case 'not-installed':
      return 'ABSENT';
    case 'not-ready':
      return 'NOT READY';
    case 'unreadable':
    case 'unsupported':
    default:
      return 'UNKNOWN';
  }
}

/**
 * @param {string | undefined} raw
 */
function mapClusterPresentation(raw) {
  if (raw === 'present') {
    return CLUSTER_LABELS.present;
  }
  if (raw === 'absent') {
    return CLUSTER_LABELS.absent;
  }
  if (raw === 'unreadable') {
    return CLUSTER_LABELS.unreadable;
  }
  if (raw === 'created') {
    return CLUSTER_LABELS.created;
  }
  return 'UNKNOWN';
}

/**
 * @param {Record<string, number>} tallies
 */
function formatCountLine(tallies) {
  const parts = [];
  for (const key of ['READY', 'ABSENT', 'NOT READY', 'UNKNOWN']) {
    const count = tallies[key] ?? 0;
    if (count > 0) {
      parts.push(`${key.toLowerCase()} ${count}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : 'none observed';
}

/**
 * @param {InfraProfileId} profileId
 * @param {unknown} payload
 * @param {{ services?: string }} options
 */
function nextStatusCommand(profileId, payload, options) {
  let services = options.services;
  if (typeof services !== 'string' || services.trim().length === 0) {
    const selected =
      payload &&
      typeof payload === 'object' &&
      Array.isArray(
        /** @type {{ selectedServices?: string[] }} */ (payload)
          .selectedServices,
      )
        ? /** @type {{ selectedServices: string[] }} */ (payload)
            .selectedServices
        : [];
    if (selected.length > 0) {
      const cleaned = selected
        .map((id) => allowlistedService(id))
        .filter((id) => id !== null);
      services = cleaned.length > 0 ? cleaned.join(',') : 'core';
    } else {
      services = 'core';
    }
  }
  return `node infra/environments/infra-cli.mjs status --env ${profileId} --services ${services}`;
}

/**
 * @param {InfraCommand} command
 * @param {InfraProfileId} profileId
 * @param {unknown} payload
 * @param {{ contextName?: string, services?: string }} [options]
 * @returns {string}
 */
export function formatInfraResult(command, profileId, payload, options = {}) {
  /** @type {string[]} */
  const lines = [
    'OFFSCREEN',
    'PLATFORM',
    `cmd: ${command}`,
    `env: ${profileId}`,
  ];

  const contextFromPayload =
    payload && typeof payload === 'object' && 'contextName' in payload
      ? /** @type {{ contextName?: string }} */ (payload).contextName
      : undefined;
  const context =
    typeof contextFromPayload === 'string' && contextFromPayload.length > 0
      ? contextFromPayload
      : typeof options.contextName === 'string' &&
          options.contextName.length > 0
        ? options.contextName
        : 'UNKNOWN';
  lines.push(`ctx: ${context}`);
  lines.push('');

  const body = formatCommandBody(command, profileId, payload);
  lines.push(...body);
  lines.push('');
  lines.push(`next: ${nextStatusCommand(profileId, payload, options)}`);

  return `${lines.join('\n')}\n`;
}

/**
 * @param {InfraCommand} command
 * @param {InfraProfileId} profileId
 * @param {unknown} payload
 * @returns {string[]}
 */
function formatCommandBody(command, profileId, payload) {
  if (!payload || typeof payload !== 'object') {
    return ['result: UNKNOWN', 'detail: omitted'];
  }

  const record = /** @type {Record<string, unknown>} */ (payload);

  const parseOnlyFailure =
    typeof record.message === 'string' &&
    !('cluster' in record) &&
    !('phases' in record) &&
    !('receipt' in record) &&
    !('phase' in record) &&
    !('ran' in record) &&
    !('refusals' in record) &&
    !('services' in record);
  if (parseOnlyFailure) {
    return ['result: REFUSED', 'reason: parse-error'];
  }

  const ids = refusalIds(record.refusals);
  if (ids.length > 0 && command === 'plan') {
    return formatPlanRefusal(record, ids);
  }
  if (ids.length > 0 && command === 'status') {
    return formatStatusRefusal(record, ids);
  }
  if (ids.length > 0 && command === 'up') {
    return formatUpResult(record, ids);
  }

  if (command === 'status') {
    return formatStatusBody(record);
  }
  if (command === 'plan') {
    return formatPlanBody(record);
  }
  if (command === 'up') {
    return formatUpResult(record, []);
  }

  return ['result: UNKNOWN'];
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} ids
 * @returns {string[]}
 */
function formatPlanRefusal(record, ids) {
  /** @type {string[]} */
  const lines = ['preview: read-only', 'result: REFUSED'];
  lines.push(`refusals: ${ids.join(' ')}`);
  if (record.phase === 'selection') {
    lines.push('phase: selection');
  }
  return lines;
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} ids
 * @returns {string[]}
 */
function formatStatusRefusal(record, ids) {
  return ['result: REFUSED', `refusals: ${ids.join(' ')}`, 'phase: selection'];
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string[]}
 */
function formatStatusBody(record) {
  /** @type {string[]} */
  const lines = [];
  lines.push('scope: status');
  lines.push(
    `cluster: ${mapClusterPresentation(String(record.cluster ?? ''))}`,
  );

  /** @type {string[]} */
  const selected = Array.isArray(record.selectedServices)
    ? record.selectedServices
        .map((id) => (typeof id === 'string' ? allowlistedService(id) : null))
        .filter((id) => id !== null)
    : [];

  const services =
    record.services && typeof record.services === 'object'
      ? /** @type {Record<string, { state?: string }>} */ (record.services)
      : {};

  /** @type {Record<string, number>} */
  const tallies = {};
  for (const serviceId of selected) {
    const observation = services[serviceId];
    const label = mapServicePresentation(observation?.state);
    tallies[label] = (tallies[label] ?? 0) + 1;
    lines.push(`${serviceId} ${label}`);
  }

  if (selected.length === 0) {
    lines.push('services: none selected');
  }

  lines.splice(2, 0, `counts: ${formatCountLine(tallies)}`);

  if (record.ok === true) {
    lines.push('observed: complete');
  }

  return lines;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string[]}
 */
function formatPlanBody(record) {
  /** @type {string[]} */
  const lines = ['preview: read-only', 'live: not observed'];

  if (record.ok === true) {
    lines.push('result: OK');
  } else if (record.ok === false) {
    lines.push('result: REFUSED');
  }

  const selected = Array.isArray(record.selectedServices)
    ? record.selectedServices
        .map((id) => (typeof id === 'string' ? allowlistedService(id) : null))
        .filter((id) => id !== null)
    : [];
  lines.push(
    selected.length > 0 ? `services: ${selected.join(' ')}` : 'services: none',
  );

  const preflight = Array.isArray(record.preflight)
    ? record.preflight
        .map((step) => allowlistedPreflight(String(step)))
        .filter((step) => step !== null)
    : [];
  lines.push(
    preflight.length > 0
      ? `preflight: ${preflight.join(' ')}`
      : 'preflight: none',
  );

  const phases = Array.isArray(record.phases) ? record.phases : [];
  /** @type {string[]} */
  const phaseLines = [];
  for (const phase of phases) {
    if (!phase || typeof phase !== 'object') {
      continue;
    }
    const id = allowlistedPhase(
      String(/** @type {{ id?: string }} */ (phase).id ?? ''),
    );
    if (!id) {
      continue;
    }
    const mutate = /** @type {{ mutate?: boolean }} */ (phase).mutate === true;
    phaseLines.push(`${id} ${mutate ? 'MUTATE' : 'READONLY'}`);
  }
  lines.push(phaseLines.length > 0 ? 'phases:' : 'phases: none');
  lines.push(...phaseLines);

  return lines;
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} refusalIdsFromPayload
 * @returns {string[]}
 */
function formatUpResult(record, refusalIdsFromPayload) {
  /** @type {string[]} */
  const lines = [];

  const ok = record.ok === true;
  const refusalList = [
    ...refusalIdsFromPayload,
    ...refusalIds(record.refusals),
  ];
  if (!ok && refusalList.length > 0) {
    lines.push('result: REFUSED');
  } else {
    lines.push(ok ? 'result: OK' : 'result: FAILURE');
  }

  if (typeof record.phase === 'string') {
    const phase = allowlistedPhase(record.phase) ?? 'UNKNOWN';
    lines.push(`phase: ${phase}`);
  }

  if (typeof record.cluster === 'string') {
    lines.push(`cluster: ${mapClusterPresentation(record.cluster)}`);
  }

  const ran = Array.isArray(record.ran)
    ? record.ran
        .map((id) => allowlistedPhase(String(id)))
        .filter((id) => id !== null)
    : [];
  lines.push(ran.length > 0 ? `ran: ${ran.join(' ')}` : 'ran: none');

  const receipt =
    record.receipt && typeof record.receipt === 'object'
      ? /** @type {{ skipped?: { id?: string }[], refusals?: { id?: string }[] }} */ (
          record.receipt
        )
      : null;

  const skipped =
    receipt && Array.isArray(receipt.skipped)
      ? receipt.skipped
          .map((item) => allowlistedPhase(String(item?.id ?? '')))
          .filter((id) => id !== null)
      : [];
  if (skipped.length > 0) {
    lines.push(`skipped: ${skipped.join(' ')}`);
  }

  const allRefusals = [
    ...refusalIdsFromPayload,
    ...(receipt ? refusalIds(receipt.refusals) : []),
    ...refusalIds(record.refusals),
  ];
  const uniqueRefusals = [...new Set(allRefusals)];
  if (uniqueRefusals.length > 0) {
    lines.push(`refusals: ${uniqueRefusals.join(' ')}`);
  }

  if (!ok) {
    lines.push('partial: UNKNOWN');
    lines.push('data: not asserted');
  }

  return lines;
}
