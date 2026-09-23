import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCalendarMonths,
  compileWorldDate,
  formatWorldDuration,
  projectWorldTime,
} from '../src/calendar.ts';

const emberCalendar = {
  kind: 'named-year',
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

test('named calendars round-trip across unequal month and year boundaries', () => {
  const date = {
    kind: 'named-year',
    year: 4,
    monthId: 'rain',
    day: 12,
    gameSecondOfDay: 3,
  };
  const gameSecond = compileWorldDate(emberCalendar, date);
  assert.deepEqual(projectWorldTime(emberCalendar, gameSecond), {
    kind: 'named-year',
    definitionId: 'ember-calendar',
    definitionRevision: 1,
    gameSecond,
    year: 4,
    monthId: 'rain',
    monthLabel: 'Rain',
    day: 12,
    gameSecondOfDay: 3,
    eraLabel: 'the Lantern',
    label: 'Rain 12, Cycle 4 of the Lantern',
  });
});

test('month addition preserves the day and rejects nonexistent target dates', () => {
  const source = {
    kind: 'named-year',
    year: 3,
    monthId: 'ember',
    day: 10,
    gameSecondOfDay: 1,
  };
  const target = addCalendarMonths(emberCalendar, source, 2);
  assert.deepEqual(target, {
    ...source,
    monthId: 'frost',
  });
  assert.equal(
    compileWorldDate(emberCalendar, target) -
      compileWorldDate(emberCalendar, source),
    55 * emberCalendar.gameSecondsPerDay,
  );
  assert.throws(
    () =>
      addCalendarMonths(
        emberCalendar,
        { ...source, monthId: 'rain', day: 30 },
        1,
      ),
    /nonexistent date/,
  );
});

test('ordinal and elapsed definitions project from nonzero epochs', () => {
  const ordinal = {
    kind: 'ordinal-days',
    id: 'spore-days',
    revision: 2,
    dayLabel: 'Bloom',
    gameSecondsPerDay: 6,
    epoch: { day: 9, gameSecondOfDay: 4 },
  };
  assert.equal(projectWorldTime(ordinal, 3).label, 'Bloom 10');
  assert.equal(
    compileWorldDate(ordinal, {
      kind: 'ordinal-days',
      day: 10,
      gameSecondOfDay: 1,
    }),
    3,
  );

  const elapsed = {
    kind: 'elapsed',
    id: 'cell-cycles',
    revision: 1,
    unit: {
      id: 'cycle',
      label: 'cycle',
      pluralLabel: 'cycles',
      gameSecondsPerUnit: 8,
    },
    epoch: { wholeUnits: 2, gameSecondOfUnit: 7 },
  };
  assert.equal(projectWorldTime(elapsed, 1).label, '3 cycles');
  assert.equal(formatWorldDuration(elapsed, 16), '2 cycles');
  assert.equal(formatWorldDuration(elapsed, 3), '3 fictional seconds');
});

test('date compilation rejects mismatched and pre-epoch dates', () => {
  assert.throws(
    () =>
      compileWorldDate(emberCalendar, {
        kind: 'ordinal-days',
        day: 1,
        gameSecondOfDay: 0,
      }),
    /does not match/,
  );
  assert.throws(
    () =>
      compileWorldDate(emberCalendar, {
        kind: 'named-year',
        year: 1,
        monthId: 'ember',
        day: 1,
        gameSecondOfDay: 0,
      }),
    /outside the campaign fictional-second range/,
  );
});
