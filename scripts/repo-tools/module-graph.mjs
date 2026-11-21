/**
 * Read-only workspace manifest and TypeScript import graph.
 * The report observes intra-application cycles. It fails closed when the
 * baseline or parser is missing, and when a production workspace import is
 * undeclared, an export subpath does not exist, or packages depend in a cycle.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applicationDomain,
  runtimeCycles,
  sortEdges,
  stronglyConnectedComponents,
  typeOnlyCycles,
} from './module-graph-core.mjs';
import { stripComments } from './host-domain-imports.mjs';

export const SCHEMA = 'offscreen.module-graph.v1';
const SUMMARY_LIMIT = 12;
const WORKSPACE_SCOPE = '@offscreen/';
export const FORBIDDEN_APPLICATION_IMPORT = '@offscreen/application';

/**
 * @typedef {object} PackageRecord
 * @property {string} directory
 * @property {string} name
 * @property {Record<string, unknown>} manifest
 */

/**
 * @typedef {object} SourceRecord
 * @property {string} path
 * @property {string} text
 */

/**
 * @param {string[]} argv
 */
export function main(argv = globalThis.process.argv.slice(2)) {
  const options = parseArgs(argv);
  const report = options.root
    ? scanModuleGraph(options.root)
    : unavailableReport(
        null,
        'baseline-unavailable',
        'No workspace root was provided.',
      );
  const text = options.mermaid
    ? renderMermaid(report)
    : options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : renderHuman(report);
  globalThis.process.stdout.write(text);
  return exitCode(report);
}

/**
 * @param {string} root
 */
export function scanModuleGraph(root) {
  const baseline = readBaselineSha(root);
  if (!baseline.sha) {
    return unavailableReport(
      null,
      'baseline-unavailable',
      baseline.message ?? 'Git HEAD is unavailable, so the graph cannot pass.',
    );
  }
  let typescript;
  try {
    typescript = loadTypeScript();
  } catch (error) {
    return unavailableReport(
      baseline.sha,
      'parser-unavailable',
      error instanceof Error ? error.message : String(error),
    );
  }
  const listed = listWorkspaceSources(root);
  if (!listed.ok) {
    return unavailableReport(
      baseline.sha,
      'source-list-unavailable',
      listed.message,
    );
  }
  const loaded = loadPackages(root);
  if (!loaded.ok) {
    return unavailableReport(
      baseline.sha,
      'manifest-unreadable',
      loaded.message,
    );
  }
  return buildModuleGraph({
    baselineSha: baseline.sha,
    packages: loaded.packages,
    sources: listed.sources,
    typescript,
    exists: (relative) => existsSync(path.join(root, relative)),
  });
}

/**
 * @param {{ baselineSha: string | null, packages: PackageRecord[], sources: SourceRecord[], typescript: typeof import('typescript') | null, exists?: (relative: string) => boolean }} input
 */
export function buildModuleGraph(input) {
  if (!input.baselineSha) {
    return unavailableReport(
      null,
      'baseline-unavailable',
      'Git HEAD is unavailable, so the graph cannot pass.',
    );
  }
  if (!input.typescript) {
    return unavailableReport(
      input.baselineSha,
      'parser-unavailable',
      'The TypeScript parser is unavailable, so the graph cannot pass.',
    );
  }
  const packages = [...input.packages].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const byName = new Map(packages.map((item) => [item.name, item]));
  const fileSet = new Set(
    input.sources.map((source) => normalize(source.path)),
  );
  /** @type {Array<Record<string, unknown>>} */
  const declaredEdges = [];
  /** @type {Array<Record<string, unknown>>} */
  const sourceEdges = [];
  /** @type {Array<Record<string, unknown>>} */
  const domainEdges = [];
  /** @type {Array<Record<string, unknown>>} */
  const mismatches = [];
  /** @type {Array<Record<string, string>>} */
  const errors = [];
  /** @type {Array<Record<string, string>>} */
  const warnings = [];

  for (const item of packages) {
    for (const field of ['dependencies', 'devDependencies']) {
      const block = item.manifest[field];
      if (!block || typeof block !== 'object') continue;
      for (const name of Object.keys(block).sort()) {
        if (!byName.has(name) || name === item.name) continue;
        declaredEdges.push({ from: item.name, to: name, field });
      }
    }
  }

  for (const source of [...input.sources].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    const file = normalize(source.path);
    const owner = packageForFile(file, packages);
    let specifiers;
    try {
      specifiers = collectSpecifiers(input.typescript, file, source.text);
    } catch (error) {
      errors.push({
        code: 'parse-failed',
        message: error instanceof Error ? error.message : String(error),
        file,
      });
      continue;
    }
    for (const specifier of specifiers) {
      classifySpecifier({
        specifier,
        file,
        owner,
        packages,
        byName,
        fileSet,
        exists: input.exists ?? (() => false),
        sourceEdges,
        domainEdges,
        mismatches,
        errors,
        warnings,
      });
    }
    if (isApplicationImportBanScope(file)) {
      for (const specifier of collectRequireSpecifiers(source.text)) {
        if (!isForbiddenApplicationSpecifier(specifier.specifier)) continue;
        classifySpecifier({
          specifier,
          file,
          owner,
          packages,
          byName,
          fileSet,
          exists: input.exists ?? (() => false),
          sourceEdges,
          domainEdges,
          mismatches,
          errors,
          warnings,
        });
      }
    }
  }

  const packageNodes = packages.map((item) => item.name);
  const declaredRuntime = declaredEdges
    .filter((edge) => edge.field === 'dependencies')
    .map((edge) => ({
      from: String(edge.from),
      to: String(edge.to),
      kind: 'runtime',
    }));
  const declaredSccs = stronglyConnectedComponents(
    packageNodes,
    declaredRuntime,
  );
  for (const cycle of declaredSccs) {
    errors.push({
      code: 'package-dependency-cycle',
      message: `Package dependencies cycle: ${cycle.join(' → ')}`,
    });
  }

  const productionEdges = sourceEdges.filter(
    (edge) => edge.production === true && edge.fromPackage !== edge.toPackage,
  );
  const packageRuntimeSccs = runtimeCycles(
    packageNodes,
    productionEdges.map(packageEdge),
  );
  for (const cycle of packageRuntimeSccs) {
    errors.push({
      code: 'package-source-cycle',
      message: `Production source imports cycle across packages: ${cycle.join(' → ')}`,
    });
  }
  const packageTypeOnlySccs = typeOnlyCycles(
    packageNodes,
    productionEdges.map(packageEdge),
  );
  const domainNodes = [
    ...new Set(
      domainEdges.flatMap((edge) => [String(edge.from), String(edge.to)]),
    ),
  ];
  const domainRuntimeSccs = runtimeCycles(
    domainNodes,
    domainEdges.map(plainEdge),
  );
  const domainTypeOnlySccs = typeOnlyCycles(
    domainNodes,
    domainEdges.map(plainEdge),
  );
  for (const cycle of domainRuntimeSccs) {
    warnings.push({
      code: 'domain-runtime-cycle',
      message: `Intra-application runtime cycle is observed, not newly forbidden: ${cycle.join(' → ')}`,
    });
  }
  for (const cycle of packageTypeOnlySccs) {
    warnings.push({
      code: 'package-type-only-cycle',
      message: `Type-only package cycle: ${cycle.join(' → ')}`,
    });
  }
  for (const cycle of domainTypeOnlySccs) {
    warnings.push({
      code: 'domain-type-only-cycle',
      message: `Type-only intra-application cycle: ${cycle.join(' → ')}`,
    });
  }

  const report = {
    schema: SCHEMA,
    baselineSha: input.baselineSha,
    availability: 'ok',
    result:
      errors.length > 0 ? 'fail' : warnings.length > 0 ? 'observed' : 'clear',
    packages: packages.map((item) => ({
      name: item.name,
      directory: item.directory,
    })),
    declaredEdges: sortRecords(declaredEdges, ['from', 'to', 'field']),
    sourceEdges: sortRecords(sourceEdges, [
      'fromFile',
      'line',
      'specifier',
      'kind',
    ]),
    domainEdges: sortRecords(domainEdges, [
      'fromFile',
      'line',
      'specifier',
      'kind',
    ]),
    mismatches: sortRecords(mismatches, ['file', 'line', 'specifier', 'code']),
    runtimePackageSccs: packageRuntimeSccs,
    typeOnlyPackageSccs: packageTypeOnlySccs,
    declaredDependencySccs: declaredSccs,
    domainRuntimeSccs,
    domainTypeOnlySccs,
    errors: sortRecords(errors, ['code', 'file', 'specifier', 'message']),
    warnings: sortRecords(warnings, ['code', 'message']),
  };
  return report;
}

/**
 * @param {typeof import('typescript')} typescript
 * @param {string} filePath
 * @param {string} text
 */
export function collectSpecifiers(typescript, filePath, text) {
  const source = typescript.createSourceFile(
    filePath,
    text,
    typescript.ScriptTarget.ESNext,
    true,
    filePath.endsWith('.tsx')
      ? typescript.ScriptKind.TSX
      : filePath.endsWith('.mjs')
        ? typescript.ScriptKind.JS
        : typescript.ScriptKind.TS,
  );
  /** @type {Array<{ specifier: string, kind: string, line: number }>} */
  const found = [];
  /**
   * @param {import('typescript').Node} node
   */
  function visit(node) {
    if (
      typescript.isImportDeclaration(node) &&
      typescript.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push({
        specifier: node.moduleSpecifier.text,
        kind: importKind(typescript, node),
        line: lineOf(source, node),
      });
    } else if (
      typescript.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      typescript.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push({
        specifier: node.moduleSpecifier.text,
        kind: exportKind(typescript, node),
        line: lineOf(source, node),
      });
    } else if (
      typescript.isCallExpression(node) &&
      node.expression.kind === typescript.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0];
      if (argument && typescript.isStringLiteral(argument)) {
        found.push({
          specifier: argument.text,
          kind: 'dynamic',
          line: lineOf(source, node),
        });
      }
    }
    typescript.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} subpath
 */
export function subpathIsExported(manifest, subpath) {
  const exportsField = manifest.exports;
  if (exportsField == null) return subpath === '';
  if (typeof exportsField === 'string') return subpath === '';
  if (typeof exportsField !== 'object' || Array.isArray(exportsField))
    return false;
  const key = subpath === '' ? '.' : `./${subpath}`;
  const table = /** @type {Record<string, unknown>} */ (exportsField);
  if (Object.prototype.hasOwnProperty.call(table, key)) return true;
  for (const pattern of Object.keys(table)) {
    if (!pattern.includes('*')) continue;
    const expression = `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/gu, '\\$&'))
      .join('.*')}$`;
    if (new RegExp(expression, 'u').test(key)) return true;
  }
  return false;
}

/**
 * @param {string} specifier
 */
export function isForbiddenApplicationSpecifier(specifier) {
  return (
    specifier === FORBIDDEN_APPLICATION_IMPORT ||
    specifier.startsWith(`${FORBIDDEN_APPLICATION_IMPORT}/`)
  );
}

/**
 * Production apps, tools, and repo-tool entrypoints must not import Application.
 *
 * @param {string} filePath
 */
export function isApplicationImportBanScope(filePath) {
  const file = normalize(filePath);
  if (/^scripts\/repo-tools\/[^/]+\.mjs$/u.test(file)) {
    return !file.endsWith('.test.mjs');
  }
  if (/^(?:apps|tools)\/[^/]+\/src\//u.test(file)) {
    return isProductionSource(file);
  }
  return false;
}

/**
 * @param {string} text
 * @returns {Array<{ specifier: string, kind: string, line: number }>}
 */
export function collectRequireSpecifiers(text) {
  const code = stripComments(text);
  /** @type {Array<{ specifier: string, kind: string, line: number }>} */
  const found = [];
  for (const match of code.matchAll(
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    const index = match.index ?? 0;
    const line = text.slice(0, index).split('\n').length;
    found.push({ specifier: match[1], kind: 'require', line });
  }
  return found;
}

/**
 * @param {string} filePath
 */
export function isProductionSource(filePath) {
  const file = normalize(filePath);
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false;
  if (file.endsWith('.d.ts')) return false;
  if (file.split('/').some((part) => part === 'dist' || part === 'generated')) {
    return false;
  }
  return !isTestSource(file);
}

/**
 * @param {string} filePath
 */
export function isTestSource(filePath) {
  const file = normalize(filePath);
  return (
    /\.(?:test|spec)\.tsx?$/u.test(file) ||
    file.includes('/__tests__/') ||
    file.includes('/test/') ||
    file.includes('/tests/')
  );
}

/**
 * @param {object} report
 */
export function renderHuman(report) {
  const lines = [
    `${report.schema}`,
    `baseline ${report.baselineSha ?? 'unavailable'}`,
    `RESULT ${report.result}`,
    `packages ${report.packages?.length ?? 0}`,
    `declared edges ${report.declaredEdges?.length ?? 0}`,
    `source edges ${report.sourceEdges?.length ?? 0}`,
    `domain edges ${report.domainEdges?.length ?? 0}`,
  ];
  appendCapped(lines, 'declared', report.declaredEdges, (edge) => {
    return `${edge.from} -> ${edge.to} (${edge.field})`;
  });
  appendCapped(
    lines,
    'domain',
    uniqueDomainPairs(report.domainEdges ?? []),
    (edge) => {
      return `${edge.from} -> ${edge.to} (${edge.kind})`;
    },
  );
  appendCapped(lines, 'mismatches', report.mismatches, (item) => {
    return `${item.code} ${item.file}:${item.line} ${item.specifier}`;
  });
  appendCapped(
    lines,
    'errors',
    report.errors,
    (item) => `${item.code} ${item.message}`,
  );
  appendCapped(lines, 'warnings', report.warnings, (item) => {
    return `${item.code} ${item.message}`;
  });
  return `${lines.join('\n')}\n`;
}

/**
 * @param {object} report
 */
export function renderMermaid(report) {
  const pairs = uniqueDomainPairs(
    (report.domainEdges ?? []).filter((edge) => edge.kind !== 'type-only'),
  );
  const edges = pairs.length > 0 ? pairs : (report.declaredEdges ?? []);
  const lines = ['flowchart LR'];
  for (const edge of edges.slice(0, SUMMARY_LIMIT)) {
    const from = mermaidId(String(edge.from));
    const to = mermaidId(String(edge.to));
    lines.push(`  ${from} --> ${to}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} specifier
 * @param {string[]} packageNames
 */
export function matchWorkspacePackage(specifier, packageNames) {
  const names = [...packageNames].sort(
    (left, right) => right.length - left.length,
  );
  for (const name of names) {
    if (specifier === name) return { name, subpath: '' };
    if (specifier.startsWith(`${name}/`)) {
      return { name, subpath: specifier.slice(name.length + 1) };
    }
  }
  return null;
}

/**
 * @param {object} input
 */
function classifySpecifier(input) {
  const { specifier, file, owner } = input;
  if (
    !specifier.specifier.startsWith('.') &&
    isForbiddenApplicationSpecifier(specifier.specifier) &&
    isApplicationImportBanScope(file)
  ) {
    pushMismatch(input, 'forbidden-production-application-import', true);
    return;
  }
  if (specifier.specifier.startsWith('.')) {
    if (isAssetSpecifier(specifier.specifier)) return;
    classifyRelative(input);
    return;
  }
  const match = matchWorkspacePackage(specifier.specifier, [
    ...input.byName.keys(),
  ]);
  if (!match) {
    if (specifier.specifier.startsWith(WORKSPACE_SCOPE)) {
      pushMismatch(input, 'unknown-workspace-package', true);
    }
    return;
  }
  const target = input.byName.get(match.name);
  const production = owner ? isProductionSource(file) : false;
  const resolved = Boolean(
    target && subpathIsExported(target.manifest, match.subpath),
  );
  if (owner && target) {
    input.sourceEdges.push({
      fromPackage: owner.name,
      toPackage: target.name,
      fromFile: file,
      specifier: specifier.specifier,
      kind: specifier.kind,
      line: specifier.line,
      production,
      resolved,
    });
  }
  if (!resolved) {
    pushMismatch(input, 'unknown-export-subpath', true);
    return;
  }
  if (!owner || !target || owner.name === target.name) return;
  const field = dependencyField(owner.manifest, target.name);
  if (production && field !== 'dependencies' && field !== 'peerDependencies') {
    pushMismatch(input, 'undeclared-production-import', true);
    return;
  }
  if (!production && !field) {
    input.warnings.push({
      code: 'undeclared-test-import',
      message: `${file}:${specifier.line} ${specifier.specifier}`,
    });
    pushMismatch(input, 'undeclared-test-import', false);
  }
}

/**
 * @param {object} input
 */
function classifyRelative(input) {
  const { specifier, file, owner } = input;
  const resolved = resolveRelative(
    file,
    specifier.specifier,
    input.fileSet,
    input.exists,
  );
  if (!resolved) {
    input.warnings.push({
      code: 'unresolved-relative',
      message: `${file}:${specifier.line} ${specifier.specifier}`,
    });
    pushMismatch(input, 'unresolved-relative', false);
    return;
  }
  if (!owner) return;
  const fromDomain = applicationDomain(file);
  const toDomain = applicationDomain(resolved);
  if (!fromDomain || !toDomain || fromDomain === toDomain) return;
  if (!isProductionSource(file)) return;
  input.domainEdges.push({
    from: fromDomain,
    to: toDomain,
    fromFile: file,
    specifier: specifier.specifier,
    kind: specifier.kind,
    line: specifier.line,
    resolved: true,
  });
}

/**
 * @param {object} input
 * @param {string} code
 * @param {boolean} failing
 */
function pushMismatch(input, code, failing) {
  const item = {
    code,
    file: input.file,
    specifier: input.specifier.specifier,
    line: input.specifier.line,
    production: isProductionSource(input.file),
  };
  input.mismatches.push(item);
  if (!failing) return;
  input.errors.push({
    code,
    message: `${item.file}:${item.line} ${item.specifier}`,
    file: item.file,
    specifier: item.specifier,
  });
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 * @param {Set<string>} fileSet
 */
export function resolveRelative(
  fromFile,
  specifier,
  fileSet,
  exists = () => false,
) {
  return (
    relativeCandidates(fromFile, specifier).find(
      (candidate) => fileSet.has(candidate) || exists(candidate),
    ) ?? null
  );
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 */
function relativeCandidates(fromFile, specifier) {
  const directory = path.posix.dirname(normalize(fromFile));
  const joined = path.posix.normalize(path.posix.join(directory, specifier));
  const withoutEmittedExtension = joined.replace(/\.(?:js|mjs|cjs|jsx)$/u, '');
  const candidates = [
    `${withoutEmittedExtension}.ts`,
    `${withoutEmittedExtension}.tsx`,
    `${withoutEmittedExtension}.mts`,
    `${withoutEmittedExtension}/index.ts`,
    `${withoutEmittedExtension}/index.tsx`,
  ];
  if (/\.(?:json|tsx?)$/u.test(specifier)) candidates.unshift(joined);
  return candidates;
}

/**
 * Stylesheets and images are not TypeScript modules. A missing `.js` import
 * is still reported.
 *
 * @param {string} specifier
 */
function isAssetSpecifier(specifier) {
  return /\.(?:css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|woff2?|ttf)$/iu.test(
    specifier,
  );
}

/**
 * @param {string} file
 * @param {PackageRecord[]} packages
 */
function packageForFile(file, packages) {
  const matches = packages.filter((item) =>
    file.startsWith(`${item.directory}/`),
  );
  matches.sort((left, right) => right.directory.length - left.directory.length);
  return matches[0] ?? null;
}

/**
 * @param {Record<string, unknown>} manifest
 * @param {string} packageName
 */
function dependencyField(manifest, packageName) {
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
    const block = manifest[field];
    if (block && typeof block === 'object' && packageName in block)
      return field;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} edge
 */
function packageEdge(edge) {
  return {
    from: String(edge.fromPackage),
    to: String(edge.toPackage),
    kind: String(edge.kind),
  };
}

/**
 * @param {Record<string, unknown>} edge
 */
function plainEdge(edge) {
  return {
    from: String(edge.from),
    to: String(edge.to),
    kind: String(edge.kind),
  };
}

/**
 * @param {typeof import('typescript')} typescript
 * @param {import('typescript').ImportDeclaration} node
 */
function importKind(typescript, node) {
  if (node.importClause?.isTypeOnly) return 'type-only';
  const bindings = node.importClause?.namedBindings;
  if (
    bindings &&
    typescript.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly) &&
    !node.importClause?.name
  ) {
    return 'type-only';
  }
  return 'runtime';
}

/**
 * @param {typeof import('typescript')} typescript
 * @param {import('typescript').ExportDeclaration} node
 */
function exportKind(typescript, node) {
  if (node.isTypeOnly) return 'type-only';
  const clause = node.exportClause;
  if (
    clause &&
    typescript.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  ) {
    return 'type-only';
  }
  return 'reexport';
}

/**
 * @param {import('typescript').SourceFile} source
 * @param {import('typescript').Node} node
 */
function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

/**
 * @param {string | null} baselineSha
 * @param {string} code
 * @param {string} message
 */
function unavailableReport(baselineSha, code, message) {
  return {
    schema: SCHEMA,
    baselineSha,
    availability: 'unavailable',
    result: 'unavailable',
    packages: [],
    declaredEdges: [],
    sourceEdges: [],
    domainEdges: [],
    mismatches: [],
    runtimePackageSccs: [],
    typeOnlyPackageSccs: [],
    declaredDependencySccs: [],
    domainRuntimeSccs: [],
    domainTypeOnlySccs: [],
    errors: [{ code, message }],
    warnings: [],
  };
}

/**
 * @param {object} report
 */
function exitCode(report) {
  if (report.result === 'unavailable') return 2;
  if (report.result === 'fail') return 1;
  return 0;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  return {
    json: argv.includes('--json'),
    mermaid: argv.includes('--mermaid'),
    root:
      rootIndex >= 0
        ? argv[rootIndex + 1]
        : path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            '..',
            '..',
          ),
  };
}

/**
 * @param {string} root
 */
function readBaselineSha(root) {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (!sha) return { sha: null, message: 'Git HEAD was empty.' };
    return { sha, message: '' };
  } catch (error) {
    return {
      sha: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {string} root
 */
function listWorkspaceSources(root) {
  let output;
  try {
    output = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      sources: [],
    };
  }
  /** @type {SourceRecord[]} */
  const sources = [];
  for (const relative of output.split('\0').filter(Boolean)) {
    const file = normalize(relative);
    if (!isWorkspaceSource(file)) continue;
    const absolute = path.join(root, file);
    sources.push({ path: file, text: readFileSync(absolute, 'utf8') });
  }
  return { ok: true, message: '', sources };
}

/**
 * @param {string} file
 */
function isWorkspaceSource(file) {
  if (file.split('/').some((part) => part === 'dist' || part === 'generated')) {
    return false;
  }
  if (
    /^scripts\/repo-tools\/[^/]+\.mjs$/u.test(file) &&
    !file.endsWith('.test.mjs')
  ) {
    return true;
  }
  if (!/\.(?:ts|tsx)$/u.test(file) || file.endsWith('.d.ts')) return false;
  return /^(?:apps|packages|tools)\/[^/]+\/src\//u.test(file);
}

/**
 * @param {string} root
 */
function loadPackages(root) {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  if (!existsSync(workspaceFile)) {
    return {
      ok: false,
      message: 'pnpm-workspace.yaml is missing.',
      packages: [],
    };
  }
  const patterns = readFileSync(workspaceFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).replaceAll('"', '').replaceAll("'", ''))
    .filter((line) => line.endsWith('/*'));
  /** @type {PackageRecord[]} */
  const packages = [];
  for (const pattern of patterns) {
    const parent = pattern.slice(0, -2);
    const absolute = path.join(root, parent);
    if (!existsSync(absolute)) continue;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = normalize(path.join(parent, entry.name));
      const manifestPath = path.join(root, directory, 'package.json');
      if (!existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        if (typeof manifest.name !== 'string') {
          return {
            ok: false,
            message: `${directory}/package.json has no package name.`,
            packages: [],
          };
        }
        packages.push({ directory, name: manifest.name, manifest });
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
          packages: [],
        };
      }
    }
  }
  return { ok: true, message: '', packages };
}

function loadTypeScript() {
  const require = createRequire(import.meta.url);
  return require('typescript');
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string[]} keys
 */
function sortRecords(records, keys) {
  return [...records].sort((left, right) => {
    for (const key of keys) {
      const compared = String(left[key] ?? '').localeCompare(
        String(right[key] ?? ''),
      );
      if (compared !== 0) return compared;
    }
    return 0;
  });
}

/**
 * @param {Array<Record<string, unknown>>} edges
 */
function uniqueDomainPairs(edges) {
  /** @type {Map<string, Record<string, unknown>>} */
  const pairs = new Map();
  for (const edge of sortEdges(
    edges.map((edge) => ({
      from: String(edge.from),
      to: String(edge.to),
      kind: String(edge.kind ?? ''),
    })),
  )) {
    const key = `${edge.from}\0${edge.to}\0${edge.kind}`;
    if (!pairs.has(key)) pairs.set(key, edge);
  }
  return [...pairs.values()];
}

/**
 * @param {string[]} lines
 * @param {string} label
 * @param {Array<Record<string, unknown>> | undefined} items
 * @param {(item: Record<string, unknown>) => string} format
 */
function appendCapped(lines, label, items, format) {
  const list = items ?? [];
  lines.push(`${label}:`);
  for (const item of list.slice(0, SUMMARY_LIMIT))
    lines.push(`  ${format(item)}`);
  if (list.length > SUMMARY_LIMIT) {
    lines.push(`  … ${list.length - SUMMARY_LIMIT} more`);
  }
}

/**
 * @param {string} value
 */
function mermaidId(value) {
  const cleaned = value.replace(/[^A-Za-z0-9_]/gu, '_');
  return cleaned.length > 0 ? cleaned : 'node';
}

/**
 * @param {string} value
 */
function normalize(value) {
  return value.replaceAll('\\', '/');
}

const nodeProcess = globalThis.process;
if (
  nodeProcess.argv[1] &&
  path.resolve(nodeProcess.argv[1]) === fileURLToPath(import.meta.url)
) {
  nodeProcess.exitCode = main();
}
