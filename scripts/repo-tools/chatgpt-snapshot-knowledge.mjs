/**
 * Portable, source-exact wiki inventory for ordinary ChatGPT.
 * Built with the repository's existing wiki AST + route parser, never a second
 * markdown parser, and only against the staged committed snapshot tree.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const PORTABLE_WIKI_SCHEMA = 'wiki.portable-snapshot.v1';

export function safeGithubOrigin(remote) {
  const candidate = String(remote ?? '').trim();
  const match = /(?:^|@)github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(candidate)
    ?? /^https?:\/\/(?:[^/@]+@)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(candidate);
  if (!match) return null;
  return 'https://github.com/' + match[1] + '/' + match[2];
}

function encodedPath(rel) {
  return rel.split('/').map(encodeURIComponent).join('/');
}

function githubFallback(origin, sha, rel, fragment, isDirectory) {
  if (!origin || !rel) return null;
  const action = isDirectory ? 'tree' : 'blob';
  return origin + '/' + action + '/' + sha + '/' + encodedPath(rel) + (fragment ? '#' + encodeURIComponent(fragment) : '');
}

function sensitiveTarget(rel) {
  return /(^|\/)(\.env[^/]*|credentials(?:\.json)?|secrets(?:\.json)?|id_rsa|id_ed25519|node_modules)(\/|$)/i.test(rel ?? '')
    || /\.(pem|key|p12|pfx)$/i.test(rel ?? '');
}

function withinTrackedTree(name, tracked) {
  return tracked.has(name) || [...tracked].some(p => p.startsWith(name.replace(/\/$/, '') + '/'));
}

function canonicalReachability(sections) {
  const adj = new Map();
  const canonical = new Set();
  for (const section of sections) {
    if (section.path.startsWith('docs/')) canonical.add(section.path);
    const edges = adj.get(section.path) ?? new Set();
    for (const edge of section.outbound ?? []) {
      if (edge.path?.startsWith('docs/')) edges.add(edge.path);
    }
    adj.set(section.path, edges);
  }
  const reached = new Set(['docs/README.md']);
  const queue = ['docs/README.md'];
  while (queue.length) {
    const from = queue.shift();
    for (const to of adj.get(from) ?? []) {
      if (reached.has(to)) continue;
      reached.add(to);
      queue.push(to);
    }
  }
  return {
    canonicalPages: canonical.size,
    reachedCanonical: [...canonical].filter(p => reached.has(p)).length,
    unreachableCanonical: [...canonical].filter(p => !reached.has(p)).sort(),
  };
}

/**
 * A prepared dependency injection slot keeps the transport/test logic testable
 * without requiring node_modules in the portable archive or fixture environment.
 * A normal repository export uses the real wiki modules (not a simulated parser).
 */
export async function buildPortableWikiIndex({
  stagedRoot, head, trackedPaths, repositoryUrl = null, engine = null,
}) {
  const realEngine = engine ?? await (async () => {
    const [route, markdown, paths] = await Promise.all([
      import('./wiki-core/route.mjs'),
      import('./wiki-core/markdown.mjs'),
      import('./wiki-core/paths.mjs'),
    ]);
    return { ...route, ...markdown, ...paths };
  })();
  const { buildSectionIndex, routePages, parseMarkdownDocument, resolveHref } = realEngine;
  const original = buildSectionIndex(stagedRoot, { repoSha: head, dirty: false });
  const pages = routePages(stagedRoot);
  const tracked = new Set(trackedPaths);
  const sections = original.sections.map(s => ({
    path: s.path, anchor: s.anchor, heading: s.heading, depth: s.depth,
    lineStart: s.lineStart, lineEnd: s.lineEnd, bytes: s.bytes,
    preview: s.preview, rowContext: s.rowContext, authority: s.authority,
    lane: s.lane, kind: s.kind, outbound: s.outbound,
  }));
  const headings = new Map();
  for (const s of sections) {
    const ids = headings.get(s.path) ?? new Set();
    ids.add(s.anchor);
    headings.set(s.path, ids);
  }
  const defects = [];
  const seen = new Set();
  let inspectedInternalLinks = 0;
  let omittedLinkCount = 0;
  let brokenLinkCount = 0;
  for (const from of pages) {
    const text = readFileSync(path.join(stagedRoot, ...from.split('/')), 'utf8');
    const doc = parseMarkdownDocument(text);
    for (const ref of doc.references) {
      if (ref.kind !== 'link' || !ref.href) continue;
      const target = resolveHref(stagedRoot, from, ref.href);
      if (target.class === 'external' || target.class === 'custom' || target.class === 'empty') continue;
      inspectedInternalLinks++;
      let state = null;
      const rel = target.requested ?? target.rel ?? null;
      if (!target.ok) {
        state = rel && withinTrackedTree(rel, tracked)
          ? (sensitiveTarget(rel) ? 'excluded-sensitive-file' : 'excluded-by-snapshot-profile')
          : 'missing-at-source-revision';
      } else if (target.fragment && target.rel?.endsWith('.md')) {
        let ids = headings.get(target.rel);
        if (!ids) {
          try {
            ids = new Set(parseMarkdownDocument(readFileSync(target.abs, 'utf8')).headings.map(h => h.id));
            headings.set(target.rel, ids);
          } catch { ids = new Set(); }
        }
        if (!ids.has(target.fragment)) state = 'broken-anchor-at-source-revision';
      }
      if (!state) continue;
      if (state === 'excluded-by-snapshot-profile' || state === 'excluded-sensitive-file') omittedLinkCount++;
      else brokenLinkCount++;
      const key = [from, ref.line, ref.href, state].join('\0');
      if (seen.has(key)) continue;
      seen.add(key);
      defects.push({
        from, line: ref.line, href: ref.href,
        state, target: rel, fragment: target.fragment ?? null,
        githubUrl: state === 'excluded-by-snapshot-profile'
          ? githubFallback(repositoryUrl, head, rel, target.fragment, !tracked.has(rel)) : null,
      });
    }
  }
  const reachability = canonicalReachability(sections);
  return {
    schema: PORTABLE_WIKI_SCHEMA,
    source: { commit: head, revisionKind: 'committed-git-tree', parser: 'wiki-core/route.mjs + markdown.mjs' },
    sections,
    omittedLinks: defects.filter(d => d.state === 'excluded-by-snapshot-profile' || d.state === 'excluded-sensitive-file'),
    unresolvedLinks: defects.filter(d => d.state !== 'excluded-by-snapshot-profile' && d.state !== 'excluded-sensitive-file'),
    summary: {
      pages: pages.length, sections: sections.length, inspectedInternalLinks,
      omittedLinkCount, brokenLinkCount, ...reachability,
    },
    warning: 'This index is an exact-source locator, not independent proof of semantic correctness. Historical targets can be absent by design.',
  };
}
