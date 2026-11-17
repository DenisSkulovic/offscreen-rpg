import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse } from 'msw';
import { StoryHistoryView } from '@/src/features/play/history';
import { withIsolatedQueryClient } from './decorators/query-isolation';

const storyId = '11111111-1111-4111-8111-111111111111';

const meta = {
  title: 'Experience/Journal reader',
  decorators: [withIsolatedQueryClient],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get(`/api/stories/${storyId}/history`, ({ request }) => {
          const before = new URL(request.url).searchParams.get('before');
          if (before === null) {
            return HttpResponse.json({
              items: [
                {
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  sequence: 4,
                  content: {
                    version: 1,
                    title: 'Someone at the door',
                    paragraphs: [
                      'Someone in a soaked harbor coat has climbed onto the landing.',
                      'They stop beside the mechanism.',
                    ],
                  },
                },
              ],
              nextBefore: 2,
            });
          }
          return HttpResponse.json({
            items: [
              {
                id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                sequence: 2,
                content: {
                  version: 1,
                  title: 'The repair stops',
                  paragraphs: ['The lamp stays dark. Nothing here is a new choice.'],
                },
              },
            ],
            nextBefore: null,
          });
        }),
      ],
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const OriginalPassage: Story = {
  render: () => (
    <div className="story-frame">
      <article className="story-frame__book">
        <StoryHistoryView viewerId="viewer-story" storyId={storyId} />
      </article>
    </div>
  ),
};
