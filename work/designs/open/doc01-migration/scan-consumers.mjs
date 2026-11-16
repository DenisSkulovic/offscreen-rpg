#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(dir, "../../../..");
const pattern =
  "docs/(programs|engineering|history|changes|operations|product|technical)/|docs/(progress|questions)\\.md";

const out = execFileSync(
  "git",
  [
    "grep",
    "-nE",
    pattern,
    "--",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "TODO.md",
    ".agents",
    ".cursor",
    "scripts",
    "apps",
    "packages",
    "tools",
    "package.json",
  ],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

const lines = out.split(/\r?\n/).filter(Boolean);
const byFile = new Map();
for (const line of lines) {
  const idx = line.indexOf(":");
  const file = line.slice(0, idx);
  byFile.set(file, (byFile.get(file) || 0) + 1);
}

const summary = {
  hit_lines: lines.length,
  files: [...byFile.entries()].sort((a, b) => b[1] - a[1]).map(([file, count]) => ({ file, count })),
};
writeFileSync(join(dir, "non-docs-consumers.json"), JSON.stringify(summary, null, 2) + "\n");
writeFileSync(join(dir, "non-docs-consumers.grep.txt"), out);
console.log(JSON.stringify({ hit_lines: summary.hit_lines, files: summary.files.length }, null, 2));
