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
    await user.click(screen.getByRole('button', { name: /Look around/i }));
    expect(
      screen.getByRole('button', { name: /Approach the gate/i }),
    ).toBeInTheDocument();
    expect(command.send).not.toHaveBeenCalled();
    await user.click(
      screen.getAllByRole('button', { name: /Add to plan ahead/i })[0]!,
    );
    expect(screen.getByText(/Plan a little ahead/i)).toBeInTheDocument();
    expect(screen.getByText(/1 later activity staged/i)).toBeInTheDocument();
    expect(command.send).not.toHaveBeenCalled();
  });

  it('treats Back as explore navigation without a command (negative)', async () => {
    const user = userEvent.setup();
    renderCampaign();
    await user.click(screen.getByRole('button', { name: /Look around/i }));
    await user.click(screen.getByRole('button', { name: /^Back/i }));
    expect(screen.getByRole('button', { name: /Look around/i })).toBeInTheDocument();
    expect(command.send).not.toHaveBeenCalled();
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
    expect(screen.getByRole('button', { name: /Look around/i })).toBeDisabled();
  });

  it('shows held-clock status for storyteller holds', () => {
    renderCampaign(makeCampaign({ holdKind: 'storyteller' }));
    expect(
      screen.getByText(/Storyteller prepares a required scene/i),
    ).toBeInTheDocument();
  });

  it('shows contribution progress and paused truth without inventing completion', () => {
    renderCampaign(makeCampaign({ activity: 'paused-contribution' }));
    expect(screen.getByText(/Repair the beacon/i)).toBeInTheDocument();
    expect(screen.getByText(/3\/5 earned/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Paused — time is not advancing this work/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Resume work/i }),
    ).toBeInTheDocument();
  });

  it('refuses to label completion-pending as finished (negative)', () => {
    renderCampaign(makeCampaign({ activity: 'completion-pending' }));
    expect(
      screen.getByText(/Checking the outcome — not finished yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This is not a completed reward/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Complete$/i)).not.toBeInTheDocument();
  });

  it('states that no active commitment means time is idle', () => {
    renderCampaign(makeCampaign({ activity: 'none' }));
    expect(
      screen.getByText(/No active commitment\. Fictional time is not advancing/i),
    ).toBeInTheDocument();
  });

  it('omits fantasy ability sheet when character scores are absent (negative)', () => {
    renderCampaign(makeCampaign());
    expect(
      screen.queryByText(/Character abilities/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^strength$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Silt Gate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^World$/i)).toBeInTheDocument();
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
