import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RELEASE_NATIVE_SECRET_NAME,
  releaseLegacyOfflineObjectStorageSpecimen,
  resolveReleaseNativeObjectStorageBinding,
} from '../binding.mjs';

test('offline legacy release render specimen is explicit, not live admission', () => {
  const specimen = releaseLegacyOfflineObjectStorageSpecimen();
  assert.equal(specimen.specimen, 'legacy-offline');
  assert.equal(specimen.objectStorage.credentials.secretName, 'game-runtime');
  assert.notEqual(
    specimen.objectStorage.credentials.secretName,
    RELEASE_NATIVE_SECRET_NAME,
  );
});

test('live native release binding uses scoped game-s3', () => {
  const binding = resolveReleaseNativeObjectStorageBinding();
  assert.equal(binding.credentials.secretName, RELEASE_NATIVE_SECRET_NAME);
  assert.equal(binding.bucket, 'lab-objects');
});
