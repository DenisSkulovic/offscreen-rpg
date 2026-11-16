#!/usr/bin/env node
/** Rewrite remaining high-traffic legacy path literals to RETAIN copies / canonical owners. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

const replacements = [
  [
    "docs/engineering/frontend-execution-playbook.md",
    "research/legacy-engineering/frontend-execution-playbook.md",
  ],
  [
    "docs/engineering/connected-poc-proof.md",
    "research/legacy-engineering/connected-poc-proof.md",
  ],
  [
    "docs/engineering/audits/chamber-gap-2026-11-12.md",
    "research/legacy-audits/chamber-gap-2026-11-12.md",
  ],
  [
    "docs/engineering/audits/react-next-gap-2026-11-12.md",
    "research/legacy-audits/react-next-gap-2026-11-12.md",
  ],
  [
    "docs/engineering/README.md",
    "research/engineering-manuals.md",
  ],
  [
    "docs/history/initiatives/AUDIT-2026-11-11.md",
    "work/designs/open/legacy-initiatives-index/AUDIT-2026-11-11.md",
  ],
  [
    "docs/history/minutes/2026-11-11.md",
    "work/sessions/README.md",
  ],
];

const scopes = [
  ".agents",
  "AGENTS.md",
  "README.md",
  "TODO.md",
  "STATUS.md",
  "ROADMAP.md",
  "NOTICE.md",
  "apps",
  "packages",
  "tools",
  "scripts",
  "docs",
  "work",
  "evidence",
  "research",
];

let listed;
try {
  listed = execFileSync(
    "git",
    ["grep", "-l", "-E", "docs/(engineering|history|programs|operations)/", "--", ...scopes],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
} catch {
  listed = [];
}

let filesChanged = 0;
let replaceCount = 0;
for (const rel of listed) {
  if (!/\.(md|mdc|mjs|ts|tsx|js)$/i.test(rel) && !["AGENTS.md", "README.md", "TODO.md", "STATUS.md", "ROADMAP.md", "NOTICE.md"].includes(rel)) {
    continue;
  }
  // Do not rewrite inside trees we are about to delete (sources).
  if (
    rel.startsWith("docs/engineering/") ||
    rel.startsWith("docs/history/") ||
    rel.startsWith("docs/programs/") ||
    rel.startsWith("docs/operations/")
  ) {
    continue;
  }
  const abs = join(repoRoot, rel);
  let text = readFileSync(abs, "utf8");
  let next = text;
  for (const [from, to] of replacements) {
    if (next.includes(from)) {
      const parts = next.split(from);
      replaceCount += parts.length - 1;
      next = parts.join(to);
    }
  }
  if (next !== text) {
    writeFileSync(abs, next);
    filesChanged += 1;
  }
}

console.log(JSON.stringify({ filesScanned: listed.length, filesChanged, replaceCount }, null, 2));
