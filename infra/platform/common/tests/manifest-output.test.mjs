import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { parseAllDocuments } from 'yaml';
import test from 'node:test';
import { formatManifestDocuments } from '../manifest-output.mjs';
import { renderPlatformYaml } from '../render.mjs';

const fixtureDocs = () => [
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: { name: 'scalar-strings', namespace: 'demo' },
    data: {
      num: '20',
      flag: 'true',
      emptyish: 'null',
    },
  },
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: { name: 'multiline', namespace: 'demo' },
    data: {
      script: ['line one', 'line two', ''].join('\n'),
    },
  },
  {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: { name: 'collections', namespace: 'demo' },
    data: {},
    spec: {
      enabled: true,
      replicas: 0,
      tags: ['alpha', 'beta'],
      nested: { child: null, deeper: { ok: false } },
    },
  },
];

function parseYamlDocuments(text) {
  return parseAllDocuments(text).map((doc) => doc.toJS());
}

test('yaml format round-trips semantic values', () => {
  const documents = fixtureDocs();
  const text = formatManifestDocuments(documents, 'yaml');
  const parsed = parseYamlDocuments(text);
  assert.equal(parsed.length, documents.length);
  for (let i = 0; i < documents.length; i += 1) {
    assert.ok(
      isDeepStrictEqual(parsed[i], documents[i]),
      `document ${i} should round-trip`,
    );
  }
});

test('json format emits indented array document', () => {
  const documents = fixtureDocs();
  const text = formatManifestDocuments(documents, 'json');
  assert.equal(text, `${JSON.stringify(documents, null, 2)}\n`);
  const parsed = JSON.parse(text);
  assert.ok(isDeepStrictEqual(parsed, documents));
});

test('legacy format matches renderPlatformYaml bytes', () => {
  const documents = fixtureDocs();
  const legacy = formatManifestDocuments(documents, 'legacy');
  const expected = renderPlatformYaml(documents);
  assert.equal(legacy, expected);
});

test('unknown format is rejected', () => {
  assert.throws(
    () => formatManifestDocuments([], 'xml'),
    /unsupported manifest format: xml/,
  );
});

test('non-array documents are rejected', () => {
  assert.throws(
    () => formatManifestDocuments({}, 'yaml'),
    /documents must be an array/,
  );
});

test('non-object entries are rejected', () => {
  assert.throws(
    () => formatManifestDocuments([{ ok: true }, null], 'yaml'),
    /each document must be a plain object/,
  );
  assert.throws(
    () => formatManifestDocuments([[]], 'yaml'),
    /each document must be a plain object/,
  );
});
