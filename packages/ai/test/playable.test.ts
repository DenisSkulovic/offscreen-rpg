import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  playableProposalSchema,
  playableOpeningArtifactSchema,
  validatePlayableResult,
  playablePresentation,
  preparePlayableOpening,
  preparePlayableContinuation,
} from '../src/playable';
const premise = {
  title: '',
  premise: 'I am a microscopic organism inside a spaceship.',
  storytellingDirection: 'Quiet discovery.',
};
const proposal = {
  version: 1,
  content: {
    version: 1,
    title: 'A faint vibration',
    paragraphs: ['The surrounding fluid vibrates.'],
  },
  next: {
    kind: 'choice',
    prompt: 'What do you attempt?',
    options: [
      {
        id: 'sense-vibration',
        label: 'Sense the vibration',
        intention: 'Remain still and try to identify the nearby vibration.',
      },
      {
        id: 'wait',
        label: 'Do nothing',
        intention: 'Observe without intervening.',
      },
    ],
  },
};
function situation() {
  const presentation = playablePresentation(proposal);
  const snapshot = {
    id: randomUUID(),
    revision: 3,
    viewVersion: 5,
    items: [],
    current: {
      id: randomUUID(),
      content: presentation.content,
      interaction: {
        id: randomUUID(),
        specification: presentation.interaction,
      },
    },
  };
  return {
    premise,
    snapshot,
    publishedProposal: structuredClone(proposal),
    submission: {
      interactionId: snapshot.current.interaction.id,
      answer: { kind: 'choice.v1', optionId: 'sense-vibration' },
    },
  };
}
test('opening captures the premise as data and emits a playable schema, not private IDs', () => {
  const draft = {
    ...premise,
    id: randomUUID(),
    revision: 2,
    createdAt: '2026-09-17T10:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
  };
  const artifact = preparePlayableOpening(draft);
  assert.equal(artifact.source.draftRevision, 2);
  assert.ok(!JSON.stringify(artifact.request).includes(draft.id));
  assert.equal(
    JSON.parse(artifact.request.messages[1]!.content).premise.premise,
    premise.premise,
  );
  assert.ok(Object.isFrozen(artifact.request.messages));
  assert.equal(playableOpeningArtifactSchema.parse(artifact).task, 'opening');
  assert.equal(
    playableOpeningArtifactSchema.parse(artifact).promptVersion,
    'playable.v1',
  );
  assert.throws(() =>
    playableOpeningArtifactSchema.parse({
      ...artifact,
      promptVersion: 'opening.v1',
    }),
  );
  assert.throws(() => preparePlayableOpening({ ...draft, premise: ' ' }));
});
test('new option identities carry an intention without fixture-specific branching', () => {
  const input = situation();
  const artifact = preparePlayableContinuation(input);
  const data = JSON.parse(artifact.request.messages[1]!.content);
  assert.equal(data.intention, proposal.next.options[0]!.intention);
  assert.equal(data.current.title, proposal.content.title);
  assert.equal(artifact.source.narrativeRevision, 3);
  assert.ok(!JSON.stringify(artifact.request).includes(input.snapshot.id));
  input.publishedProposal.next.options[0]!.intention = 'Changed after capture';
  assert.equal(
    JSON.parse(artifact.request.messages[1]!.content).intention,
    data.intention,
  );
});
test('mismatched, invented and unsupported pending offers cannot prepare continuation', () => {
  const wrong = situation();
  wrong.submission.interactionId = randomUUID();
  assert.throws(() => preparePlayableContinuation(wrong));
  const invented = situation();
  invented.submission.answer.optionId = 'invented';
  assert.throws(() => preparePlayableContinuation(invented));
  const changed = situation();
  changed.publishedProposal.content.title = 'Other scene';
  assert.throws(() => preparePlayableContinuation(changed));
  const timed = situation();
  assert.throws(() =>
    preparePlayableContinuation({
      ...timed,
      snapshot: {
        ...timed.snapshot,
        decision: {
          dueAt: '2026-09-18T10:00:00.000Z',
          defaultOptionId: 'wait',
        },
      },
    }),
  );
});
test('fake outputs accept a new offer or explicit ending and reject application authority', () => {
  assert.equal(playableProposalSchema.parse(proposal).next.kind, 'choice');
  assert.equal(
    playablePresentation({ ...proposal, next: { kind: 'end' } }).interaction,
    null,
  );
  for (const extra of [
    { deadline: 'tomorrow' },
    { effects: [] },
    { ownerId: randomUUID() },
    { model: 'expensive' },
  ]) {
    assert.throws(() =>
      playableProposalSchema.parse({ ...proposal, ...extra }),
    );
  }
  assert.throws(() =>
    playableProposalSchema.parse({
      ...proposal,
      next: {
        ...proposal.next,
        options: [proposal.next.options[0], proposal.next.options[0]],
      },
    }),
  );
  assert.throws(() =>
    playableProposalSchema.parse({
      ...proposal,
      next: { ...proposal.next, options: [] },
    }),
  );
});

test('an opening cannot silently finish the story before the player acts', () => {
  const ending = { ...proposal, next: { kind: 'end' } };
  assert.throws(() => validatePlayableResult('opening', ending));
  assert.equal(validatePlayableResult('continuation', ending).next.kind, 'end');
});
