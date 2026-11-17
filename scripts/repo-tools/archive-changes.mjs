/**
 * Classify and relocate Change packets: open/ (non-terminal) vs
 * archive/YYYY-MM/<program>/ (Done / Cancelled / superseded).
 *
 * Usage:
 *   node scripts/repo-tools/archive-changes.mjs --dry-run
 *   node scripts/repo-tools/archive-changes.mjs --apply
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './process.mjs';

/** DOC01 G3: packets live under work/changes. */
export const changesRoot = path.join(root, 'work', 'changes');
export const workChangesLedgerRoot = path.join(root, 'work', 'changes', 'ledger');

const SKIP_DIR_NAMES = new Set(['open', 'archive']);

/** @param {string} leaf e.g. 2026-11-14--admin-staff-session */
export function programForLeaf(leaf) {
  const slug = leaf.replace(/^\d{4}-\d{2}-\d{2}--/, '');
  if (slug.startsWith('admin-')) return 'admin';
  if (slug.startsWith('chamber-')) return 'chamber';
  if (slug.startsWith('eng') || slug.startsWith('eng03')) return 'eng';
  if (
    slug.startsWith('ux-') ||
    slug.startsWith('px-') ||
    slug.startsWith('pf-') ||
    slug.startsWith('gm-')
  ) {
    return 'experience';
  }
  if (slug.startsWith('obs') || slug.startsWith('qa-')) return 'observability';
  if (slug.startsWith('sa')) return 'storyteller';
  if (slug.startsWith('web-')) return 'web';
  return 'other';
}

/** @param {string} leaf */
export function monthForLeaf(leaf) {
  const match = /^(\d{4}-\d{2})-\d{2}--/.exec(leaf);
  if (!match) {
    throw new Error(`Change leaf must start with YYYY-MM-DD--: ${leaf}`);
  }
  return match[1];
}

/**
 * @param {string} text CHANGE.md body
 * @returns {{ label: string, kind: 'open' | 'archive' }}
 */
export function classifyChangeText(text) {
  const stateMatch =
    text.match(/\*\*State:\*\*\s*([^\n]+)/i) ||
    text.match(/\*\*State:\s*([^*]+?)\*\*/i) ||
    text.match(/\*\*Status:\*\*\s*([^\n]+)/i) ||
    text.match(/\*\*Status:\s*([^*]+?)\*\*/i) ||
    text.match(/^State:\s*([^\n]+)/im) ||
    text.match(/^Status:\s*([^\n]+)/im);
  const label = stateMatch ? stateMatch[1].replace(/\s+/g, ' ').trim() : '';
  const head = label.replace(/\*+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!head) {
    return { label: '(no State/Status)', kind: 'open' };
  }
  if (/\bblocked\b/i.test(head)) {
    return { label, kind: 'open' };
  }
  if (
    /^(cancelled|canceled)\b/i.test(head) ||
    /^superseded\b/i.test(head) ||
    /\bcancelled\s*\/\s*superseded\b/i.test(head) ||
    /\bdo not implement\b/i.test(head)
  ) {
    return { label, kind: 'archive' };
  }
  if (/^done\b/i.test(head)) {
    return { label, kind: 'archive' };
  }
  return { label, kind: 'open' };
}

/** Terminal packets need a reconciliation ledger. Partial "Done … blocked" stays open. */
export function changeNeedsLedger(text) {
  return classifyChangeText(text).kind === 'archive';
}

/**
 * Depth of packet dir under work/changes (number of path segments after changes/).
 * flat leaf → 1; open/leaf → 2; archive/YYYY-MM/program/leaf → 4
 * @param {string} relFromChanges
 */
export function depthUnderChanges(relFromChanges) {
  const parts = relFromChanges.split(/[/\\]/).filter(Boolean);
  return parts.length;
}

/**
 * @param {string} leaf
 * @param {'open' | 'archive'} kind
 */
export function targetRelFromChanges(leaf, kind) {
  if (kind === 'open') return path.posix.join('open', leaf);
  return path.posix.join(
    'archive',
    monthForLeaf(leaf),
    programForLeaf(leaf),
    leaf,
  );
}

/**
 * Rewrite a single relative link from an old file location to a new one.
 * @param {string} link
 * @param {string} fromFileOldAbs
 * @param {string} fromFileNewAbs
 */
export function rewriteRelativeLink(link, fromFileOldAbs, fromFileNewAbs) {
  const trimmed = link.trim();
  if (
    !trimmed ||
    /^(https?:|mailto:|data:|#|\/)/i.test(trimmed) ||
    trimmed.startsWith('//')
  ) {
    return link;
  }
  // Windows drive / UNC — leave alone
  if (/^[a-zA-Z]:/.test(trimmed)) return link;
  const absTarget = path.resolve(path.dirname(fromFileOldAbs), trimmed);
  let rel = path.relative(path.dirname(fromFileNewAbs), absTarget);
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.') && !path.isAbsolute(rel)) {
    rel = './' + rel;
  }
  return rel;
}

/**
 * @param {string} content
 * @param {string} fromFileOldAbs
 * @param {string} fromFileNewAbs
 */
export function rewriteMarkdownLinksInText(
  content,
  fromFileOldAbs,
  fromFileNewAbs,
) {
  return content.replace(
    /(!?\[[^\]]*]\()([^)\s]+)(\))/g,
    (full, left, target, right) => {
      if (/^(https?:|mailto:|data:|#)/i.test(target)) return full;
      const next = rewriteRelativeLink(target, fromFileOldAbs, fromFileNewAbs);
      return left + next + right;
    },
  );
}

/**
 * Replace inbound path references to a leaf with its new location under work/changes.
 * @param {string} content
 * @param {string} leaf
 * @param {string} newRelFromChanges posix path
 */
export function rewriteInboundLeafPaths(content, leaf, newRelFromChanges) {
  const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = content;
  out = out.replace(
    new RegExp(`work/changes/${escaped}(?=/|[)\\s#"'\`])`, 'g'),
    `work/changes/${newRelFromChanges}`,
  );
  out = out.replace(
    new RegExp(`docs/changes/${escaped}(?=/|[)\\s#"'\`])`, 'g'),
    `work/changes/${newRelFromChanges}`,
  );
  out = out.replace(
    new RegExp(`(?<=[/\\"\\(])changes/${escaped}(?=/|[)\\s#"'\`])`, 'g'),
    `changes/${newRelFromChanges}`,
  );
  out = out.replace(
    new RegExp(`(\\[[^\\]]*\\]\\()(?:\\./)?${escaped}/`, 'g'),
    `$1${newRelFromChanges}/`,
  );
  return out;
}

function listFlatPacketLeaves() {
  if (!existsSync(changesRoot)) return [];
  return readdirSync(changesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP_DIR_NAMES.has(entry.name))
    .map((entry) => entry.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}--/.test(name))
    .filter((name) =>
      existsSync(path.join(changesRoot, name, 'CHANGE.md')),
    )
    .sort();
}

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist'
      ) {
        continue;
      }
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function gitMv(fromAbs, toAbs) {
  mkdirSync(path.dirname(toAbs), { recursive: true });
  const relFrom = path.relative(root, fromAbs);
  const relTo = path.relative(root, toAbs);
  const result = spawnSync(
    'git',
    ['mv', relFrom.split(path.sep).join('/'), relTo.split(path.sep).join('/')],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `git mv failed: ${relFrom} → ${relTo}\n${result.stderr || result.stdout}`,
    );
  }
}

/**
 * @param {{ apply?: boolean }} options
 */
export function planMigration(options = {}) {
  const leaves = listFlatPacketLeaves();
  /** @type {{ leaf: string, kind: 'open'|'archive', label: string, fromRel: string, toRel: string }[]} */
  const moves = [];
  for (const leaf of leaves) {
    const changePath = path.join(changesRoot, leaf, 'CHANGE.md');
    const text = readFileSync(changePath, 'utf8');
    const { label, kind } = classifyChangeText(text);
    const toRel = targetRelFromChanges(leaf, kind);
    const fromRel = leaf;
    if (fromRel === toRel) continue;
    moves.push({ leaf, kind, label, fromRel, toRel });
  }
  return moves;
}

/**
 * @param {{ apply?: boolean }} options
 */
export function runMigration(options = {}) {
  const apply = Boolean(options.apply);
  const moves = planMigration();
  const summary = {
    apply,
    moves: moves.length,
    open: moves.filter((m) => m.kind === 'open').length,
    archive: moves.filter((m) => m.kind === 'archive').length,
    rewrittenFiles: 0,
  };

  if (!apply) {
    return { summary, moves };
  }

  // Move first (so git tracks renames), then rewrite contents.
  for (const move of moves) {
    const fromAbs = path.join(changesRoot, move.fromRel);
    const toAbs = path.join(changesRoot, ...move.toRel.split('/'));
    if (existsSync(toAbs)) {
      throw new Error(`Target already exists: ${move.toRel}`);
    }
    gitMv(fromAbs, toAbs);
  }

  // Rewrite links inside each moved packet (depth adjustment).
  for (const move of moves) {
    const fromDirOld = path.join(changesRoot, move.fromRel);
    const toDir = path.join(changesRoot, ...move.toRel.split('/'));
    const files = walkFiles(toDir).filter((f) => /\.(md|mdc|txt)$/i.test(f));
    for (const fileAbs of files) {
      const relInside = path.relative(toDir, fileAbs);
      const oldFileAbs = path.join(fromDirOld, relInside);
      const before = readFileSync(fileAbs, 'utf8');
      const after = rewriteMarkdownLinksInText(before, oldFileAbs, fileAbs);
      if (after !== before) {
        writeFileSync(fileAbs, after, 'utf8');
        summary.rewrittenFiles += 1;
      }
    }
  }

  // Inbound rewrites across the repo (markdown + a few tooling texts).
  const scanRoots = [
    path.join(root, 'docs'),
    path.join(root, '.agents'),
    path.join(root, 'AGENTS.md'),
    path.join(root, 'TODO.md'),
    path.join(root, 'apps'),
    path.join(root, 'scripts'),
  ];
  /** @type {string[]} */
  const targets = [];
  for (const scan of scanRoots) {
    if (!existsSync(scan)) continue;
    if (statSync(scan).isFile()) targets.push(scan);
    else targets.push(...walkFiles(scan));
  }
  const textFiles = targets.filter(
    (f) =>
      /\.(md|mdc|mjs|ts|tsx|js|json)$/i.test(f) &&
      !f.replace(/\\/g, '/').endsWith('archive-changes.test.mjs') &&
      !f.replace(/\\/g, '/').endsWith('archive-changes.mjs'),
  );

  for (const fileAbs of textFiles) {
    let content = readFileSync(fileAbs, 'utf8');
    let changed = false;
    for (const move of moves) {
      const next = rewriteInboundLeafPaths(content, move.leaf, move.toRel);
      if (next !== content) {
        content = next;
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(fileAbs, content, 'utf8');
      summary.rewrittenFiles += 1;
    }
  }

  // DOC01: append compact ledger rows for newly archived packets.
  const archived = moves.filter((m) => m.kind === 'archive');
  if (archived.length > 0) {
    /** @type {Map<string, typeof archived>} */
    const byMonth = new Map();
    for (const move of archived) {
      const month = monthForLeaf(move.leaf);
      const list = byMonth.get(month) ?? [];
      list.push(move);
      byMonth.set(month, list);
    }
    mkdirSync(workChangesLedgerRoot, { recursive: true });
    for (const [month, monthMoves] of byMonth) {
      const ledgerPath = path.join(workChangesLedgerRoot, `${month}.md`);
      const rows = monthMoves
        .map((m) => {
          const program = programForLeaf(m.leaf);
          return `| \`${m.leaf}\` | ${program} | archived | [packet](../${m.toRel}/CHANGE.md) |`;
        })
        .join('\n');
      if (!existsSync(ledgerPath)) {
        writeFileSync(
          ledgerPath,
          `# Change ledger ${month}\n\n| Leaf | Program | Note | Link |\n| --- | --- | --- | --- |\n${rows}\n`,
          'utf8',
        );
      } else {
        writeFileSync(ledgerPath, `${readFileSync(ledgerPath, 'utf8').trimEnd()}\n${rows}\n`, 'utf8');
      }
      summary.ledgerAppends = (summary.ledgerAppends ?? 0) + monthMoves.length;
    }
  }

  return { summary, moves };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run') || !apply;
  if (args.includes('--help') || (!apply && !args.includes('--dry-run') && args.length)) {
    if (!args.includes('--dry-run') && !apply) {
      console.error('Usage: node scripts/repo-tools/archive-changes.mjs --dry-run | --apply');
      process.exitCode = 1;
      return;
    }
  }
  const { summary, moves } = runMigration({ apply: apply && !dryRun });
  console.log(
    JSON.stringify(
      {
        mode: apply && !dryRun ? 'apply' : 'dry-run',
        ...summary,
        sample: moves.slice(0, 15).map((m) => ({
          leaf: m.leaf,
          kind: m.kind,
          to: m.toRel,
          state: m.label.slice(0, 60),
        })),
      },
      null,
      2,
    ),
  );
  if (dryRun || !apply) {
    console.error(
      `Dry-run: ${summary.moves} moves (${summary.open} open, ${summary.archive} archive). Re-run with --apply to execute.`,
    );
  }
}

const isMain =
  process.argv[1] &&
  path.normalize(process.argv[1]) === path.normalize(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// Windows path quirks: also run when invoked directly via node …/archive-changes.mjs
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('archive-changes.mjs')) {
  main();
}
