import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { LabWorkbench } from './lab-workbench';

const readLabScenarios = vi.fn();
const readLabCommands = vi.fn();
const openLabRun = vi.fn();
const readLabRun = vi.fn();
const submitLabCommand = vi.fn();
const replayLabRun = vi.fn();

vi.mock('./lab-transport', () => ({
  readLabScenarios: (...args: unknown[]) => readLabScenarios(...args),
  readLabCommands: (...args: unknown[]) => readLabCommands(...args),
  openLabRun: (...args: unknown[]) => openLabRun(...args),
  readLabRun: (...args: unknown[]) => readLabRun(...args),
  submitLabCommand: (...args: unknown[]) => submitLabCommand(...args),
  replayLabRun: (...args: unknown[]) => replayLabRun(...args),
}));

function renderWorkbench(viewerId: string) {
  const client = createBrowserQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <LabWorkbench viewerId={viewerId} />
    </QueryClientProvider>,
  );
}

describe('LabWorkbench', () => {
  beforeEach(() => {
    readLabScenarios.mockReset();
    readLabCommands.mockReset();
    openLabRun.mockReset();
    readLabRun.mockReset();
    submitLabCommand.mockReset();
    replayLabRun.mockReset();
    readLabCommands.mockResolvedValue([
      { name: 'load', params: '', description: 'Materialize' },
      {
        name: 'advanceClock',
        params: 'targetGameSecond',
        description: 'Advance',
      },
    ]);
    readLabScenarios.mockResolvedValue([
      {
        id: 'activity-clock-wait-eighty',
        version: 1,
        name: 'Eighty-percent clock-wait',
        family: 'finite-action',
        costClass: 'offline',
        searchTags: ['activity'],
        availabilityPerLane: {
          'bench-policy': { state: 'available' },
          connected: {
            state: 'planned',
            reason: 'Connected later',
          },
        },
      },
    ]);
  });

  it('opens available bench lane and refuses acting when lane blocked', async () => {
    const user = userEvent.setup();
    openLabRun.mockResolvedValue({
      runId: '11111111-1111-4111-8111-111111111111',
      snapshot: {
        runId: '11111111-1111-4111-8111-111111111111',
        lane: 'bench-policy',
        lifecycle: 'prepared',
        revision: 0,
        seed: 141,
        fixtureHash: null,
        nextOrdinal: 1,
        breakpoint: null,
        evidenceTier: 'bench-policy',
      },
      scenarioId: 'activity-clock-wait-eighty',
      scenarioVersion: 1,
      lane: 'bench-policy',
      unavailableReason: null,
    });
    readLabRun.mockResolvedValue({
      runId: '11111111-1111-4111-8111-111111111111',
      snapshot: {
        runId: '11111111-1111-4111-8111-111111111111',
        lane: 'bench-policy',
        lifecycle: 'running',
        revision: 1,
        seed: 141,
        fixtureHash: 'a'.repeat(64),
        nextOrdinal: 2,
        breakpoint: null,
        evidenceTier: 'bench-policy',
      },
      scenarioId: 'activity-clock-wait-eighty',
      scenarioVersion: 1,
      lastObservation: { summary: true },
      lastDelta: null,
      evidence: null,
    });

    renderWorkbench('viewer-a');
    await screen.findByRole('heading', { name: 'Lab workbench' });
    await waitFor(() => expect(readLabScenarios).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByLabelText('Scenario'),
      'activity-clock-wait-eighty@1',
    );
    await user.click(screen.getByRole('button', { name: 'Open LabRun' }));
    await waitFor(() => expect(openLabRun).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText('Lane'), 'connected');
    expect(screen.getByText(/Lane unavailable: Connected later/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open LabRun' }),
    ).toBeDisabled();
  });
});
