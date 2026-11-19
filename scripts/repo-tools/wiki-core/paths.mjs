import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT_INDEXES = new Set(['README.md', 'ENGINEERING.md', 'AGENTS.md', 'STATUS.md', 'ROADMAP.md', 'CLAUDE.md']);
const WORK_INDEXES = new Set([
  'work/README.md',
  'work/changes/README.md',
  'work/designs/README.md',
  'work/QUEUE.md',
  'work/WORK-TAXONOMY.md',
  'work/tasks/README.md',
  'work/tasks/TEMPLATE.md',
  'work/tasks/open/README.md',
  'work/tasks/archive/README.md',
]);

export function toPosix(rel) {
  return rel.replaceAll('\\', '/');
}

export function classifyRepoPath(rel, { isDirectory = false } = {}) {
  const name = toPosix(rel);
  if (isDirectory) return 'directory';
  const markdown = name.endsWith('.md') || name.endsWith('.mdc');
  if (!markdown) {
    if (name.startsWith('evidence/')) return 'evidence';
    return 'source-file';
  }
  if (
    name === 'docs/README.md' ||
    name === 'AGENTS.md' ||
    name === 'STATUS.md' ||
    /^docs\/[^/]+\/README\.md$/.test(name)
  ) {
    return 'canonical-router';
  }
  if (name.startsWith('docs/product/')) return 'canonical-product';
  if (name.startsWith('docs/technical/')) return 'canonical-technical';
  if (name.startsWith('docs/decisions/') || name.startsWith('docs/runbooks/')) {
    return 'canonical-support';
  }
  if (name.startsWith('docs/')) return 'canonical-page';
  if (WORK_INDEXES.has(name)) return 'work-index';
  if (name.startsWith('work/designs/open/')) return 'open-design';
  if (name.startsWith('work/tasks/open/')) return 'open-task';
  if (name.startsWith('work/changes/open/')) return 'open-change';
  if (
    name.startsWith('work/changes/archive/') ||
    name.startsWith('work/tasks/archive/') ||
    name.startsWith('work/designs/parked/') ||
    name.startsWith('work/sessions/') ||
    name.startsWith('research/')
  ) {
    return 'historic';
  }
  if (name.startsWith('evidence/')) return 'evidence';
  if (/^(apps|packages|tools)\/(?:.+\/)?README\.md$/.test(name)) return 'source-map';
  if (name.startsWith('.agents/')) return 'agent-maintenance';
  if (ROOT_INDEXES.has(name)) return 'root-index';
  if (WORK_INDEXES.has(name)) return 'work-index';
  return 'other-page';
}

export function isCanonicalKind(kind) {
  return kind.startsWith('canonical');
}

export function isLintSource(rel) {
  const name = toPosix(rel);
  if (ROOT_INDEXES.has(name) || WORK_INDEXES.has(name)) return true;
  if (name.startsWith('docs/')) return true;
  if (name.startsWith('work/designs/open/')) return true;
  if (name.startsWith('work/changes/open/')) return true;
  if (name.startsWith('work/tasks/open/')) return true;
  if (/^(apps|packages|tools)\/(?:.+\/)?README\.md$/.test(name)) return true;
  return false;
}

export function isHistoricRequest(rel) {
  const name = toPosix(rel ?? '');
  return (
    name.includes('work/changes/archive/') ||
    name.includes('work/tasks/archive/') ||
    name.includes('work/designs/parked/') ||
    name.includes('research/legacy-') ||
    name.startsWith('research/') ||
    name.startsWith('work/sessions/')
  );
}

const listingCache = new Map();

function listNames(dir) {
  const cached = listingCache.get(dir);
  if (cached) return cached;
  const names = readdirSync(dir);
  listingCache.set(dir, names);
  return names;
}

export function clearListingCache() {
  listingCache.clear();
}

/**
 * Resolve a repo-relative posix path with exact filesystem case.
 * @returns {{ ok: true, rel: string, abs: string, isDir: boolean } | { ok: false, code: string, rel: string, actualName?: string }}
 */
export function caseSensitiveResolve(root, relPosix) {
  const normalized = path.posix.normalize(relPosix);
  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes('/../')
  ) {
    return { ok: false, code: 'escapes-root', rel: normalized };
  }
  const segments = normalized.split('/').filter(Boolean);
  let dir = root;
  const actual = [];
  for (const segment of segments) {
    let names;
    try {
      names = listNames(dir);
    } catch {
      return { ok: false, code: 'broken-path', rel: normalized };
    }
    const exact = names.find((name) => name === segment);
    if (!exact) {
      const folded = names.find((name) => name.toLowerCase() === segment.toLowerCase());
      if (folded) {
        return { ok: false, code: 'case-mismatch', rel: normalized, actualName: folded };
      }
      return { ok: false, code: 'broken-path', rel: normalized };
    }
    actual.push(exact);
    dir = path.join(dir, exact);
  }
  if (actual.length === 0) return { ok: false, code: 'broken-path', rel: normalized };
  let isDir = false;
  try {
    isDir = statSync(dir).isDirectory();
  } catch {
    return { ok: false, code: 'broken-path', rel: normalized };
  }
  return { ok: true, rel: actual.join('/'), abs: dir, isDir };
}

function exactChildFile(root, dirRel, childName) {
  return caseSensitiveResolve(root, `${dirRel}/${childName}`);
}

/**
 * @param {string} root absolute repo root
 * @param {string} fromRel posix path of the source page
 * @param {string | null} href
 */
export function resolveHref(root, fromRel, href) {
  const raw = String(href ?? '').trim();
  if (!raw) return { class: 'empty' };
  if (raw.startsWith('//')) return { class: 'external', href: raw };
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    if (/^https?:/i.test(raw) || /^mailto:/i.test(raw)) return { class: 'external', href: raw };
    return { class: 'custom', href: raw };
  }
  const hashAt = raw.indexOf('#');
  const pathPart = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const fragmentRaw = hashAt === -1 ? null : raw.slice(hashAt + 1);
  let fragment = null;
  if (fragmentRaw) {
    try {
      fragment = decodeURIComponent(fragmentRaw);
    } catch {
      return { class: 'local', ok: false, code: 'broken-anchor', rel: fromRel, fragment: fragmentRaw };
    }
  }
  if (!pathPart) {
    return { class: 'self', ok: true, rel: fromRel, fragment, isDir: false };
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    return { class: 'local', ok: false, code: 'broken-path', rel: pathPart, fragment };
  }
  let joined;
  if (decoded.startsWith('/')) joined = path.posix.normalize(decoded.slice(1));
  else joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), decoded));
  const resolved = caseSensitiveResolve(root, joined);
  if (!resolved.ok) return { class: 'local', ...resolved, fragment, requested: joined };
  if (resolved.isDir) {
    if (fragment) {
      return {
        class: 'local',
        ok: false,
        code: 'directory-fragment',
        rel: resolved.rel,
        fragment,
        requested: joined,
      };
    }
    const readme = exactChildFile(root, resolved.rel, 'README.md');
    if (readme.ok && !readme.isDir) {
      return { class: 'local', ok: true, rel: readme.rel, abs: readme.abs, isDir: false, fragment, viaDirectory: true };
    }
    if (!readme.ok && readme.code === 'case-mismatch') return { class: 'local', ...readme, fragment };
    const index = exactChildFile(root, resolved.rel, 'index.md');
    if (index.ok && !index.isDir) {
      return { class: 'local', ok: true, rel: index.rel, abs: index.abs, isDir: false, fragment, viaDirectory: true };
    }
    return { class: 'local', ok: true, rel: resolved.rel, abs: resolved.abs, isDir: true, fragment };
  }
  return { class: 'local', ...resolved, fragment, requested: joined };
}

export function fileExists(root, rel) {
  return existsSync(path.join(root, rel));
}
