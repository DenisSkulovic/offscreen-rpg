import type { CanonicalDocument } from './schema.js';
import type { CanonicalSourcePassage } from './schema.js';

function yamlString(value: string) {
  return JSON.stringify(value);
}

/** Friendly export. The immutable stored object remains the exact version authority. */
export function renderCanonicalMarkdown(document: CanonicalDocument) {
  const { envelope } = document;
  const lines = [
    '---',
    `documentId: ${envelope.documentId}`,
    `kind: ${envelope.kind}`,
    `schemaVersion: ${envelope.schemaVersion}`,
    `revision: ${envelope.revision}`,
    `authority: ${envelope.authority}`,
    `visibility: ${envelope.visibility}`,
  ];
  if (envelope.sources.length) {
    lines.push('sources:');
    for (const source of envelope.sources) {
      lines.push(`  - documentId: ${source.documentId}`);
      lines.push(`    revision: ${source.revision}`);
      if (source.section) lines.push(`    section: ${yamlString(source.section)}`);
    }
  } else {
    lines.push('sources: []');
  }
  lines.push('---', `# ${document.title}`, document.body);
  return `${lines.join('\n')}\n`;
}

export function renderSourcePassageMarkdown(
  passage: CanonicalSourcePassage,
) {
  const { envelope } = passage;
  const frontmatter = [
    '---',
    `documentId: ${envelope.documentId}`,
    'kind: source-passage',
    `schemaVersion: ${envelope.schemaVersion}`,
    `revision: ${envelope.revision}`,
    'authority: source',
    `visibility: ${envelope.visibility}`,
    '---',
  ].join('\n');
  const body = [`# ${passage.content.title}`, ...passage.content.paragraphs].join(
    '\n\n',
  );
  return `${frontmatter}\n${body}\n`;
}
