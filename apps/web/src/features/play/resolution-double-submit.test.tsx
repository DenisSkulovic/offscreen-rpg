import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import { renderWithStoryQuery } from '@/src/test/query-harness';

const digestGate = {
  delayMs: 0,
};

vi.mock('@/src/shared/api/canonical-digest', () => ({
  digestResolutionRequest: async () => {
    if (digestGate.delayMs > 0) {
      await delay(digestGate.delayMs);
    }
    return 'ab'.repeat(32);
  },
}));

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));
vi.mock('./history', () => ({
  StoryHistoryView: () => null,
}));
vi.mock('./campaign-settings', () => ({
  CampaignSettingsEditor: () => null,
}));
vi.mock('./campaign-play', () => ({
  CampaignPlay: () => null,
}));
vi.mock('@/src/shared/api/story-update-stream', () => ({
  openStoryUpdateStream: () => ({ close() {} }),
  setStoryUpdateEventSourceFactoryForTests: () => undefined,
}));

import { PlayScene } from './view';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
  digestGate.delayMs = 0;
});

afterAll(() => {
  server.close();
});

describe('Play resolution double-submit guard', () => {
  it('keeps one operation identity across rapid double click before digest settles (negative)', async () => {
    const user = userEvent.setup();
    const initial = makeStorySnapshot();
    const operationIds: string[] = [];
    digestGate.delayMs = 80;

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
        async ({ params }) => {
          operationIds.push(String(params.operationId));
          await delay(20);
          return HttpResponse.json(
            makeStorySnapshot({
              viewVersion: 4,
              revision: 4,
              canRespond: false,
              title: 'Choice accepted',
              resolution: {
                state: 'pending',
                evidence: 'committed',
                version: 1,
              },
              interaction: null,
            }),
          );
        },
      ),
    );

    const { element } = renderWithStoryQuery(
      ({ viewerId, storyId }) => (
        <PlayScene viewerId={viewerId} storyId={storyId} />
      ),
      initial,
    );
    render(element);

    const choice = screen.getByRole('button', { name: 'Walk the gate road' });
    await user.click(choice);
    await user.click(choice);

    await waitFor(() => {
      expect(operationIds.length).toBeGreaterThanOrEqual(1);
    });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Choice accepted' }),
      ).toBeInTheDocument();
    });
    expect(operationIds).toHaveLength(1);
  });
});
