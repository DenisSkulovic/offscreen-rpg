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
 *   tier: 'SOURCE' | 'FIXTURE',
 *   requires: string[],
 *   resources: string[],
 *   scenarioIds: string[],
 *   timeoutMs: number,
 *   childSuite: InfraChildSuite,
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
  }),
  sections: INFRA_SECTION_DEFINITIONS,
});

/**
 * @param {string} scenarioId
 */
export function infraScenarioHasFixtureProof(scenarioId) {
  return (
    Boolean(SCENARIO_TIER_MAP[scenarioId]) ||
    Boolean(MON_FIXTURE_EVIDENCE[scenarioId])
  );
}