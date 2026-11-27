/**
 * Single repository-wide work selector.
 * No side effects and no dependency on a checked-out filesystem.
 *
 * work/QUEUE.md may select one open Change or one standalone operational Task,
 * never a nested Composer TASKS.md item, a design proposal, or a group README.
 * An open Change is either changes/open/<leaf>/CHANGE.md or
 * changes/open/<design-slug>/<leaf>/CHANGE.md.
 */
import { parseOpenChangeHref } from './change-paths.mjs';

export const WORK_QUEUE_FILE = 'work/QUEUE.md';

export function parseCurrentWork(text) {
  const lines = [...String(text ?? '').matchAll(/^Current work:\s*(.*?)\s*$/gm)];
  if (lines.length !== 1) {
    return {
      ok: false,
      message: `work/QUEUE.md needs exactly one Current work declaration; found ${lines.length}.`,
    };
  }
  const selected = lines[0][1].trim();
  if (selected === 'none') {
    return { ok: true, selected, kind: null, href: null, target: null };
  }
  const link = /^\[[^\]\r\n]+\]\(([^\s)#]+)\)$/.exec(selected);
  if (!link) {
    return {
      ok: false,
      selected,
      message: 'Current work must be none or one relative Markdown link to an open CHANGE.md or TASK.md.',
    };
  }
  const href = link[1];
  // Don't permit relative escapes, fragments, external URLs, or multiple items.
  if (href.startsWith('/') || href.split('/').includes('..') || href.split('/').includes('.')) {
    return { ok: false, selected, message: 'Current work path must not escape the work/ directory.' };
  }
  const change = parseOpenChangeHref(href);
  const task = /^tasks\/open\/[a-zA-Z0-9._-]+\/TASK\.md$/.test(href);
  if (!change && !task) {
    return {
      ok: false,
      selected,
      message: 'Current work must target changes/open/<leaf>/CHANGE.md, changes/open/<design-slug>/<leaf>/CHANGE.md, or tasks/open/<leaf>/TASK.md.',
    };
  }
  return {
    ok: true,
    selected,
    kind: change ? 'change' : 'task',
    href,
    target: `work/${href}`,
    ...(change ? { leaf: change.leaf, group: change.group } : {}),
  };
}
