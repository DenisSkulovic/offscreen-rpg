import assert from 'node:assert/strict';
import test from 'node:test';
import {
  selectStorytellerNoticeTopicAtAdmission,
  storytellerDistributedTopic,
  storytellerTopic,
} from '../../../packages/story-engine/dist/storyteller/records.js';

test('STORY03 T04: admission selector freezes distributed vs legacy topic', () => {
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({}),
    storytellerTopic,
  );
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({ STORYTELLER_DISTRIBUTED_V1: 'false' }),
    storytellerTopic,
  );
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({ STORYTELLER_DISTRIBUTED_V1: 'true' }),
    storytellerDistributedTopic,
  );
});

test('STORY03 T04 negative: flipped runtime flag does not change persisted topic semantics', () => {
  const legacyNoticeTopic = storytellerTopic;
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({ STORYTELLER_DISTRIBUTED_V1: 'true' }),
    storytellerDistributedTopic,
  );
  assert.notEqual(legacyNoticeTopic, storytellerDistributedTopic);
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({}),
    legacyNoticeTopic,
  );
});