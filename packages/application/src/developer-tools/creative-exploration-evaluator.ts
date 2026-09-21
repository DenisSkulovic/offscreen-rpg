import {
  creativeExplorationBenchmarkCaseSchema,
  creativeExplorationEvaluationReportSchema,
  creativeExplorationObservationSchema,
  type CreativeExplorationBenchmarkCase,
  type CreativeExplorationObservation,
} from '@offscreen/contracts/creative-exploration-evaluation';
import type { LongStoryMemoryCorpus } from '@offscreen/contracts/memory-evaluation';
import { buildLongStoryMemoryCorpus } from './long-story-memory-corpus';

const reviewDimensions = [
  'specificity',
  'coherence',
  'surprise',
  'restraint',
  'continuity-payoff',
  'desire-to-continue',
] as const;

function sources(
  corpus: LongStoryMemoryCorpus,
  keys: readonly string[],
): CreativeExplorationBenchmarkCase['sources'] {
  const evidence = new Map(corpus.evidence.map((entry) => [entry.key, entry]));
  return keys.map((key) => {
    const entry = evidence.get(key);
    if (!entry) throw new Error(`Creative benchmark evidence missing: ${key}`);
    return {
      evidenceKey: entry.key,
      documentId: entry.documentId,
      revision: entry.revision,
      path: entry.path,
      authority: entry.authority,
      visibility: entry.visibility,
    };
  });
}

function greywakeCase(
  narrativeMode: 'directed' | 'no-grand-narrative',
): CreativeExplorationBenchmarkCase {
  const corpus = buildLongStoryMemoryCorpus('greywake');
  const allKeys = [
    'identity.mira-vale',
    'place.greywake',
    'relationship.open-favor',
    'thread.patient-tide-current',
    'possibility.smugglers',
    'decoy.false-road',
    'branch.destroyed-greywake',
  ];
  const quiet = narrativeMode === 'no-grand-narrative';
  return creativeExplorationBenchmarkCaseSchema.parse({
    id: quiet
      ? 'creative.greywake-quiet-nets'
      : 'creative.greywake-directed-nets',
    corpusId: corpus.id,
    worldContrast: 'conventional',
    checkpoint: {
      branchKey: 'main',
      throughSequence: 200,
      situation:
        'The traveler has returned to Greywake and is repairing fishing nets on the quay.',
      playerIntention:
        'Spend the next stretch quietly repairing nets; do not choose a larger commitment for the player.',
      narrativeMode,
    },
    sources: sources(corpus, allKeys),
    literalBaselineEvidenceKeys: ['relationship.open-favor'],
    directionFamilies: [
      {
        id: 'greywake.reciprocity',
        label: 'Quiet labor gives the old favor a natural point of contact',
        lens: 'relationship',
        requiredEvidenceKeys: ['relationship.open-favor', 'place.greywake'],
        intendedValue:
          'Let Mira or the damaged inn intersect the routine without making the player accept a quest.',
      },
      {
        id: 'greywake.changed-route',
        label: 'The repaired route changes the ordinary life of the quay',
        lens: 'consequence',
        requiredEvidenceKeys: ['thread.patient-tide-current', 'place.greywake'],
        intendedValue:
          'Turn an old correction into present texture, opportunity or pressure rather than repeating bridge exposition.',
      },
      {
        id: 'greywake.trust-ledger',
        label: 'Mira’s trusted custodianship reframes the unpaid favor',
        lens: 'echo',
        requiredEvidenceKeys: ['identity.mira-vale', 'relationship.open-favor'],
        intendedValue:
          'Connect established trust and debt into a specific social beat without inventing betrayal.',
      },
    ],
    forbiddenConnections: [
      {
        id: 'greywake.destroyed-fork',
        evidenceKeys: ['branch.destroyed-greywake'],
        kind: 'wrong-branch',
        reason:
          'A dramatic falling-star branch is not true on this checkpoint.',
      },
      {
        id: 'greywake.stale-road',
        evidenceKeys: ['decoy.false-road'],
        kind: 'stale-as-current',
        reason:
          'The old broken-road state cannot replace the current repaired route.',
      },
      {
        id: 'greywake.forced-smugglers',
        evidenceKeys: ['possibility.smugglers'],
        kind: 'forced-escalation',
        reason: quiet
          ? 'No-grand-narrative play cannot promote a private smuggler possibility merely to create plot.'
          : 'A private possibility may inspire a question but cannot be asserted or force a quest.',
      },
    ],
    minimumDistinctDirections: 3,
    reviewDimensions,
  });
}

function gradientCase(): CreativeExplorationBenchmarkCase {
  const corpus = buildLongStoryMemoryCorpus('gradient-life');
  return creativeExplorationBenchmarkCaseSchema.parse({
    id: 'creative.gradient-life-recurrence',
    corpusId: corpus.id,
    worldContrast: 'abstract',
    checkpoint: {
      branchKey: 'main',
      throughSequence: 200,
      situation:
        'A distributed chemical consciousness meets a newly steepening mineral boundary.',
      playerIntention:
        'Continue sensing and adapting without importing humanoid motives or a calendar.',
      narrativeMode: 'quiet',
    },
    sources: sources(corpus, [
      'identity.gradient-organism',
      'lore.iron-gradient',
    ]),
    literalBaselineEvidenceKeys: ['lore.iron-gradient'],
    directionFamilies: [
      {
        id: 'gradient.recurrence',
        label:
          'The earlier survival response becomes a present option with new cost',
        lens: 'echo',
        requiredEvidenceKeys: [
          'identity.gradient-organism',
          'lore.iron-gradient',
        ],
        intendedValue:
          'Recall slowing exchange as embodied continuity without assuming it must solve the new boundary.',
      },
      {
        id: 'gradient.contrast',
        label:
          'The new boundary contrasts persistence with distributed identity',
        lens: 'contrast',
        requiredEvidenceKeys: [
          'identity.gradient-organism',
          'lore.iron-gradient',
        ],
        intendedValue:
          'Explore whether preserving exchange or preserving distribution matters here, without humanizing either choice.',
      },
    ],
    forbiddenConnections: [],
    minimumDistinctDirections: 2,
    reviewDimensions,
  });
}

export function buildCreativeExplorationBenchmarkCases() {
  return [
    greywakeCase('directed'),
    greywakeCase('no-grand-narrative'),
    gradientCase(),
  ] as const;
}

export function buildCreativeExplorationFixtureObservations(
  benchmark: CreativeExplorationBenchmarkCase,
) {
  const validSources = benchmark.sources.filter(
    (source) =>
      !benchmark.forbiddenConnections.some((forbidden) =>
        forbidden.evidenceKeys.includes(source.evidenceKey),
      ),
  );
  const curatedDirections = benchmark.directionFamilies.map(
    (family, index) => ({
      id: `direction.${index + 1}`,
      familyId: family.id,
      evidenceKeys: family.requiredEvidenceKeys,
      premise: family.intendedValue,
    }),
  );
  const selected = curatedDirections[0];
  const forbidden = benchmark.forbiddenConnections[0];
  return {
    literal: creativeExplorationObservationSchema.parse({
      format: 'offscreen.creative-exploration-observation.v1',
      caseId: benchmark.id,
      route: 'literal',
      discoveredEvidenceKeys: benchmark.literalBaselineEvidenceKeys,
      directions: [],
      selectedDirectionId: null,
      finalUsedEvidenceKeys: [],
    }),
    noisy: creativeExplorationObservationSchema.parse({
      format: 'offscreen.creative-exploration-observation.v1',
      caseId: benchmark.id,
      route: 'noisy',
      discoveredEvidenceKeys: forbidden
        ? [forbidden.evidenceKeys[0]]
        : ['invented.human-default'],
      directions: [
        {
          id: 'direction.noisy',
          familyId: benchmark.directionFamilies[0]?.id,
          evidenceKeys: forbidden
            ? [forbidden.evidenceKeys[0]]
            : ['invented.human-default'],
          premise:
            'Escalate immediately using an ineligible source or an unsupported world default.',
        },
      ],
      selectedDirectionId: 'direction.noisy',
      finalUsedEvidenceKeys: forbidden
        ? [forbidden.evidenceKeys[0]]
        : ['invented.human-default'],
    }),
    curated: creativeExplorationObservationSchema.parse({
      format: 'offscreen.creative-exploration-observation.v1',
      caseId: benchmark.id,
      route: 'curated',
      discoveredEvidenceKeys: validSources.map((source) => source.evidenceKey),
      directions: curatedDirections,
      selectedDirectionId: selected?.id ?? null,
      finalUsedEvidenceKeys: selected?.evidenceKeys ?? [],
    }),
  } as const;
}

function includesAll(values: ReadonlySet<string>, required: readonly string[]) {
  return required.every((key) => values.has(key));
}

/** Structural attribution only; human review owns whether a direction is good. */
export function evaluateCreativeExplorationObservation(
  rawBenchmark: CreativeExplorationBenchmarkCase,
  rawObservation: CreativeExplorationObservation,
) {
  const benchmark = creativeExplorationBenchmarkCaseSchema.parse(rawBenchmark);
  const observation =
    creativeExplorationObservationSchema.parse(rawObservation);
  if (observation.caseId !== benchmark.id) {
    throw new Error('Creative exploration observation targets another case');
  }
  const knownSources = new Set(
    benchmark.sources.map((source) => source.evidenceKey),
  );
  const inaccessibleSources = new Set(
    benchmark.sources
      .filter((source) => source.visibility === 'developer-private')
      .map((source) => source.evidenceKey),
  );
  const observedKeys = new Set([
    ...observation.discoveredEvidenceKeys,
    ...observation.directions.flatMap((direction) => direction.evidenceKeys),
    ...observation.finalUsedEvidenceKeys,
  ]);
  const unknown = [...observedKeys].filter((key) => !knownSources.has(key));
  const connectionSets = [
    ...observation.directions.map(
      (direction) => new Set(direction.evidenceKeys),
    ),
    new Set(observation.finalUsedEvidenceKeys),
  ];
  const forbidden = benchmark.forbiddenConnections.filter((entry) =>
    connectionSets.some((keys) => includesAll(keys, entry.evidenceKeys)),
  );
  const sourceReasons = [
    ...unknown.map((key) => `Unknown evidence: ${key}`),
    ...[...observedKeys]
      .filter((key) => inaccessibleSources.has(key))
      .map((key) => `Inaccessible evidence: ${key}`),
    ...forbidden.map((entry) => `${entry.kind}: ${entry.id}`),
  ];

  const families = new Map(
    benchmark.directionFamilies.map((family) => [family.id, family]),
  );
  const validDirections = observation.directions.filter((direction) => {
    const family = families.get(direction.familyId);
    if (!family) return false;
    const evidence = new Set(direction.evidenceKeys);
    return (
      includesAll(evidence, family.requiredEvidenceKeys) &&
      direction.evidenceKeys.every((key) => knownSources.has(key)) &&
      !benchmark.forbiddenConnections.some((entry) =>
        includesAll(evidence, entry.evidenceKeys),
      )
    );
  });
  const coveredFamilies = [
    ...new Set(validDirections.map((direction) => direction.familyId)),
  ].sort();
  const diversityPassed =
    coveredFamilies.length >= benchmark.minimumDistinctDirections;

  const selected = observation.selectedDirectionId
    ? observation.directions.find(
        (direction) => direction.id === observation.selectedDirectionId,
      )
    : null;
  const selectedValid = selected
    ? validDirections.some((direction) => direction.id === selected.id)
    : false;
  const finalEvidence = new Set(observation.finalUsedEvidenceKeys);
  const finalGrounded =
    selectedValid && includesAll(finalEvidence, selected?.evidenceKeys ?? []);

  return creativeExplorationEvaluationReportSchema.parse({
    format: 'offscreen.creative-exploration-report.v1',
    caseId: benchmark.id,
    route: observation.route,
    sourceValidity: {
      status: sourceReasons.length ? 'failed' : 'passed',
      reasons: sourceReasons,
    },
    connectionCoverage: {
      status: coveredFamilies.length ? 'passed' : 'failed',
      reasons: coveredFamilies.length
        ? []
        : ['No direction contains a complete eligible source connection'],
      coveredFamilies,
      totalFamilies: benchmark.directionFamilies.length,
    },
    directionDiversity: {
      status: diversityPassed ? 'passed' : 'failed',
      reasons: diversityPassed
        ? []
        : [
            `Found ${coveredFamilies.length} distinct valid direction families; required ${benchmark.minimumDistinctDirections}`,
          ],
      distinctValidFamilies: coveredFamilies.length,
      requiredDistinctFamilies: benchmark.minimumDistinctDirections,
    },
    finalGrounding: observation.selectedDirectionId
      ? {
          status: finalGrounded ? 'passed' : 'failed',
          reasons: finalGrounded
            ? []
            : ['Selected direction is invalid or its evidence was not used'],
        }
      : { status: 'not-run', reasons: ['No direction was selected'] },
    humanTaste: {
      status: 'not-run',
      dimensions: benchmark.reviewDimensions,
    },
  });
}
