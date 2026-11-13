import { http, HttpResponse } from 'msw';
import { makeDraft, fixtureDraftId } from '@/src/test/draft-fixtures';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';

export const emptyStoriesHandlers = [
  http.get('/api/stories', () =>
    HttpResponse.json({ items: [], nextBefore: null }),
  ),
];

/** First-page stories failure — must not render verified-empty copy. */
export const failedStoriesHandlers = [
  http.get('/api/stories', () =>
    HttpResponse.json({ message: 'unavailable' }, { status: 503 }),
  ),
];

export const oneStoryHandlers = [
  http.get('/api/stories', () =>
    HttpResponse.json({
      items: [
        {
          id: fixtureIds.storyId,
          title: 'Ashfall Approach',
          status: 'live',
          storyteller: null,
        },
      ],
      nextBefore: null,
    }),
  ),
];

export const pagedStoriesHandlers = [
  http.get('/api/stories', ({ request }) => {
    const before = new URL(request.url).searchParams.get('before');
    if (before) {
      return HttpResponse.json({
        items: [
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            title: 'Older silt road',
            status: 'live',
            storyteller: null,
          },
        ],
        nextBefore: null,
      });
    }
    return HttpResponse.json({
      items: [
        {
          id: fixtureIds.storyId,
          title: 'Ashfall Approach',
          status: 'live',
          storyteller: null,
        },
      ],
      nextBefore: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
  }),
];

export const emptyDraftsHandlers = [
  http.get('/api/drafts', () =>
    HttpResponse.json({ items: [], nextCursor: null }),
  ),
];

export const draftConflictHandlers = [
  http.get(`/api/drafts/${fixtureDraftId}`, () =>
    HttpResponse.json(makeDraft()),
  ),
  http.put(`/api/drafts/${fixtureDraftId}`, () =>
    HttpResponse.json(
      { error: 'Revision conflict', code: 'conflict' },
      { status: 409 },
    ),
  ),
];

export const emptyPresetHandlers = [
  http.get('/api/stories/presets/catalogue', () => HttpResponse.json([])),
  http.get('/api/stories/presets', () => HttpResponse.json([])),
];

/** Explicit deny: Chamber tools are absent on ordinary Nest boot. */
export const chamberDeniedHandlers = [
  http.get('/api/chamber-tools/stories/:id', () =>
    HttpResponse.json(
      { error: 'Chamber tools are not mounted on this API.' },
      { status: 404 },
    ),
  ),
  http.post('/api/stories/:id/chamber', () =>
    HttpResponse.json(
      { error: 'Chamber tools are not mounted on this API.' },
      { status: 404 },
    ),
  ),
];

export const storySnapshotHandlers = [
  http.get(`/api/stories/${fixtureIds.storyId}`, () =>
    HttpResponse.json(makeStorySnapshot()),
  ),
];
