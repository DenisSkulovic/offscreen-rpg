import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  storyDelegationPolicy,
  storyDelegationPolicyCommand,
} from '@offscreen/story-persistence/campaign';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { DECLINE_HARMLESS_INVITATION_CLASS } from '@offscreen/game/delegation-eligibility';
import { isDeclineHarmlessInvitation } from '@offscreen/game/delegation-eligibility';
import {
  declineHarmlessInvitationWithdrawalPlan,
  harmlessSocialInvitationPlan,
} from '../../../packages/story-engine/dist/campaign/fixtures/harmless-invitation-offer.js';
import { createStories } from '../../../packages/story-engine/dist/stories/index.js';
import { initializeStoryInTransaction } from '../../../packages/story-engine/dist/stories/initialization.js';
import { StoryError } from '../../../packages/story-engine/dist/stories/errors.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../../../packages/lab-support/dist/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'GM07', `${ownerId}@example.test`],
  );
}

async function seedStory(database, ownerId = `gm07-${randomUUID()}`) {
  const storyId = randomUUID();
  await insertUser(database, ownerId);
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise: null,
        storyteller: profile,
        execution: null,
        usagePolicy: null,
        items: [],
        content: {
          version: 1,
          title: 'Delegation policy',
          paragraphs: ['A quiet quay invitation waits.'],
        },
        interaction: null,
      },
    });
  });
  return { ownerId, storyId };
}

test('fixture predicate accepts withdrawal only', () => {
  assert.equal(isDeclineHarmlessInvitation(declineHarmlessInvitationWithdrawalPlan), true);
  assert.equal(isDeclineHarmlessInvitation(harmlessSocialInvitationPlan), false);
});

test('owner enable, idempotency, disable and refusal paths', async () => {
  await withDisposable(async (database) => {
    const stories = createStories(database);
    const { ownerId, storyId } = await seedStory(database);
    const intruder = `intruder-${randomUUID()}`;

    const absent = await stories.delegationPolicy.read({ ownerId, storyId });
    assert.deepEqual(absent, {
      enabled: false,
      version: null,
      allowedClass: null,
    });

    const operationId = randomUUID();
    const enabled = await stories.delegationPolicy.update({
      ownerId,
      storyId,
      operationId,
      body: { intent: 'enable' },
    });
    assert.equal(enabled.enabled, true);
    assert.equal(enabled.version, 1);
    assert.equal(enabled.allowedClass, DECLINE_HARMLESS_INVITATION_CLASS);

    const replay = await stories.delegationPolicy.update({
      ownerId,
      storyId,
      operationId,
      body: { intent: 'enable' },
    });
    assert.equal(replay.version, 1);

    const secondEnable = await stories.delegationPolicy.update({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'enable' },
    });
    assert.equal(secondEnable.version, 2);
    assert.equal(secondEnable.enabled, true);

    const disabled = await stories.delegationPolicy.update({
      ownerId,
      storyId,
      operationId: randomUUID(),
      body: { intent: 'disable' },
    });
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.version, 3);

    await assert.rejects(
      () =>
        stories.delegationPolicy.update({
          ownerId,
          storyId,
          operationId: randomUUID(),
          body: { intent: 'enable', allowedClass: 'other-class.v1' },
        }),
      (error) => error instanceof StoryError && error.code === 'invalid',
    );

    await assert.rejects(
      () =>
        stories.delegationPolicy.update({
          ownerId: intruder,
          storyId,
          operationId: randomUUID(),
          body: { intent: 'enable' },
        }),
      (error) => error instanceof StoryError && error.code === 'not_found',
    );

    const policyRows = await database.db
      .select()
      .from(storyDelegationPolicy)
      .where(eq(storyDelegationPolicy.storyId, storyId));
    assert.equal(policyRows.length, 1);
    assert.equal(policyRows[0].ownerId, ownerId);

    const commandRows = await database.db
      .select()
      .from(storyDelegationPolicyCommand)
      .where(eq(storyDelegationPolicyCommand.storyId, storyId));
    assert.equal(commandRows.length, 3);
  });
});