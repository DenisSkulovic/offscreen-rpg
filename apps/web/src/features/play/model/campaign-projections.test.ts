import { describe, expect, it } from 'vitest';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import {
  activityConditionLabel,
  campaignHoldMessage,
  isPathStaged,
  offerChildren,
  offerNodes,
  pathKey,
} from './campaign-projections';

describe('campaign projections', () => {
  it('projects hold copy and offer children for the current path', () => {
    const campaign = makeCampaign({ holdKind: 'storyteller' });
    expect(campaignHoldMessage(campaign.holds)).toMatch(
      /Storyteller prepares/i,
    );

    const story = makeStorySnapshot({ resolution: null });
    const nodes = offerNodes(story, campaign);
    expect(offerChildren(nodes, []).map((node) => node.id)).toEqual(['look']);
    expect(offerChildren(nodes, ['look']).map((node) => node.id)).toEqual([
      'approach',
      'wait',
    ]);
  });

  it('hides offer nodes while a resolution is pending (negative)', () => {
    const campaign = makeCampaign();
    const story = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });
    expect(offerNodes(story, campaign)).toEqual([]);
  });

  it('detects staged successor paths without inventing authority', () => {
    expect(pathKey(['look', 'wait'])).toBe('look/wait');
    expect(isPathStaged([['look', 'approach']], ['look', 'approach'])).toBe(
      true,
    );
    expect(isPathStaged([['look', 'approach']], ['look', 'wait'])).toBe(false);
  });

  it('labels completion-pending ahead of raw running state (negative)', () => {
    const campaign = makeCampaign({ activity: 'completion-pending' });
    expect(activityConditionLabel(campaign.activity!)).toMatch(
      /not finished yet/i,
    );
  });
});
