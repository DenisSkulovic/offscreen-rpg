import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { countWords, extractContractDependencies, parseMarkdownDocument } from './markdown.mjs';
import {
  classifyRepoPath,
  clearListingCache,
  isCanonicalKind,
  isHistoricRequest,
  isLintSource,
  resolveHref,
  toPosix,
} from './paths.mjs';

export const GRAPH_SCHEMA = 'wiki.graph.v1';
export const HEALTH_SCHEMA = 'wiki.health.v1';
export const LARGE_PAGE_BYTES = 40_000;

const CONTRACT_RELATIONS = new Set(['depends-on', 'constrained-by', 'co-change']);
const CONTRACT_FANOUT = 30;
const ROOT_FILES = ['README.md', 'ENGINEERING.md', 'AGENTS.md', 'STATUS.md', 'ROADMAP.md', 'CLAUDE.md'];
const WORK_FILES = ['work/README.md', 'work/changes/README.md', 'work/designs/README.md'];
const CITATION =
  /archiv|histor|retir|legacy|evidence|observ|receipt|\bdone\b|expired|proposed|open design|\bdraft\b|not accepted|git history/i;
const NORMATIVE =
  /\b(owners?|specification|specs?|contract|binding|normative|current rule|product truth|implementation design|replacement)\b/i;
const VAGUE_LABEL = /^(here|more|read|link|this|click here)$/i;
const IMPLEMENTED_CLAIM =
  /\b(current implemented design|implemented design|already deployed|selected normative|production monitoring stack|this is the current contract)\b/i;
const PROPOSAL_DISCLOSURE =
  /propos|not selected|not accepted|unaccepted|recommendation|not installed|not authorized|not landed|\bdraft\b|open design/i;

function walk(absDir, relDir, out, predicate) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'out') continue;
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) walk(abs, rel, out, predicate);
    else if (entry.isFile() && predicate(rel)) out.push(rel);
  }
}

export function collectMaintainedPages(root) {
  /** @type {string[]} */
  const pages = [];
  for (const rel of [...ROOT_FILES, ...WORK_FILES]) {
    if (existsSync(path.join(root, rel))) pages.push(rel);
  }
  for (const dir of ['docs', 'work/designs/open', 'work/changes/open']) {
    const abs = path.join(root, ...dir.split('/'));
    walk(abs, dir, pages, (rel) => rel.endsWith('.md') || rel.endsWith('.mdc'));
  }
  for (const dir of ['apps', 'packages', 'tools']) {
    const abs = path.join(root, dir);
    walk(abs, dir, pages, (rel) => rel.endsWith('/README.md') || rel === `${dir}/README.md`);
  }
  return [...new Set(pages)].sort();
}

function readText(abs) {
  return readFileSync(abs, 'utf8');
}

function issue(severity, code, file, line, target, message) {
  return { severity, code, path: file, line: line ?? null, target: target ?? null, message };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function edgeKind(fromKind, toKind, referenceKind) {
  if (referenceKind === 'image') return 'image';
  if (toKind === 'source-file') return 'observed-in';
  if (toKind === 'evidence') return 'evidence-citation';
  if (toKind === 'historic') return 'historic-citation';
  if (toKind === 'open-design' || toKind === 'open-change') return 'proposal-navigation';
  if (toKind === 'directory') return 'directory';
  if (isCanonicalKind(fromKind) && isCanonicalKind(toKind)) return 'canonical-navigation';
  if (fromKind === 'source-map' && isCanonicalKind(toKind)) return 'implementation-of';
  return 'wiki-navigation';
}

function pageEdge(kind) {
  return kind !== 'image' && kind !== 'observed-in';
}

function authorityViolation(sourceKind, destKind, requested, ref) {
  const historic = destKind === 'historic' || isHistoricRequest(requested);
  if (!historic) return false;
  if (sourceKind !== 'canonical-router' && sourceKind !== 'root-index') return false;
  const blob = `${ref.headingText ?? ''}\n${ref.context ?? ''}\n${ref.label ?? ''}`;
  if (CITATION.test(blob)) return false;
  return NORMATIVE.test(blob);
}

function proposalPresentedAsCurrent(sourceKind, destKind, ref) {
  if (destKind !== 'open-design' && destKind !== 'open-change') return false;
  if (!isCanonicalKind(sourceKind) && sourceKind !== 'root-index') return false;
  const blob = `${ref.headingText ?? ''}\n${ref.context ?? ''}\n${ref.label ?? ''}`;
  if (PROPOSAL_DISCLOSURE.test(blob)) return false;
  return IMPLEMENTED_CLAIM.test(blob);
}

function contractKey(page, anchor) {
  return `${page}#${anchor ?? ''}`;
}

function nonbindingContractTarget(rel) {
  return (
    rel.startsWith('work/') ||
    rel.startsWith('research/') ||
    rel.startsWith('evidence/') ||
    rel.includes('/archive/')
  );
}

function targetSaysProposed(root, rel) {
  const abs = path.join(root, ...rel.split('/'));
  if (!existsSync(abs)) return false;
  const head = readText(abs).split(/\r?\n/).slice(0, 40).join('\n');
  return /status:\s*proposed/i.test(head);
}

/**
 * One-hop reverse lookup by default. Cycles are visited once.
 * A count above the fanout limit is kept and flagged, not truncated.
 * @param {object[]} edges
 * @param {{ path: string, anchor?: string | null }} target
 * @param {{ hops?: number }} [options]
 */
export function reverseContractDependents(edges, target, options = {}) {
  const hops = options.hops ?? 1;
  const start = contractKey(target.path, target.anchor);
  const dependents = [];
  const seen = new Set([start]);
  let frontier = [start];
  for (let hop = 1; hop <= hops; hop += 1) {
    const next = [];
    for (const node of frontier) {
      for (const edge of edges) {
        const governing = contractKey(edge.to, edge.toAnchor);
        const origin = contractKey(edge.from, edge.fromAnchor);
        const matched = governing === node || (edge.relation === 'co-change' && origin === node);
        if (!matched) continue;
        const dependent = governing === node ? origin : governing;
        if (seen.has(dependent)) continue;
        seen.add(dependent);
        dependents.push({ ...edge, hop, dependent });
        next.push(dependent);
      }
    }
    frontier = next;
  }
  return {
    dependents,
    knownRoute: dependents.length > 0,
    fanoutWarning: dependents.length > CONTRACT_FANOUT,
  };
}

/**
 * @param {string} root
 * @param {{ repoSha?: string | null, dirty?: boolean | null }} [meta]
 */
export function buildWikiModel(root, meta = {}) {
  clearListingCache();
  const pages = collectMaintainedPages(root);
  const documents = new Map();
  for (const rel of pages) {
    const abs = path.join(root, ...rel.split('/'));
    const text = readText(abs);
    const parsed = parseMarkdownDocument(text);
    documents.set(rel, {
      rel,
      text,
      bytes: Buffer.byteLength(text),
      words: countWords(text),
      headings: parsed.headings,
      references: parsed.references,
      kind: classifyRepoPath(rel),
    });
  }

  const anchorCache = new Map(
    [...documents.entries()].map(([rel, doc]) => [rel, new Set(doc.headings.map((heading) => heading.id))]),
  );

  function anchorsFor(rel) {
    if (anchorCache.has(rel)) return anchorCache.get(rel);
    const abs = path.join(root, ...rel.split('/'));
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      anchorCache.set(rel, new Set());
      return anchorCache.get(rel);
    }
    if (!rel.endsWith('.md') && !rel.endsWith('.mdc')) {
      anchorCache.set(rel, new Set());
      return anchorCache.get(rel);
    }
    const parsed = parseMarkdownDocument(readText(abs));
    const ids = new Set(parsed.headings.map((heading) => heading.id));
    anchorCache.set(rel, ids);
    return ids;
  }

  /** @type {ReturnType<typeof issue>[]} */
  const issues = [];
  /** @type {Map<string, object>} */
  const edges = new Map();
  const externalCount = { external: 0, custom: 0, image: 0 };
  let internalLinkOccurrences = 0;
  let internalAnchorOccurrences = 0;

  function addEdge(edge) {
    const key = [edge.from, edge.to, edge.toAnchor ?? '', edge.kind].join('\0');
    const prior = edges.get(key);
    if (prior) {
      prior.occurrences += 1;
      if ((edge.context?.length ?? 0) > (prior.context?.length ?? 0)) prior.context = edge.context;
      return;
    }
    edges.set(key, { ...edge, occurrences: 1 });
  }

  for (const doc of documents.values()) {
    if (!isLintSource(doc.rel)) continue;
    for (const ref of doc.references) {
      if (ref.kind === 'image') externalCount.image += 1;
      if (ref.undefinedReference) {
        issues.push(
          issue(
            'error',
            'undefined-reference',
            doc.rel,
            ref.line,
            ref.label,
            'Reference-style link has no definition',
          ),
        );
        continue;
      }
      const resolved = resolveHref(root, doc.rel, ref.href);
      if (resolved.class === 'external') {
        externalCount.external += 1;
        continue;
      }
      if (resolved.class === 'custom') {
        externalCount.custom += 1;
        continue;
      }
      if (resolved.class === 'empty') continue;
      if (ref.kind === 'link') {
        internalLinkOccurrences += 1;
        if (resolved.fragment) internalAnchorOccurrences += 1;
      }
      if (!resolved.ok) {
        if (ref.kind === 'image' && resolved.code !== 'escapes-root') {
          issues.push(issue('warning', 'broken-image', doc.rel, ref.line, ref.href, 'Local image path does not resolve'));
          continue;
        }
        const code =
          resolved.code === 'case-mismatch'
            ? 'case-mismatch'
            : resolved.code === 'directory-fragment'
              ? 'directory-fragment'
              : resolved.code === 'escapes-root'
                ? 'escapes-root'
                : resolved.code === 'broken-anchor'
                  ? 'broken-anchor'
                  : 'broken-path';
        const target = ref.href ?? resolved.rel;
        issues.push(
          issue(
            'error',
            code,
            doc.rel,
            ref.line,
            target,
            code === 'case-mismatch'
              ? `Path case does not match ${resolved.actualName ?? 'the filesystem'}`
              : code === 'broken-anchor'
                ? 'Heading fragment is not valid'
                : 'Local path does not resolve inside the repository',
          ),
        );
        if (
          authorityViolation(doc.kind, 'missing', resolved.requested ?? resolved.rel, ref)
        ) {
          issues.push(
            issue(
              'error',
              'authority-route',
              doc.rel,
              ref.line,
              target,
              'Router presents a historic path as a normative owner',
            ),
          );
        }
        continue;
      }

      const destinationKind = classifyRepoPath(resolved.rel, { isDirectory: resolved.isDir });
      if (ref.kind === 'link' && resolved.fragment && !resolved.isDir) {
        const markdown = resolved.rel.endsWith('.md') || resolved.rel.endsWith('.mdc');
        if (markdown && !anchorsFor(resolved.rel).has(resolved.fragment)) {
          issues.push(
            issue(
              'error',
              'broken-anchor',
              doc.rel,
              ref.line,
              ref.href,
              'Destination file exists but the heading fragment does not',
            ),
          );
        }
      }
      if (ref.kind === 'image' && !existsSync(resolved.abs ?? path.join(root, resolved.rel))) {
        issues.push(issue('warning', 'broken-image', doc.rel, ref.line, ref.href, 'Local image is missing'));
      }
      if (authorityViolation(doc.kind, destinationKind, resolved.rel, ref)) {
        issues.push(
          issue(
            'error',
            'authority-route',
            doc.rel,
            ref.line,
            ref.href,
            'Router presents a historic page as a normative owner',
          ),
        );
      }
      if (ref.kind === 'link' && proposalPresentedAsCurrent(doc.kind, destinationKind, ref)) {
        issues.push(
          issue(
            'error',
            'authority-route',
            doc.rel,
            ref.line,
            ref.href,
            'Canonical page presents an open proposal as current implemented design',
          ),
        );
      }
      if (VAGUE_LABEL.test(ref.label) && doc.kind === 'canonical-router') {
        issues.push(
          issue('warning', 'vague-label', doc.rel, ref.line, ref.href, 'Router link label does not name its topic'),
        );
      }
      const kind = edgeKind(doc.kind, ref.kind === 'image' ? 'image' : destinationKind, ref.kind);
      addEdge({
        from: doc.rel,
        to: resolved.rel,
        fromHeading: ref.headingId,
        toAnchor: resolved.fragment,
        label: ref.label,
        context: ref.context ?? '',
        kind: ref.kind === 'image' ? 'image' : kind,
        line: ref.line,
      });
    }
  }

  const edgeList = [...edges.values()];
  const outPages = new Map();
  const inPages = new Map();
  const canonicalIn = new Map();
  for (const edge of edgeList) {
    if (!pageEdge(edge.kind)) continue;
    if (!outPages.has(edge.from)) outPages.set(edge.from, new Set());
    outPages.get(edge.from).add(edge.to);
    if (!inPages.has(edge.to)) inPages.set(edge.to, new Set());
    inPages.get(edge.to).add(edge.from);
    if (edge.kind === 'canonical-navigation') {
      if (!canonicalIn.has(edge.to)) canonicalIn.set(edge.to, new Set());
      canonicalIn.get(edge.to).add(edge.from);
    }
  }

  // Reachability is the docs wiki. AGENTS.md and STATUS.md are entry routers,
  // not pages that must be discovered from docs/README.md.
  const canonicalIds = [...documents.values()]
    .filter((doc) => doc.rel.startsWith('docs/') && (doc.rel.endsWith('.md') || doc.rel.endsWith('.mdc')))
    .map((doc) => doc.rel)
    .sort();
  const adjacency = new Map();
  for (const edge of edgeList) {
    if (edge.kind !== 'canonical-navigation') continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    adjacency.get(edge.from).add(edge.to);
  }

  const rootId = 'docs/README.md';
  const distance = new Map();
  const parent = new Map();
  if (documents.has(rootId)) {
    distance.set(rootId, 0);
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of adjacency.get(current) ?? []) {
        if (distance.has(next) || !isCanonicalKind(documents.get(next)?.kind ?? classifyRepoPath(next))) {
          continue;
        }
        distance.set(next, distance.get(current) + 1);
        parent.set(next, current);
        queue.push(next);
      }
    }
  } else {
    issues.push(
      issue('error', 'missing-wiki-root', rootId, null, null, 'docs/README.md is not in the maintained scan'),
    );
  }

  let exceptions = [];
  const exceptionPath = path.join(root, 'scripts/repo-tools/wiki-core/reachability-exceptions.json');
  if (existsSync(exceptionPath)) {
    const parsed = JSON.parse(readText(exceptionPath));
    if (!Array.isArray(parsed)) throw new Error('reachability-exceptions.json must be an array');
    exceptions = parsed;
  }
  const exceptionIds = new Set(exceptions.map((item) => item.path));

  for (const id of canonicalIds) {
    if (distance.has(id)) continue;
    const reviewed = exceptions.find((item) => item.path === id);
    if (reviewed) {
      issues.push(
        issue(
          'warning',
          'unreachable-exception',
          id,
          null,
          null,
          reviewed.reason || 'Reviewed reachability exception',
        ),
      );
      continue;
    }
    issues.push(
      issue(
        'error',
        'unreachable-canonical',
        id,
        null,
        null,
        'No directed canonical path from docs/README.md',
      ),
    );
  }

  for (const doc of documents.values()) {
    if (!isCanonicalKind(doc.kind) || doc.kind === 'canonical-router') continue;
    const inbound = [...(canonicalIn.get(doc.rel) ?? [])].filter((from) => from !== doc.rel).length;
    if (inbound === 0) {
      issues.push(
        issue('warning', 'orphan-canonical', doc.rel, null, null, 'No distinct incoming canonical page edge'),
      );
    }
    const outbound = outPages.get(doc.rel)?.size ?? 0;
    if (outbound === 0) {
      issues.push(
        issue('warning', 'dead-end', doc.rel, null, null, 'Canonical page has no outbound wiki-page link'),
      );
    }
    if (doc.bytes >= LARGE_PAGE_BYTES && doc.headings.filter((heading) => heading.depth <= 3).length < 3) {
      issues.push(
        issue(
          'warning',
          'large-page-navigation',
          doc.rel,
          null,
          null,
          `Page is at least ${LARGE_PAGE_BYTES} bytes with fewer than three H1–H3 headings`,
        ),
      );
    }
  }

  const hashes = new Map();
  for (const doc of documents.values()) {
    if (!isCanonicalKind(doc.kind)) continue;
    const digest = createHash('sha256')
      .update(doc.text.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim())
      .digest('hex');
    if (!hashes.has(digest)) hashes.set(digest, []);
    hashes.get(digest).push(doc.rel);
  }
  for (const group of hashes.values()) {
    if (group.length < 2) continue;
    const names = group.sort();
    issues.push(
      issue(
        'warning',
        'duplicate-canonical',
        names[0],
        null,
        names.slice(1).join(', '),
        'Identical normalized canonical bodies',
      ),
    );
  }

  const bridge = new Map();
  for (const id of distance.keys()) {
    let cursor = id;
    while (parent.has(cursor)) {
      cursor = parent.get(cursor);
      if (cursor === rootId) break;
      bridge.set(cursor, (bridge.get(cursor) ?? 0) + 1);
    }
  }
  const component = new Map(canonicalIds.map((id) => [id, id]));
  function find(id) {
    let cursor = id;
    while (component.get(cursor) !== cursor) cursor = component.get(cursor);
    return cursor;
  }
  for (const edge of edgeList) {
    if (edge.kind !== 'canonical-navigation') continue;
    if (!component.has(edge.from) || !component.has(edge.to)) continue;
    const left = find(edge.from);
    const right = find(edge.to);
    if (left !== right) component.set(right, left);
  }
  const componentRoots = new Set(canonicalIds.map(find));

  const hops = canonicalIds
    .filter((id) => id !== rootId && distance.has(id))
    .map((id) => distance.get(id))
    .sort((a, b) => a - b);
  const hopP95 = percentile(hops, 95);
  if (hopP95 !== null && hopP95 > 3) {
    issues.push(
      issue(
        'warning',
        'hop-p95-above-pilot',
        rootId,
        null,
        null,
        `Pilot hypothesis is p95 ≤ 3; measured p95 is ${hopP95}. This is not a hard gate.`,
      ),
    );
  }
  if (componentRoots.size > 1) {
    issues.push(
      issue(
        'warning',
        'weak-components',
        rootId,
        null,
        null,
        `${componentRoots.size} undirected canonical components`,
      ),
    );
  }

  /** @type {object[]} */
  const contractEdges = [];
  for (const doc of documents.values()) {
    if (!isLintSource(doc.rel)) continue;
    for (const row of extractContractDependencies(doc.text)) {
      if (row.malformed) {
        issues.push(
          issue('error', 'contract-malformed-row', doc.rel, row.line, null, 'A contract dependency row needs claim, relation, governing heading, and reason.'),
        );
        continue;
      }
      if (!row.fromAnchor) {
        issues.push(
          issue('error', 'contract-unknown-claim', doc.rel, row.line, row.fromText, 'The contract row does not name a heading on this page.'),
        );
        continue;
      }
      if (!CONTRACT_RELATIONS.has(row.relation)) {
        issues.push(
          issue(
            'error',
            'contract-invalid-relation',
            doc.rel,
            row.line,
            row.relation,
            'Binding relations are depends-on, constrained-by, and co-change. See-also, evidence, and example links are not edges.',
          ),
        );
        continue;
      }
      if (row.rationale.length < 12) {
        issues.push(
          issue('error', 'contract-empty-rationale', doc.rel, row.line, row.relation, 'A contract edge needs a concrete reason.'),
        );
        continue;
      }
      if (!row.href) {
        issues.push(
          issue('error', 'contract-missing-target', doc.rel, row.line, row.relation, 'The governing claim needs a local heading link.'),
        );
        continue;
      }
      const resolved = resolveHref(root, doc.rel, row.href);
      if (!resolved || resolved.class !== 'local' || !resolved.ok || !resolved.rel) {
        issues.push(
          issue('error', 'contract-missing-target', doc.rel, row.line, row.href, 'The governing claim does not resolve inside this repository.'),
        );
        continue;
      }
      if (!resolved.fragment) {
        issues.push(
          issue('error', 'contract-missing-heading', doc.rel, row.line, resolved.rel, 'A contract edge must name the governing heading.'),
        );
        continue;
      }
      if (!anchorsFor(resolved.rel).has(resolved.fragment)) {
        issues.push(
          issue(
            'error',
            'contract-missing-heading',
            doc.rel,
            row.line,
            `${resolved.rel}#${resolved.fragment}`,
            'The governing heading does not exist.',
          ),
        );
        continue;
      }
      if (nonbindingContractTarget(resolved.rel)) {
        issues.push(
          issue(
            'error',
            'contract-nonbinding-target',
            doc.rel,
            row.line,
            resolved.rel,
            'A proposal, archive, research note, or evidence file cannot be a binding governing claim.',
          ),
        );
        continue;
      }
      if (targetSaysProposed(root, resolved.rel)) {
        issues.push(
          issue(
            'error',
            'contract-proposed-target',
            doc.rel,
            row.line,
            resolved.rel,
            'A page that still says its status is proposed cannot govern a binding edge.',
          ),
        );
        continue;
      }
      const dependentIsProduct = doc.rel.startsWith('docs/product/');
      const governingIsTechnical = resolved.rel.startsWith('docs/technical/');
      if (dependentIsProduct && governingIsTechnical) {
        issues.push(
          issue(
            'error',
            'contract-reversed-authority',
            doc.rel,
            row.line,
            resolved.rel,
            'A product heading is not governed by a technical page.',
          ),
        );
        continue;
      }
      contractEdges.push({
        from: doc.rel,
        fromAnchor: row.fromAnchor,
        to: resolved.rel,
        toAnchor: resolved.fragment,
        relation: row.relation,
        rationale: row.rationale,
        line: row.line,
      });
    }
  }
  const contractFanout = new Map();
  for (const edge of contractEdges) {
    const id = contractKey(edge.to, edge.toAnchor);
    contractFanout.set(id, (contractFanout.get(id) ?? 0) + 1);
  }
  for (const [id, count] of contractFanout) {
    if (count <= CONTRACT_FANOUT) continue;
    issues.push(
      issue(
        'warning',
        'contract-fanout',
        id.split('#')[0],
        null,
        id,
        `${count} direct dependents are listed in full. The set was not truncated.`,
      ),
    );
  }

  const nodes = [];
  const nodeIds = new Set(documents.keys());
  for (const edge of edgeList) nodeIds.add(edge.to);
  for (const id of [...nodeIds].sort()) {
    const doc = documents.get(id);
    const kind = doc?.kind ?? classifyRepoPath(id, { isDirectory: !id.endsWith('.md') && !id.endsWith('.mdc') });
    nodes.push({
      id,
      kind,
      bytes: doc?.bytes ?? null,
      words: doc?.words ?? null,
      headingIds: doc ? doc.headings.map((heading) => heading.id) : [...(anchorCache.get(id) ?? [])].sort(),
      linkOccurrences: doc ? doc.references.filter((ref) => ref.kind === 'link').length : 0,
      distinctOut: outPages.get(id)?.size ?? 0,
      distinctIn: inPages.get(id)?.size ?? 0,
      distanceFromRoot: distance.has(id) ? distance.get(id) : null,
    });
  }

  const sortedEdges = edgeList
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      fromHeading: edge.fromHeading,
      toAnchor: edge.toAnchor,
      label: edge.label,
      context: edge.context ?? '',
      kind: edge.kind,
      line: edge.line,
      occurrences: edge.occurrences,
    }))
    .sort((a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      String(a.toAnchor).localeCompare(String(b.toAnchor)) ||
      a.kind.localeCompare(b.kind) ||
      (a.line ?? 0) - (b.line ?? 0),
    );

  const severityRank = { error: 0, warning: 1 };
  issues.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.code.localeCompare(b.code) ||
      a.path.localeCompare(b.path) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      String(a.target).localeCompare(String(b.target)),
  );

  const hard = issues.filter((item) => item.severity === 'error');
  const reachable = canonicalIds.filter((id) => distance.has(id));

  const densityByKind = {};
  for (const doc of documents.values()) {
    const bucket = densityByKind[doc.kind] ?? { pages: 0, words: 0, linkOccurrences: 0 };
    bucket.pages += 1;
    bucket.words += doc.words;
    bucket.linkOccurrences += doc.references.filter((ref) => ref.kind === 'link').length;
    densityByKind[doc.kind] = bucket;
  }
  for (const bucket of Object.values(densityByKind)) {
    bucket.perThousandWords = bucket.words === 0 ? null : Number(((bucket.linkOccurrences * 1000) / bucket.words).toFixed(3));
  }

  const routers = nodes.filter((node) => node.kind === 'canonical-router');
  const fanout = routers.map((router) => {
    const direct = [...(adjacency.get(router.id) ?? [])];
    const two = new Set(direct);
    for (const next of direct) {
      for (const further of adjacency.get(next) ?? []) two.add(further);
    }
    return { path: router.id, direct: direct.length, withinTwoHops: two.size };
  });

  const graph = {
    schema: GRAPH_SCHEMA,
    repoSha: meta.repoSha ?? null,
    dirty: meta.dirty ?? null,
    nodes,
    edges: sortedEdges,
    contractEdges,
  };
  const health = {
    schema: HEALTH_SCHEMA,
    repoSha: meta.repoSha ?? null,
    dirty: meta.dirty ?? null,
    denominators: {
      maintainedPages: pages.length,
      canonicalPages: canonicalIds.length,
      reachableCanonical: reachable.length,
      maintainedLinkOccurrences: internalLinkOccurrences,
      anchoredEdgeOccurrences: internalAnchorOccurrences,
      distinctEdges: sortedEdges.length,
      reviewedReachabilityExceptions: exceptionIds.size,
    },
    integrity: {
      brokenPaths: hard.filter((item) => item.code === 'broken-path' || item.code === 'escapes-root').length,
      brokenAnchors: hard.filter((item) => item.code === 'broken-anchor' || item.code === 'directory-fragment').length,
      caseMismatches: hard.filter((item) => item.code === 'case-mismatch').length,
      undefinedReferences: hard.filter((item) => item.code === 'undefined-reference').length,
      authorityRoutes: hard.filter((item) => item.code === 'authority-route').length,
      unreachableCanonical: hard.filter((item) => item.code === 'unreachable-canonical').length,
      hardErrors: hard.length,
    },
    discoverability: {
      reachabilityRatio: canonicalIds.length === 0 ? null : Number((reachable.length / canonicalIds.length).toFixed(4)),
      hopMin: hops[0] ?? null,
      hopMedian: percentile(hops, 50),
      hopP95: hopP95,
      hopMax: hops.at(-1) ?? null,
      hopSampleSize: hops.length,
      orphanWarnings: issues.filter((item) => item.code === 'orphan-canonical').length,
      deadEndWarnings: issues.filter((item) => item.code === 'dead-end').length,
      weakComponents: componentRoots.size,
    },
    densityByKind,
    routerFanout: fanout,
    bottlenecks: [...bridge.entries()]
      .map(([page, dependents]) => ({ path: page, shortestPathDependents: dependents }))
      .sort((a, b) => b.shortestPathDependents - a.shortestPathDependents || a.path.localeCompare(b.path))
      .slice(0, 8),
    counts: externalCount,
    pilotHypotheses: {
      hopP95AtMost: 3,
      enforced: false,
      note: 'Calibrate from the measured baseline. Do not add links to satisfy this number.',
    },
    exclusions: [
      'work/changes/archive is retained and is not present-day link lint, and its edges do not confer canonical reachability',
      'parked designs, research, and session notes are historic destinations',
      'evidence internal links are outside the maintained lint set',
      '.agents Markdown stays on python scripts/check_docs.py',
    ],
    limitations: [
      'Near-duplicate shingles are not scored; identical normalized canonical bodies are',
      'PageRank is not calculated and is not a documentation grade',
      'Freshness against code commits is not inferred from this graph',
      'External URLs are counted and not fetched',
    ],
    largePageBytesThreshold: LARGE_PAGE_BYTES,
  };

  return { graph, health, issues, distance };
}
