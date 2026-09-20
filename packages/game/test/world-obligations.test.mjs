import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyWorldObligationCondition,
  compileWorldObligation,
  projectPublicWorldObligation,
} from '../dist/src/world-obligations.js';

const timeDefinition = {
  kind: 'ordinal-days',
  id: 'bloom-time',
  revision: 1,
  dayLabel: 'Bloom',
  ticksPerDay: 6,
  epoch: { day: 9, tickOfDay: 0 },
};

const proposal = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  revision: 1,
  source: { id: 'fixture.winter', revision: 2 },
  label: 'The cold current arrives',
  visibility: { kind: 'exact' },
  due: {
    kind: 'date',
    date: { kind: 'ordinal-days', day: 10, tickOfDay: 2 },
  },
  consequence: {
    kind: 'condition.set.v1',
    condition: {
      id: 'cold-current',
      label: 'Cold current',
      value: true,
    },
  },
  followUp: 'controlling-scene',
};

test('an admitted date is compiled once to an exact due tick', () => {
  const obligation = compileWorldObligation({
    proposal,
    timeDefinition,
    originTick: 0,
  });
  assert.equal(obligation.dueTick, 8);
  assert.equal(obligation.originTick, 0);
  assert.deepEqual(
    projectPublicWorldObligation({ obligation, state: 'pending' }),
    {
      id: proposal.id,
      revision: 1,
      label: proposal.label,
      visibility: 'exact',
      state: 'pending',
      dueTick: 8,
    },
  );
});

test('a fired obligation replaces its condition by stable identity', () => {
  const obligation = compileWorldObligation({
    proposal,
    timeDefinition,
    originTick: 0,
  });
  assert.deepEqual(
    applyWorldObligationCondition({
      conditions: [
        {
          id: 'cold-current',
          label: 'Cold current',
          value: false,
          setByObligationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          setAtTick: 1,
        },
      ],
      obligation,
    }),
    [
      {
        id: 'cold-current',
        label: 'Cold current',
        value: true,
        setByObligationId: proposal.id,
        setAtTick: 8,
      },
    ],
  );
});

test('hidden obligations expose no schedule and past admission is rejected', () => {
  const obligation = compileWorldObligation({
    proposal: {
      ...proposal,
      visibility: { kind: 'hidden' },
      due: { kind: 'tick', tick: 12 },
    },
    timeDefinition,
    originTick: 3,
  });
  assert.equal(
    projectPublicWorldObligation({ obligation, state: 'pending' }),
    null,
  );
  assert.throws(
    () =>
      compileWorldObligation({
        proposal: { ...proposal, due: { kind: 'tick', tick: 3 } },
        timeDefinition,
        originTick: 3,
      }),
    /due after its admission origin/,
  );
});
