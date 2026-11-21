import assert from 'node:assert/strict';
import test from 'node:test';
import { routeStorytellerTaskCustody } from '@offscreen/contracts/storyteller-task-custody';
import { routeFor } from '../src/server';

const operationId = '550e8400-e29b-41d4-a716-446655440000';

test('GA story route parser accepts launch PUT and GET', () => {
  assert.deepEqual(
    routeFor('PUT', `/internal/v1/stories/launch/${operationId}`),
    { kind: 'launch-put', operationId },
  );
  assert.deepEqual(
    routeFor('GET', `/internal/v1/stories/launch/${operationId}`),
    { kind: 'launch-get', operationId },
  );
});

test('launch paths are not storyteller task custody routes', () => {
  const custody = routeStorytellerTaskCustody(
    'PUT',
    `/internal/v1/stories/launch/${operationId}`,
  );
  assert.equal(custody.kind, 'absent');
});