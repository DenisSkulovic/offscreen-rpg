#!/usr/bin/env node
/**
 * Rewrite markdown links under docs/, .agents/, apps/, packages/, etc. that
 * resolve into docs/programs|engineering|history|operations → retain/canonical homes.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const skipPrefix = [
  "docs/programs/",
  "docs/engineering/",
  "docs/history/",
  "docs/operations/",
  "evidence/inspections/admin-program-essays-2026-11/",
  "evidence/inspections/obs-technical-essays-2026-11/",
  "research/legacy-engineering/",
  "research/legacy-audits/",
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, out);
    } else if (entry.isFile()) out.push(full);
  }
  return out;
}

function mapLegacy(resolvedRel) {
  const r = resolvedRel.replace(/\\/g, "/");
  // Prefer curated retain homes where they exist; else full snapshot.
  if (r.startsWith("docs/programs/observability/evidence/")) {
    return (
      "evidence/runs/observability-program-2026-11-15/" +
      r.slice("docs/programs/observability/evidence/".length)
    );
  }
  if (r === "docs/engineering/frontend-execution-playbook.md") {
    return "research/legacy-engineering/frontend-execution-playbook.md";
  }
  if (r === "docs/engineering/connected-poc-proof.md") {
    return "research/legacy-engineering/connected-poc-proof.md";
  }
  if (r.startsWith("docs/history/legal/")) return "NOTICE.md";
  if (r === "docs/operations/development.md") {
    return "docs/runbooks/local-development.md";
  }
  if (r === "docs/programs/admin/README.md") return "docs/product/admin/README.md";
  if (r === "docs/programs/storyteller/README.md") {
    return "docs/product/storyteller/behavior-and-quality.md";
  }
  if (r === "docs/programs/engine/README.md") {
    return "docs/technical/engine/authority-and-transitions.md";
  }
  if (r === "docs/programs/experience/README.md") {
    return "docs/product/experience/principles.md";
  }
  if (r === "docs/programs/observability/README.md") {
    return "docs/technical/observability/identities-and-evidence.md";
  }
  if (r === "docs/engineering/README.md") return "research/engineering-manuals.md";
  if (r === "docs/history/minutes/README.md" || r.startsWith("docs/history/minutes/")) {
    return "work/sessions/README.md";
  }
  // Full no-loss snapshot for everything else under the four trees.
  for (const tree of ["programs", "engineering", "history", "operations"]) {
    const prefix = `docs/${tree}/`;
    if (r === `docs/${tree}` || r === `docs/${tree}/`) {
      return `evidence/inspections/doc01-legacy-snapshot/${tree}/README.md`;
    }
    if (r.startsWith(prefix)) {
      return `evidence/inspections/doc01-legacy-snapshot/${tree}/` + r.slice(prefix.length);
    }
  }
  return null;
}

const scanRoots = [
  "docs",
  ".agents",
  "apps",
  "packages",
  "tools",
  "scripts",
  "work",
  "evidence",
  "research",
  "AGENTS.md",
  "STATUS.md",
  "TODO.md",
  "README.md",
  "ROADMAP.md",
  "NOTICE.md",
  "CLAUDE.md",
].map((p) => path.join(repoRoot, p));

/** @type {string[]} */
const files = [];
for (const scan of scanRoots) {
  if (!existsSync(scan)) continue;
  if (statSync(scan).isFile()) files.push(scan);
  else files.push(...walk(scan));
}

let filesChanged = 0;
let replaceCount = 0;
let unmapped = new Set();

for (const abs of files) {
  const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
  if (!/\.(md|mdc|mjs|ts|tsx|js)$/i.test(rel) && !["AGENTS.md", "README.md", "TODO.md", "STATUS.md", "ROADMAP.md", "NOTICE.md", "CLAUDE.md"].includes(rel)) {
    continue;
  }
  if (skipPrefix.some((p) => rel.startsWith(p))) continue;

  const before = readFileSync(abs, "utf8");
  const dirRel = path
    .relative(repoRoot, path.dirname(abs))
    .split(path.sep)
    .filter(Boolean);
  const after = before.replace(
    /(!?\[[^\]]*]\()([^)\s]+)(\))/g,
    (full, left, target, right) => {
      if (/^(https?:|mailto:|data:|#|\/)/i.test(target)) return full;
      const hashIdx = target.indexOf("#");
      const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
      const hash = hashIdx >= 0 ? target.slice(hashIdx) : "";
      const norm = pathPart.replace(/\\/g, "/");
      let resolvedRel;
      if (norm.startsWith("docs/programs/") || norm.startsWith("docs/engineering/") || norm.startsWith("docs/history/") || norm.startsWith("docs/operations/")) {
        resolvedRel = norm;
      } else {
        const resolved = path.resolve(path.dirname(abs), pathPart);
        resolvedRel = path.relative(repoRoot, resolved).split(path.sep).join("/");
      }
      if (
        !(
          resolvedRel.startsWith("docs/programs/") ||
          resolvedRel.startsWith("docs/engineering/") ||
          resolvedRel.startsWith("docs/history/") ||
          resolvedRel.startsWith("docs/operations/")
        )
      ) {
        return full;
      }
      const mapped = mapLegacy(resolvedRel);
      if (!mapped) {
        unmapped.add(resolvedRel);
        return full;
      }
      const prefix = "../".repeat(dirRel.length);
      replaceCount += 1;
      return left + prefix + mapped + hash + right;
    },
  );
  if (after !== before) {
    writeFileSync(abs, after, "utf8");
    filesChanged += 1;
  }
}

console.log(
  JSON.stringify(
    {
      filesChanged,
      replaceCount,
      unmappedCount: unmapped.size,
      unmappedSample: [...unmapped].slice(0, 40),
    },
    null,
    2,
  ),
);
