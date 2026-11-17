/**
 * pnpm wiki:read path#heading [--outline] [--max-chars 5000] [--from-line N]
 * pnpm wiki:read --self-test
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitRouteMeta, readSection } from './wiki-core/route.mjs';
import { root } from './process.mjs';

function usage() {
  console.error('Usage: pnpm wiki:read <path[#heading]> [--outline] [--max-chars N] [--from-line N] [--char-offset N] [--json]');
  return 2;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    const selfTest = await import('./wiki-core/route-self-test.mjs');
    return selfTest.runRouteSelfTest();
  }
  const json = argv.includes('--json');
  const outline = argv.includes('--outline');
  let maxChars = undefined;
  let fromLine = null;
  let charOffset = 0;
  const position = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json' || arg === '--outline') continue;
    if (arg === '--max-chars') {
      maxChars = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--from-line') {
      fromLine = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--char-offset') {
      charOffset = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) return usage();
    position.push(arg);
  }
  if (position.length !== 1) return usage();
  const meta = gitRouteMeta(root);
  const result = readSection(root, position[0], {
    outline,
    maxChars,
    fromLine,
    charOffset,
    ...meta,
  });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  if (!result.ok) {
    console.error(result.message);
    if (result.nearby) {
      for (const item of result.nearby) console.error(`  ${item.anchor}  line ${item.line}  ${item.heading}`);
    }
    return 1;
  }
  if (result.mode === 'outline') {
    console.log(`${result.schema} outline ${result.path} @ ${result.repoSha ?? 'unknown'}${result.dirty ? ' dirty' : ''}`);
    for (const item of result.headings) {
      console.log(`${'  '.repeat(item.depth - 2)}${item.anchor}  lines ${item.lineStart}-${item.lineEnd}  ${item.bytes} bytes  ${item.heading}`);
    }
    console.log(result.message);
    return 0;
  }
  console.log(
    `${result.schema} ${result.path}#${result.anchor} lines ${result.lineStart}-${result.shownThrough} of ${result.lineStart}-${result.lineEnd} @ ${result.repoSha ?? 'unknown'}${result.dirty ? ' dirty' : ''}`,
  );
  if (result.truncated) {
    console.log(
      `TRUNCATED. Continuation: --from-line ${result.continuation.fromLine}${result.continuation.charOffset ? ` --char-offset ${result.continuation.charOffset}` : ''}. This is not the whole section.`,
    );
  }
  console.log(result.text);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(await main());
}
