/**
 * Chamber Bench lane (CH02): run catalogue scenarios against real pure
 * @offscreen/game policies. No DB, Nest, Temporal, Next, browser or provider.
 */
import { openChamberLabScenario } from '@offscreen/application/developer-tools';
import {
  addCalendarMonths,
  compileWorldDate,
  projectWorldTime,
} from '@offscreen/game/calendar';
import { resolveCheck, type DrawD20 } from '@offscreen/game/checks';
import { actionOverlapEligibility } from '@offscreen/game/immediate-actions';
import { characterSchema } from '@offscreen/game/state';

export type BenchAssertion = {
  id: string;
  passed: boolean;
  detail: string;
};

export type BenchResult = {
  scenarioId: string;
  version: number;
  lane: 'bench-policy';
  seed: number;
  ok: boolean;
  assertions: BenchAssertion[];
  observation: unknown;
  error?: string;
};

const emberCalendar = {
  kind: 'named-year' as const,
  id: 'ember-calendar',
  revision: 1,
  gameSecondsPerDay: 4,
  yearLabel: 'Cycle',
  months: [
    { id: 'ember', label: 'Ember', days: 20 },
    { id: 'rain', label: 'Rain', days: 35 },
    { id: 'frost', label: 'Frost', days: 25 },
  ],
  epoch: {
    year: 3,
    monthId: 'ember',
    day: 10,
    gameSecondOfDay: 1,
    eraLabel: 'the Lantern',
  },
};

/** Deterministic d20 draw from a Bench seed. Not a second rules authority. */
export function createSeededDraw(seed: number): DrawD20 {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state % 20) + 1;
  };
}

function assertion(
  id: string,
  passed: boolean,
  detail: string,
): BenchAssertion {
  return { id, passed, detail };
}

function runCalendarNamedYear(
  seed: number,
): Omit<BenchResult, 'scenarioId' | 'version' | 'lane'> {
  const date = {
    kind: 'named-year' as const,
    year: 4,
    monthId: 'rain',
    day: 12,
    gameSecondOfDay: 3,
  };
  const gameSecond = compileWorldDate(emberCalendar, date);
  const projected = projectWorldTime(emberCalendar, gameSecond);
  const advanced = addCalendarMonths(emberCalendar, date, 1);
  const assertions = [
    assertion(
      'round-trip-label',
      projected.label === 'Rain 12, Cycle 4 of the Lantern',
      `projected.label=${projected.label}`,
    ),
    assertion(
      'month-advance',
      advanced.monthId === 'frost' && advanced.day === 12,
      `advanced=${advanced.monthId} ${advanced.day}`,
    ),
    assertion(
      'seed-recorded',
      Number.isInteger(seed),
      `seed=${seed} (calendar path is deterministic; seed retained for report)`,
    ),
  ];

  let negativeCaught = false;
  let negativeDetail = 'expected kind mismatch to throw';
  try {
    compileWorldDate(emberCalendar, {
      kind: 'ordinal-days',
      day: 1,
      gameSecondOfDay: 0,
    });
  } catch (error) {
    negativeCaught = /does not match/i.test(
      error instanceof Error ? error.message : String(error),
    );
    negativeDetail = error instanceof Error ? error.message : String(error);
  }
  assertions.push(
    assertion('reject-mismatched-kind', negativeCaught, negativeDetail),
  );

  return {
    seed,
    ok: assertions.every((entry) => entry.passed),
    assertions,
    observation: { gameSecond, projected, advanced },
  };
}

function runFiniteActionOverlap(
  seed: number,
): Omit<BenchResult, 'scenarioId' | 'version' | 'lane'> {
  const eligible = actionOverlapEligibility({
    resolutionKind: 'check',
    hasInterveningWorldObligation: false,
  });
  const intervening = actionOverlapEligibility({
    resolutionKind: 'automatic',
    hasInterveningWorldObligation: true,
  });
  const unsupported = actionOverlapEligibility({
    resolutionKind: 'process',
    hasInterveningWorldObligation: false,
  });

  const character = characterSchema.parse({
    name: 'Bench walker',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 10,
      intelligence: 10,
      wisdom: 14,
      charisma: 8,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [{ id: 'perception', label: 'Perception' }],
    proficientSkills: ['perception'],
    proficiencyBonus: 2,
    hp: 8,
    maxHp: 8,
    facts: [],
    quantities: [],
  });
  const draw = createSeededDraw(seed);
  const roll = resolveCheck(
    character,
    {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Notice the lantern flicker',
      skill: 'perception',
      ability: 'wisdom',
      dc: 10,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    draw,
  );
  const rollAgain = resolveCheck(
    character,
    {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Notice the lantern flicker',
      skill: 'perception',
      ability: 'wisdom',
      dc: 10,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    createSeededDraw(seed),
  );

  let abilityRejected = false;
  const limited = characterSchema.parse({
    ...character,
    applicableAbilities: ['wisdom'],
  });
  try {
    resolveCheck(
      limited,
      {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Impossible form check',
        skill: null,
        ability: 'strength',
        dc: 10,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      createSeededDraw(seed),
    );
  } catch (error) {
    abilityRejected = /not applicable/i.test(
      error instanceof Error ? error.message : String(error),
    );
  }

  const assertions = [
    assertion(
      'check-eligible',
      eligible.eligible === true,
      JSON.stringify(eligible),
    ),
    assertion(
      'intervening-fails-closed',
      intervening.eligible === false &&
        intervening.reason === 'intervening-world-obligation',
      JSON.stringify(intervening),
    ),
    assertion(
      'unsupported-fails-closed',
      unsupported.eligible === false &&
        unsupported.reason === 'unsupported-resolution',
      JSON.stringify(unsupported),
    ),
    assertion(
      'resolveCheck-seed-reproducible',
      roll.total === rollAgain.total &&
        roll.chosen === rollAgain.chosen &&
        roll.success === rollAgain.success,
      `roll=${JSON.stringify(roll)} again=${JSON.stringify(rollAgain)}`,
    ),
    assertion(
      'resolveCheck-rejects-inapplicable-ability',
      abilityRejected,
      'production resolveCheck must reject inapplicable ability',
    ),
  ];

  return {
    seed,
    ok: assertions.every((entry) => entry.passed),
    assertions,
    observation: { eligible, intervening, unsupported, roll },
  };
}

const runners: Record<
  string,
  (seed: number) => Omit<BenchResult, 'scenarioId' | 'version' | 'lane'>
> = {
  'calendar-named-year-projection@1': (seed) => runCalendarNamedYear(seed),
  'finite-action-overlap-eligibility@1': (seed) => runFiniteActionOverlap(seed),
};

export function runBenchScenario(args: {
  scenarioId: string;
  version?: number;
  seed?: number;
}): BenchResult {
  const version = args.version ?? 1;
  const seed = args.seed ?? 141;
  const opened = openChamberLabScenario({
    id: args.scenarioId,
    version,
    lane: 'bench-policy',
  });
  if (!opened.ok) {
    return {
      scenarioId: args.scenarioId,
      version,
      lane: 'bench-policy',
      seed,
      ok: false,
      assertions: [assertion('lane-open', false, opened.reason)],
      observation: null,
      error: opened.reason,
    };
  }

  const key = `${opened.scenario.id}@${opened.scenario.version}`;
  const runner = runners[key];
  if (!runner) {
    const reason = `No Bench runner registered for ${key}`;
    return {
      scenarioId: opened.scenario.id,
      version: opened.scenario.version,
      lane: 'bench-policy',
      seed,
      ok: false,
      assertions: [assertion('runner-registered', false, reason)],
      observation: null,
      error: reason,
    };
  }

  try {
    const body = runner(seed);
    return {
      scenarioId: opened.scenario.id,
      version: opened.scenario.version,
      lane: 'bench-policy',
      ...body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      scenarioId: opened.scenario.id,
      version: opened.scenario.version,
      lane: 'bench-policy',
      seed,
      ok: false,
      assertions: [assertion('policy-threw', false, message)],
      observation: null,
      error: message,
    };
  }
}

export function listBenchScenarios(): string[] {
  return Object.keys(runners);
}
