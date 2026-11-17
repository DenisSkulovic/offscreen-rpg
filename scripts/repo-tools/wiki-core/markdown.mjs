import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { githubHeadingSlug } from './slug.mjs';

const parser = unified().use(remarkParse).use(remarkGfm);

function plain(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(plain).join('');
}

function definitionMap(tree) {
  const definitions = new Map();
  function walk(node) {
    if (node.type === 'definition' && node.identifier && node.url) {
      definitions.set(String(node.identifier).toLowerCase(), node.url);
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(tree);
  return definitions;
}

/**
 * Parse one Markdown document into headings and active links/images.
 * Fenced and inline code are not references. Custom schemes stay as hrefs.
 * @param {string} markdown
 */
export function parseMarkdownDocument(markdown) {
  const source = markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown;
  const tree = parser.parse(source);
  const definitions = definitionMap(tree);
  const counts = new Map();
  /** @type {{ id: string, text: string, line: number | null, depth: number }[]} */
  const headings = [];
  /** @type {object[]} */
  const references = [];
  /** @type {{ id: string, text: string } | null} */
  let currentHeading = null;

  function pushHeading(node) {
    const text = plain(node).replace(/\s+/g, ' ').trim();
    const base = githubHeadingSlug(text);
    if (!base) return;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    const assigned = {
      id: seen === 0 ? base : `${base}-${seen}`,
      text,
      line: node.position?.start?.line ?? null,
      depth: node.depth,
    };
    headings.push(assigned);
    currentHeading = assigned;
  }

  function tableContextOf(parents) {
    const row = [...parents].reverse().find((node) => node.type === 'tableRow');
    return row ? plain(row).replace(/\s+/g, ' ').trim().slice(0, 500) : '';
  }

  function contextOf(parents) {
    const row = [...parents].reverse().find((node) => node.type === 'tableRow');
    const parent =
      row ??
      [...parents]
        .reverse()
        .find((node) => node.type === 'paragraph' || node.type === 'tableCell' || node.type === 'heading');
    return plain(parent).replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  function record(node, parents, kind) {
    let href = null;
    let undefinedReference = false;
    if (node.type === 'link' || node.type === 'image') href = node.url ?? '';
    else {
      const key = String(node.identifier ?? node.label ?? '').toLowerCase();
      if (definitions.has(key)) href = definitions.get(key);
      else undefinedReference = true;
    }
    references.push({
      kind,
      href,
      label: plain(node).replace(/\s+/g, ' ').trim(),
      line: node.position?.start?.line ?? null,
      headingId: currentHeading?.id ?? null,
      headingText: currentHeading?.text ?? null,
      context: contextOf(parents),
      tableContext: tableContextOf(parents),
      undefinedReference,
    });
  }

  function walk(node, parents) {
    if (node.type === 'heading') pushHeading(node);
    if (node.type === 'link' || node.type === 'linkReference') record(node, parents, 'link');
    if (node.type === 'image' || node.type === 'imageReference') record(node, parents, 'image');
    for (const child of node.children ?? []) {
      if (child.type === 'code' || child.type === 'inlineCode') continue;
      walk(child, parents.concat(node));
    }
  }

  walk(tree, []);
  return { headings, references };
}

export function countWords(markdown) {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, ' ');
  const withoutInline = withoutFences.replace(/`[^`]*`/g, ' ');
  return withoutInline.split(/\s+/).filter(Boolean).length;
}
