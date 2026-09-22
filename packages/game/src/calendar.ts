import { z } from 'zod';

const identityFields = {
  id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/),
  revision: z.number().int().positive().max(2_147_483_646),
};
const labelSchema = z.string().trim().min(1).max(80);
const tickSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const ticksPerUnitSchema = z.number().int().positive().max(1_000_000_000);

const elapsedTimeDefinitionSchema = z
  .strictObject({
    ...identityFields,
    kind: z.literal('elapsed'),
    unit: z.strictObject({
      id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
      label: labelSchema,
      pluralLabel: labelSchema,
      ticksPerUnit: ticksPerUnitSchema,
    }),
    epoch: z.strictObject({
      wholeUnits: tickSchema,
      tickOfUnit: tickSchema,
    }),
  })
  .superRefine((definition, context) => {
    if (definition.epoch.tickOfUnit >= definition.unit.ticksPerUnit) {
      context.addIssue({
        code: 'custom',
        path: ['epoch', 'tickOfUnit'],
        message: 'Elapsed epoch offset must be inside its unit',
      });
    }
  });

const ordinalTimeDefinitionSchema = z
  .strictObject({
    ...identityFields,
    kind: z.literal('ordinal-days'),
    dayLabel: labelSchema,
    ticksPerDay: ticksPerUnitSchema,
    epoch: z.strictObject({
      day: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      tickOfDay: tickSchema,
    }),
  })
  .superRefine((definition, context) => {
    if (definition.epoch.tickOfDay >= definition.ticksPerDay) {
      context.addIssue({
        code: 'custom',
        path: ['epoch', 'tickOfDay'],
        message: 'Ordinal epoch offset must be inside its day',
      });
    }
  });

const namedYearTimeDefinitionSchema = z
  .strictObject({
    ...identityFields,
    kind: z.literal('named-year'),
    ticksPerDay: ticksPerUnitSchema,
    yearLabel: labelSchema,
    months: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
          label: labelSchema,
          days: z.number().int().positive().max(10_000),
        }),
      )
      .min(1)
      .max(24),
    epoch: z.strictObject({
      year: z.number().int().positive().max(10_000_000),
      monthId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
      day: z.number().int().positive().max(10_000),
      tickOfDay: tickSchema,
      eraLabel: labelSchema.nullable(),
    }),
  })
  .superRefine((definition, context) => {
    const monthIds = definition.months.map((month) => month.id);
    if (new Set(monthIds).size !== monthIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['months'],
        message: 'Calendar month IDs must be unique',
      });
    }
    const epochMonth = definition.months.find(
      (month) => month.id === definition.epoch.monthId,
    );
    if (!epochMonth) {
      context.addIssue({
        code: 'custom',
        path: ['epoch', 'monthId'],
        message: 'Calendar epoch month is unknown',
      });
    } else if (definition.epoch.day > epochMonth.days) {
      context.addIssue({
        code: 'custom',
        path: ['epoch', 'day'],
        message: 'Calendar epoch day does not exist',
      });
    }
    if (definition.epoch.tickOfDay >= definition.ticksPerDay) {
      context.addIssue({
        code: 'custom',
        path: ['epoch', 'tickOfDay'],
        message: 'Calendar epoch offset must be inside its day',
      });
    }
    const daysPerYear = definition.months.reduce(
      (total, month) => total + month.days,
      0,
    );
    if (
      !Number.isSafeInteger(daysPerYear * definition.ticksPerDay) ||
      !Number.isSafeInteger(
        definition.epoch.year * daysPerYear * definition.ticksPerDay,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Calendar boundaries exceed exact integer range',
      });
    }
  });

export const worldTimeDefinitionSchema = z.discriminatedUnion('kind', [
  elapsedTimeDefinitionSchema,
  ordinalTimeDefinitionSchema,
  namedYearTimeDefinitionSchema,
]);
export type WorldTimeDefinition = z.infer<typeof worldTimeDefinitionSchema>;
export type NamedYearTimeDefinition = Extract<
  WorldTimeDefinition,
  { kind: 'named-year' }
>;

export const defaultWorldTimeDefinition = {
  kind: 'elapsed' as const,
  id: 'simulation-ticks',
  revision: 1,
  unit: {
    id: 'tick',
    label: 'fictional second',
    pluralLabel: 'fictional seconds',
    ticksPerUnit: 1,
  },
  epoch: { wholeUnits: 0, tickOfUnit: 0 },
};

export const worldDateSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('elapsed'),
    wholeUnits: tickSchema,
    tickOfUnit: tickSchema,
  }),
  z.strictObject({
    kind: z.literal('ordinal-days'),
    day: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tickOfDay: tickSchema,
  }),
  z.strictObject({
    kind: z.literal('named-year'),
    year: z.number().int().positive().max(10_000_000),
    monthId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/),
    day: z.number().int().positive().max(10_000),
    tickOfDay: tickSchema,
  }),
]);
export type WorldDate = z.infer<typeof worldDateSchema>;

export const worldTimeViewSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('elapsed'),
    definitionId: identityFields.id,
    definitionRevision: identityFields.revision,
    tick: tickSchema,
    wholeUnits: tickSchema,
    tickOfUnit: tickSchema,
    unitLabel: labelSchema,
    label: z.string().min(1).max(200),
  }),
  z.strictObject({
    kind: z.literal('ordinal-days'),
    definitionId: identityFields.id,
    definitionRevision: identityFields.revision,
    tick: tickSchema,
    day: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tickOfDay: tickSchema,
    label: z.string().min(1).max(200),
  }),
  z.strictObject({
    kind: z.literal('named-year'),
    definitionId: identityFields.id,
    definitionRevision: identityFields.revision,
    tick: tickSchema,
    year: z.number().int().positive().max(10_000_000),
    monthId: z.string(),
    monthLabel: labelSchema,
    day: z.number().int().positive().max(10_000),
    tickOfDay: tickSchema,
    eraLabel: labelSchema.nullable(),
    label: z.string().min(1).max(240),
  }),
]);
export type WorldTimeView = z.infer<typeof worldTimeViewSchema>;

function safeNumber(value: bigint, message: string) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(message);
  }
  return Number(value);
}

function namedDayIndex(
  definition: NamedYearTimeDefinition,
  date: Extract<WorldDate, { kind: 'named-year' }>,
) {
  const monthIndex = definition.months.findIndex(
    (month) => month.id === date.monthId,
  );
  if (monthIndex < 0) {
    throw new Error('Unknown calendar month');
  }
  const month = definition.months[monthIndex]!;
  if (date.day > month.days || date.tickOfDay >= definition.ticksPerDay) {
    throw new Error('Invalid calendar date');
  }
  const daysPerYear = definition.months.reduce(
    (total, candidate) => total + BigInt(candidate.days),
    0n,
  );
  const daysBeforeMonth = definition.months
    .slice(0, monthIndex)
    .reduce((total, candidate) => total + BigInt(candidate.days), 0n);
  return (
    BigInt(date.year - 1) * daysPerYear + daysBeforeMonth + BigInt(date.day - 1)
  );
}

function namedDateAtDayIndex(
  definition: NamedYearTimeDefinition,
  dayIndex: bigint,
) {
  const daysPerYear = definition.months.reduce(
    (total, month) => total + BigInt(month.days),
    0n,
  );
  const yearIndex = dayIndex / daysPerYear;
  let remaining = dayIndex % daysPerYear;
  for (const month of definition.months) {
    if (remaining < BigInt(month.days)) {
      return {
        year: safeNumber(yearIndex + 1n, 'Calendar year exceeds range'),
        month,
        day: Number(remaining) + 1,
      };
    }
    remaining -= BigInt(month.days);
  }
  throw new Error('Calendar projection failed');
}

export function compileWorldDate(definitionInput: unknown, dateInput: unknown) {
  const definition = worldTimeDefinitionSchema.parse(definitionInput);
  const date = worldDateSchema.parse(dateInput);
  if (definition.kind !== date.kind) {
    throw new Error('World date does not match its time definition');
  }
  let tick: bigint;
  if (definition.kind === 'elapsed' && date.kind === 'elapsed') {
    if (date.tickOfUnit >= definition.unit.ticksPerUnit) {
      throw new Error('Invalid elapsed-unit date');
    }
    tick =
      (BigInt(date.wholeUnits) - BigInt(definition.epoch.wholeUnits)) *
        BigInt(definition.unit.ticksPerUnit) +
      BigInt(date.tickOfUnit - definition.epoch.tickOfUnit);
  } else if (
    definition.kind === 'ordinal-days' &&
    date.kind === 'ordinal-days'
  ) {
    if (date.tickOfDay >= definition.ticksPerDay) {
      throw new Error('Invalid ordinal date');
    }
    tick =
      (BigInt(date.day) - BigInt(definition.epoch.day)) *
        BigInt(definition.ticksPerDay) +
      BigInt(date.tickOfDay - definition.epoch.tickOfDay);
  } else if (definition.kind === 'named-year' && date.kind === 'named-year') {
    const epoch = {
      kind: 'named-year' as const,
      year: definition.epoch.year,
      monthId: definition.epoch.monthId,
      day: definition.epoch.day,
      tickOfDay: definition.epoch.tickOfDay,
    };
    tick =
      (namedDayIndex(definition, date) - namedDayIndex(definition, epoch)) *
        BigInt(definition.ticksPerDay) +
      BigInt(date.tickOfDay - definition.epoch.tickOfDay);
  } else {
    throw new Error('World date does not match its time definition');
  }
  return safeNumber(tick, 'World date is outside the campaign tick range');
}

export function projectWorldTime(
  definitionInput: unknown,
  tickInput: unknown,
): WorldTimeView {
  const definition = worldTimeDefinitionSchema.parse(definitionInput);
  const tick = tickSchema.parse(tickInput);
  if (definition.kind === 'elapsed') {
    const total =
      BigInt(definition.epoch.wholeUnits) *
        BigInt(definition.unit.ticksPerUnit) +
      BigInt(definition.epoch.tickOfUnit) +
      BigInt(tick);
    const wholeUnits = total / BigInt(definition.unit.ticksPerUnit);
    const tickOfUnit = total % BigInt(definition.unit.ticksPerUnit);
    const count = safeNumber(wholeUnits, 'Elapsed time exceeds range');
    const unitLabel =
      count === 1 ? definition.unit.label : definition.unit.pluralLabel;
    return {
      kind: definition.kind,
      definitionId: definition.id,
      definitionRevision: definition.revision,
      tick,
      wholeUnits: count,
      tickOfUnit: Number(tickOfUnit),
      unitLabel,
      label: `${count} ${unitLabel}`,
    };
  }
  if (definition.kind === 'ordinal-days') {
    const total = BigInt(definition.epoch.tickOfDay) + BigInt(tick);
    const day =
      BigInt(definition.epoch.day) + total / BigInt(definition.ticksPerDay);
    const tickOfDay = total % BigInt(definition.ticksPerDay);
    const dayNumber = safeNumber(day, 'Ordinal day exceeds range');
    return {
      kind: definition.kind,
      definitionId: definition.id,
      definitionRevision: definition.revision,
      tick,
      day: dayNumber,
      tickOfDay: Number(tickOfDay),
      label: `${definition.dayLabel} ${dayNumber}`,
    };
  }
  const epoch = {
    kind: 'named-year' as const,
    year: definition.epoch.year,
    monthId: definition.epoch.monthId,
    day: definition.epoch.day,
    tickOfDay: definition.epoch.tickOfDay,
  };
  const total = BigInt(definition.epoch.tickOfDay) + BigInt(tick);
  const dayIndex =
    namedDayIndex(definition, epoch) + total / BigInt(definition.ticksPerDay);
  const projected = namedDateAtDayIndex(definition, dayIndex);
  const era = definition.epoch.eraLabel
    ? ` of ${definition.epoch.eraLabel}`
    : '';
  return {
    kind: definition.kind,
    definitionId: definition.id,
    definitionRevision: definition.revision,
    tick,
    year: projected.year,
    monthId: projected.month.id,
    monthLabel: projected.month.label,
    day: projected.day,
    tickOfDay: Number(total % BigInt(definition.ticksPerDay)),
    eraLabel: definition.epoch.eraLabel,
    label: `${projected.month.label} ${projected.day}, ${definition.yearLabel} ${projected.year}${era}`,
  };
}

export function addCalendarMonths(
  definitionInput: unknown,
  dateInput: unknown,
  months: number,
) {
  const definition = namedYearTimeDefinitionSchema.parse(definitionInput);
  const date = worldDateSchema.parse(dateInput);
  if (date.kind !== 'named-year' || !Number.isInteger(months)) {
    throw new Error('Named calendar month addition requires an exact date');
  }
  const sourceMonth = definition.months.findIndex(
    (month) => month.id === date.monthId,
  );
  if (
    sourceMonth < 0 ||
    date.day > definition.months[sourceMonth]!.days ||
    date.tickOfDay >= definition.ticksPerDay
  ) {
    throw new Error('Invalid calendar date');
  }
  const absoluteMonth =
    BigInt(date.year - 1) * BigInt(definition.months.length) +
    BigInt(sourceMonth) +
    BigInt(months);
  if (absoluteMonth < 0n) {
    throw new Error('Calendar month addition precedes the first year');
  }
  const yearIndex = absoluteMonth / BigInt(definition.months.length);
  const monthIndex = Number(absoluteMonth % BigInt(definition.months.length));
  const targetMonth = definition.months[monthIndex]!;
  if (date.day > targetMonth.days) {
    throw new Error('Calendar month addition produces a nonexistent date');
  }
  const result = {
    kind: 'named-year' as const,
    year: safeNumber(yearIndex + 1n, 'Calendar year exceeds range'),
    monthId: targetMonth.id,
    day: date.day,
    tickOfDay: date.tickOfDay,
  };
  compileWorldDate(definition, result);
  return result;
}

export function formatWorldDuration(
  definitionInput: unknown,
  ticksInput: unknown,
) {
  const definition = worldTimeDefinitionSchema.parse(definitionInput);
  const ticks = tickSchema.parse(ticksInput);
  if (definition.kind === 'elapsed') {
    const unitTicks = definition.unit.ticksPerUnit;
    if (ticks % unitTicks === 0) {
      const count = ticks / unitTicks;
      const label =
        count === 1 ? definition.unit.label : definition.unit.pluralLabel;
      return `${count} ${label}`;
    }
    return `${ticks} ticks`;
  }
  if (ticks % definition.ticksPerDay === 0) {
    const days = ticks / definition.ticksPerDay;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${ticks} ticks`;
}
