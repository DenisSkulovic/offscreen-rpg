/**
 * CH07: typed lab observations and semantic before/after deltas.
 * Pure specimen/run path first; does not claim SQL inspector atomicity.
 */
import { createHash } from 'node:crypto';
import {
  parseLabObservation,
  parseLabSemanticDelta,
  type LabAssertionResult,
  type LabObservation,
  type LabObservationDomain,
  type LabSemanticDelta,
} from '@offscreen/contracts/chamber-lab';
import type { FixtureSpecimenState } from './fixture-specimens.js';

export type FacetSource = {
  name: string;
  domain: LabObservationDomain;
  version: number;
  value: unknown;
};

function stableValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableValue(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
    .join(',')}}`;
}

/** Normalize volatile UUIDs/timestamps for comparison only. */
export function normalizeForComparison(value: unknown): unknown {
  if (typeof value === 'string') {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      return '<uuid>';
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return '<timestamp>';
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForComparison(entry));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = normalizeForComparison(entry);
    }
    return out;
  }
  return value;
}

function flatten(
  value: unknown,
  prefix = '',
  into: Map<string, unknown> = new Map(),
): Map<string, unknown> {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index);
      flatten(entry, path, into);
    });
    return into;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const path = prefix ? `${prefix}.${key}` : key;
      flatten(entry, path, into);
    }
    return into;
  }
  into.set(prefix || '$', value);
  return into;
}

export function captureLabObservation(args: {
  runId: string;
  stepOrdinal?: number | null;
  facets: FacetSource[];
  domains?: LabObservationDomain[];
  redaction?: 'default' | 'private-drilldown';
  privatePaths?: string[];
}): LabObservation {
  const versions = new Set(args.facets.map((facet) => facet.version));
  const consistency = versions.size <= 1 ? 'atomic' : 'cross-version';
  const facets: LabObservation['facets'] = {};
  const privatePaths = new Set(
    args.privatePaths ?? ['private', 'prompt', 'raw'],
  );
  for (const facet of args.facets) {
    let value = facet.value;
    if ((args.redaction ?? 'default') === 'default') {
      value = redactDefault(value, privatePaths);
    }
    facets[facet.name] = { version: facet.version, value };
  }
  return parseLabObservation({
    runId: args.runId,
    stepOrdinal: args.stepOrdinal ?? null,
    consistency,
    ...(consistency === 'cross-version'
      ? {
          consistencyNote:
            'Facets were captured at different versions; not an atomic cross-store snapshot',
        }
      : {}),
    domains: args.domains ?? [
      ...new Set(args.facets.map((facet) => facet.domain)),
    ],
    facets,
    redaction: args.redaction ?? 'default',
  });
}

function redactDefault(value: unknown, privatePaths: Set<string>): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (privatePaths.has(key)) {
        out[key] = '<redacted>';
        continue;
      }
      out[key] = redactDefault(entry, privatePaths);
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactDefault(entry, privatePaths));
  }
  return value;
}

/**
 * Build mechanics-focused observation from an in-memory specimen state.
 * Marks atomic when a single revision is supplied for all facets.
 */
export function observeSpecimenState(args: {
  runId: string;
  stepOrdinal?: number | null;
  state: FixtureSpecimenState;
  revision: number;
  includePrivate?: boolean;
  /** Intentionally different facet versions to label cross-version inspection. */
  facetVersions?: Partial<
    Record<'clock' | 'items' | 'activity' | 'decision', number>
  >;
}): LabObservation {
  const versions = args.facetVersions ?? {};
  const facets: FacetSource[] = [
    {
      name: 'clock',
      domain: 'mechanics',
      version: versions.clock ?? args.revision,
      value: { gameSecond: args.state.gameSecond },
    },
    {
      name: 'items',
      domain: 'mechanics',
      version: versions.items ?? args.revision,
      value: {
        items: args.state.items,
        ...(args.includePrivate
          ? { private: { holderAudit: args.state.items } }
          : {}),
      },
    },
    {
      name: 'activity',
      domain: 'mechanics',
      version: versions.activity ?? args.revision,
      value: {
        hasPlan: args.state.acceptedPlan !== null,
        progress: args.state.activityProgress,
      },
    },
    {
      name: 'decision',
      domain: 'public-story',
      version: versions.decision ?? args.revision,
      value: {
        dueGameSecond: args.state.decision?.dueGameSecond ?? null,
        optionIds:
          args.state.decision?.interaction.specification.kind === 'choice.v1'
            ? args.state.decision.interaction.specification.options.map(
                (option) => option.id,
              )
            : [],
      },
    },
  ];
  return captureLabObservation({
    runId: args.runId,
    ...(args.stepOrdinal !== undefined
      ? { stepOrdinal: args.stepOrdinal }
      : {}),
    facets,
    redaction: args.includePrivate ? 'private-drilldown' : 'default',
  });
}

export function diffLabObservations(args: {
  before: LabObservation;
  after: LabObservation;
  normalizeVolatile?: boolean;
  prevented?: LabSemanticDelta['prevented'];
}): LabSemanticDelta {
  const normalize = args.normalizeVolatile === true;
  const beforeFacets = Object.fromEntries(
    Object.entries(args.before.facets).map(([name, facet]) => [
      name,
      normalize ? normalizeForComparison(facet.value) : facet.value,
    ]),
  );
  const afterFacets = Object.fromEntries(
    Object.entries(args.after.facets).map(([name, facet]) => [
      name,
      normalize ? normalizeForComparison(facet.value) : facet.value,
    ]),
  );
  const beforeFlat = flatten(beforeFacets);
  const afterFlat = flatten(afterFacets);
  const paths = new Set([...beforeFlat.keys(), ...afterFlat.keys()]);
  const changes: LabSemanticDelta['changes'] = [];
  const unchanged: string[] = [];
  for (const path of [...paths].sort()) {
    const left = beforeFlat.get(path);
    const right = afterFlat.get(path);
    if (stableValue(left) === stableValue(right)) {
      unchanged.push(path);
    } else {
      changes.push({ path, before: left, after: right });
    }
  }
  return parseLabSemanticDelta({
    before: args.before,
    after: args.after,
    changes,
    unchanged,
    prevented: args.prevented ?? [],
    normalizedForComparison: normalize,
  });
}

export function assertDelta(args: {
  delta: LabSemanticDelta;
  invariantId: string;
  predicate: LabAssertionResult['predicate'];
  path?: string;
  expected?: unknown;
}): LabAssertionResult {
  const { delta, invariantId, predicate } = args;
  let passed = false;
  let actual: unknown = null;
  switch (predicate) {
    case 'unchanged':
      actual = delta.changes.length;
      passed = delta.changes.length === 0;
      break;
    case 'exists':
      actual = args.path
        ? delta.changes.some((change) => change.path === args.path)
        : delta.changes.length > 0;
      passed = actual === true;
      break;
    case 'equals': {
      const change = delta.changes.find((entry) => entry.path === args.path);
      actual = change?.after;
      passed = Object.is(actual, args.expected);
      break;
    }
    case 'stateTransition': {
      const change = delta.changes.find((entry) => entry.path === args.path);
      actual = change ? { before: change.before, after: change.after } : null;
      passed = change !== undefined;
      break;
    }
    case 'monotonic': {
      const change = delta.changes.find((entry) => entry.path === args.path);
      actual = change?.after;
      passed =
        typeof change?.before === 'number' &&
        typeof change.after === 'number' &&
        change.after >= change.before;
      break;
    }
    default:
      actual = null;
      passed = false;
  }
  return {
    invariantId,
    predicate,
    passed,
    actual,
    ...(args.expected !== undefined ? { expected: args.expected } : {}),
    proofBoundary: 'observation-delta',
  };
}

export function observationDigest(observation: LabObservation): string {
  return createHash('sha256')
    .update(stableValue(observation.facets))
    .digest('hex');
}
