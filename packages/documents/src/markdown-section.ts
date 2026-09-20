export type MarkdownSection = Readonly<{
  heading: string;
  level: number;
  line: number;
}>;

/** Returns one complete heading subtree. Callers own byte budgets; this never truncates. */
export function selectCompleteMarkdownSection(
  body: string,
  sections: readonly MarkdownSection[],
  sectionLine: number,
) {
  const sectionIndex = sections.findIndex(
    (section) => section.line === sectionLine,
  );
  const section = sections[sectionIndex];
  if (!section) {
    throw new Error('markdown_section_not_found');
  }
  const next = sections
    .slice(sectionIndex + 1)
    .find((candidate) => candidate.level <= section.level);
  return body
    .split(/\r?\n/u)
    .slice(section.line - 1, next ? next.line - 1 : undefined)
    .join('\n');
}
