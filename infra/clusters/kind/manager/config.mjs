import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MANAGER_ROOT = dirname(fileURLToPath(import.meta.url));
const KIND_ROOT = join(MANAGER_ROOT, '..');

/** @typedef {'dev' | 'release'} KindProfileId */

export const RELEASE_API_PORT = 6443;
export const DEV_API_PORT_RANGE = Object.freeze({ start: 24443, end: 24543 });
export const LOOPBACK_API_ADDRESS = '127.0.0.1';

const PROFILE_HOME = Object.freeze({
  dev: Object.freeze({
    id: 'dev',
    clusterName: 'offscreen-dev',
    contextName: 'kind-offscreen-dev',
    kindYamlRel: 'dev/kind.yaml',
    requireApiServerPort: false,
  }),
  release: Object.freeze({
    id: 'release',
    clusterName: 'offscreen-release',
    contextName: 'kind-offscreen-release',
    kindYamlRel: 'release/kind.yaml',
    requireApiServerPort: true,
  }),
});

const ALLOWED_TOP_LEVEL = new Set(['kind', 'apiVersion', 'networking', 'nodes']);
const ALLOWED_NETWORKING = new Set(['apiServerAddress', 'apiServerPort']);
const ALLOWED_NODE = new Set(['role', 'image']);

/**
 * @param {string} text
 * @param {KindProfileId} profileId
 */
export function parseKindTopology(text, profileId) {
  const home = PROFILE_HOME[profileId];
  if (!home) {
    throw new Error(`unknown kind profile ${profileId}`);
  }

  const lines = text.split('\n');
  /** @type {Map<string, number>} */
  const topLevelCounts = new Map();
  /** @type {Map<string, number>} */
  const networkingCounts = new Map();
  let inNetworking = false;
  let inNodes = false;
  let inNodeItem = false;
  /** @type {Map<string, number>} */
  const nodeFieldCounts = new Map();
  /** @type {{ role?: string, image?: string } | null} */
  let currentNode = null;
  /** @type {{ role: string, image: string }[]} */
  const nodes = [];
  let apiServerAddress = null;
  let apiServerPort = null;

  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = rawLine.length - rawLine.trimStart().length;

    if (indent === 0) {
      const topMatch = trimmed.match(/^([A-Za-z][\w.-]*):\s*(.*)$/);
      if (!topMatch) continue;
      inNetworking = false;
      inNodes = false;
      inNodeItem = false;
      currentNode = null;
      nodeFieldCounts.clear();
      const key = topMatch[1];
      if (!ALLOWED_TOP_LEVEL.has(key)) {
        throw new Error(`unknown top-level kind topology key ${key}`);
      }
      bump(topLevelCounts, key);
      if (key === 'networking') inNetworking = true;
      if (key === 'nodes') inNodes = true;
      continue;
    }

    if (inNetworking && indent === 2) {
      const fieldMatch = trimmed.match(/^([A-Za-z][\w.-]*):\s*(.*)$/);
      if (!fieldMatch) continue;
      const key = fieldMatch[1];
      const value = fieldMatch[2].trim();
      if (!ALLOWED_NETWORKING.has(key)) {
        throw new Error(`unknown networking key ${key}`);
      }
      bump(networkingCounts, key);
      if (key === 'apiServerAddress') {
        const quoted = value.match(/^"([^"]*)"$/);
        if (!quoted) throw new Error('apiServerAddress must be a quoted string');
        apiServerAddress = quoted[1];
      }
      if (key === 'apiServerPort') {
        const port = Number.parseInt(value, 10);
        if (!Number.isInteger(port)) throw new Error('apiServerPort must be an integer');
        apiServerPort = port;
      }
      continue;
    }

    if (inNodes && indent === 2 && trimmed.startsWith('- ')) {
      if (currentNode) {
        nodes.push(finishNode(currentNode, nodeFieldCounts));
      }
      nodeFieldCounts.clear();
      currentNode = {};
      inNodeItem = true;
      const rest = trimmed.slice(2);
      const itemMatch = rest.match(/^([A-Za-z][\w.-]*):\s*(.+)$/);
      if (itemMatch) {
        applyNodeField(currentNode, nodeFieldCounts, itemMatch[1], itemMatch[2].trim());
      }
      continue;
    }

    if (inNodes && inNodeItem && indent >= 4) {
      const fieldMatch = trimmed.match(/^([A-Za-z][\w.-]*):\s*(.*)$/);
      if (!fieldMatch) continue;
      const key = fieldMatch[1];
      const value = fieldMatch[2].trim();
      applyNodeField(currentNode, nodeFieldCounts, key, value);
    }
  }

  if (currentNode) {
    nodes.push(finishNode(currentNode, nodeFieldCounts));
  }

  for (const [key, count] of topLevelCounts) {
    if (count > 1) throw new Error(`duplicate top-level key ${key}`);
  }
  for (const [key, count] of networkingCounts) {
    if (count > 1) throw new Error(`duplicate networking key ${key}`);
  }
  if (!topLevelCounts.has('kind') || !topLevelCounts.has('apiVersion')) {
    throw new Error('kind topology must declare kind and apiVersion');
  }
  if (!topLevelCounts.has('networking') || !topLevelCounts.has('nodes')) {
    throw new Error('kind topology must declare networking and nodes');
  }
  if (apiServerAddress == null) {
    throw new Error('kind topology must declare apiServerAddress');
  }
  if (apiServerAddress !== LOOPBACK_API_ADDRESS) {
    throw new Error(`apiServerAddress must be ${LOOPBACK_API_ADDRESS}`);
  }

  const portCount = networkingCounts.get('apiServerPort') ?? 0;
  if (home.requireApiServerPort) {
    if (portCount !== 1 || apiServerPort == null) {
      throw new Error('release profile requires exactly one apiServerPort');
    }
  } else if (portCount !== 0) {
    throw new Error('dev profile must not declare apiServerPort in committed kind.yaml');
  }

  if (nodes.length === 0) {
    throw new Error('kind topology must declare at least one node');
  }

  const images = new Set(nodes.map((node) => node.image));
  const primaryImage = nodes[0].image;
  if (images.size !== 1) {
    throw new Error('kind topology nodes must share one image');
  }

  return {
    apiServerAddress,
    apiServerPort: home.requireApiServerPort ? apiServerPort : null,
    nodes,
    nodeCount: nodes.length,
    nodeImage: primaryImage,
    roles: nodes.map((node) => node.role),
  };
}

/**
 * @param {{ role?: string, image?: string }} node
 * @param {Map<string, number>} fieldCounts
 */
function finishNode(node, fieldCounts) {
  for (const [key, count] of fieldCounts) {
    if (count > 1) throw new Error(`duplicate node key ${key}`);
  }
  if (!node.role || !node.image) {
    throw new Error('each node requires role and image');
  }
  return { role: node.role, image: node.image };
}

/**
 * @param {{ role?: string, image?: string }} node
 * @param {Map<string, number>} fieldCounts
 * @param {string} key
 * @param {string} value
 */
function applyNodeField(node, fieldCounts, key, value) {
  if (!ALLOWED_NODE.has(key)) {
    throw new Error(`unknown node key ${key}`);
  }
  fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1);
  if (key === 'role') {
    node.role = value;
    return;
  }
  node.image = value;
}

/**
 * @param {KindProfileId} profileId
 */
export function readKindProfile(profileId) {
  const home = PROFILE_HOME[profileId];
  if (!home) {
    throw new Error(`unknown kind profile ${profileId}`);
  }
  const kindYamlPath = join(KIND_ROOT, home.kindYamlRel);
  const kindYamlText = readFileSync(kindYamlPath, 'utf8');
  const topology = parseKindTopology(kindYamlText, profileId);
  return {
    id: profileId,
    clusterName: home.clusterName,
    contextName: home.contextName,
    kindYamlPath,
    kindYamlText,
    devApiPortRange: profileId === 'dev' ? DEV_API_PORT_RANGE : null,
    ...topology,
  };
}

/**
 * @param {ReturnType<typeof readKindProfile>} profile
 * @param {number} port
 */
export function renderKindConfig(profile, port) {
  if (profile.id === 'release') {
    if (port !== RELEASE_API_PORT) {
      throw new Error(`release kind config requires apiServerPort ${RELEASE_API_PORT}`);
    }
    return profile.kindYamlText.endsWith('\n') ? profile.kindYamlText : `${profile.kindYamlText}\n`;
  }

  if (!Number.isInteger(port) || port === RELEASE_API_PORT || port < 1 || port > 65535) {
    throw new Error(`dev API port ${port} is not a non-release loopback port`);
  }
  if (port < DEV_API_PORT_RANGE.start || port > DEV_API_PORT_RANGE.end) {
    throw new Error(`dev API port ${port} is outside ${DEV_API_PORT_RANGE.start}-${DEV_API_PORT_RANGE.end}`);
  }

  const lines = profile.kindYamlText.split('\n');
  const rendered = [];
  let injected = false;
  let addressFound = false;
  for (const line of lines) {
    rendered.push(line);
    if (/^\s*apiServerAddress:/.test(line)) {
      if (addressFound) throw new Error('kind config has duplicate apiServerAddress lines');
      addressFound = true;
      rendered.push(`  apiServerPort: ${port}`);
      injected = true;
    }
  }
  if (!addressFound || !injected) {
    throw new Error('kind config is missing a unique apiServerAddress line');
  }
  const text = rendered.join('\n');
  return text.endsWith('\n') ? text : `${text}\n`;
}