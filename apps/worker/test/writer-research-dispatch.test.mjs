import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WRITER_RESEARCH_JOIN_WAKE_TOPIC,
  WRITER_RESEARCH_WAKE_TOPIC,
} from '@offscreen/story-engine/storyteller';
import {
  writerResearchJoinWorkflowId,
  writerResearchJoinWorkflowType,
  writerResearchWorkflowId,
  writerResearchWorkflowType,
} from '@offscreen/workflows/contracts';
import { selectNoticeDispatch } from '../dist/src/outbox/dispatch.js';

const childId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const joinId = '11111111-2222-4333-8444-555555555555';

test('writer.research.v1 dispatches writerResearchV1', () => {
  const dispatch = selectNoticeDispatch(WRITER_RESEARCH_WAKE_TOPIC);
  assert.ok(dispatch);
  assert.equal(dispatch.kind, 'start');
  assert.equal(dispatch.workflowType, writerResearchWorkflowType);
  assert.equal(dispatch.workflowId(childId), writerResearchWorkflowId(childId));
});

test('writer.research.join.v1 dispatches writerResearchJoinV1', () => {
  const dispatch = selectNoticeDispatch(WRITER_RESEARCH_JOIN_WAKE_TOPIC);
  assert.ok(dispatch);
  assert.equal(dispatch.kind, 'start');
  assert.equal(dispatch.workflowType, writerResearchJoinWorkflowType);
  assert.equal(
    dispatch.workflowId(joinId),
    writerResearchJoinWorkflowId(joinId),
  );
});