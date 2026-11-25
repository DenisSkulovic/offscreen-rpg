/**
 * Pure production source-health metrics from pre-discovered paths.
 * No filesystem or Git access; adapters supply text and optional baseline reads.
 */
import { Buffer } from 'node:buffer';
import ts from 'typescript';

export const CODE_HEALTH_MISSING = 'CODE_HEALTH_MISSING';

export const THRESHOLDS = {
  thresholdsVersion: 'cq06.v1',
  fileLinesAdvisory: 300,
  fileLinesReview: 700,
  fileLinesHigh: 1200,
  functionBodySpanReview: 60,
  functionBodySpanSevere: 100,
  functionLinesReview: 120,
  cyclomaticComplexityReview: 12,
  controlFlowNestingAdvisory: 3,
  controlFlowNestingReview: 5,
  parameterCountReview: 5,
  directFilesReview: 35,
};

const PRODUCTION_ROOTS = ['apps/', 'packages/', 'tools/'];
const HARD_EXCLUDED_SEGMENTS = new Set([
  'dist',
  '.next',
  'generated',
  'node_modules',
  'coverage',
]);
const PRODUCTION_EXCLUDED_SEGMENTS = new Set([
  ...HARD_EXCLUDED_SEGMENTS,
  'test',
  'tests',
  '__tests__',
  'fixtures',
]);
const TEST_PATH_SEGMENTS = new Set(['test', 'tests', '__tests__', 'fixtures']);
const SOURCE_EXT_RE = /\.(ts|tsx|mts|cts)$/;
const TEST_NAME_RE = /\.(test|spec|integration)\.(ts|tsx|mts|cts)$/;
/** Basename (no extension) begins with packet id + hyphen/underscore or cache-wave prefix. */
const PACKET_STYLE_TEST_BASENAME_RE =
  /^(?:[A-Za-z]{2,}\d{2}[-_]|cache-wave\d+-)/u;

const CONTROL_FLOW_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.TryStatement,
]);

const GROWTH_MIN_LINES = 150;
const GROWTH_MIN_RATIO = 0.3;
const NEW_FILE_SEVERE_LINES = 1200;

/** Normalize to posix separators for deterministic ordering. */
export function normalizePath(rel) {
  return String(rel).replaceAll('\\', '/');
}

/** Whether a repo-relative path is in-scope TypeScript under apps/packages/tools. */
export function isInScopeSource(rel) {
  const normalized = normalizePath(rel);
  if (!PRODUCTION_ROOTS.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }
  if (!SOURCE_EXT_RE.test(normalized)) {
    return false;
  }
  for (const segment of normalized.split('/')) {
    if (HARD_EXCLUDED_SEGMENTS.has(segment)) {
      return false;
    }
  }
  return true;
}

/** Whether a repo-relative path is in-scope production TypeScript source. */
export function isProductionSource(rel) {
  const normalized = normalizePath(rel);
  if (!isInScopeSource(normalized)) {
    return false;
  }
  const baseName = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (TEST_NAME_RE.test(baseName)) {
    return false;
  }
  for (const segment of normalized.split('/')) {
    if (PRODUCTION_EXCLUDED_SEGMENTS.has(segment)) {
      return false;
    }
  }
  return true;
}

/** Tracked test/fixture TypeScript inventory (separate from production sizing). */
export function isTrackedTestSource(rel) {
  const normalized = normalizePath(rel);
  if (!isInScopeSource(normalized)) {
    return false;
  }
  if (isProductionSource(normalized)) {
    return false;
  }
  const baseName = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (TEST_NAME_RE.test(baseName)) {
    return true;
  }
  for (const segment of normalized.split('/')) {
    if (TEST_PATH_SEGMENTS.has(segment)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {string} rel
 */
export function testBasenameWithoutExtension(rel) {
  const normalized = normalizePath(rel);
  const baseName = normalized.slice(normalized.lastIndexOf('/') + 1);
  return baseName.replace(/\.(ts|tsx|mts|cts)$/u, '');
}

/** Packet-style test filename debt (e.g. cq06-foo, cache03-bar, cache-wave1-x). */
export function hasPacketStyleTestBasename(rel) {
  return PACKET_STYLE_TEST_BASENAME_RE.test(testBasenameWithoutExtension(rel));
}

/**
 * @param {string} relPath
 */
function posixNormalizeRelative(relPath) {
  /** @type {string[]} */
  const parts = [];
  for (const part of normalizePath(relPath).split('/')) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}

/**
 * Resolve a static relative module specifier from a repo-relative file path.
 * @param {string} fromFile
 * @param {string} specifier
 */
export function resolveStaticRelativeImport(fromFile, specifier) {
  const normalized = normalizePath(specifier);
  if (!normalized.startsWith('./') && !normalized.startsWith('../')) {
    return null;
  }
  const normalizedFrom = normalizePath(fromFile);
  const directory = normalizedFrom.includes('/')
    ? normalizedFrom.slice(0, normalizedFrom.lastIndexOf('/'))
    : '';
  return posixNormalizeRelative(`${directory}/${normalized}`);
}

/**
 * @param {string} resolvedPath
 */
function resolvedPathTouchesTestBoundary(resolvedPath) {
  const normalized = normalizePath(resolvedPath);
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (
      segment === 'test-stores' ||
      segment === 'test-stores.js' ||
      segment.startsWith('test-stores.')
    ) {
      return { match: true, reason: 'target includes test-stores helper path' };
    }
    if (segment === 'test' || segment === 'tests') {
      return { match: true, reason: 'target includes test directory segment' };
    }
    if (segment === 'fixtures') {
      return { match: true, reason: 'target includes fixtures segment' };
    }
    if (segment === '__tests__') {
      return { match: true, reason: 'target includes __tests__ segment' };
    }
  }
  return { match: false, reason: '' };
}

/**
 * @param {import('typescript').ImportDeclaration} node
 */
function importIsTypeOnly(node) {
  if (node.importClause?.isTypeOnly) {
    return true;
  }
  const bindings = node.importClause?.namedBindings;
  if (
    bindings &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly) &&
    !node.importClause?.name
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('typescript').ExportDeclaration} node
 */
function exportIsTypeOnly(node) {
  if (node.isTypeOnly) {
    return true;
  }
  const clause = node.exportClause;
  if (
    clause &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('typescript').SourceFile} sourceFile
 * @param {string} path
 */
function productionTestBoundaryFindings(sourceFile, path) {
  /** @type {import('./code-health-core.mjs').CodeHealthFinding[]} */
  const findings = [];

  function inspect(node) {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (!importIsTypeOnly(node)) {
        const specifier = node.moduleSpecifier.text;
        const resolved = resolveStaticRelativeImport(path, specifier);
        if (resolved) {
          const boundary = resolvedPathTouchesTestBoundary(resolved);
          if (boundary.match) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              ).line + 1;
            findings.push({
              id: `production-test-boundary-import:${path}:${line}:${specifier}`,
              kind: 'production-test-boundary-import',
              severity: 'info',
              path,
              line,
              specifier,
              resolvedTarget: resolved,
              reason: boundary.reason,
              message: `Production file imports test-scoped module (${boundary.reason}).`,
            });
          }
        }
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (!exportIsTypeOnly(node)) {
        const specifier = node.moduleSpecifier.text;
        const resolved = resolveStaticRelativeImport(path, specifier);
        if (resolved) {
          const boundary = resolvedPathTouchesTestBoundary(resolved);
          if (boundary.match) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              ).line + 1;
            findings.push({
              id: `production-test-boundary-export:${path}:${line}:${specifier}`,
              kind: 'production-test-boundary-export',
              severity: 'info',
              path,
              line,
              specifier,
              resolvedTarget: resolved,
              reason: boundary.reason,
              message: `Production file re-exports from test-scoped module (${boundary.reason}).`,
            });
          }
        }
      }
    }
    ts.forEachChild(node, inspect);
  }

  inspect(sourceFile);
  return findings;
}

/**
 * @param {string} path
 * @param {(path: string) => string | null | undefined} readText
 * @param {(text: string, path: string) => import('typescript').SourceFile} parseFn
 */
function collectProductionBoundaryImportKeys(path, readText, parseFn) {
  const text = readSourceText(readText, path);
  if (text == null) {
    return [];
  }
  try {
    const sourceFile = parseFn(text, path);
    return productionTestBoundaryFindings(sourceFile, path).map(
      (finding) =>
        `${finding.path}|${finding.resolvedTarget}|${finding.specifier}|${finding.kind}`,
    );
  } catch {
    return [];
  }
}

/**
 * @param {string[]} baselineEntries
 * @param {(path: string) => string | null | undefined} readBaseline
 * @param {(text: string, path: string) => import('typescript').SourceFile} parseFn
 */
function indexBaselineBoundaryImports(baselineEntries, readBaseline, parseFn) {
  /** @type {Set<string>} */
  const keys = new Set();
  for (const entry of baselineEntries.map(normalizePath)) {
    if (!isProductionSource(entry)) {
      continue;
    }
    for (const key of collectProductionBoundaryImportKeys(
      entry,
      readBaseline,
      parseFn,
    )) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * @param {string} testPath
 */
function testNamingDebtFinding(testPath) {
  return {
    id: `test-naming-packet-debt-new:${testPath}`,
    kind: 'test-naming-packet-debt-new',
    severity: 'info',
    path: testPath,
    metric: 'test-basename',
    value: testBasenameWithoutExtension(testPath),
    message:
      'New or renamed test uses packet-style basename; prefer behavior-oriented naming.',
  };
}

/**
 * Newline-aware line count without a phantom trailing empty line.
 * @param {string} text
 */
export function countLines(text) {
  if (text === '') {
    return 0;
  }
  const parts = text.split(/\r\n|\n|\r/);
  if (parts.at(-1) === '') {
    parts.pop();
  }
  return parts.length;
}

/**
 * @param {(path: string) => string | null | undefined} readText
 * @param {string} path
 * @returns {string | null}
 */
function readSourceText(readText, path) {
  try {
    const text = readText(path);
    if (text == null) {
      return null;
    }
    return String(text);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      /** @type {{ code?: string }} */ (error).code === CODE_HEALTH_MISSING
    ) {
      return null;
    }
    throw error;
  }
}

function defaultParse(text, path) {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true, kind);
}

function isFunctionLikeNode(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/**
 * @param {import('typescript').FunctionLikeDeclaration} node
 */
function getFunctionLikeName(node) {
  if (ts.isConstructorDeclaration(node)) {
    return 'constructor';
  }
  const name = node.name;
  if (name && ts.isIdentifier(name)) {
    return name.text;
  }
  return '<anonymous>';
}

/**
 * @param {import('typescript').FunctionLikeDeclaration} fnNode
 * @param {import('typescript').SourceFile} sourceFile
 */
function functionBodySpanLines(fnNode, sourceFile) {
  const start = sourceFile.getLineAndCharacterOfPosition(
    fnNode.getStart(sourceFile),
  );
  const end = sourceFile.getLineAndCharacterOfPosition(
    Math.max(fnNode.getStart(sourceFile), fnNode.getEnd() - 1),
  );
  return end.line - start.line + 1;
}

/**
 * @param {import('typescript').FunctionLikeDeclaration} fnNode
 */
function countParameters(fnNode) {
  return fnNode.parameters?.length ?? 0;
}

/**
 * Deepest if/for/while/switch/try nesting inside one function body.
 * Nested functions are measured separately.
 * @param {import('typescript').FunctionLikeDeclaration} fnNode
 */
function measureControlFlowNesting(fnNode) {
  const body = fnNode.body;
  if (!body) {
    return 0;
  }

  let maxDepth = 0;

  /** @param {import('typescript').Node} node @param {number} depth */
  function walk(node, depth) {
    if (isFunctionLikeNode(node) && node !== fnNode) {
      return;
    }

    const isControl = CONTROL_FLOW_KINDS.has(node.kind);
    const childDepth = isControl ? depth + 1 : depth;
    if (isControl && childDepth > maxDepth) {
      maxDepth = childDepth;
    }

    ts.forEachChild(node, (child) => walk(child, childDepth));
  }

  walk(body, 0);
  return maxDepth;
}

const CYCLOMATIC_LOOP_KINDS = new Set([
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
]);

/**
 * Cyclomatic complexity within one function body; nested callables are omitted.
 * @param {import('typescript').FunctionLikeDeclaration} fnNode
 */
function measureCyclomaticComplexity(fnNode) {
  const body = fnNode.body;
  if (!body) {
    return 1;
  }

  let count = 1;

  /** @param {import('typescript').Node} node */
  function walk(node) {
    if (isFunctionLikeNode(node) && node !== fnNode) {
      return;
    }

    if (ts.isIfStatement(node)) {
      count += 1;
    } else if (CYCLOMATIC_LOOP_KINDS.has(node.kind)) {
      count += 1;
    } else if (ts.isSwitchStatement(node)) {
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) {
          count += 1;
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(body);
  return count;
}

/**
 * @param {import('typescript').FunctionLikeDeclaration} fnNode
 * @param {import('typescript').SourceFile} sourceFile
 * @param {string} path
 */
function buildFunctionAdvisoryFindings(fnNode, sourceFile, path) {
  /** @type {import('./code-health-core.mjs').CodeHealthFinding[]} */
  const findings = [];
  const name = getFunctionLikeName(fnNode);
  const line =
    sourceFile.getLineAndCharacterOfPosition(fnNode.getStart(sourceFile)).line +
    1;
  const span = functionBodySpanLines(fnNode, sourceFile);
  const nesting = measureControlFlowNesting(fnNode);
  const cyclomatic = measureCyclomaticComplexity(fnNode);
  const parameters = countParameters(fnNode);

  const base = { path, line, name, severity: 'info' };

  if (span >= THRESHOLDS.functionBodySpanSevere) {
    findings.push({
      ...base,
      id: `function-body-span-severe:${path}:${line}:${name}`,
      kind: 'function-body-span-severe',
      severity: 'warning',
      metric: 'body-span-lines',
      value: span,
      threshold: THRESHOLDS.functionBodySpanSevere,
      message: `${name} body span is ${span} lines (>= ${THRESHOLDS.functionBodySpanSevere}).`,
    });
  } else if (span >= THRESHOLDS.functionBodySpanReview) {
    findings.push({
      ...base,
      id: `function-body-span-review:${path}:${line}:${name}`,
      kind: 'function-body-span-review',
      metric: 'body-span-lines',
      value: span,
      threshold: THRESHOLDS.functionBodySpanReview,
      message: `${name} body span is ${span} lines (>= ${THRESHOLDS.functionBodySpanReview}).`,
    });
  }

  if (cyclomatic > THRESHOLDS.cyclomaticComplexityReview) {
    findings.push({
      ...base,
      id: `cyclomatic-complexity-review:${path}:${line}:${name}`,
      kind: 'cyclomatic-complexity-review',
      metric: 'cyclomatic-complexity',
      value: cyclomatic,
      threshold: THRESHOLDS.cyclomaticComplexityReview,
      message: `${name} cyclomatic complexity is ${cyclomatic} (> ${THRESHOLDS.cyclomaticComplexityReview}).`,
    });
  }

  if (nesting > THRESHOLDS.controlFlowNestingAdvisory) {
    findings.push({
      ...base,
      id: `function-nesting-advisory:${path}:${line}:${name}`,
      kind: 'function-nesting-advisory',
      metric: 'control-flow-nesting',
      value: nesting,
      threshold: THRESHOLDS.controlFlowNestingAdvisory,
      message: `${name} control-flow nesting is ${nesting} (> ${THRESHOLDS.controlFlowNestingAdvisory}).`,
    });
  }

  if (parameters > THRESHOLDS.parameterCountReview) {
    findings.push({
      ...base,
      id: `parameter-count-review:${path}:${line}:${name}`,
      kind: 'parameter-count-review',
      metric: 'parameter-count',
      value: parameters,
      threshold: THRESHOLDS.parameterCountReview,
      message: `${name} has ${parameters} parameters (> ${THRESHOLDS.parameterCountReview}).`,
    });
  }

  return findings;
}

/**
 * @param {import('typescript').SourceFile} sourceFile
 * @param {import('typescript').ParseConfig['parse']} parseDiagnosticsHost
 */
function diagnosticsToFindings(path, sourceFile) {
  const findings = [];
  for (const diagnostic of sourceFile.parseDiagnostics ?? []) {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    );
    const start = diagnostic.start ?? 0;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    const severity =
      diagnostic.category === ts.DiagnosticCategory.Error ? 'warning' : 'info';
    findings.push({
      id: `parse-diagnostic:${path}:${line + 1}:${character + 1}`,
      kind: 'parse-diagnostic',
      severity,
      path,
      line: line + 1,
      column: character + 1,
      message,
    });
  }
  return findings;
}

/**
 * @param {import('typescript').SourceFile} sourceFile
 * @param {string} path
 */
function analyzeSourceFile(sourceFile, path) {
  let functionCount = 0;
  let maxFunctionLines = 0;
  let maxControlFlowNesting = 0;
  let assertionCount = 0;
  let nonNullCount = 0;
  let anyCount = 0;
  /** @type {import('./code-health-core.mjs').CodeHealthFinding[]} */
  const functionAdvisoryFindings = [];

  function recordFunction(fnNode) {
    functionCount += 1;
    const span = functionBodySpanLines(fnNode, sourceFile);
    if (span > maxFunctionLines) {
      maxFunctionLines = span;
    }
    const nesting = measureControlFlowNesting(fnNode);
    if (nesting > maxControlFlowNesting) {
      maxControlFlowNesting = nesting;
    }
    functionAdvisoryFindings.push(
      ...buildFunctionAdvisoryFindings(fnNode, sourceFile, path),
    );
  }

  function walk(node) {
    if (isFunctionLikeNode(node)) {
      recordFunction(node);
    }
    if (ts.isAsExpression(node)) {
      assertionCount += 1;
    }
    if (ts.isNonNullExpression(node)) {
      nonNullCount += 1;
    }
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      anyCount += 1;
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);

  return {
    functionCount,
    maxFunctionLines,
    maxControlFlowNesting,
    assertionCount,
    nonNullCount,
    anyCount,
    functionAdvisoryFindings,
  };
}

/**
 * @param {ReturnType<typeof analyzeSourceFile> & { path: string; lines: number; bytes: number }} file
 * @returns {import('./code-health-core.mjs').CodeHealthFinding[]}
 */
function fileThresholdFindings(file) {
  /** @type {import('./code-health-core.mjs').CodeHealthFinding[]} */
  const findings = [];

  if (file.lines >= THRESHOLDS.fileLinesAdvisory) {
    findings.push({
      id: `file-lines-advisory:${file.path}`,
      kind: 'file-lines-advisory',
      severity: 'info',
      path: file.path,
      metric: 'file-lines',
      value: file.lines,
      threshold: THRESHOLDS.fileLinesAdvisory,
      message: `File has ${file.lines} lines (>= ${THRESHOLDS.fileLinesAdvisory}).`,
    });
  }

  if (file.lines >= THRESHOLDS.fileLinesHigh) {
    findings.push({
      id: `file-lines-high:${file.path}`,
      kind: 'file-lines-high',
      severity: 'warning',
      path: file.path,
      value: file.lines,
      threshold: THRESHOLDS.fileLinesHigh,
      message: `File has ${file.lines} lines (>= ${THRESHOLDS.fileLinesHigh}).`,
    });
  } else if (file.lines >= THRESHOLDS.fileLinesReview) {
    findings.push({
      id: `file-lines-review:${file.path}`,
      kind: 'file-lines-review',
      severity: 'info',
      path: file.path,
      value: file.lines,
      threshold: THRESHOLDS.fileLinesReview,
      message: `File has ${file.lines} lines (>= ${THRESHOLDS.fileLinesReview}).`,
    });
  }

  if (file.maxFunctionLines >= THRESHOLDS.functionLinesReview) {
    findings.push({
      id: `function-lines-review:${file.path}`,
      kind: 'function-lines-review',
      severity: 'info',
      path: file.path,
      value: file.maxFunctionLines,
      threshold: THRESHOLDS.functionLinesReview,
      message: `Longest function span is ${file.maxFunctionLines} lines (>= ${THRESHOLDS.functionLinesReview}).`,
    });
  }

  if (file.maxControlFlowNesting >= THRESHOLDS.controlFlowNestingReview) {
    findings.push({
      id: `control-flow-nesting-review:${file.path}`,
      kind: 'control-flow-nesting-review',
      severity: 'info',
      path: file.path,
      value: file.maxControlFlowNesting,
      threshold: THRESHOLDS.controlFlowNestingReview,
      message: `Deepest control-flow nesting is ${file.maxControlFlowNesting} (>= ${THRESHOLDS.controlFlowNestingReview}).`,
    });
  }

  return findings;
}

/**
 * @param {{ path: string; directFiles: number }} directory
 */
function directoryThresholdFindings(directory) {
  if (directory.directFiles < THRESHOLDS.directFilesReview) {
    return [];
  }
  return [
    {
      id: `directory-direct-files-review:${directory.path}`,
      kind: 'directory-direct-files-review',
      severity: 'info',
      path: directory.path,
      value: directory.directFiles,
      threshold: THRESHOLDS.directFilesReview,
      message: `Directory has ${directory.directFiles} direct production source files (>= ${THRESHOLDS.directFilesReview}).`,
    },
  ];
}

/**
 * @param {import('./code-health-core.mjs').CodeHealthFileRecord[]} files
 */
function buildDirectoryMetrics(files) {
  /** @type {Map<string, { directFiles: number; bytes: number; lines: number; filesAtReview: number; filesAtHigh: number }>} */
  const byDir = new Map();

  for (const file of files) {
    const dir = file.path.includes('/')
      ? file.path.slice(0, file.path.lastIndexOf('/'))
      : '';
    const bucket = byDir.get(dir) ?? {
      directFiles: 0,
      bytes: 0,
      lines: 0,
      filesAtReview: 0,
      filesAtHigh: 0,
    };
    bucket.directFiles += 1;
    bucket.bytes += file.bytes;
    bucket.lines += file.lines;
    if (file.lines >= THRESHOLDS.fileLinesReview) {
      bucket.filesAtReview += 1;
    }
    if (file.lines >= THRESHOLDS.fileLinesHigh) {
      bucket.filesAtHigh += 1;
    }
    byDir.set(dir, bucket);
  }

  const allDirs = new Set(byDir.keys());
  for (const dir of [...allDirs]) {
    if (!dir) {
      continue;
    }
    let parent = dir;
    while (parent.includes('/')) {
      parent = parent.slice(0, parent.lastIndexOf('/'));
      allDirs.add(parent);
    }
  }

  /** @type {Map<string, Set<string>>} */
  const childDirsWithSource = new Map();

  for (const dir of allDirs) {
    childDirsWithSource.set(dir, new Set());
  }

  for (const file of files) {
    const fileDir = file.path.includes('/')
      ? file.path.slice(0, file.path.lastIndexOf('/'))
      : '';
    if (!fileDir || !fileDir.includes('/')) {
      continue;
    }
    const parent = fileDir.slice(0, fileDir.lastIndexOf('/'));
    const childName = fileDir.slice(parent.length + 1);
    const children = childDirsWithSource.get(parent) ?? new Set();
    children.add(childName);
    childDirsWithSource.set(parent, children);
  }

  /** @type {import('./code-health-core.mjs').CodeHealthDirectoryRecord[]} */
  const directories = [...allDirs]
    .sort((a, b) => a.localeCompare(b))
    .map((dirPath) => {
      const stats = byDir.get(dirPath) ?? {
        directFiles: 0,
        bytes: 0,
        lines: 0,
        filesAtReview: 0,
        filesAtHigh: 0,
      };
      const children = childDirsWithSource.get(dirPath) ?? new Set();
      return {
        path: dirPath,
        directFiles: stats.directFiles,
        bytes: stats.bytes,
        lines: stats.lines,
        filesAtReview: stats.filesAtReview,
        filesAtHigh: stats.filesAtHigh,
        childSourceDirectories: children.size,
      };
    });

  return directories;
}

function baselineRequested(options) {
  return options.baselineEntries != null || options.readBaseline != null;
}

/**
 * @param {string[]} baselineEntries
 * @param {(path: string) => string | null | undefined} readBaseline
 */
function indexBaselineLines(baselineEntries, readBaseline) {
  /** @type {Map<string, number>} */
  const baselineLines = new Map();

  for (const entry of baselineEntries) {
    const path = normalizePath(entry);
    if (!isProductionSource(path)) {
      continue;
    }
    const text = readSourceText(readBaseline, path);
    if (text == null) {
      continue;
    }
    baselineLines.set(path, countLines(text));
  }

  return baselineLines;
}

function directFilesByDirectory(paths) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const filePath of paths) {
    const dir = filePath.includes('/')
      ? filePath.slice(0, filePath.lastIndexOf('/'))
      : '';
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  return counts;
}

function significantGrowth(oldLines, newLines) {
  if (oldLines <= 0) {
    return false;
  }
  const added = newLines - oldLines;
  if (added < GROWTH_MIN_LINES) {
    return false;
  }
  return added / oldLines >= GROWTH_MIN_RATIO;
}

/**
 * @param {{
 *   files: import('./code-health-core.mjs').CodeHealthFileRecord[];
 *   directories: import('./code-health-core.mjs').CodeHealthDirectoryRecord[];
 * }} current
 * @param {{ baselineLines: Map<string, number>; baselinePaths: Set<string> }} baseline
 */
function computeStrictRegressions(current, baseline) {
  /** @type {import('./code-health-core.mjs').CodeHealthStrictRegression[]} */
  const regressions = [];

  for (const file of current.files) {
    const onBaseline = baseline.baselinePaths.has(file.path);
    const oldLines = baseline.baselineLines.get(file.path);

    if (!onBaseline) {
      if (file.lines >= NEW_FILE_SEVERE_LINES) {
        regressions.push({
          id: `strict-new-file-lines-high:${file.path}`,
          kind: 'strict-new-file-lines-high',
          path: file.path,
          currentLines: file.lines,
          message: `Newly introduced file has ${file.lines} lines (>= ${NEW_FILE_SEVERE_LINES}).`,
        });
      }
      continue;
    }

    if (oldLines === undefined) {
      continue;
    }

    if (
      oldLines < THRESHOLDS.fileLinesHigh &&
      file.lines >= THRESHOLDS.fileLinesHigh
    ) {
      regressions.push({
        id: `strict-file-lines-high-crossing:${file.path}`,
        kind: 'strict-file-lines-high-crossing',
        path: file.path,
        baselineLines: oldLines,
        currentLines: file.lines,
        message: `File crossed ${THRESHOLDS.fileLinesHigh} lines (${oldLines} -> ${file.lines}).`,
      });
    }

    if (
      significantGrowth(oldLines, file.lines) &&
      file.lines >= THRESHOLDS.fileLinesReview
    ) {
      regressions.push({
        id: `strict-significant-growth:${file.path}`,
        kind: 'strict-significant-growth',
        path: file.path,
        baselineLines: oldLines,
        currentLines: file.lines,
        addedLines: file.lines - oldLines,
        message: `Significant growth (${oldLines} -> ${file.lines}) with current size >= ${THRESHOLDS.fileLinesReview}.`,
      });
    }
  }

  const currentDirCounts = new Map(
    current.directories.map((d) => [d.path, d.directFiles]),
  );
  const baselineDirCounts = directFilesByDirectory([...baseline.baselinePaths]);

  for (const [dirPath, directFiles] of currentDirCounts) {
    const oldDirect = baselineDirCounts.get(dirPath) ?? 0;
    if (
      oldDirect < THRESHOLDS.directFilesReview &&
      directFiles >= THRESHOLDS.directFilesReview
    ) {
      regressions.push({
        id: `strict-directory-direct-files-crossing:${dirPath}`,
        kind: 'strict-directory-direct-files-crossing',
        path: dirPath,
        baselineDirectFiles: oldDirect,
        currentDirectFiles: directFiles,
        message: `Directory direct file count crossed ${THRESHOLDS.directFilesReview} (${oldDirect} -> ${directFiles}).`,
      });
    }
  }

  regressions.sort((a, b) => a.id.localeCompare(b.id));
  return regressions;
}

/**
 * @param {string[]} entries
 * @param {{
 *   readText: (path: string) => string | null | undefined;
 *   parse?: (text: string, path: string) => import('typescript').SourceFile;
 *   baselineEntries?: string[];
 *   readBaseline?: (path: string) => string | null | undefined;
 * }} options
 */
export function scanCodeHealth(entries, options) {
  if (!options?.readText) {
    throw new Error('scanCodeHealth requires options.readText');
  }

  const readText = options.readText;
  const parseFn = options.parse ?? defaultParse;

  const normalizedEntries = [
    ...new Set(entries.map((entry) => normalizePath(entry))),
  ].sort((a, b) => a.localeCompare(b));

  const productionPaths = normalizedEntries
    .filter(isProductionSource)
    .sort((a, b) => a.localeCompare(b));
  const testPaths = normalizedEntries
    .filter(isTrackedTestSource)
    .sort((a, b) => a.localeCompare(b));

  /** @type {import('./code-health-core.mjs').CodeHealthFileRecord[]} */
  const files = [];
  /** @type {import('./code-health-core.mjs').CodeHealthTestRecord[]} */
  const tests = [];
  /** @type {import('./code-health-core.mjs').CodeHealthFinding[]} */
  const findings = [];

  const wantsBaseline = baselineRequested(options);
  /** @type {Set<string>} */
  let baselineTestPaths = new Set();
  /** @type {Set<string>} */
  let baselineBoundaryImportKeys = new Set();

  if (wantsBaseline && typeof options.readBaseline === 'function') {
    const baselineEntries = (options.baselineEntries ?? entries).map(
      normalizePath,
    );
    // Production paths are not indexed here: new-debt gates only need baseline
    // test paths (packet-style names) and baseline boundary import keys.
    baselineTestPaths = new Set(
      baselineEntries.filter((p) => isTrackedTestSource(p)),
    );
    baselineBoundaryImportKeys = indexBaselineBoundaryImports(
      baselineEntries,
      options.readBaseline,
      parseFn,
    );
  }

  for (const path of testPaths) {
    const text = readSourceText(readText, path);
    if (text == null) {
      continue;
    }
    tests.push({
      path,
      lines: countLines(text),
      bytes: Buffer.byteLength(text, 'utf8'),
    });
    if (hasPacketStyleTestBasename(path)) {
      const isLegacyUnchanged = baselineTestPaths.has(path);
      if (!isLegacyUnchanged) {
        findings.push(testNamingDebtFinding(path));
      }
    }
  }

  for (const path of productionPaths) {
    const text = readSourceText(readText, path);
    if (text == null) {
      continue;
    }

    const lines = countLines(text);
    const bytes = Buffer.byteLength(text, 'utf8');

    let metrics = {
      functionCount: 0,
      maxFunctionLines: 0,
      maxControlFlowNesting: 0,
      assertionCount: 0,
      nonNullCount: 0,
      anyCount: 0,
      functionAdvisoryFindings: [],
    };

    try {
      const sourceFile = parseFn(text, path);
      metrics = analyzeSourceFile(sourceFile, path);
      findings.push(...diagnosticsToFindings(path, sourceFile));
      findings.push(...metrics.functionAdvisoryFindings);
      for (const boundaryFinding of productionTestBoundaryFindings(
        sourceFile,
        path,
      )) {
        const key = `${boundaryFinding.path}|${boundaryFinding.resolvedTarget}|${boundaryFinding.specifier}|${boundaryFinding.kind}`;
        if (!baselineBoundaryImportKeys.has(key)) {
          findings.push(boundaryFinding);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Source parse failed.';
      findings.push({
        id: `parse-failure:${path}`,
        kind: 'parse-failure',
        severity: 'warning',
        path,
        message,
      });
    }

    const fileRecord = {
      path,
      lines,
      bytes,
      functionCount: metrics.functionCount,
      maxFunctionLines: metrics.maxFunctionLines,
      maxControlFlowNesting: metrics.maxControlFlowNesting,
      assertionCount: metrics.assertionCount,
      nonNullCount: metrics.nonNullCount,
      anyCount: metrics.anyCount,
    };
    files.push(fileRecord);
    findings.push(...fileThresholdFindings(fileRecord));
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  tests.sort((a, b) => a.path.localeCompare(b.path));

  const directories = buildDirectoryMetrics(files);
  for (const directory of directories) {
    findings.push(...directoryThresholdFindings(directory));
  }

  findings.sort((a, b) => a.id.localeCompare(b.id));

  let baselineAvailable = false;
  /** @type {import('./code-health-core.mjs').CodeHealthStrictRegression[]} */
  let strictRegressions = [];

  if (wantsBaseline) {
    const baselineEntries = (options.baselineEntries ?? entries).map(
      normalizePath,
    );
    if (typeof options.readBaseline === 'function') {
      const baselineLines = indexBaselineLines(
        baselineEntries,
        options.readBaseline,
      );
      const baselinePaths = new Set(
        baselineEntries.filter((p) => isProductionSource(p)),
      );
      baselineAvailable = true;
      strictRegressions = computeStrictRegressions(
        { files, directories },
        { baselineLines, baselinePaths },
      );
    }
  }

  const summary = {
    productionFiles: files.length,
    testFiles: tests.length,
    productionDirectories: directories.length,
    findings: findings.length,
    strictRegressions: strictRegressions.length,
    filesAtReview: files.filter((f) => f.lines >= THRESHOLDS.fileLinesReview)
      .length,
    filesAtHigh: files.filter((f) => f.lines >= THRESHOLDS.fileLinesHigh)
      .length,
    directoriesAtReview: directories.filter(
      (d) => d.directFiles >= THRESHOLDS.directFilesReview,
    ).length,
  };

  return {
    thresholdsVersion: THRESHOLDS.thresholdsVersion,
    baselineAvailable,
    files,
    tests,
    directories,
    findings,
    strictRegressions,
    summary,
  };
}
