export const CACHE_MANIFEST_SCHEMA_VERSION = 1;

/** Frozen cache catalogue from docs/technical/platform/verification-programmes.md */
export const CACHE_PROFILE_SECTIONS = Object.freeze({
  source: Object.freeze(['source']),
  memory: Object.freeze(['source', 'memory']),
  standard: Object.freeze(['source', 'memory', 'redis']),
  stress: Object.freeze(['source', 'memory', 'pressure']),
  recovery: Object.freeze(['source', 'recovery']),
  sql: Object.freeze(['source', 'sql-origin', 'story-snapshot']),
  full: Object.freeze([
    'source',
    'memory',
    'redis',
    'pressure',
    'recovery',
    'sql-origin',
    'story-snapshot',
  ]),
});

export const CACHE_SECTION_DEFINITIONS = Object.freeze([
  {
    id: 'source',
    tier: 'SOURCE',
    resources: [],
    scenarioIds: ['CA-S01', 'CA-S02'],
    timeoutMs: 120_000,
  },
  {
    id: 'memory',
    tier: 'FIXTURE',
    resources: [],
    scenarioIds: ['CA-M01', 'CA-M02', 'CA-M03', 'CA-M04'],
    timeoutMs: 60_000,
  },
  {
    id: 'redis',
    tier: 'LIVE',
    resources: ['redis:single'],
    scenarioIds: ['CA-R01', 'CA-R02', 'CA-R03', 'CA-R04'],
    timeoutMs: 90_000,
  },
  {
    id: 'pressure',
    tier: 'LIVE',
    resources: ['redis:single'],
    scenarioIds: ['CA-P01', 'CA-P02', 'CA-P03'],
    timeoutMs: 120_000,
  },
  {
    id: 'recovery',
    tier: 'LIVE',
    resources: ['redis:single'],
    scenarioIds: ['CA-F01', 'CA-F02', 'CA-F03', 'CA-F04', 'CA-F05'],
    timeoutMs: 90_000,
  },
  {
    id: 'sql-origin',
    tier: 'LIVE',
    resources: ['postgres:single', 'redis:single'],
    scenarioIds: ['CA-D01', 'CA-D02'],
    timeoutMs: 120_000,
  },
  {
    id: 'story-snapshot',
    tier: 'LIVE',
    resources: ['postgres:single', 'redis:single'],
    scenarioIds: ['CA-D03'],
    timeoutMs: 180_000,
  },
]);

export const CACHE_SECTION_BY_ID = new Map(
  CACHE_SECTION_DEFINITIONS.map((row) => [row.id, row]),
);

export const CACHE_MANIFEST_NAME = '@offscreen/cache';

export const CACHE_MANIFEST = Object.freeze({
  schemaVersion: CACHE_MANIFEST_SCHEMA_VERSION,
  subject: Object.freeze({
    kind: 'package',
    manifestName: CACHE_MANIFEST_NAME,
  }),
  defaultProfile: 'source',
  manifestPath: 'suites/packages/cache/manifest.mjs',
  adapter: 'suites/packages/cache',
  implementationStatus: 'registered',
  profiles: CACHE_PROFILE_SECTIONS,
  sections: CACHE_SECTION_DEFINITIONS,
});
