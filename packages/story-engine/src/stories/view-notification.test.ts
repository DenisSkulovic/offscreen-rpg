import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY_VIEW_NOTIFY_CHANNEL } from './view-notification.js';

test('story view notify channel literal is stable', () => {
  assert.equal(STORY_VIEW_NOTIFY_CHANNEL, 'offscreen_story_view');
});