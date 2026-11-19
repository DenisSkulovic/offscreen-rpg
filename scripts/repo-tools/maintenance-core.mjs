/**
 * Read-only tracked-artifact inventory and lifecycle gate.
 * Reuses the wiki path classifier, Markdown parser, and Change state classifier.
 * It does not rewrite files, call a provider, or decide whether product prose is true.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { classifyChangeText } from './archive-changes.mjs';
import { parseCurrentWork, WORK_QUEUE_FILE } from './work-selection.mjs';
import { scanDocuments } from './wiki-core/content-health.mjs';
import { parseMarkdownDocument } from './wiki-core/markdown.mjs';
import { emptyKnowledgeCoverage, reviewKnowledgeCoverage } from './wiki-core/model.mjs';
import { classifyRepoPath, resolveHref } from './wiki-core/paths.mjs';

export const MAINTENANCE_SCHEMA = 'repo.maintenance.v1';

const ROOT_OWNERS = new Set([
  'README.md',
  'ENGINEERING.md',
  'AGENTS.md',
  'STATUS.md',
  'ROADMAP.md',
  'CLAUDE.md',
  'NOTICE.md',
]);

const CONTROL_BASENAMES = new Set([
  'TODO.md',
  'STATUS.md',
  'HANDOFF.md',
  'CURRENT.md',
  'ROADMAP.md',
]);

export function maintenanceKind(rel) {
  const name = String(rel).replaceAll('\\', '/');
  const base = classifyRepoPath(name);
  if (base !== 'other-page') return base;
  if (
    name.startsWith('.claude/') ||
    name.startsWith('.cursor/') ||
    name.startsWith('.github/')
  ) {
    return 'agent-adapter';
  }
  if (name.startsWith('content/')) return 'content-source';
  if (name.startsWith('work/changes/ledger/')) return 'change-ledger';
  if (ROOT_OWNERS.has(name)) return 'root-notice';
  return 'unclassified';
}

function posix(rel) {
  return String(rel).replaceAll('\\', '/');
}

function finding(severity, code, file, message, suggestion) {
  return { severity, code, path: file, message, suggestion };
}

function readOrNull(readText, rel) {
  try {
    return readText(rel);
  } catch {
    return null;
  }
}

function localLinks(root, fromRel, text) {
  const parsed = parseMarkdownDocument(text);
  const targets = [];
  const broken = [];
  for (const ref of parsed.references) {
    if (ref.kind === 'image' || !ref.href) continue;
    const resolved = resolveHref(root, fromRel, ref.href);
    if (
      resolved.class === 'external' ||
      resolved.class === 'custom' ||
      resolved.class === 'empty'
    ) {
      continue;
    }
    if (resolved.ok && resolved.rel) targets.push(posix(resolved.rel));
    else if (resolved.class === 'local' || resolved.ok === false) {
      broken.push({
        href: ref.href,
        line: ref.line,
        code: resolved.code ?? 'broken-path',
      });
    }
  }
  return { targets, broken };
}

function covers(targets, prefix) {
  const dir = prefix.replace(/\/$/, '');
  return targets.some(
    (target) => target === dir || target.startsWith(`${dir}/`),
  );
}

function exceptionFor(exceptions, rel, today) {
  const row = exceptions.find((item) => posix(item.path) === rel);
  if (!row) return null;
  const reviewBy = String(row.reviewBy ?? '');
  if (!row.owner || !row.reason || !/^\d{4}-\d{2}-\d{2}$/.test(reviewBy)) {
    return { invalid: true, row };
  }
  if (reviewBy < today) return { expired: true, row };
  return { expired: false, row };
}

function suppress(findings, exceptions, today, extra) {
  const kept = [];
  for (const item of findings) {
    const match = exceptionFor(exceptions, item.path, today);
    if (!match) {
      kept.push(item);
      continue;
    }
    if (match.invalid) {
      kept.push(item);
      kept.push(
        finding(
          'error',
          'invalid-exception',
          item.path,
          'An exception needs owner, reason, and reviewBy YYYY-MM-DD.',
          'Repair scripts/repo-tools/maintenance-exceptions.json. A wildcard is not an exception.',
        ),
      );
      continue;
    }
    if (match.expired) {
      kept.push(
        finding(
          'error',
          'expired-exception',
          item.path,
          `Exception owned by ${match.row.owner} expired on ${match.row.reviewBy}.`,
          'Renew the review date with a reason, or repair the finding.',
        ),
      );
      continue;
    }
    extra.exceptionsApplied.push({
      path: item.path,
      owner: match.row.owner,
      reason: match.row.reason,
      reviewBy: match.row.reviewBy,
    });
  }
  return kept;
}

/**
 * @param {{
 *   root: string,
 *   files: string[],
 *   readText: (rel: string) => string,
 *   git: { available: boolean, complete: boolean, sha?: string | null, dirty?: boolean | null, reason?: string },
 *   exceptions?: { path: string, owner: string, reason: string, reviewBy: string }[],
 *   now?: string,
 * }} input
 */
export function scanMaintenance(input) {
  const root = input.root;
  const files = [...new Set(input.files.map(posix))].sort();
  const markdown = files.filter((rel) => rel.endsWith('.md') || rel.endsWith('.mdc'));
  const today = String(input.now ?? '1970-01-01').slice(0, 10);
  const git = input.git ?? { available: false, complete: false, reason: 'Git status was not supplied.' };
  const counts = {};
  for (const rel of markdown) {
    const kind = maintenanceKind(rel);
    counts[kind] = (counts[kind] ?? 0) + 1;
  }

  if (!git.available || !git.complete) {
    return {
      schema: MAINTENANCE_SCHEMA,
      unavailable:
        git.reason ||
        'Integrity gate unavailable. This checkout has no Git history or is missing the archive and evidence trees, so it is not a full-repo result.',
      sha: git.sha ?? null,
      dirty: git.dirty ?? null,
      complete: false,
      counts,
      markdownCount: markdown.length,
      currentWork: null,
      selectedWorkPath: null,
      currentChange: null,
      findings: [],
      exceptionsApplied: [],
      delegated: ['Canonical docs/ reachability stays with wiki:health.'],
      candidates: [],
      top3: [],
      provenance: [],
      historyStatus: 'not-requested',
    };
  }

  /** @type {ReturnType<typeof finding>[]} */
  const findings = [];
  const exceptionsApplied = [];
  const readText = input.readText;

  function consider(rel) {
    const text = readOrNull(readText, rel);
    if (text == null) {
      findings.push(
        finding(
          'error',
          'broken-owner',
          rel,
          'Tracked file could not be read.',
          'Restore the file or stop tracking it.',
        ),
      );
      return null;
    }
    const links = localLinks(root, rel, text);
    for (const broken of links.broken) {
      findings.push(
        finding(
          'error',
          'broken-owner',
          rel,
          `Broken local link ${broken.href} (${broken.code}).`,
          'Repair the relative link. Do not retarget it at a missing archive to force a green result.',
        ),
      );
    }
    return links.targets;
  }

  const queueRel = 'work/changes/README.md'; // catalog, not selection
  const taskIndexRel = 'work/tasks/open/README.md';
  const workQueueRel = WORK_QUEUE_FILE;
  const designRel = 'work/designs/README.md';
  const queueTargets = markdown.includes(queueRel) ? consider(queueRel) : null;
  const taskTargets = markdown.includes(taskIndexRel) ? consider(taskIndexRel) : null;
  const workQueueTargets = markdown.includes(workQueueRel) ? consider(workQueueRel) : null;
  const designTargets = markdown.includes(designRel) ? consider(designRel) : null;
  for (const router of ['work/tasks/README.md', 'work/tasks/archive/README.md', 'work/WORK-TAXONOMY.md']) {
    if (markdown.includes(router)) consider(router);
  }
  if (!workQueueTargets) {
    findings.push(finding(
      'error', 'missing-work-queue', workQueueRel,
      'The single Current work selector is missing or unreadable.',
      'Restore work/QUEUE.md with exactly one Current work line; none is valid.',
    ));
  }
  const selected = workQueueTargets ? parseCurrentWork(readText(workQueueRel)) : { ok: false };
  if (!selected.ok && workQueueTargets) {
    findings.push(finding(
      'error', 'invalid-selection', workQueueRel, selected.message,
      'Use Current work: none or a link to one open CHANGE.md/TASK.md.',
    ));
  } else if (selected.ok && selected.target && !files.includes(selected.target)) {
    findings.push(finding(
      'error', 'invalid-selection', workQueueRel,
      `Selected ${selected.target} is not a tracked open packet.`,
      'Restore the referenced packet or select none; do not select an archived item.',
    ));
  }
  if (queueTargets && /^Current change:/m.test(readText(queueRel))) {
    findings.push(finding(
      'error', 'legacy-selection', queueRel,
      'Change catalog still declares a competing Current change selection.',
      'Use Current work in work/QUEUE.md as the sole selector; keep this page a catalog.',
    ));
  }

  // A tracked open folder without its front door is an error, even if no
  // CHANGE.md exists to be discovered by the older packet-only scan.
  const changeLeaves = new Set(
    files.filter((rel) => /^work\/changes\/open\/[^/]+\//.test(rel))
      .map((rel) => rel.split('/').slice(0, 4).join('/')),
  );
  for (const leaf of [...changeLeaves].sort()) {
    if (!files.includes(`${leaf}/CHANGE.md`)) {
      findings.push(finding(
        'error', 'orphan-open-folder', leaf,
        'Tracked open Change folder has no CHANGE.md front door.',
        'Restore its Change packet or move completed material to the matching archive.',
      ));
    }
  }

  for (const rel of markdown) {
    if (!/^work\/changes\/open\/[^/]+\/CHANGE\.md$/.test(rel)) continue;
    const leaf = rel.slice(0, rel.lastIndexOf('/'));
    if (!queueTargets || !covers(queueTargets, leaf)) {
      findings.push(
        finding(
          'error',
          'missing-route',
          rel,
          'Open Change packet is missing from work/changes/README.md.',
          'Add a queue link to this CHANGE.md. none remains a valid Current change.',
        ),
      );
    }
    const text = readOrNull(readText, rel);
    if (text == null) continue;
    consider(rel);
    const state = classifyChangeText(text);
    if (state.label.startsWith('(no State')) {
      findings.push(
        finding(
          'error',
          'unclassified-state',
          rel,
          'Open Change has no State or Status line.',
          'Declare one state. An unknown state is not archived automatically.',
        ),
      );
    } else if (state.kind === 'archive') {
      findings.push(
        finding(
          'error',
          'terminal-open',
          rel,
          `Open packet declares a terminal state (${state.label}).`,
          'Archive the packet after its ledger, or correct the state. A partial Done with blocked stays open.',
        ),
      );
    }
  }

  for (const rel of markdown) {
    if (!rel.startsWith('work/changes/archive/') || !rel.endsWith('/CHANGE.md')) continue;
    const text = readOrNull(readText, rel);
    if (text == null) continue;
    const state = classifyChangeText(text);
    if (state.label.startsWith('(no State')) {
      findings.push(
        finding(
          'error',
          'unclassified-state',
          rel,
          'Archived Change has no State or Status line.',
          'Declare a terminal state, or move the packet back to open/.',
        ),
      );
    } else if (state.kind === 'open') {
      findings.push(
        finding(
          'error',
          'active-archived',
          rel,
          `Archived packet is still active (${state.label}).`,
          'Move it to open/ and index it, or set a terminal state.',
        ),
      );
    }
  }

  const taskLeaves = new Set(
    files.filter((rel) => /^work\/tasks\/open\/[^/]+\//.test(rel))
      .map((rel) => rel.split('/').slice(0, 4).join('/')),
  );
  for (const leaf of [...taskLeaves].sort()) {
    if (!files.includes(`${leaf}/TASK.md`)) {
      findings.push(finding(
        'error', 'orphan-open-task', leaf,
        'Tracked open standalone Task folder has no TASK.md front door.',
        'Restore its TASK.md or archive the completed operational record.',
      ));
    }
  }
  for (const rel of markdown) {
    if (!/^work\/tasks\/open\/[^/]+\/TASK\.md$/.test(rel)) continue;
    const leaf = rel.slice(0, rel.lastIndexOf('/'));
    if (!taskTargets || !covers(taskTargets, leaf)) {
      findings.push(finding(
        'error', 'missing-route', rel,
        'Open standalone Task is not linked from work/tasks/open/README.md.',
        'Link the TASK.md in the open Task index; selecting none remains valid.',
      ));
    }
    const content = readOrNull(readText, rel);
    if (content == null) continue;
    consider(rel);
    const state = classifyChangeText(content);
    if (state.label.startsWith('(no State')) {
      findings.push(finding(
        'error', 'unclassified-state', rel,
        'Open Task has no State or Status line.',
        'Declare Proposed, Ready, In-progress or Blocked.',
      ));
    } else if (state.kind === 'archive') {
      findings.push(finding(
        'error', 'terminal-open', rel,
        `Open Task declares a terminal state (${state.label}).`,
        'Archive the Task packet with its evidence or correct the state.',
      ));
    }
  }
  for (const rel of markdown) {
    if (!/^work\/tasks\/archive\/\d{4}-\d{2}\/[^/]+\/TASK\.md$/.test(rel)) continue;
    const content = readOrNull(readText, rel);
    if (content == null) continue;
    const state = classifyChangeText(content);
    if (state.label.startsWith('(no State') || state.kind !== 'archive') {
      findings.push(finding(
        'error', 'active-archived', rel,
        'Archived Task is missing a terminal Done or Cancelled state.',
        'Record actual terminal disposition or return the Task to open.',
      ));
    }
  }

  const designEntries = new Set();
  for (const rel of markdown) {
    if (!rel.startsWith('work/designs/open/')) continue;
    const rest = rel.slice('work/designs/open/'.length);
    const slash = rest.indexOf('/');
    if (slash === -1) designEntries.add(rel);
    else designEntries.add(`work/designs/open/${rest.slice(0, slash)}`);
  }
  for (const entry of designEntries) {
    if (!designTargets || !covers(designTargets, entry)) {
      findings.push(
        finding(
          'error',
          'missing-route',
          entry,
          'Open design dossier is missing from work/designs/README.md.',
          'Link the dossier entry from the design index. A mention in a historical footnote is not a route.',
        ),
      );
    }
  }

  if (markdown.includes('work/changes/ledger') || markdown.some((rel) => rel.startsWith('work/changes/ledger/'))) {
    if (!queueTargets || !covers(queueTargets, 'work/changes/ledger')) {
      findings.push(
        finding(
          'error',
          'missing-route',
          'work/changes/ledger',
          'Change ledger is not linked from the queue.',
          'Link ledger/ from work/changes/README.md.',
        ),
      );
    }
  }

  const routers = markdown.filter((rel) => {
    if (rel === 'research/README.md' || rel === 'evidence/README.md' || rel === '.agents/README.md') {
      return true;
    }
    if (/^research\/[^/]+\/README\.md$/.test(rel)) return true;
    if (/^evidence\/[^/]+\/README\.md$/.test(rel)) return true;
    if (/^evidence\/[^/]+\/MANIFEST\.md$/.test(rel)) return true;
    if (ROOT_OWNERS.has(rel)) return true;
    return false;
  });
  for (const rel of routers) consider(rel);

  for (const rel of markdown) {
    if (maintenanceKind(rel) !== 'unclassified') continue;
    const base = path.posix.basename(rel);
    const control = CONTROL_BASENAMES.has(base);
    findings.push(
      finding(
        'error',
        'unclassified',
        rel,
        control
          ? 'Control document has no owning router.'
          : 'Tracked Markdown is outside the known lifecycle classes.',
        control
          ? 'Route it from README.md, STATUS.md, or the work queue, or move it under its owner.'
          : 'Classify the path with its collection router. Do not hide it with a wildcard exception.',
      ),
    );
  }

  const kept = suppress(findings, input.exceptions ?? [], today, { exceptionsApplied });
  kept.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));

  const report = {
    schema: MAINTENANCE_SCHEMA,
    unavailable: null,
    sha: git.sha ?? null,
    dirty: git.dirty ?? null,
    complete: true,
    counts,
    markdownCount: markdown.length,
    currentWork: selected.ok ? selected.selected : null,
    selectedWorkPath: selected.ok ? selected.target : null,
    currentChange: selected.ok && selected.kind === 'change' ? selected.selected : 'none',
    findings: kept,
    exceptionsApplied,
    delegated: [
      'Canonical docs/ reachability stays with wiki:health.',
      'Dated evidence and archived Change bodies stay on their collection router.',
    ],
    candidates: [],
    top3: [],
    provenance: [],
    historyStatus: 'not-requested',
  };
  return attachFreshness(report, input, markdown, readText);
}

const BACKTICK_PATH =
  /`((?:docs|apps|packages|tools|scripts|\.agents|work)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`/g;

function isActivePage(rel) {
  if (ROOT_OWNERS.has(rel) || rel.startsWith('docs/')) return true;
  if (rel.startsWith('work/changes/open/') || rel.startsWith('work/designs/open/') || rel.startsWith('work/tasks/open/')) return true;
  if (['work/README.md', 'work/QUEUE.md', 'work/WORK-TAXONOMY.md', 'work/changes/README.md', 'work/designs/README.md', 'work/tasks/README.md', 'work/tasks/archive/README.md'].includes(rel)) {
    return true;
  }
  if (rel === 'research/README.md' || rel === 'evidence/README.md' || rel === '.agents/README.md') return true;
  if (/^research\/[^/]+\/README\.md$/.test(rel) || /^evidence\/[^/]+\/README\.md$/.test(rel)) return true;
  if (/^(apps|packages|tools)\/(?:.+\/)?README\.md$/.test(rel)) return true;
  return false;
}

function ageDays(now, at) {
  const end = Date.parse(now);
  const start = Date.parse(at);
  if (Number.isNaN(end) || Number.isNaN(start)) return null;
  return Math.floor((end - start) / 86400000);
}

function cohortOf(days) {
  if (days == null || days < 14) return null;
  if (days >= 90) return 90;
  if (days >= 60) return 60;
  if (days >= 30) return 30;
  return 14;
}

function citedPaths(root, rel, text) {
  const found = new Set();
  const links = localLinks(root, rel, text);
  for (const target of links.targets) {
    if (target === rel) continue;
    if (!path.posix.basename(target).includes('.')) continue;
    found.add(target);
  }
  for (const match of text.matchAll(BACKTICK_PATH)) found.add(match[1]);
  found.delete(rel);
  return [...found];
}

function rankCandidate(item) {
  let score = 0;
  if (item.selected) score += 1000;
  if (item.control) score += 500;
  if (item.code === 'needs-revalidation') score += 200;
  if (item.code === 'unknown-provenance') score += 150;
  if (item.code === 'unknown-review-needed') score += 800;
  if (item.code === 'no-known-route') score += 80;
  if (item.code === 'suspected-stale-instruction') score += 40;
  if (item.code === 'inactive-open-work') score += 10;
  return score + Math.min(item.ageDays ?? 0, 90);
}

function rememberCoverage(report, coverage) {
  report.coverage = {
    status: coverage.status,
    productBible: coverage.productBible,
    canon: false,
    reviewed: coverage.reviewed,
    unknown: coverage.candidates.map((item) => item.path),
  };
  for (const candidate of coverage.candidates) report.candidates.push(candidate);
}

function attachFreshness(report, input, markdown, readText) {
  const history = input.history;
  if (!history) {
    rememberCoverage(report, emptyKnowledgeCoverage('not-assessed'));
    return report;
  }
  report.historyStatus = history.available ? 'available' : 'unavailable';
  if (!history.available) {
    rememberCoverage(report, emptyKnowledgeCoverage('not-assessed'));
    return report;
  }

  const now = input.now ?? '1970-01-01T00:00:00Z';
  const dirty = new Set((history.dirty ?? []).map(posix));
  const commits = history.commits ?? {};
  const active = markdown.filter(isActivePage);
  const selectedPath = report.selectedWorkPath ?? '';

  /** @type {Map<string, { owner: string, edge: string }[]>} */
  const inbound = new Map();
  const documents = [];
  for (const rel of active) {
    let text = '';
    try {
      text = readText(rel);
    } catch {
      report.candidates.push({
        code: 'unknown-provenance',
        severity: 'warning',
        path: rel,
        message: 'Active page could not be read, so it is not fresh.',
        ageDays: null,
        cohort: null,
      });
      continue;
    }
    documents.push({ path: rel, text });
    const commit = commits[rel];
    const days = commit ? ageDays(now, commit.at) : null;
    report.provenance.push({
      path: rel,
      sha: commit?.sha ?? null,
      at: commit?.at ?? null,
      ageDays: days,
      cohort: cohortOf(days),
      dirty: dirty.has(rel),
    });
    for (const target of citedPaths(input.root, rel, text)) {
      const list = inbound.get(target) ?? [];
      list.push({ owner: rel, edge: target });
      inbound.set(target, list);
    }
  }

  function cleared(owner, source) {
    for (const rel of markdown) {
      if (!rel.endsWith('/CHANGE.md')) continue;
      let text = '';
      try {
        text = readText(rel);
      } catch {
        continue;
      }
      if (!/unchanged because/i.test(text)) continue;
      if (text.includes(owner) && text.includes(source)) return true;
    }
    return false;
  }

  for (const [source, owners] of inbound) {
    const sourceCommit = commits[source];
    const missing = !sourceCommit && !(history.present ?? (() => true))(source);
    for (const edge of owners) {
      const ownerCommit = commits[edge.owner];
      const control = ROOT_OWNERS.has(edge.owner) || edge.owner === 'work/QUEUE.md';
      const selected = Boolean(selectedPath) && (edge.owner === selectedPath || edge.owner.startsWith(selectedPath.replace(/\/CHANGE\.md$/, '/')));
      if (dirty.has(edge.owner) || dirty.has(source) || missing || !sourceCommit || !ownerCommit) {
        report.candidates.push({
          code: 'unknown-provenance',
          severity: 'warning',
          path: edge.owner,
          dependency: source,
          message: 'The cited path is dirty, missing, or has no commit, so it is not fresh.',
          ownerSha: ownerCommit?.sha ?? null,
          sourceSha: sourceCommit?.sha ?? null,
          ageDays: null,
          cohort: null,
          control,
          selected,
        });
        continue;
      }
      if (Date.parse(sourceCommit.at) > Date.parse(ownerCommit.at)) {
        if (cleared(edge.owner, source)) {
          report.cleared = report.cleared ?? [];
          report.cleared.push({ path: edge.owner, dependency: source });
          continue;
        }
        report.candidates.push({
          code: 'needs-revalidation',
          severity: 'warning',
          path: edge.owner,
          dependency: source,
          message: 'Cited source changed after the owner. This is a review candidate, not a false contract.',
          ownerSha: ownerCommit.sha,
          sourceSha: sourceCommit.sha,
          ageDays: ageDays(now, ownerCommit.at),
          cohort: cohortOf(ageDays(now, ownerCommit.at)),
          control,
          selected,
        });
      }
    }
  }

  for (const row of report.provenance) {
    const openWork =
      /^work\/changes\/open\/[^/]+\/CHANGE\.md$/.test(row.path) ||
      /^work\/designs\/open\/[^/]+\/README\.md$/.test(row.path);
    if (!openWork || row.dirty || row.ageDays == null || row.ageDays < 14) continue;
    if (report.candidates.some((item) => item.path === row.path && item.code === 'needs-revalidation')) {
      continue;
    }
    report.candidates.push({
      code: 'inactive-open-work',
      severity: 'warning',
      path: row.path,
      message: 'Open work has had no commit inside the 14-day review window. Age does not close it.',
      ageDays: row.ageDays,
      cohort: row.cohort,
      ownerSha: row.sha,
      control: false,
      selected: Boolean(selectedPath) && row.path === selectedPath,
    });
  }

  for (const source of history.uncited ?? []) {
    if (inbound.has(source)) continue;
    report.candidates.push({
      code: 'no-known-route',
      severity: 'warning',
      path: source,
      message: 'Changed source has no explicit documentation citation. It is not attributed to every technical page.',
      ageDays: null,
      cohort: null,
      control: false,
      selected: false,
    });
  }

  const changedSources = [
    ...new Set([...(history.uncited ?? []), ...(history.dirty ?? [])].map(posix)),
  ].filter((rel) => !rel.endsWith('.md') && !rel.endsWith('.mdc'));
  const coverageEntries = [];
  for (const rel of changedSources) {
    let text = '';
    try {
      text = readText(rel);
    } catch {
      continue;
    }
    coverageEntries.push({
      path: rel,
      text,
      owners: (inbound.get(rel) ?? []).map((edge) => edge.owner),
    });
  }
  rememberCoverage(
    report,
    reviewKnowledgeCoverage(
      coverageEntries,
      documents.map((doc) => doc.text.replace(/\s*$/, '')).join('\n'),
    ),
  );

  const stale = scanDocuments(documents, { scripts: input.scriptNames ?? [] });
  for (const item of stale.issues) {
    if (item.code !== 'stale-unimplemented-script' && item.code !== 'unratified-canonical') continue;
    report.candidates.push({
      code: 'suspected-stale-instruction',
      severity: 'warning',
      path: item.path,
      message: item.message,
      ageDays: null,
      cohort: null,
      control: ROOT_OWNERS.has(item.path),
      selected: false,
    });
  }

  report.candidates.sort((a, b) => rankCandidate(b) - rankCandidate(a) || a.path.localeCompare(b.path));
  report.top3 = report.candidates.slice(0, 3);
  return report;
}

export function citationEdges(root, files, readText) {
  const edges = [];
  for (const rel of files.map(posix).filter(isActivePage)) {
    let text = '';
    try {
      text = readText(rel);
    } catch {
      continue;
    }
    for (const target of citedPaths(root, rel, text)) edges.push({ from: rel, to: target });
  }
  return edges;
}

export function pathsForHistory(root, files, readText) {
  const needed = new Set();
  const cited = new Set();
  for (const rel of files.map(posix).filter(isActivePage)) {
    needed.add(rel);
    let text = '';
    try {
      text = readText(rel);
    } catch {
      continue;
    }
    for (const target of citedPaths(root, rel, text)) {
      needed.add(target);
      cited.add(target);
    }
  }
  return { needed: [...needed], cited: [...cited] };
}

export function loadExceptionFile(filePath) {
  if (!existsSync(filePath)) return [];
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('maintenance exceptions must be an array');
  }
  return parsed;
}
