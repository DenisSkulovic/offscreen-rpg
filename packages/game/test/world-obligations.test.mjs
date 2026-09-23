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
  gameSecondsPerDay: 6,
  epoch: { day: 9, gameSecondOfDay: 0 },
};

const proposal = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  revision: 1,
  source: { id: 'fixture.winter', revision: 2 },
  label: 'The cold current arrives',
  visibility: { kind: 'exact' },
  due: {
    kind: 'date',
    date: { kind: 'ordinal-days', day: 10, gameSecondOfDay: 2 },
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

test('an admitted date is compiled once to an exact due game second', () => {
  const obligation = compileWorldObligation({
    proposal,
    timeDefinition,
    originGameSecond: 0,
  });
  assert.equal(obligation.dueGameSecond, 8);
  assert.equal(obligation.originGameSecond, 0);
  assert.deepEqual(
    projectPublicWorldObligation({ obligation, state: 'pending' }),
    {
      id: proposal.id,
      revision: 1,
      label: proposal.label,
      visibility: 'exact',
      state: 'pending',
      dueGameSecond: 8,
    },
  );
});

test('a fired obligation replaces its condition by stable identity', () => {
  const obligation = compileWorldObligation({
    proposal,
    timeDefinition,
    originGameSecond: 0,
  });
  assert.deepEqual(
    applyWorldObligationCondition({
      conditions: [
        {
          id: 'cold-current',
          label: 'Cold current',
          value: false,
          provenance: {
            kind: 'world-obligation',
            obligationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          },
          setAtGameSecond: 1,
        },
      ],
      obligation,
    }),
    [
      {
        id: 'cold-current',
        label: 'Cold current',
        value: true,
        provenance: {
          kind: 'world-obligation',
          obligationId: proposal.id,
        },
        setAtGameSecond: 8,
      },
    ],
  );
});

test('hidden obligations expose no schedule and past admission is rejected', () => {
  const obligation = compileWorldObligation({
    proposal: {
      ...proposal,
      visibility: { kind: 'hidden' },
      due: { kind: 'game-second', gameSecond: 12 },
    },
    timeDefinition,
    originGameSecond: 3,
  });
  assert.equal(
    projectPublicWorldObligation({ obligation, state: 'pending' }),
    null,
  );
  assert.throws(
    () =>
      compileWorldObligation({
        proposal: { ...proposal, due: { kind: 'game-second', gameSecond: 3 } },
        timeDefinition,
        originGameSecond: 3,
      }),
    /due after its admission origin/,
  );
});
