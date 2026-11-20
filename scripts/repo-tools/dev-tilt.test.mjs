import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessDevLaunch,
  formatReadyLines,
  maybeAnnounce,
  LAB_RESOURCES,
} from './dev-tilt.mjs';

function fullReadiness(overrides = {}) {
  /** @type {Record<string, boolean>} */
  const map = Object.fromEntries(LAB_RESOURCES.map((name) => [name, true]));
  return { ...map, ...overrides };
}

test('happy path returns the three loopback URLs', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'owned' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.urls, {
    game: 'http://127.0.0.1:3000/',
    control: 'http://127.0.0.1:3000/control',
    tilt: 'http://127.0.0.1:10350/',
  });
  const announced = maybeAnnounce(result);
  assert.equal(announced.length, 3);
  assert.ok(announced.every((line) => line.includes('127.0.0.1')));
});

test('foreign context preflight refusal yields null urls', () => {
  const preflightRefusals = [
    {
      id: 'foreign-context',
      message: 'Refusing: current kubectl context is "minikube", not kind-offscreen-lab.',
    },
  ];
  const result = assessDevLaunch({
    preflightOk: false,
    preflightRefusals,
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'foreign-context'));
  assert.equal(maybeAnnounce(result).length, 0);
});

test('foreign game port yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'foreign', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'foreign-game-port'));
});

test('unready game-executor yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'owned', tilt: 'owned' },
    readiness: fullReadiness({ 'game-executor': false }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'resource-not-ready-game-executor'));
});

test('missing tilt yields null urls', () => {
  const result = assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: false,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.urls, null);
  assert.ok(result.refusals.some((r) => r.id === 'missing-tilt'));
});

test('maybeAnnounce with null urls or empty input prints nothing', () => {
  assert.deepEqual(maybeAnnounce({ urls: null }), []);
  assert.deepEqual(maybeAnnounce({ ok: false, urls: null, refusals: [] }), []);
  assert.deepEqual(maybeAnnounce([]), []);
});

test('formatReadyLines and assertions never use 0.0.0.0 as bind address', () => {
  const urls = {
    game: 'http://127.0.0.1:3000/',
    control: 'http://127.0.0.1:3000/control',
    tilt: 'http://127.0.0.1:10350/',
  };
  const lines = formatReadyLines(urls);
  const blob = JSON.stringify({ urls, lines, result: assessDevLaunch({
    preflightOk: true,
    preflightRefusals: [],
    tiltOnPath: true,
    ports: { game: 'free', tilt: 'free' },
    readiness: fullReadiness(),
  }) });
  assert.doesNotMatch(blob, /0\.0\.0\.0/);
});