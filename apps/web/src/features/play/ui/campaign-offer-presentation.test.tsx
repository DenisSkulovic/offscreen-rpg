import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { cavePresentation, caveScope, resolveFixture } from '../presentation/fixtures';
import { CampaignOfferPanel } from './campaign-offer';

describe('CampaignOfferPanel presentation', () => {
  it('styles the matched path and still sends that path', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    const campaign = makeCampaign();
    const presentation = resolveFixture(cavePresentation, {
      ...caveScope,
      campaignOfferId: campaign.offer!.id,
    });
    render(
      <CampaignOfferPanel
        story={makeStorySnapshot()}
        campaign={campaign}
        command={{ send, busy: false, message: '', retry: false }}
        presentation={presentation}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Look around/i }));
    expect(send).not.toHaveBeenCalled();
    const approach = screen.getByRole('button', { name: /Approach the gate/i });
    const wait = screen.getByRole('button', { name: /Wait in shadow/i });
    expect(approach).toHaveAttribute('data-surface', 'filled');
    expect(wait).toHaveAttribute('data-surface', 'luminous');
    await user.click(approach);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[1]).toMatchObject({
      path: ['look', 'approach'],
      offerId: campaign.offer!.id,
    });
  });

  it('ignores decoration aimed at a previous offer', () => {
    const campaign = makeCampaign();
    const presentation = resolveFixture(cavePresentation, caveScope);
    render(
      <CampaignOfferPanel
        story={makeStorySnapshot()}
        campaign={campaign}
        command={{ send: vi.fn(), busy: false, message: '', retry: false }}
        presentation={{
          ...presentation,
          choices: presentation.choices.map((choice) =>
            choice.target.kind === 'campaign'
              ? {
                  ...choice,
                  target: { ...choice.target, offerId: 'stale-offer' },
                }
              : choice,
          ),
        }}
      />,
    );
    expect(screen.getByRole('button', { name: /Look around/i })).not.toHaveAttribute('data-surface');
  });
});
