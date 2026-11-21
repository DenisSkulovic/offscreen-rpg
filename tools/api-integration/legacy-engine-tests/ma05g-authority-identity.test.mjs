import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import {
  selectStorytellerNoticeTopicAtAdmission,
  insertStorytellerTask,
  storytellerTopic,
  storytellerDistributedTopic,
} from '../../../packages/story-engine/dist/storyteller/records.js';
import {
  selectStorytellerNoticeTopicAtAdmission as selectNoticeFromRecord,
  insertStorytellerTask as insertFromRecord,
} from '../../../packages/story-engine/dist/stories/storyteller-task-record.js';
import {
  isStorytellerActivityState,
  storytellerActivityContextFilter,
  STORYTELLER_ACTIVITY_STATES,
} from '../../../packages/story-engine/dist/storyteller/activity-context.js';
import {
  isStorytellerActivityState as isStateFromFilter,
  storytellerActivityContextFilter as filterFromCampaign,
  STORYTELLER_ACTIVITY_STATES as statesFromCampaign,
} from '../../../packages/story-engine/dist/campaign/storyteller-activity-filter.js';
import { activeSceneAnchorSchema as anchorFromContext } from '../../../packages/story-engine/dist/storyteller/context.js';
import { activeSceneAnchorSchema as anchorFromStories } from '../../../packages/story-engine/dist/stories/active-scene-anchor.js';
import {
  replayStorytellerResolutionIfMatching as replayFromAdmission,
  commitStorytellerResolution as commitFromAdmission,
} from '../../../packages/story-engine/dist/storyteller/admission.js';
import {
  replayStorytellerResolutionIfMatching as replayFromAuthority,
  commitStorytellerResolution as commitFromAuthority,
} from '../../../packages/story-engine/dist/stories/storyteller-resolution-authority.js';

const srcRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/story-engine/src',
);

function readAuthoritySource(relativePath) {
  return readFileSync(join(srcRoot, relativePath), 'utf8');
}

test('MA05G T01: task record functions are strict-identical via records reexport', () => {
  assert.strictEqual(
    selectStorytellerNoticeTopicAtAdmission,
    selectNoticeFromRecord,
  );
  assert.strictEqual(insertStorytellerTask, insertFromRecord);
});

test('MA05G T01: activity filter exports are strict-identical via activity-context reexport', () => {
  assert.strictEqual(isStorytellerActivityState, isStateFromFilter);
  assert.strictEqual(storytellerActivityContextFilter, filterFromCampaign);
  assert.strictEqual(STORYTELLER_ACTIVITY_STATES, statesFromCampaign);
});

test('MA05G T01: activeSceneAnchorSchema is strict-identical via context reexport', () => {
  assert.strictEqual(anchorFromContext, anchorFromStories);
});

test('MA05G T02: resolution replay and commit are strict-identical via admission reexport', () => {
  assert.strictEqual(replayFromAdmission, replayFromAuthority);
  assert.strictEqual(commitFromAdmission, commitFromAuthority);
});

test('MA05G T01: selector behavior unchanged', () => {
  assert.equal(selectStorytellerNoticeTopicAtAdmission({}), storytellerTopic);
  assert.equal(
    selectStorytellerNoticeTopicAtAdmission({
      STORYTELLER_DISTRIBUTED_V1: 'true',
    }),
    storytellerDistributedTopic,
  );
});

test('MA05G T01 negative: new authority modules do not import storyteller admission', () => {
  const authorityPaths = [
    'stories/storyteller-task-record.ts',
    'stories/storyteller-resolution-contract.ts',
    'stories/active-scene-anchor.ts',
    'stories/storyteller-resolution-authority.ts',
  ];
  const forbidden = /from\s+['"]\.\.\/storyteller\/admission/;
  for (const relativePath of authorityPaths) {
    const source = readAuthoritySource(relativePath);
    assert.doesNotMatch(
      source,
      forbidden,
      `${relativePath} must not import storyteller/admission`,
    );
  }
});

test('MA05G T03 negative: resolution core and authority do not import storyteller runtime', () => {
  const boundaryPaths = [
    'stories/resolution-core.ts',
    'stories/storyteller-resolution-authority.ts',
  ];
  const forbiddenStorytellerRelative = /from\s+['"]\.\.\/storyteller\//;
  for (const relativePath of boundaryPaths) {
    const source = readAuthoritySource(relativePath);
    assert.doesNotMatch(
      source,
      forbiddenStorytellerRelative,
      `${relativePath} must not use relative ../storyteller/ imports`,
    );
  }
});
