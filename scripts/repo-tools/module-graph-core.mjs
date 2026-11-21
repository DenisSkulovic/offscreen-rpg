/**
 * Pure workspace/source graph operations for `pnpm repo:module-graph`.
 * Tarjan's algorithm is used because strongly connected components are the
 * cycles; successor and component order are sorted so the same edges always
 * produce the same JSON.
 */

/** @typedef {'runtime' | 'type-only' | 'reexport' | 'dynamic'} EdgeKind */

/**
 * @typedef {object} GraphEdge
 * @property {string} from
 * @property {string} to
 * @property {EdgeKind | string} [kind]
 */

const RUNTIME_KINDS = new Set(['runtime', 'reexport', 'dynamic']);

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function applicationDomain(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  const marker = 'packages/application/src/';
  const start = normalized.indexOf(marker);
  if (start < 0) return null;
  const [domain, ...rest] = normalized.slice(start + marker.length).split('/');
  if (!domain || rest.length === 0) return null;
  if (domain.endsWith('.ts') || domain.endsWith('.tsx')) return null;
  return domain;
}

const STORY_ENGINE_MARKER = 'packages/story-engine/src/';
const STORY_ENGINE_DOMAIN_VALUES = new Map([
  ['stories', 'story-engine:authority.stories'],
  ['campaign', 'story-engine:authority.campaign'],
  ['storyteller', 'story-engine:writer'],
  ['generations', 'story-engine:generation'],
]);
const STORY_ENGINE_EXCLUDED_SEGMENTS = new Set([
  'dist',
  'generated',
  'tests',
  'test',
  '__tests__',
]);

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function storyEngineDomain(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  const start = normalized.indexOf(STORY_ENGINE_MARKER);
  if (start < 0) return null;
  const segments = normalized
    .slice(start + STORY_ENGINE_MARKER.length)
    .split('/');
  const [domain, ...rest] = segments;
  if (!domain || rest.length === 0) return null;
  if (domain.endsWith('.ts') || domain.endsWith('.tsx')) return null;
  if (segments.some((part) => STORY_ENGINE_EXCLUDED_SEGMENTS.has(part))) {
    return null;
  }
  const leaf = rest.at(-1) ?? '';
  if (/\.(?:test|spec)\.tsx?$/u.test(leaf)) return null;
  return STORY_ENGINE_DOMAIN_VALUES.get(domain) ?? null;
}

/**
 * @param {readonly GraphEdge[]} edges
 * @returns {GraphEdge[]}
 */
export function sortEdges(edges) {
  return [...edges].sort((left, right) => compareEdge(left, right));
}

/**
 * @param {readonly string[]} nodes
 * @param {readonly GraphEdge[]} edges
 * @returns {string[][]}
 */
export function stronglyConnectedComponents(nodes, edges) {
  const orderedNodes = [...new Set(nodes)].sort((left, right) =>
    left.localeCompare(right),
  );
  const orderedEdges = sortEdges(edges);
  /** @type {Map<string, string[]>} */
  const adjacency = new Map(orderedNodes.map((node) => [node, []]));
  /** @type {Set<string>} */
  const selfLoops = new Set();
  for (const edge of orderedEdges) {
    if (edge.from === edge.to) selfLoops.add(edge.from);
    const next = adjacency.get(edge.from);
    if (!next || !adjacency.has(edge.to) || edge.from === edge.to) continue;
    next.push(edge.to);
  }
  for (const next of adjacency.values()) {
    next.sort((left, right) => left.localeCompare(right));
  }

  let index = 0;
  /** @type {Map<string, number>} */
  const indices = new Map();
  /** @type {Map<string, number>} */
  const low = new Map();
  /** @type {string[]} */
  const stack = [];
  /** @type {Set<string>} */
  const onStack = new Set();
  /** @type {string[][]} */
  const components = [];

  /**
   * @param {string} node
   */
  function connect(node) {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        connect(next);
        low.set(node, Math.min(low.get(node) ?? index, low.get(next) ?? index));
      } else if (onStack.has(next)) {
        low.set(
          node,
          Math.min(low.get(node) ?? index, indices.get(next) ?? index),
        );
      }
    }
    if (low.get(node) !== indices.get(node)) return;
    /** @type {string[]} */
    const component = [];
    let member;
    do {
      member = stack.pop() ?? '';
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    component.sort((left, right) => left.localeCompare(right));
    components.push(component);
  }

  for (const node of orderedNodes) {
    if (!indices.has(node)) connect(node);
  }

  return components
    .filter(
      (component) => component.length > 1 || selfLoops.has(component[0] ?? ''),
    )
    .sort((left, right) => left.join('\0').localeCompare(right.join('\0')));
}

/**
 * Type-only imports disappear before execution, so they must not become
 * runtime cycles. Re-exports and dynamic imports still carry a runtime edge.
 *
 * @param {readonly string[]} nodes
 * @param {readonly GraphEdge[]} edges
 */
export function runtimeCycles(nodes, edges) {
  return stronglyConnectedComponents(
    nodes,
    edges.filter((edge) => RUNTIME_KINDS.has(String(edge.kind ?? 'runtime'))),
  );
}

/**
 * @param {readonly string[]} nodes
 * @param {readonly GraphEdge[]} edges
 */
export function typeOnlyCycles(nodes, edges) {
  return stronglyConnectedComponents(
    nodes,
    edges.filter((edge) => edge.kind === 'type-only'),
  );
}

/**
 * @param {GraphEdge} left
 * @param {GraphEdge} right
 */
function compareEdge(left, right) {
  return (
    left.from.localeCompare(right.from) ||
    left.to.localeCompare(right.to) ||
    String(left.kind ?? '').localeCompare(String(right.kind ?? ''))
  );
}
