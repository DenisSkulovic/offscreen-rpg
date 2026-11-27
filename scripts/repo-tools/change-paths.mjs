/**
 * Open Change packet locations.
 *
 * Standalone: work/changes/open/<leaf>/CHANGE.md
 * Design group: work/changes/open/<design-slug>/<leaf>/CHANGE.md
 *
 * One grouping level. The group directory is not a Change.
 * Archive layout stays work/changes/archive/YYYY-MM/<program>/<leaf>/CHANGE.md.
 */

export const CHANGE_LEAF = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const DESIGN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const OPEN_FLAT = /^work\/changes\/open\/([^/]+)\/CHANGE\.md$/;
const OPEN_GROUPED = /^work\/changes\/open\/([^/]+)\/([^/]+)\/CHANGE\.md$/;
const ARCHIVE = /^work\/changes\/archive\/\d{4}-\d{2}\/[^/]+\/([^/]+)\/CHANGE\.md$/;

function clean(rel) {
  return String(rel ?? '').replaceAll('\\', '/');
}

function badSegment(rel) {
  return clean(rel).split('/').some((part) => part === '' || part === '.' || part === '..');
}

/**
 * @param {string} rel repository-relative path
 * @returns {{ ok: true, area: 'open'|'archive', group: string|null, leaf: string, path: string } | { ok: false, code: string, path: string }}
 */
export function parseChangePacketPath(rel) {
  const path = clean(rel);
  if (badSegment(path)) return { ok: false, code: 'invalid-change-nesting', path };
  const flat = OPEN_FLAT.exec(path);
  if (flat) {
    if (!CHANGE_LEAF.test(flat[1])) return { ok: false, code: 'invalid-change-nesting', path };
    return { ok: true, area: 'open', group: null, leaf: flat[1], path };
  }
  const grouped = OPEN_GROUPED.exec(path);
  if (grouped) {
    const group = grouped[1];
    const leaf = grouped[2];
    if (!DESIGN_SLUG.test(group) || !CHANGE_LEAF.test(leaf)) {
      return { ok: false, code: 'invalid-change-nesting', path };
    }
    return { ok: true, area: 'open', group, leaf, path };
  }
  if (/^work\/changes\/open\/(?:[^/]+\/){2,}[^/]+\/CHANGE\.md$/.test(path)) {
    return { ok: false, code: 'invalid-change-nesting', path };
  }
  const archived = ARCHIVE.exec(path);
  if (archived) {
    if (!CHANGE_LEAF.test(archived[1])) return { ok: false, code: 'invalid-change-nesting', path };
    return { ok: true, area: 'archive', group: null, leaf: archived[1], path };
  }
  return { ok: false, code: 'not-a-packet', path };
}

/**
 * QUEUE href relative to work/, without a leading slash.
 * @param {string} href
 */
export function parseOpenChangeHref(href) {
  const value = clean(href);
  if (badSegment(value) || value.startsWith('/')) return null;
  const parsed = parseChangePacketPath(`work/${value}`);
  if (!parsed.ok || parsed.area !== 'open') return null;
  return parsed;
}

/**
 * @param {string[]} files repository-relative paths
 */
export function locateLeafPackets(files, leaf) {
  const open = [];
  const archived = [];
  const invalid = [];
  for (const file of files) {
    if (!String(file).endsWith('/CHANGE.md')) continue;
    const parsed = parseChangePacketPath(file);
    if (!parsed.ok) {
      if (clean(file).includes(`/${leaf}/CHANGE.md`)) invalid.push(parsed);
      continue;
    }
    if (parsed.leaf !== leaf) continue;
    if (parsed.area === 'open') open.push(parsed);
    else archived.push(parsed);
  }
  return { open, archived, invalid };
}

/**
 * Classify open/ folders. A group README with child packets is coordination, not an orphan Change.
 * @param {string[]} files
 * @returns {{ code: string, path: string }[]}
 */
export function auditOpenChangeTree(files) {
  const findings = [];
  const packets = [];
  for (const file of files) {
    if (!clean(file).startsWith('work/changes/open/') || !clean(file).endsWith('/CHANGE.md')) continue;
    const parsed = parseChangePacketPath(file);
    if (!parsed.ok) {
      findings.push({ code: parsed.code, path: parsed.path });
      continue;
    }
    if (parsed.area === 'open') packets.push(parsed);
  }
  const byLeaf = new Map();
  for (const packet of packets) {
    const list = byLeaf.get(packet.leaf) ?? [];
    list.push(packet);
    byLeaf.set(packet.leaf, list);
  }
  for (const list of byLeaf.values()) {
    if (list.length < 2) continue;
    for (const packet of list) {
      findings.push({ code: 'duplicate-change-identity', path: packet.path });
    }
  }

  const prefix = 'work/changes/open/';
  const topDirs = new Set();
  for (const file of files) {
    const rel = clean(file);
    if (!rel.startsWith(prefix)) continue;
    const rest = rel.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) continue;
    topDirs.add(rest.slice(0, slash));
  }
  for (const name of [...topDirs].sort()) {
    const top = `${prefix}${name}`;
    const hasChange = files.includes(`${top}/CHANGE.md`);
    const hasReadme = files.includes(`${top}/README.md`);
    const children = new Set();
    const extras = [];
    for (const file of files) {
      const rel = clean(file);
      if (!rel.startsWith(`${top}/`)) continue;
      const rest = rel.slice(top.length + 1);
      const slash = rest.indexOf('/');
      if (slash === -1) {
        if (rest !== 'README.md' && rest !== 'CHANGE.md') extras.push(rel);
        continue;
      }
      children.add(rest.slice(0, slash));
    }
    if (hasChange && (children.size > 0 || hasReadme)) {
      findings.push({ code: 'invalid-change-nesting', path: top });
      continue;
    }
    if (hasChange) continue;
    if (!hasReadme) {
      findings.push({ code: 'orphan-open-folder', path: top });
      continue;
    }
    let malformed = extras.length > 0;
    for (const child of [...children].sort()) {
      const childPath = `${top}/${child}`;
      if (!files.includes(`${childPath}/CHANGE.md`)) {
        findings.push({ code: 'orphan-open-folder', path: childPath });
        malformed = true;
      }
    }
    if (malformed) findings.push({ code: 'malformed-group', path: top });
  }
  return findings;
}
