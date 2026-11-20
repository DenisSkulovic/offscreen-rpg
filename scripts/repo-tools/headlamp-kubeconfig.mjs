#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONTEXT_NAME } from './stack-preflight.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_OUT = resolve(homedir(), '.kube/offscreen-lab-headlamp.config');

/**
 * @param {string[]} lines
 * @returns {Record<string, unknown>}
 */
function parseIndentedMap(lines) {
  /** @type {Record<string, unknown>} */
  const root = {};
  /** @type {{ indent: number, obj: Record<string, unknown> }[]} */
  const stack = [{ indent: -1, obj: root }];

  for (const raw of lines) {
    if (!raw.trim()) {
      continue;
    }
    const indent = raw.search(/\S/);
    const content = raw.slice(indent);
    const colon = content.indexOf(':');
    if (colon === -1) {
      throw new Error(`Invalid kubeconfig line: ${content}`);
    }
    const key = content.slice(0, colon).trim();
    const val = content.slice(colon + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;
    if (val) {
      parent[key] = parseScalar(val);
    } else {
      /** @type {Record<string, unknown>} */
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    }
  }
  return root;
}

/**
 * @param {string} blockText
 * @returns {Record<string, unknown>}
 */
function parseItemBlock(blockText) {
  const rawLines = blockText.split('\n');
  const first = rawLines[0].replace(/^\s*-\s*/, '');
  const firstIndent = rawLines[0].length - rawLines[0].replace(/^\s*/, '').length;
  /** @type {string[]} */
  const norm = [first];
  for (let j = 1; j < rawLines.length; j += 1) {
    const line = rawLines[j];
    if (!line.trim()) {
      continue;
    }
    const indent = line.length - line.replace(/^\s*/, '').length;
    const rel = Math.max(0, indent - firstIndent - 2);
    norm.push(`${' '.repeat(rel)}${line.trim()}`);
  }
  return parseIndentedMap(norm);
}

/**
 * @param {string[]} lines
 * @param {number} start
 */
function captureListBlocks(lines, start) {
  /** @type {string[]} */
  const blocks = [];
  let i = start;
  while (i < lines.length) {
    if (lines[i].startsWith('- ')) {
      const chunk = [lines[i]];
      i += 1;
      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('- ')) {
          break;
        }
        if (line.trim() && line.search(/\S/) === 0) {
          break;
        }
        chunk.push(line);
        i += 1;
      }
      blocks.push(chunk.join('\n'));
      continue;
    }
    if (lines[i].trim() && lines[i].search(/\S/) === 0) {
      break;
    }
    i += 1;
  }
  return { blocks, next: i };
}

/**
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
function parseKubeConfigDocument(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  /** @type {Record<string, unknown>} */
  const doc = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i += 1;
      continue;
    }
    if (/^(apiVersion|kind|current-context):\s*.+/.test(line)) {
      const idx = line.indexOf(':');
      doc[line.slice(0, idx).trim()] = parseScalar(line.slice(idx + 1).trim());
      i += 1;
      continue;
    }
    if (/^(clusters|contexts|users):\s*$/.test(line)) {
      const section = line.slice(0, -1).trim();
      i += 1;
      const { blocks, next } = captureListBlocks(lines, i);
      doc[section] = blocks.map((block) => parseItemBlock(block));
      i = next;
      continue;
    }
    i += 1;
  }
  return doc;
}

/**
 * @param {string} raw
 * @returns {string | number | boolean}
 */
function parseScalar(raw) {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return raw;
}

/**
 * @param {unknown} value
 * @param {number} indent
 * @returns {string[]}
 */
function stringifyValue(value, indent) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    /** @type {string[]} */
    const lines = [];
    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        lines.push(`${pad}- ${item}`);
        continue;
      }
      const entries = Object.entries(/** @type {Record<string, unknown>} */ (item));
      if (entries.length === 0) {
        lines.push(`${pad}- {}`);
        continue;
      }
      const [firstKey, firstVal] = entries[0];
      if (typeof firstVal === 'object' && firstVal !== null && !Array.isArray(firstVal)) {
        lines.push(`${pad}- ${firstKey}:`);
        lines.push(...stringifyValue(firstVal, indent + 4));
        for (let i = 1; i < entries.length; i += 1) {
          const [k, v] = entries[i];
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            lines.push(`${pad}  ${k}:`);
            lines.push(...stringifyValue(v, indent + 4));
          } else {
            lines.push(`${pad}  ${k}: ${formatScalar(v)}`);
          }
        }
      } else {
        lines.push(`${pad}- ${firstKey}: ${formatScalar(firstVal)}`);
        for (let i = 1; i < entries.length; i += 1) {
          const [k, v] = entries[i];
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            lines.push(`${pad}  ${k}:`);
            lines.push(...stringifyValue(v, indent + 4));
          } else {
            lines.push(`${pad}  ${k}: ${formatScalar(v)}`);
          }
        }
      }
    }
    return lines;
  }
  if (typeof value === 'object' && value !== null) {
    /** @type {string[]} */
    const lines = [];
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'object' && v !== null) {
        lines.push(`${pad}${k}:`);
        lines.push(...stringifyValue(v, indent + 2));
      } else {
        lines.push(`${pad}${k}: ${formatScalar(v)}`);
      }
    }
    return lines;
  }
  return [`${pad}${formatScalar(value)}`];
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatScalar(value) {
  if (typeof value === 'string') {
    if (/[:#\s]/.test(value) || value === '') {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string}
 */
function stringifyKubeConfig(doc) {
  /** @type {string[]} */
  const lines = [];
  lines.push(`apiVersion: ${doc.apiVersion ?? 'v1'}`);
  lines.push(`kind: ${doc.kind ?? 'Config'}`);
  for (const key of ['clusters', 'contexts', 'users']) {
    const section = doc[key];
    if (!Array.isArray(section)) {
      continue;
    }
    lines.push(`${key}:`);
    lines.push(...stringifyValue(section, 0));
  }
  if (typeof doc['current-context'] === 'string') {
    lines.push(`current-context: ${doc['current-context']}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} kubeconfigText
 * @param {string} contextName
 * @returns {string}
 */
export function selectContext(kubeconfigText, contextName) {
  const doc = parseKubeConfigDocument(kubeconfigText);
  const contexts = /** @type {{ name: string, context: { cluster: string, user: string } }[]} */ (
    doc.contexts ?? []
  );
  const match = contexts.find((entry) => entry.name === contextName);
  if (!match) {
    throw new Error(`Context not found: ${contextName}`);
  }
  const clusterName = match.context.cluster;
  const userName = match.context.user;
  const clusters = /** @type {{ name: string, cluster: Record<string, unknown> }[]} */ (
    doc.clusters ?? []
  );
  const users = /** @type {{ name: string, user: Record<string, unknown> }[]} */ (
    doc.users ?? []
  );
  const cluster = clusters.find((entry) => entry.name === clusterName);
  const user = users.find((entry) => entry.name === userName);
  if (!cluster || !user) {
    throw new Error(`Context ${contextName} is missing cluster or user entries`);
  }
  const minified = {
    apiVersion: doc.apiVersion ?? 'v1',
    kind: doc.kind ?? 'Config',
    clusters: [cluster],
    contexts: [match],
    users: [user],
    'current-context': contextName,
  };
  return stringifyKubeConfig(minified);
}

/**
 * @param {string} outPath
 * @param {string} repoRoot
 */
export function assertOutputPath(outPath, repoRoot) {
  const trimmed = typeof outPath === 'string' ? outPath.trim() : '';
  if (!trimmed) {
    throw new Error('Output path must not be empty');
  }
  const resolvedOut = resolve(trimmed);
  const resolvedRoot = resolve(repoRoot);
  const rootWithSep = resolvedRoot.endsWith(sep) ? resolvedRoot : `${resolvedRoot}${sep}`;
  if (resolvedOut === resolvedRoot || resolvedOut.startsWith(rootWithSep)) {
    throw new Error('Refusing to write kubeconfig inside the repository');
  }
}

/**
 * @param {string} outPath
 * @param {string} content
 * @param {string} repoRoot
 */
export function writeKubeconfigFile(outPath, content, repoRoot) {
  assertOutputPath(outPath, repoRoot);
  const resolved = resolve(outPath);
  const dir = dirname(resolved);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(resolved, content, { encoding: 'utf8', mode: 0o600 });
}

/**
 * @param {string} contextName
 * @returns {string}
 */
export function readKubeconfigFromEnvironment(contextName) {
  const result = spawnSync(
    'kubectl',
    ['config', 'view', '--context', contextName, '--minify', '--flatten'],
    { encoding: 'utf8', env: process.env },
  );
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || `kubectl config view failed for ${contextName}`);
  }
  return result.stdout;
}

/**
 * @param {string[]} argv
 */
export function runCli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      `Usage: node scripts/repo-tools/headlamp-kubeconfig.mjs [--context ${CONTEXT_NAME}] [--out PATH]`,
    );
    return 0;
  }
  let contextName = CONTEXT_NAME;
  let outPath = DEFAULT_OUT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--context') {
      contextName = argv[i + 1] ?? '';
      i += 1;
    } else if (argv[i] === '--out') {
      outPath = argv[i + 1] ?? '';
      i += 1;
    } else {
      console.error(`Unknown argument: ${argv[i]}`);
      return 1;
    }
  }
  if (contextName !== CONTEXT_NAME) {
    console.error(`Only context ${CONTEXT_NAME} is allowed for Headlamp export`);
    return 1;
  }
  try {
    assertOutputPath(outPath, REPO_ROOT);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  let kubeconfigText;
  try {
    kubeconfigText = readKubeconfigFromEnvironment(contextName);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  let minified;
  try {
    minified = selectContext(kubeconfigText, contextName);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  try {
    writeKubeconfigFile(outPath, minified, REPO_ROOT);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  console.log(`Wrote Headlamp kubeconfig to ${resolve(outPath)}`);
  return 0;
}

const thisFile = fileURLToPath(import.meta.url);
const invoked =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(thisFile).href;

if (invoked) {
  process.exitCode = runCli();
}