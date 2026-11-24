import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_API_PORT_RANGE,
  RELEASE_API_PORT,
  parseKindTopology,
  readKindProfile,
  renderKindConfig,
} from './config.mjs';

const devProfile = readKindProfile('dev');
const releaseProfile = readKindProfile('release');

test('canonical release profile matches committed kind.yaml topology', () => {
  const parsed = parseKindTopology(releaseProfile.kindYamlText, 'release');
  assert.equal(parsed.nodeCount, releaseProfile.nodeCount);
  assert.equal(parsed.nodeImage, releaseProfile.nodeImage);
  assert.equal(parsed.apiServerPort, RELEASE_API_PORT);
});

test('canonical dev profile omits apiServerPort in committed topology', () => {
  const parsed = parseKindTopology(devProfile.kindYamlText, 'dev');
  assert.equal(parsed.apiServerPort, null);
  assert.equal(parsed.nodeCount, devProfile.nodeCount);
});

test('renderKindConfig injects dev port after apiServerAddress and preserves nodes', () => {
  const port = DEV_API_PORT_RANGE.start;
  const rendered = renderKindConfig(devProfile, port);
  assert.match(rendered, new RegExp(`apiServerPort: ${port}`));
  assert.match(rendered, /apiServerAddress: "127\.0\.0\.1"/);
  for (const node of devProfile.nodes) {
    assert.match(rendered, new RegExp(`role: ${node.role}`));
    assert.match(rendered, new RegExp(`image: ${node.image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('fixture with an extra worker renders unchanged node lines', () => {
  const fixture = `${devProfile.kindYamlText.trimEnd()}\n  - role: worker\n    image: ${devProfile.nodeImage}\n`;
  const modifiedProfile = { ...devProfile, kindYamlText: `${fixture}\n` };
  const rendered = renderKindConfig(modifiedProfile, DEV_API_PORT_RANGE.start + 1);
  assert.match(rendered, /- role: worker[\s\S]*- role: worker/);
  assert.equal((rendered.match(/- role: worker/g) ?? []).length, 2);
});

test('parseKindTopology rejects duplicate networking keys and dev apiServerPort', () => {
  const duplicateAddress = releaseProfile.kindYamlText.replace(
    'nodes:',
    '  apiServerAddress: "127.0.0.1"\nnodes:',
  );
  assert.throws(() => parseKindTopology(duplicateAddress, 'release'), /duplicate networking key apiServerAddress/);

  const devWithPort = devProfile.kindYamlText.replace(
    'apiServerAddress: "127.0.0.1"',
    'apiServerAddress: "127.0.0.1"\n  apiServerPort: 24443',
  );
  assert.throws(() => parseKindTopology(devWithPort, 'dev'), /must not declare apiServerPort/);
});

test('parseKindTopology rejects unknown topology keys', () => {
  const unknownKey = devProfile.kindYamlText.replace('networking:', 'networking:\n  foo: bar');
  assert.throws(() => parseKindTopology(unknownKey, 'dev'), /unknown networking key foo/);
});

test('renderKindConfig refuses invalid dev ports', () => {
  assert.throws(() => renderKindConfig(devProfile, RELEASE_API_PORT), /non-release/);
  assert.throws(() => renderKindConfig(devProfile, DEV_API_PORT_RANGE.end + 1), /outside/);
});