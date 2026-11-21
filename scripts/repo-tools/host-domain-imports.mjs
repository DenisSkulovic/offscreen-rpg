/**
 * Production hosts must import stories, generations and storyteller from
 * @offscreen/story-engine. Application still owns outbox, drafts, cache and
 * the compatibility forwarders used outside these source trees.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST_ROOTS = [
  'apps/api/src',
  'apps/game-authority/src',
  'apps/worker/src',
];

const PREFIX =
  /@offscreen\/application\/(?:stories|generations|storyteller)(?:\/|['"`]|$)/;

/**
 * @param {string} source
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/**
 * @param {string} source
 * @returns {string[]}
 */
export function forbiddenHostDomainSpecifiers(source) {
  const code = stripComments(source);
  const found = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      if (PREFIX.test(match[1])) found.push(match[1]);
    }
  }
  return found;
}

/**
 * @param {string} root
 * @param {string[]} [hosts]
 */
export function scanHostDomainImports(root, hosts = HOST_ROOTS) {
  /** @type {{ file: string, specifiers: string[] }[]} */
  const violations = [];
  for (const host of hosts) {
    const directory = path.join(root, host);
    walk(directory, (file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
      const specifiers = forbiddenHostDomainSpecifiers(
        readFileSync(file, 'utf8'),
      );
      if (specifiers.length > 0) {
        violations.push({
          file: path.relative(root, file),
          specifiers,
        });
      }
    });
  }
  return violations;
}

/**
 * @param {string[]} argv
 * @param {string} [cwd]
 */
export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const root = argv[0] ?? cwd;
  const violations = scanHostDomainImports(root);
  if (violations.length === 0) {
    process.stdout.write('host domain imports: pass\n');
    return 0;
  }
  for (const violation of violations) {
    process.stderr.write(
      `${violation.file}: ${violation.specifiers.join(', ')}\n`,
    );
  }
  process.stderr.write(
    'production hosts must import stories, generations and storyteller from @offscreen/story-engine\n',
  );
  return 1;
}

/**
 * @param {string} directory
 * @param {(file: string) => void} visit
 */
function walk(directory, visit) {
  for (const entry of readdirSync(directory)) {
    const file = path.join(directory, entry);
    if (statSync(file).isDirectory()) walk(file, visit);
    else visit(file);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main();
}
