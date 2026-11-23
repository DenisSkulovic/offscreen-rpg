import type { CampaignView } from '@offscreen/story-interface/campaign';
import type { StorySnapshot } from '@offscreen/story-interface/stories';
import { describe, expect, it } from 'vitest';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { resolutionMessage, stageStatusLabel } from './play-status';

/** Truthy campaign character for presentation branches; validated via makeCampaign spread. */
const minimalCharacter = {
  name: 'Outlander',
  scores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
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
  hp: 10,
  maxHp: 10,
  facts: [],
  quantities: [],
} as NonNullable<CampaignView['character']>;

const actionExecution = {
  operationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  label: 'Cross the gate',
  startGameSecond: 0,
  targetGameSecond: 30,
  state: 'running' as const,
  revision: 0,
  dueAt: null,
};

function storyWithCampaign(
  campaignPatch: Partial<ReturnType<typeof makeCampaign>> & {
    character?: typeof minimalCharacter | null;
  },
  snapshotOverrides: Parameters<typeof makeStorySnapshot>[0] = {},
): StorySnapshot {
  const campaign = { ...makeCampaign(), ...campaignPatch };
  return { ...makeStorySnapshot(snapshotOverrides), campaign };
}

const waitingBase = {
  dueAt: '2026-11-21T12:00:00.000Z',
  canControl: true,
  controlRevision: 0,
  gameDurationMs: 60_000,
} as const;

describe('resolutionMessage', () => {
  it.each([
    {
      label: 'no resolution',
      story: makeStorySnapshot(),
      expected: null,
    },
    {
      label: 'uncertain committed',
      story: makeStorySnapshot({
        resolution: {
          state: 'uncertain',
          evidence: 'committed',
          version: 2,
          blocker: { kind: 'usage-uncertain', recovery: 'operator' },
        },
      }),
      expected:
        'Provider usage is uncertain. Paid generation is stopped until it is reconciled; refreshing does not send another model request.',
    },
    {
      label: 'failed funding blocker',
      story: makeStorySnapshot({
        resolution: {
          state: 'failed',
          evidence: 'committed',
          version: 2,
          blocker: { kind: 'funding', recovery: 'none' },
        },
      }),
      expected:
        'The generation allowance is unavailable. Your scene is unchanged.',
    },
    {
      label: 'failed campaign character no matching blocker',
      story: storyWithCampaign(
        { character: minimalCharacter },
        {
          resolution: {
            state: 'failed',
            evidence: 'committed',
            version: 2,
            blocker: { kind: 'generation', recovery: 'retry' },
          },
        },
      ),
      expected:
        'The outcome and dice are saved. Narration could not finish, and this spent operation cannot be repeated.',
    },
    {
      label: 'blocked committed',
      story: makeStorySnapshot({
        resolution: {
          state: 'blocked',
          evidence: 'committed',
          version: 2,
          blocker: { kind: 'publication', recovery: 'retry' },
        },
      }),
      expected:
        'The saved continuation could not be published. Your current scene is unchanged.',
    },
    {
      label: 'resolving pending',
      story: makeStorySnapshot({
        resolution: {
          state: 'pending',
          evidence: 'committed',
          version: 1,
        },
      }),
      expected: 'The storyteller is resolving this intention.',
    },
    {
      label: 'pending-action uncertain',
      story: storyWithCampaign(
        { actionExecution },
        {
          resolution: {
            state: 'uncertain',
            evidence: 'pending-action',
            version: 2,
          },
        },
      ),
      expected:
        'Private narration preparation has uncertain provider usage and is stopped. The accepted action is still in progress; its outcome, roll and effects are not current before the target.',
    },
    {
      label: 'pending-action resolving',
      story: storyWithCampaign(
        { actionExecution },
        {
          resolution: {
            state: 'running',
            evidence: 'pending-action',
            version: 1,
          },
        },
      ),
      expected:
        'The storyteller is preparing privately while the accepted action runs. No outcome, roll, effect or next choice is current before the target.',
    },
  ] as const)('$label', ({ story, expected }) => {
    expect(resolutionMessage(story)).toBe(expected);
  });
});

describe('stageStatusLabel', () => {
  it.each([
    {
      label: 'journey underway',
      story: {
        ...makeStorySnapshot(),
        waiting: { ...waitingBase, remainingMs: null },
      },
      canChoose: false,
      expected: 'Journey underway',
    },
    {
      label: 'journey paused',
      story: {
        ...makeStorySnapshot(),
        waiting: { ...waitingBase, remainingMs: 30_000 },
      },
      canChoose: false,
      expected: 'Journey paused',
    },
    {
      label: 'usage uncertain',
      story: makeStorySnapshot({
        resolution: {
          state: 'uncertain',
          evidence: 'committed',
          version: 2,
        },
      }),
      canChoose: false,
      expected: 'Usage uncertain',
    },
    {
      label: 'continuation failed',
      story: makeStorySnapshot({
        resolution: {
          state: 'failed',
          evidence: 'committed',
          version: 2,
        },
      }),
      canChoose: false,
      expected: 'Continuation failed',
    },
    {
      label: 'publication blocked',
      story: makeStorySnapshot({
        resolution: {
          state: 'blocked',
          evidence: 'committed',
          version: 2,
        },
      }),
      canChoose: false,
      expected: 'Publication blocked',
    },
    {
      label: 'resolving',
      story: makeStorySnapshot({
        resolution: {
          state: 'pending',
          evidence: 'committed',
          version: 1,
        },
      }),
      canChoose: false,
      expected: 'Resolving your action',
    },
    {
      label: 'waiting for choice',
      story: makeStorySnapshot(),
      canChoose: true,
      expected: 'Waiting for your choice',
    },
    {
      label: 'nothing underway',
      story: makeStorySnapshot({ canRespond: false, interaction: null }),
      canChoose: false,
      expected: 'Nothing underway',
    },
  ] as const)('$label', ({ story, canChoose, expected }) => {
    expect(stageStatusLabel(story, canChoose)).toBe(expected);
  });
});

describe('uncertain is not presented as saved success', () => {
  const uncertainWithCharacter = storyWithCampaign(
    { character: minimalCharacter },
    {
      resolution: {
        state: 'uncertain',
        evidence: 'committed',
        version: 2,
        blocker: { kind: 'usage-uncertain', recovery: 'operator' },
      },
    },
  );

  it('keeps uncertain narration wording', () => {
    const message = resolutionMessage(uncertainWithCharacter);
    expect(message).toMatch(/Provider usage is uncertain/);
    expect(message).toMatch(/Paid generation is stopped/);
    expect(message).not.toBe(
      'The outcome and dice are saved. The storyteller is preparing the next passage.',
    );
  });

  it('labels the stage as usage uncertain', () => {
    expect(stageStatusLabel(uncertainWithCharacter, false)).toBe(
      'Usage uncertain',
    );
    expect(stageStatusLabel(uncertainWithCharacter, false)).not.toBe(
      'Resolving your action',
    );
  });
});
