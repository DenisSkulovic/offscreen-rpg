#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const from =
  "work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture";
const to =
  "work/changes/archive/2026-11/other/2026-11-16--doc01-documentation-architecture";

let listed = [];
try {
  listed = execFileSync("rg", ["-l", from], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
} catch (e) {
  if (e.status !== 1) throw e;
}

let changed = 0;
let reps = 0;
for (const rel of listed) {
  const abs = path.join(repoRoot, rel);
  const before = readFileSync(abs, "utf8");
  if (!before.includes(from)) continue;
  const parts = before.split(from);
  reps += parts.length - 1;
  writeFileSync(abs, parts.join(to));
  changed += 1;
}

console.log(JSON.stringify({ filesChanged: changed, replaceCount: reps }, null, 2));
