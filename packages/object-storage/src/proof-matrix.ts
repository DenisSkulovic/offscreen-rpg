import {
  maximumObjectBytes,
  ObjectStorageError,
  type PutIfAbsentResult,
} from './object-storage.js';
import type { S3ObjectStorage } from './s3-object-storage.js';

const proofPrefixPattern = /^proof\/[0-9a-f]{16}\/$/;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function runInjectedScopedProof(input: {
  owner: S3ObjectStorage;
  stranger: S3ObjectStorage;
  denied: S3ObjectStorage;
  keyPrefix: string;
  deleteOwned: (key: string) => Promise<void>;
}): Promise<{
  duplicate: 'already-exists';
  readback: string;
  missing: 'missing';
  strangerRead: 'denied';
  ownerCrossRead: 'denied';
  deniedHead: 'unavailable';
  raceWritten: 1;
  raceAlreadyExists: 7;
  raceWinner: string;
  deleted: string[];
  grant: 'unsupported';
}> {
  if (!proofPrefixPattern.test(input.keyPrefix)) {
    throw new Error('proof key prefix refused');
  }

  const { owner, stranger, denied, keyPrefix, deleteOwned } = input;

  await owner.requireBucket();

  const objectKey = `${keyPrefix}object.bin`;
  const firstPut = await owner.putIfAbsent(
    objectKey,
    textEncoder.encode('alpha'),
    'text/plain',
  );
  if (firstPut !== 'written') {
    throw new Error(`expected first put written, got ${firstPut}`);
  }

  const duplicatePut = await owner.putIfAbsent(
    objectKey,
    textEncoder.encode('beta'),
    'text/plain',
  );
  if (duplicatePut !== 'already-exists') {
    throw new Error(`expected duplicate already-exists, got ${duplicatePut}`);
  }

  const readback = textDecoder.decode(
    await owner.get(objectKey, maximumObjectBytes),
  );
  if (readback !== 'alpha') {
    throw new Error(`expected readback alpha, got ${readback}`);
  }

  try {
    await owner.get(`${keyPrefix}missing.bin`, maximumObjectBytes);
    throw new Error('expected missing.bin to throw');
  } catch (error) {
    if (!(error instanceof ObjectStorageError) || error.code !== 'missing') {
      throw error;
    }
  }

  try {
    await stranger.get(objectKey, maximumObjectBytes);
    throw new Error('expected stranger read to throw');
  } catch (error) {
    if (
      !(error instanceof ObjectStorageError) ||
      error.code !== 'unavailable'
    ) {
      throw error;
    }
  }

  const strangerKey = `${keyPrefix}stranger.bin`;
  await stranger.putIfAbsent(
    strangerKey,
    textEncoder.encode('other'),
    'text/plain',
  );

  try {
    await owner.get(strangerKey, maximumObjectBytes);
    throw new Error('expected owner cross read to throw');
  } catch (error) {
    if (
      !(error instanceof ObjectStorageError) ||
      error.code !== 'unavailable'
    ) {
      throw error;
    }
  }

  try {
    await denied.requireBucket();
    throw new Error('expected denied requireBucket to throw');
  } catch (error) {
    if (
      !(error instanceof ObjectStorageError) ||
      error.code !== 'unavailable'
    ) {
      throw error;
    }
  }

  const raceKey = `${keyPrefix}race.bin`;
  const raceBodies = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'] as const;
  const raceResults: PutIfAbsentResult[] = await Promise.all(
    raceBodies.map((body) =>
      owner.putIfAbsent(raceKey, textEncoder.encode(body), 'text/plain'),
    ),
  );
  const raceWritten = raceResults.filter((r) => r === 'written').length;
  const raceAlreadyExists = raceResults.filter(
    (r) => r === 'already-exists',
  ).length;
  if (raceWritten !== 1 || raceAlreadyExists !== 7) {
    throw new Error(
      `race counts invalid: written=${raceWritten} already-exists=${raceAlreadyExists}`,
    );
  }

  const raceWinner = textDecoder.decode(
    await owner.get(raceKey, maximumObjectBytes),
  );
  if (!raceBodies.includes(raceWinner as (typeof raceBodies)[number])) {
    throw new Error(`unexpected race winner body ${raceWinner}`);
  }

  const deleted: string[] = [];
  for (const key of [objectKey, strangerKey, raceKey]) {
    await deleteOwned(key);
    deleted.push(key);
  }

  for (const key of [objectKey, raceKey]) {
    try {
      await owner.get(key, maximumObjectBytes);
      throw new Error(`expected ${key} missing after delete`);
    } catch (error) {
      if (!(error instanceof ObjectStorageError) || error.code !== 'missing') {
        throw error;
      }
    }
  }

  return {
    duplicate: 'already-exists',
    readback: 'alpha',
    missing: 'missing',
    strangerRead: 'denied',
    ownerCrossRead: 'denied',
    deniedHead: 'unavailable',
    raceWritten: 1,
    raceAlreadyExists: 7,
    raceWinner,
    deleted,
    grant: 'unsupported',
  };
}
