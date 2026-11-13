import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  FixtureSpecimenError,
  acceptedShiftEightyPercentRecipe,
  composeFixtureSpecimen,
  hashFixtureSpecimen,
} from '../dist/developer-tools/lab/fixture-specimens.js';

test('accepted shift at 80% is stable across identical recipes', () => {
  const recipe = acceptedShiftEightyPercentRecipe({
    seed: 141,
    includeItem: true,
  });
  const a = composeFixtureSpecimen(recipe);
  const b = composeFixtureSpecimen(structuredClone(recipe));
  assert.equal(a.hash, b.hash);
  assert.equal(a.summary.progressRatio, 0.8);
  assert.equal(a.summary.itemCount, 1);
  assert.equal(a.state.items[0].holderKey, 'courier');
  assert.equal(
    a.hash,
    hashFixtureSpecimen({ recipe: a.recipe, state: a.state }),
  );
});

test('semantic setup change alters checkpoint hash', () => {
  const base = composeFixtureSpecimen(
    acceptedShiftEightyPercentRecipe({ seed: 141, includeItem: true }),
  );
  const changed = composeFixtureSpecimen(
    acceptedShiftEightyPercentRecipe({ seed: 142, includeItem: true }),
  );
  assert.notEqual(base.hash, changed.hash);
  const withoutItem = composeFixtureSpecimen(
    acceptedShiftEightyPercentRecipe({ seed: 141, includeItem: false }),
  );
  assert.notEqual(base.hash, withoutItem.hash);
});

test('rejects progress without accepted plan, foreign holder, bad deadline, duplicates', () => {
  assert.throws(
    () =>
      composeFixtureSpecimen({
        id: 'bad-progress',
        version: 1,
        seed: 1,
        overlays: [
          {
            kind: 'owned-item',
            itemKey: 'sealed-letter',
            label: 'Sealed letter',
            ownerHolderKey: 'courier',
            holderKey: 'caretaker',
          },
        ],
      }),
    (error) =>
      error instanceof FixtureSpecimenError &&
      error.code === 'foreign-item-holder',
  );

  assert.throws(
    () =>
      composeFixtureSpecimen({
        id: 'bad-deadline',
        version: 1,
        seed: 1,
        overlays: [
          {
            kind: 'due-decision-boundary',
            offerId: randomUUID(),
            interactionId: randomUUID(),
            gameSecond: 50,
            dueGameSecond: 100,
            prompt: 'Too early',
            options: [{ id: 'go', label: 'Go' }],
          },
        ],
      }),
    (error) =>
      error instanceof FixtureSpecimenError ||
      (error instanceof Error && /not yet due/i.test(error.message)),
  );

  assert.throws(
    () =>
      composeFixtureSpecimen({
        id: 'dup-item',
        version: 1,
        seed: 1,
        overlays: [
          {
            kind: 'owned-item',
            itemKey: 'sealed-letter',
            label: 'Sealed letter',
            ownerHolderKey: 'courier',
            holderKey: 'courier',
          },
          {
            kind: 'owned-item',
            itemKey: 'sealed-letter',
            label: 'Sealed letter copy',
            ownerHolderKey: 'courier',
            holderKey: 'courier',
          },
        ],
      }),
    (error) =>
      error instanceof FixtureSpecimenError && error.code === 'duplicate-item',
  );

  assert.throws(
    () =>
      composeFixtureSpecimen({
        id: 'bad-ratio',
        version: 1,
        seed: 1,
        overlays: [
          {
            kind: 'accepted-finite-work',
            actionId: 'paid-shift',
            requiredFictionalSeconds: 1000,
            progressRatio: 1,
            acceptedAtGameSecond: 0,
            settingsRevision: 1,
          },
        ],
      }),
    (error) =>
      error instanceof FixtureSpecimenError && error.code === 'invalid-recipe',
  );
});

test('due decision boundary composes with accepted shift', () => {
  const specimen = composeFixtureSpecimen(
    acceptedShiftEightyPercentRecipe({
      seed: 9,
      includeItem: true,
      includeDueDecision: true,
    }),
  );
  assert.equal(specimen.summary.decisionDue, true);
  assert.equal(specimen.state.decision.dueGameSecond, 100);
  assert.equal(
    specimen.state.decision.interaction.specification.kind,
    'choice.v1',
  );
});
