#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  localObjectStorageBinding,
  validateObjectStorageBinding,
} from '../../platform/object-storage/binding.mjs';

const RELEASE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(RELEASE_DIR, '../../..');
const RENDER_MJS = join(REPO_ROOT, 'infra/workloads/render.mjs');

export const RELEASE_OBJECT_STORAGE_ENDPOINT =
  'http://object-store.lab-objects.svc.cluster.local:8333';
export const RELEASE_OBJECT_STORAGE_BUCKET = 'lab-objects';
export const RELEASE_NATIVE_SECRET_NAME = 'game-s3';

/**
 * @returns {ReturnType<typeof validateObjectStorageBinding>}
 */
export function resolveReleaseNativeObjectStorageBinding() {
  return localObjectStorageBinding({
    bucket: RELEASE_OBJECT_STORAGE_BUCKET,
    endpoint: RELEASE_OBJECT_STORAGE_ENDPOINT,
    secretName: RELEASE_NATIVE_SECRET_NAME,
  });
}

/**
 * Historical offline release render specimen; not live admission.
 *
 * @returns {{ specimen: 'legacy-offline', objectStorage: ReturnType<typeof validateObjectStorageBinding> }}
 */
export function releaseLegacyOfflineObjectStorageSpecimen() {
  const objectStorage = validateObjectStorageBinding({
    bucket: RELEASE_OBJECT_STORAGE_BUCKET,
    region: 'us-east-1',
    endpoint: RELEASE_OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: { mode: 'secret', secretName: 'game-runtime' },
  });
  return Object.freeze({ specimen: 'legacy-offline', objectStorage });
}

/**
 * @param {string} path
 */
export function readValidatedReleaseBindingFile(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('release objectStorage binding file is unreadable');
  }
  return validateObjectStorageBinding(parsed);
}

/**
 * @param {string} path
 * @param {unknown} binding
 */
export function writeValidatedReleaseBindingFile(path, binding) {
  const validated = validateObjectStorageBinding(binding);
  writeFileSync(path, `${JSON.stringify(validated)}\n`, { mode: 0o600 });
}

/**
 * @param {ReturnType<typeof validateObjectStorageBinding>} binding
 */
export function objectStorageDocumentEnv(binding) {
  const os = validateObjectStorageBinding(binding);
  /** @type {Array<Record<string, unknown>>} */
  const env = [
    { name: 'OFFSCREEN_DOCUMENT_STORE', value: 's3' },
    { name: 'OFFSCREEN_DOCUMENT_S3_BUCKET', value: os.bucket },
    { name: 'OFFSCREEN_DOCUMENT_S3_REGION', value: os.region },
    {
      name: 'OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE',
      value: os.forcePathStyle ? 'true' : 'false',
    },
  ];
  if (os.endpoint) {
    env.push({ name: 'OFFSCREEN_DOCUMENT_S3_ENDPOINT', value: os.endpoint });
  }
  if (os.prefix) {
    env.push({ name: 'OFFSCREEN_DOCUMENT_S3_PREFIX', value: os.prefix });
  }
  if (os.credentials.mode === 'secret') {
    const secretName = os.credentials.secretName;
    env.push(
      {
        name: 'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID',
        valueFrom: {
          secretKeyRef: { name: secretName, key: 'access-key-id' },
        },
      },
      {
        name: 'OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY',
        valueFrom: {
          secretKeyRef: { name: secretName, key: 'secret-access-key' },
        },
      },
    );
  }
  return env;
}

/**
 * @param {string} section
 * @param {string} bindingPath
 * @param {{ run?: typeof spawnSync }} [options]
 */
export function renderReleaseSectionWithBinding(
  section,
  bindingPath,
  options = {},
) {
  const run = options.run ?? spawnSync;
  const binding = readValidatedReleaseBindingFile(bindingPath);
  const expected = resolveReleaseNativeObjectStorageBinding();
  if (JSON.stringify(binding) !== JSON.stringify(expected)) {
    throw new Error(
      'release objectStorage binding does not match native admission',
    );
  }
  const result = run(process.execPath, [RENDER_MJS, 'release', section], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OFFSCREEN_RELEASE_OBJECT_STORAGE_BINDING: bindingPath,
    },
  });
  if (result.status !== 0 || result.error) {
    throw new Error('release manifest render failed');
  }
  return result.stdout ?? '';
}

function printUsage() {
  process.stderr.write(
    'usage: node binding.mjs write-native <path>\n' +
      '       node binding.mjs render <section> <binding-path>\n',
  );
}

function main() {
  const [, , command, ...rest] = process.argv;
  if (command === 'write-native') {
    const [path] = rest;
    if (!path) {
      printUsage();
      process.exitCode = 2;
      return;
    }
    writeValidatedReleaseBindingFile(
      path,
      resolveReleaseNativeObjectStorageBinding(),
    );
    return;
  }
  if (command === 'render') {
    const [section, bindingPath] = rest;
    if (!section || !bindingPath) {
      printUsage();
      process.exitCode = 2;
      return;
    }
    try {
      process.stdout.write(
        renderReleaseSectionWithBinding(section, bindingPath),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
    return;
  }
  printUsage();
  process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
