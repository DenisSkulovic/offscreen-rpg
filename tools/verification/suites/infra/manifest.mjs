import {
  CATALOG_SCENARIO_IDS,
  MON_FIXTURE_EVIDENCE,
  SCENARIO_TIER_MAP,
} from '../../../../infra/verification/verify.mjs';

export const INFRA_MANIFEST_SCHEMA_VERSION = 1;

/** @typedef {'source' | 'diagnostic'} InfraChildSuite */

/**
 * @typedef {{
 *   id: string,
 *   tier: 'SOURCE' | 'FIXTURE' | 'LIVE',
 *   requires: string[],
 *   resources: string[],
 *   scenarioIds: string[],
 *   timeoutMs: number,
 *   childSuite?: InfraChildSuite,
 *   programme?: string,
 * }} InfraSectionDefinition
 */

export const INFRA_SECTION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'source-suite',
    tier: 'SOURCE',
    requires: [],
    resources: [],
    scenarioIds: CATALOG_SCENARIO_IDS,
    timeoutMs: 120_000,
    childSuite: 'source',
  }),
  Object.freeze({
    id: 'diagnostic-suite',
    tier: 'FIXTURE',
    requires: [],
    resources: [],
    scenarioIds: CATALOG_SCENARIO_IDS,
    timeoutMs: 900_000,
    childSuite: 'diagnostic',
  }),
  Object.freeze({
    id: 'dev-lifecycle',
    tier: 'LIVE',
    requires: [],
    resources: [],
    scenarioIds: Object.freeze(['DEV-02', 'DEV-03', 'DEV-10']),
    timeoutMs: 40 * 60 * 1000,
    programme: 'infra/verification/dev-environments/dev-environment-live-dispatch.mjs',
  }),
  Object.freeze({
    id: 'dev-recovery',
    tier: 'LIVE',
    requires: [],
    resources: [],
    scenarioIds: Object.freeze(['DEV-07', 'DEV-08', 'DEV-09', 'DATA-01']),
    timeoutMs: 40 * 60 * 1000,
    programme: 'infra/verification/dev-environments/dev-environment-live-dispatch.mjs',
  }),
  Object.freeze({
    id: 'dev-selective-profiles',
    tier: 'LIVE',
    requires: [],
    resources: [],
    scenarioIds: Object.freeze(['DEV-04', 'DEV-05', 'DEV-14']),
    timeoutMs: 40 * 60 * 1000,
    programme: 'infra/verification/dev-environments/dev-environment-live-dispatch.mjs',
  }),
  Object.freeze({
    id: 'dev-selective-mixed-slots',
    tier: 'LIVE',
    requires: [],
    resources: [],
    scenarioIds: Object.freeze(['DEV-12']),
    timeoutMs: 40 * 60 * 1000,
    programme: 'infra/verification/dev-environments/dev-environment-live-dispatch.mjs',
  }),
]);

export const INFRA_SECTION_BY_ID = new Map(
  INFRA_SECTION_DEFINITIONS.map((row) => [row.id, row]),
);

export const INFRA_MANIFEST = Object.freeze({
  schemaVersion: INFRA_MANIFEST_SCHEMA_VERSION,
  subject: Object.freeze({ kind: 'infra', id: 'infra' }),
  defaultProfile: 'diagnostic',
  profiles: Object.freeze({
    source: Object.freeze({ sections: Object.freeze(['source-suite']) }),
    diagnostic: Object.freeze({
      sections: Object.freeze(['diagnostic-suite']),
    }),
    lifecycle: Object.freeze({
      sections: Object.freeze([
        'dev-lifecycle',
        'dev-recovery',
        'dev-selective-profiles',
      ]),
    }),
  }),
  sections: INFRA_SECTION_DEFINITIONS,
});

/**
 * @param {string} scenarioId
 */
export const DEV_LIFECYCLE_SCENARIO_IDS = Object.freeze([
  'DEV-02',
  'DEV-03',
  'DEV-10',
]);

export const DEV_RECOVERY_SCENARIO_IDS = Object.freeze([
  'DEV-07',
  'DEV-08',
  'DEV-09',
]);

export const DATA_TENANT_SCENARIO_IDS = Object.freeze(['DATA-01']);

export const DEV_SELECTIVE_SCENARIO_IDS = Object.freeze([
  'DEV-04',
  'DEV-05',
  'DEV-14',
]);

export const DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS = Object.freeze(['DEV-12']);

export const DEV_ENVIRONMENT_LIVE_SCENARIO_IDS = Object.freeze([
  ...DEV_LIFECYCLE_SCENARIO_IDS,
  ...DEV_RECOVERY_SCENARIO_IDS,
  ...DATA_TENANT_SCENARIO_IDS,
  ...DEV_SELECTIVE_SCENARIO_IDS,
  ...DEV_SELECTIVE_OPTIONAL_SCENARIO_IDS,
]);

export function infraScenarioHasFixtureProof(scenarioId) {
  return (
    Boolean(SCENARIO_TIER_MAP[scenarioId]) ||
    Boolean(MON_FIXTURE_EVIDENCE[scenarioId]) ||
    DEV_ENVIRONMENT_LIVE_SCENARIO_IDS.includes(scenarioId)
  );
}