import assert from 'node:assert/strict';
import test from 'node:test';
import { publicationCanonOwnerAllowed } from '../dist/stories/passage-documents.js';

const storyId = 'e757f6d0-c94d-4cf9-8a8b-96e4f3364d86';
const parentId = '643837e6-fe57-4e5b-a994-75c2a1fc829d';
const otherId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('a story publishes on its own canon root', () => {
  assert.equal(publicationCanonOwnerAllowed(storyId, storyId, null), true);
});

test('a fork publishes on the source manifest it inherited', () => {
  assert.equal(publicationCanonOwnerAllowed(storyId, parentId, parentId), true);
});

test('a fork cannot publish on an unrelated manifest', () => {
  assert.equal(publicationCanonOwnerAllowed(storyId, otherId, parentId), false);
});

test('a story that is not a fork cannot use another campaign manifest', () => {
  assert.equal(publicationCanonOwnerAllowed(storyId, parentId, null), false);
});
