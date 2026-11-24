import assert from 'node:assert/strict';
import test from 'node:test';
import { createDevS3LiveAdapter, parseCredentials } from '../src/adapters/dev-s3-tenant-live-adapter.mjs';

test('credential lines parse the SeaweedFS provision format', () => {
  const parsed = parseCredentials('Created user "dev-1"\n\nAccess Key: AKEXAMPLE\nSecret Key: SECRETVALUE\n');
  assert.equal(parsed.accessKeyId, 'AKEXAMPLE');
  assert.equal(parsed.secretAccessKey, 'SECRETVALUE');
  const split = parseCredentials('Access Key: AKERR\nSecret Key: SKERR\n');
  assert.equal(split.secretAccessKey, 'SKERR');
  const exported = parseCredentials('noise {"identities":[{"name":"dev-1","credentials":[{"accessKey":"AKJSON","secretKey":"SKJSON"}]}]}');
  assert.equal(exported.accessKeyId, 'AKJSON');
  assert.equal(parseCredentials('Created user without keys'), null);
});

test('provision stores the secret from stdin and the receipt has only a uid', () => {
  const calls = [];
  const exec = (command, args, input) => {
    calls.push({ command, args, input });
    const joined = args.join(' ');
    if (String(input).includes('s3.user.provision')) return 'Access Key: AK\nSecret Key: SK\n';
    if (joined.includes('jsonpath={.metadata.uid}')) return 'uid-1\n';
    if (joined.includes('apply')) {
      assert.equal(args.includes('SK'), false);
      assert.equal(String(input).includes('SK'), true);
      return '';
    }
    return '';
  };
  const adapter = createDevS3LiveAdapter({ exec });
  const created = adapter.provisionUser({ slotId: 'dev-1', bucket: 'offscreen-dev-1', user: 'dev-1', secret: 'dev-1-s3' });
  assert.deepEqual(created, { secret: 'dev-1-s3', uid: 'uid-1' });
  assert.equal(JSON.stringify(calls.map((call) => call.args)).includes('SK'), false);
});
