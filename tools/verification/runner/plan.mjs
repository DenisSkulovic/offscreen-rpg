import { DB_SECTION_DEFINITIONS } from './catalog.mjs';
import { INFRA_SECTION_BY_ID } from '../suites/infra/manifest.mjs';
import { CACHE_SECTION_DEFINITIONS } from '../suites/packages/cache/manifest.mjs';

const ALLOWED_TIERS = new Set([
  'SOURCE',
  'FIXTURE',
  'LIVE',
  'LIVE-OBSERVATION',
]);

/**
 * @typedef {{
 *   id: string,
 *   tier: string,
 *   requires?: string[],
 *   resources?: string[],
 *   scenarioIds: string[],
 *   timeoutMs: number | null,
 * }} ExecutableSection
 */

/**
 * @param {string} resource
 */
function parseResourceSpec(resource) {
  const [kind, profile] = resource.split(':');
  if (!kind || !profile) {
    return { ok: false, message: `invalid resource spec: ${resource}` };
  }
  if (kind === 'postgres') {
    const allowedProfiles = new Set([
      'single',
      'constrained',
      'replicated',
      'dual-replicated',
    ]);
    if (!allowedProfiles.has(profile)) {
      return { ok: false, message: `unsupported resource profile: ${profile}` };
    }
    return { ok: true, kind, profile };
  }
  if (kind === 'redis') {
    const allowedProfiles = new Set(['single', 'constrained-noeviction']);
    if (!allowedProfiles.has(profile)) {
      return { ok: false, message: `unsupported resource profile: ${profile}` };
    }
    return { ok: true, kind, profile };
  }
  return { ok: false, message: `unsupported resource kind: ${kind}` };
}

/**
 * Validate stable section IDs, dependencies, resource specs and execution order.
 *
 * @param {object} catalogPlan from buildVerificationPlan
 */
export function materializeExecutionPlan(catalogPlan) {
  if (!catalogPlan?.sections?.length) {
    return { ok: false, message: 'empty plan' };
  }

  const sectionIds = catalogPlan.sections.map((row) => row.id);
  const unique = new Set(sectionIds);
  if (unique.size !== sectionIds.length) {
    return { ok: false, message: 'duplicate section IDs in plan' };
  }

  const definitionById = new Map(
    DB_SECTION_DEFINITIONS.map((row) => [row.id, row]),
  );
  for (const row of CACHE_SECTION_DEFINITIONS) {
    definitionById.set(row.id, row);
  }
  if (catalogPlan.subject?.kind === 'infra') {
    for (const row of INFRA_SECTION_BY_ID.values()) {
      definitionById.set(row.id, row);
    }
  }
  const selectedSet = new Set(sectionIds);
  const hasSource = selectedSet.has('source');

  /** @type {ExecutableSection[]} */
  const sections = [];
  for (const planned of catalogPlan.sections) {
    const definition = definitionById.get(planned.id);
    if (!definition && catalogPlan.subject?.kind === 'package') {
      return { ok: false, message: `unknown section id: ${planned.id}` };
    }
    if (definition && !ALLOWED_TIERS.has(definition.tier)) {
      return { ok: false, message: `invalid tier for section ${planned.id}` };
    }
    if (
      !definition &&
      catalogPlan.subject?.kind === 'infra' &&
      !INFRA_SECTION_BY_ID.has(planned.id)
    ) {
      return { ok: false, message: `unknown section id: ${planned.id}` };
    }
    const scenarioIds =
      planned.scenarioIds !== undefined
        ? [...planned.scenarioIds]
        : [...(definition?.scenarioIds ?? [])];
    if (!scenarioIds.length) {
      return {
        ok: false,
        message: `section ${planned.id} has no scenario IDs`,
      };
    }
    const stableIds = new Set(scenarioIds);
    if (stableIds.size !== scenarioIds.length) {
      return {
        ok: false,
        message: `duplicate scenario IDs in section ${planned.id}`,
      };
    }

    const resources = definition?.resources ?? [];
    for (const resource of resources) {
      const parsed = parseResourceSpec(resource);
      if (!parsed.ok) return parsed;
    }

    const timeoutMs = definition?.timeoutMs ?? planned.timeoutMs ?? null;
    if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
      return {
        ok: false,
        message: `invalid timeout for section ${planned.id}`,
      };
    }

    /** @type {string[]} */
    const requires = [];
    if (hasSource && planned.id !== 'source' && selectedSet.has('source')) {
      requires.push('source');
    }

    sections.push({
      id: planned.id,
      tier: planned.tier ?? definition?.tier ?? 'SOURCE',
      requires,
      resources,
      scenarioIds: [...scenarioIds],
      timeoutMs,
      plannedStatus: planned.plannedStatus ?? 'PLANNED',
    });
  }

  if (!validateDependencyOrder(sections)) {
    return { ok: false, message: 'invalid section dependency ordering' };
  }

  return {
    ok: true,
    plan: {
      subject: catalogPlan.subject,
      profile: catalogPlan.profile,
      live: Boolean(catalogPlan.live),
      mode: catalogPlan.mode,
      incomplete: Boolean(catalogPlan.incomplete),
      sections,
    },
  };
}

/**
 * @param {ExecutableSection[]} sections
 */
export function validateDependencyOrder(sections) {
  const seen = new Set();
  for (const section of sections) {
    for (const required of section.requires ?? []) {
      if (!seen.has(required)) return false;
    }
    seen.add(section.id);
  }
  return true;
}

/**
 * Peak sequential resource budget for selected sections (max single-section footprint).
 *
 * @param {ExecutableSection[]} sections
 */
export function peakResourceBudget(sections) {
  let peak = 0;
  for (const section of sections) {
    peak = Math.max(peak, section.resources?.length ?? 0);
  }
  return peak;
}
