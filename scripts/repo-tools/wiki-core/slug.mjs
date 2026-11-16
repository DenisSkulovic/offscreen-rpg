/** GitHub-compatible ATX heading slug subset shared with scripts/check_docs.py. */

export function githubHeadingSlug(text) {
  let cleaned = String(text).replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  cleaned = cleaned.replace(/[*_~]+/g, '');
  cleaned = cleaned.trim().toLowerCase();
  let kept = '';
  for (const ch of cleaned) {
    if (/[\p{L}\p{N}]/u.test(ch) || ch === ' ' || ch === '-') kept += ch;
  }
  return kept.replaceAll(' ', '-').replace(/^-+|-+$/g, '');
}

/**
 * @param {{ text: string, line: number | null, depth: number }[]} headings
 * @returns {{ id: string, text: string, line: number | null, depth: number }[]}
 */
export function assignHeadingIds(headings) {
  const counts = new Map();
  const assigned = [];
  for (const heading of headings) {
    const base = githubHeadingSlug(heading.text);
    if (!base) continue;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    assigned.push({
      id: seen === 0 ? base : `${base}-${seen}`,
      text: heading.text,
      line: heading.line,
      depth: heading.depth,
    });
  }
  return assigned;
}
