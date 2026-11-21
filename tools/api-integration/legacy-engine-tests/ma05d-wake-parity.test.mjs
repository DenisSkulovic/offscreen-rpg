import assert from 'node:assert/strict';
import test from 'node:test';
import {
  storytellerDistributedTopic,
  storytellerTopic,
} from '@offscreen/contracts/storyteller-notices';
import {
  readFrozenStorytellerNoticeTopic,
  storytellerNoticeTopicForWake,
  storytellerDistributedTopic as recordsDistributedTopic,
  storytellerTopic as recordsStorytellerTopic,
} from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  readFrozenStorytellerNoticeTopic as wakeReadFrozenStorytellerNoticeTopic,
  storytellerNoticeTopicForWake as wakeStorytellerNoticeTopicForWake,
  isProvisionalContextCapture as wakeIsProvisionalContextCapture,
} from '../../../packages/story-engine/dist/campaign/storyteller-wake.js';
import { isProvisionalContextCapture } from '../../../packages/story-engine/dist/storyteller/capture-materialization.js';

test('MA05D T03: wake seam re-exports preserve canonical function identity', () => {
  assert.equal(
    readFrozenStorytellerNoticeTopic,
    wakeReadFrozenStorytellerNoticeTopic,
  );
  assert.equal(
    storytellerNoticeTopicForWake,
    wakeStorytellerNoticeTopicForWake,
  );
  assert.equal(isProvisionalContextCapture, wakeIsProvisionalContextCapture);
});

test('MA05D T03: notice topic literals match contracts', () => {
  assert.equal(recordsStorytellerTopic, 'storyteller.profiled.v1');
  assert.equal(recordsDistributedTopic, 'storyteller.distributed.v1');
  assert.equal(recordsStorytellerTopic, storytellerTopic);
  assert.equal(recordsDistributedTopic, storytellerDistributedTopic);
});
