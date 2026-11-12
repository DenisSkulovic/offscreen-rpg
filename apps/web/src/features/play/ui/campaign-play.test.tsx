import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { fixtureOfferIds, makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { CampaignPlay } from './campaign-play';

const command = {
  send: vi.fn(),
  busy: false,
  message: '',
  retry: false,
};

vi.mock('../api/use-campaign-command', () => ({
  useCampaignCommand: () => command,
}));

beforeEach(() => {
  command.send.mockClear();
  command.busy = false;
  command.message = '';
  command.retry = false;
});

function renderCampaign(campaign = makeCampaign()) {
  const story = makeStorySnapshot({ resolution: null });
  const queryClient = createBrowserQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignPlay
        story={story}
        campaign={campaign}
        onSnapshot={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe('CampaignPlay composition', () => {
  it('navigates offer path and stages a successor', async () => {
    const user = userEvent.setup();
    renderCampaign();
    await user.click(screen.getByRole('button', { name: 'Look around' }));
    expect(
      screen.getByRole('button', { name: 'Approach the gate' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Add as a later activity' })[0]!,
    );
    expect(screen.getByText(/1 later activity staged/i)).toBeInTheDocument();
  });

  it('keeps frozen command retry when the offer identity changes (negative)', async () => {
    command.retry = true;
    command.message = 'Could not confirm the result. Retry the same request.';
    const first = makeCampaign({ offerId: fixtureOfferIds.offerA });
    const { rerender } = renderCampaign(first);
    expect(
      screen.getByRole('button', { name: 'Retry the same request' }),
    ).toBeInTheDocument();

    const story = makeStorySnapshot({ resolution: null });
    const queryClient = createBrowserQueryClient();
    rerender(
      <QueryClientProvider client={queryClient}>
        <CampaignPlay
          story={story}
          campaign={makeCampaign({ offerId: fixtureOfferIds.offerB })}
          onSnapshot={() => undefined}
        />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'Retry the same request' }),
    ).toBeInTheDocument();
    expect(command.send).not.toHaveBeenCalled();
    // Offer tree remounted for the new identity, but command retry stayed.
    expect(screen.getByRole('button', { name: 'Look around' })).toBeDisabled();
  });

  it('shows held-clock status for storyteller holds', () => {
    renderCampaign(makeCampaign({ holdKind: 'storyteller' }));
    expect(
      screen.getByText(/Storyteller prepares a required scene/i),
    ).toBeInTheDocument();
  });

  it('keeps opening preview off the Play Client campaign module (negative)', () => {
    const previewSource = readFileSync(
      resolve(__dirname, '../../stories/opening-preview.tsx'),
      'utf8',
    );
    expect(previewSource).toMatch(/model\/pace-options/);
    expect(previewSource).not.toMatch(/play\/campaign-play/);
    expect(previewSource).not.toMatch(/play\/ui\/campaign-play/);
  });
});
