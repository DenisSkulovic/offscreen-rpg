import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PREAPPROVED_WITHDRAWAL_WINDOW_MS,
  admitDelegatedDecision,
} from '../dist/campaign/delegated-decision.js';

const decisionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const playerOperationId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const expiryOperationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const secondOperationId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const publishedAtMs = 1_700_000_000_000;
const deadline = publishedAtMs + PREAPPROVED_WITHDRAWAL_WINDOW_MS;

function invitation() {
  return {
    decisionId,
    kind: 'published-two-choice',
    publishedAtMs,
    choices: [
      {
        id: 'accept-invitation',
        label: 'Accept the invitation',
        kind: 'invitation',
        fictionalSeconds: 30,
      },
      {
        id: 'withdraw',
        label: 'Withdraw',
        kind: 'withdrawal',
        fictionalSeconds: 5,
      },
    ],
    consent: {
      version: 1,
      fallbackChoiceId: 'withdraw',
      grantedAtMs: publishedAtMs + 1_000,
    },
    revokedConsentVersion: null,
    settlement: null,
  };
}

function expiry(
  atMs,
  deliveryId = 'expiry-1',
  operationId = expiryOperationId,
) {
  return { kind: 'expiry', atMs, deliveryId, operationId };
}

function player(
  choiceId,
  atMs,
  deliveryId = 'player-1',
  operationId = playerOperationId,
) {
  return { kind: 'player', choiceId, atMs, deliveryId, operationId };
}

test('at expiry one preapproved withdrawal settles once', () => {
  const early = admitDelegatedDecision(invitation(), expiry(deadline - 1));
  assert.equal(early.status, 'held');
  assert.equal(early.reason, 'window-open');
  assert.equal(early.applied, false);
  assert.equal(early.settlement, null);

  const settled = admitDelegatedDecision(invitation(), expiry(deadline));
  assert.equal(settled.status, 'settled');
  assert.equal(settled.applied, true);
  assert.equal(settled.reason, 'preapproved-withdrawal');
  assert.equal(settled.settlement.choiceId, 'withdraw');
  assert.equal(settled.settlement.source, 'preapproved-withdrawal');
  assert.equal(settled.settlement.fictionalSeconds, 5);
  assert.equal(settled.settlement.waitingFictionalSeconds, 0);
  assert.equal(
    settled.settlement.provenance,
    'Your approved fallback chose to withdraw.',
  );
  assert.equal(settled.decision.settlement.operationId, expiryOperationId);

  const latePlayer = admitDelegatedDecision(
    settled.decision,
    player('accept-invitation', deadline + 1),
  );
  assert.equal(latePlayer.applied, false);
  assert.equal(latePlayer.settlement.source, 'preapproved-withdrawal');
  assert.equal(latePlayer.settlement.fictionalSeconds, 5);
});

test('a duplicate delivery does not settle twice', () => {
  const first = admitDelegatedDecision(
    invitation(),
    expiry(deadline, 'expiry-1'),
  );
  const second = admitDelegatedDecision(
    first.decision,
    expiry(deadline + 5_000, 'expiry-2', secondOperationId),
  );
  assert.equal(first.applied, true);
  assert.equal(second.status, 'already-settled');
  assert.equal(second.reason, 'duplicate-delivery');
  assert.equal(second.applied, false);
  assert.deepEqual(second.settlement, first.settlement);
  assert.equal(second.settlement.operationId, first.settlement.operationId);
  assert.equal(second.settlement.fictionalSeconds, 5);
  assert.notEqual(second.settlement.operationId, secondOperationId);
});

test('a player choice that arrives first wins and the fallback does not also run', () => {
  const chosen = admitDelegatedDecision(
    invitation(),
    player('accept-invitation', deadline - 1_000),
  );
  const fallback = admitDelegatedDecision(chosen.decision, expiry(deadline));
  assert.equal(chosen.status, 'settled');
  assert.equal(chosen.applied, true);
  assert.equal(chosen.settlement.source, 'player');
  assert.equal(chosen.settlement.choiceId, 'accept-invitation');
  assert.equal(chosen.settlement.provenance, null);
  assert.equal(chosen.settlement.waitingFictionalSeconds, 0);
  assert.equal(fallback.status, 'already-settled');
  assert.equal(fallback.applied, false);
  assert.deepEqual(fallback.settlement, chosen.settlement);
  assert.equal(fallback.settlement.source, 'player');
  assert.equal(
    [chosen, fallback].filter((admission) => admission.applied).length,
    1,
  );
});

test('absent consent leaves the decision held', () => {
  const decision = invitation();
  decision.consent = null;
  const held = admitDelegatedDecision(decision, expiry(deadline));
  assert.equal(held.status, 'held');
  assert.equal(held.reason, 'consent-absent');
  assert.equal(held.applied, false);
  assert.equal(held.settlement, null);
  assert.equal(held.decision.settlement, null);
});

test('a revoked grant or a stale withdrawal stays held', () => {
  const revoked = invitation();
  revoked.consent = {
    version: 2,
    fallbackChoiceId: 'withdraw',
    grantedAtMs: publishedAtMs + 1_000,
  };
  revoked.revokedConsentVersion = 2;
  const blocked = admitDelegatedDecision(revoked, expiry(deadline));
  assert.equal(blocked.reason, 'consent-revoked');
  assert.equal(blocked.applied, false);

  const renewed = invitation();
  renewed.consent = {
    version: 2,
    fallbackChoiceId: 'withdraw',
    grantedAtMs: publishedAtMs + 1_000,
  };
  renewed.revokedConsentVersion = 1;
  const allowed = admitDelegatedDecision(renewed, expiry(deadline));
  assert.equal(allowed.applied, true);
  assert.equal(allowed.settlement.source, 'preapproved-withdrawal');

  const stale = invitation();
  stale.consent = {
    version: 1,
    fallbackChoiceId: 'left-already',
    grantedAtMs: publishedAtMs + 1_000,
  };
  const unavailable = admitDelegatedDecision(stale, expiry(deadline));
  assert.equal(unavailable.reason, 'ineligible-fallback');
  assert.equal(unavailable.applied, false);
  assert.equal(unavailable.settlement, null);

  const lateConsent = invitation();
  lateConsent.consent = {
    version: 1,
    fallbackChoiceId: 'withdraw',
    grantedAtMs: deadline + 1,
  };
  const rejected = admitDelegatedDecision(lateConsent, expiry(deadline + 2));
  assert.equal(rejected.reason, 'consent-after-deadline');
  assert.equal(rejected.applied, false);
});

test('an arbitrary question, combat, or a model request does not settle', () => {
  const question = admitDelegatedDecision(
    { kind: 'open-question', prompt: 'What do you say to the stranger?' },
    expiry(deadline),
  );
  assert.equal(question.status, 'held');
  assert.equal(question.reason, 'not-this-invitation');
  assert.equal(question.applied, false);
  assert.equal(question.settlement, null);

  const asked = admitDelegatedDecision(invitation(), {
    kind: 'question',
    text: 'Why is the door shut?',
  });
  assert.equal(asked.reason, 'not-this-invitation');
  assert.equal(asked.applied, false);
  assert.equal(asked.decision.settlement, null);

  const combat = admitDelegatedDecision(
    {
      kind: 'published-two-choice',
      choices: [
        { id: 'fight', kind: 'combat', label: 'Attack', fictionalSeconds: 6 },
        {
          id: 'withdraw',
          kind: 'withdrawal',
          label: 'Withdraw',
          fictionalSeconds: 5,
        },
      ],
    },
    expiry(deadline),
  );
  assert.equal(combat.reason, 'combat-refused');
  assert.equal(combat.applied, false);
  assert.equal(combat.settlement, null);

  const model = admitDelegatedDecision(
    { kind: 'model', providerCall: true, prompt: 'Choose the safe action' },
    expiry(deadline),
  );
  assert.equal(model.reason, 'model-refused');
  assert.equal(model.applied, false);
  assert.equal(model.settlement, null);

  const source = readFileSync(
    new URL('../src/campaign/delegated-decision.ts', import.meta.url),
    'utf8',
  );
  assert.equal(/from ['"][^'"]*stories\//.test(source), false);
  assert.equal(/from ['"][^'"]*storyteller\//.test(source), false);
  assert.equal(/openai|anthropic|generateText/i.test(source), false);
});
