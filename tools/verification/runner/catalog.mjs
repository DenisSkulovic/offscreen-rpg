import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INFRA_SECTION_BY_ID } from '../suites/infra/manifest.mjs';

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

/** @typedef {'infra' | 'package' | 'app'} SubjectKind */
/** @typedef {'registered' | 'placeholder' | 'not-implemented'} ImplementationStatus */

/** Frozen DB catalogue from docs/technical/platform/verification-programmes.md */
export const DB_PROFILE_SECTIONS = Object.freeze({
  source: Object.freeze(['source']),
  standard: Object.freeze([
    'source',
    'admission',
    'transactions',
    'migrations',
    'telemetry',
  ]),
  stress: Object.freeze([
    'source',
    'admission-stress',
    'multiprocess',
    'constrained',
  ]),
  recovery: Object.freeze([
    'source',
    'shutdown',
    'connection-recovery',
    'transaction-fault',
  ]),
  topology: Object.freeze(['source', 'replicated', 'dual-replicated']),
  full: Object.freeze([
    'source',
    'admission',
    'transactions',
    'migrations',
    'admission-stress',
    'multiprocess',
    'constrained',
    'shutdown',
    'connection-recovery',
    'transaction-fault',
    'telemetry',
    'replicated',
    'dual-replicated',
  ]),
});

export const DB_SECTION_DEFINITIONS = Object.freeze([
  {
    id: 'source',
    tier: 'SOURCE',
    resources: [],
    scenarioIds: ['DB-S01', 'DB-S02'],
    timeoutMs: 120_000,
  },
  {
    id: 'admission',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-A01', 'DB-A02', 'DB-A03', 'DB-A04'],
    timeoutMs: 60_000,
  },
  {
    id: 'transactions',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-T01', 'DB-T02', 'DB-T03', 'DB-T04', 'DB-T05'],
    timeoutMs: 90_000,
  },
  {
    id: 'migrations',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-M01', 'DB-M02'],
    timeoutMs: 120_000,
  },
  {
    id: 'admission-stress',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-P01'],
    timeoutMs: 120_000,
  },
  {
    id: 'multiprocess',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-P02'],
    timeoutMs: 120_000,
  },
  {
    id: 'constrained',
    tier: 'LIVE',
    resources: ['postgres:constrained'],
    scenarioIds: ['DB-P03', 'DB-P04'],
    timeoutMs: 120_000,
  },
  {
    id: 'shutdown',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-R01'],
    timeoutMs: 60_000,
  },
  {
    id: 'connection-recovery',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-R02', 'DB-R03'],
    timeoutMs: 90_000,
  },
  {
    id: 'transaction-fault',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-R04'],
    timeoutMs: 90_000,
  },
  {
    id: 'telemetry',
    tier: 'LIVE',
    resources: ['postgres:single'],
    scenarioIds: ['DB-O01', 'DB-O02'],
    timeoutMs: 90_000,
  },
  {
    id: 'replicated',
    tier: 'LIVE',
    resources: ['postgres:replicated'],
    scenarioIds: ['DB-H01'],
    timeoutMs: 180_000,
  },
  {
    id: 'dual-replicated',
    tier: 'LIVE',
    resources: ['postgres:dual-replicated'],
    scenarioIds: ['DB-H02'],
    timeoutMs: 240_000,
  },
]);

const DB_MANIFEST_NAME = '@offscreen/db';

export const INFRA_SUITE = Object.freeze({
  kind: 'infra',
  id: 'infra',
  defaultProfile: 'diagnostic',
  implementationStatus: 'registered',
  adapter: 'suites/infra',
  profiles: Object.freeze({
    source: Object.freeze({
      sections: Object.freeze(['source-suite']),
    }),
    diagnostic: Object.freeze({
      sections: Object.freeze(['diagnostic-suite']),
    }),
  }),
});

const DB_SUITE_PLACEHOLDER = Object.freeze({
  kind: 'package',
  manifestName: DB_MANIFEST_NAME,
  defaultProfile: 'standard',
  implementationStatus: 'placeholder',
  manifestPath: 'suites/packages/db/manifest.mjs',
  profiles: DB_PROFILE_SECTIONS,
  sections: DB_SECTION_DEFINITIONS,
});

/**
 * @param {string} repoRoot
 * @param {'packages' | 'apps'} category
 */
export function discoverWorkspacePackages(repoRoot, category) {
  const base = join(repoRoot, category);
  let entries;
  try {
    entries = readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }

  /** @type {Array<{ dirName: string, manifestName: string }>} */
  const discovered = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(base, entry.name, 'package.json');
    try {
      const parsed = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (typeof parsed.name !== 'string' || parsed.name.length === 0) continue;
      discovered.push({ dirName: entry.name, manifestName: parsed.name });
    } catch {
      continue;
    }
  }

  return discovered.sort((left, right) =>
    left.manifestName.localeCompare(right.manifestName),
  );
}

/**
 * @param {string} repoRoot
 */
export function buildVerificationCatalog(repoRoot) {
  const packages = discoverWorkspacePackages(repoRoot, 'packages');
  const apps = discoverWorkspacePackages(repoRoot, 'apps');

  /** @type {Array<Record<string, unknown>>} */
  const packageEntries = packages.map((entry) => {
    if (entry.manifestName === DB_MANIFEST_NAME) {
      return {
        kind: 'package',
        dirName: entry.dirName,
        manifestName: entry.manifestName,
        defaultProfile: DB_SUITE_PLACEHOLDER.defaultProfile,
        implementationStatus: 'placeholder',
        manifestPath: DB_SUITE_PLACEHOLDER.manifestPath,
        profiles: Object.keys(DB_PROFILE_SECTIONS),
      };
    }
    return {
      kind: 'package',
      dirName: entry.dirName,
      manifestName: entry.manifestName,
      implementationStatus: 'not-implemented',
    };
  });

  /** @type {Array<Record<string, unknown>>} */
  const appEntries = apps.map((entry) => ({
    kind: 'app',
    dirName: entry.dirName,
    manifestName: entry.manifestName,
    implementationStatus: 'not-implemented',
  }));

  return Object.freeze({
    infra: INFRA_SUITE,
    packages: Object.freeze(packageEntries),
    apps: Object.freeze(appEntries),
    unimplemented: Object.freeze({
      packages: packageEntries
        .filter((row) => row.implementationStatus === 'not-implemented')
        .map((row) => row.manifestName),
      apps: appEntries.map((row) => row.manifestName),
    }),
  });
}

/**
 * @param {ReturnType<typeof discoverWorkspacePackages>} discovered
 * @param {string} name
 */
export function resolveWorkspaceName(discovered, name) {
  const byDir = discovered.filter((entry) => entry.dirName === name);
  const byManifest = discovered.filter((entry) => entry.manifestName === name);
  const matches = new Map(
    [...byDir, ...byManifest].map((entry) => [entry.manifestName, entry]),
  );

  if (matches.size === 0) {
    return { ok: false, message: `unknown subject name: ${name}` };
  }
  if (matches.size > 1) {
    return { ok: false, message: `ambiguous subject name: ${name}` };
  }

  const [entry] = matches.values();
  return { ok: true, entry };
}

/**
 * @param {SubjectKind} kind
 * @param {string} [name]
 * @param {string} repoRoot
 */
export function resolveSubject(kind, name, repoRoot) {
  if (kind === 'infra') {
    if (name) {
      return { ok: false, message: 'infra subject does not accept a name' };
    }
    return { ok: true, subject: INFRA_SUITE };
  }

  if (kind !== 'package' && kind !== 'app') {
    return { ok: false, message: `unknown subject kind: ${kind}` };
  }
  if (!name) {
    return { ok: false, message: `${kind} requires a name` };
  }

  const discovered = discoverWorkspacePackages(
    repoRoot,
    kind === 'package' ? 'packages' : 'apps',
  );
  const resolved = resolveWorkspaceName(discovered, name);
  if (!resolved.ok) {
    return resolved;
  }

  if (kind === 'package' && resolved.entry.manifestName === DB_MANIFEST_NAME) {
    return {
      ok: true,
      subject: {
        ...DB_SUITE_PLACEHOLDER,
        dirName: resolved.entry.dirName,
      },
    };
  }

  return {
    ok: true,
    subject: {
      kind,
      dirName: resolved.entry.dirName,
      manifestName: resolved.entry.manifestName,
      implementationStatus: 'not-implemented',
    },
  };
}

/**
 * @param {{ subject: object, profile?: string, section?: string, live?: boolean }} input
 */
export function buildVerificationPlan(input) {
  const { subject } = input;
  const profileId =
    input.profile ??
    ('defaultProfile' in subject ? subject.defaultProfile : undefined);

  if (!profileId) {
    return { ok: false, message: 'missing profile' };
  }

  if (subject.kind === 'infra') {
    const profiles = subject.profiles;
    if (!profiles[profileId]) {
      return { ok: false, message: `unknown profile: ${profileId}` };
    }
    const sectionIds = [...profiles[profileId].sections];
    if (input.section && !sectionIds.includes(input.section)) {
      return {
        ok: false,
        message: `section ${input.section} is not in profile ${profileId}`,
      };
    }
    const selected = input.section ? [input.section] : sectionIds;
    return {
      ok: true,
      plan: {
        subject: { kind: 'infra', id: 'infra' },
        profile: profileId,
        live: Boolean(input.live),
        mode: input.live ? 'live' : 'source',
        sections: selected.map((id) => {
          const definition = INFRA_SECTION_BY_ID.get(id);
          return {
            id,
            tier: definition?.tier ?? (id === 'source-suite' ? 'SOURCE' : 'FIXTURE'),
            plannedStatus: 'PLANNED',
            scenarioIds: definition?.scenarioIds ?? [],
            timeoutMs: definition?.timeoutMs ?? null,
          };
        }),
        adapter: subject.adapter,
      },
    };
  }

  if (subject.implementationStatus === 'not-implemented') {
    return {
      ok: false,
      exitCode: 1,
      message: `suite not implemented: ${subject.manifestName}`,
    };
  }

  if (subject.implementationStatus === 'placeholder') {
    const profiles = subject.profiles;
    if (!Object.prototype.hasOwnProperty.call(profiles, profileId)) {
      return { ok: false, message: `unknown profile: ${profileId}` };
    }

    const profileSections = [...profiles[profileId]];
    if (input.section) {
      const inProfile = profileSections.includes(input.section);
      const knownSection = DB_SECTION_DEFINITIONS.some(
        (row) => row.id === input.section,
      );
      if (!knownSection) {
        return { ok: false, message: `unknown section: ${input.section}` };
      }
      if (!inProfile) {
        return {
          ok: false,
          message: `section ${input.section} is not in profile ${profileId}`,
        };
      }
    }

    const selectedSectionIds = input.section
      ? [input.section]
      : profileSections;
    const definitionById = new Map(
      DB_SECTION_DEFINITIONS.map((row) => [row.id, row]),
    );

    const sections = selectedSectionIds.map((id) => {
      const definition = definitionById.get(id);
      const requiresLive = definition?.tier === 'LIVE';
      const plannedStatus = requiresLive && !input.live ? 'NOT-RUN' : 'PLANNED';
      return {
        id,
        tier: definition?.tier ?? 'SOURCE',
        plannedStatus,
        scenarioIds: definition?.scenarioIds ?? [],
        timeoutMs: definition?.timeoutMs ?? null,
      };
    });

    const incomplete =
      !input.live && sections.some((row) => row.plannedStatus === 'NOT-RUN');

    return {
      ok: true,
      plan: {
        subject: {
          kind: 'package',
          manifestName: subject.manifestName,
        },
        profile: profileId,
        live: Boolean(input.live),
        mode: input.live ? 'live' : 'source',
        sections,
        manifestPath: subject.manifestPath,
        incomplete,
      },
    };
  }

  return { ok: false, message: 'unsupported subject' };
}
