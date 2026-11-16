#!/usr/bin/env node
/** Join FILE-DISPOSITION.md provisional actions onto files.jsonl */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(dir, "../../../..");
const dispositionPath = join(
  repoRoot,
  "docs/changes/open/2026-11-16--doc01-documentation-architecture/FILE-DISPOSITION.md",
);
const md = readFileSync(dispositionPath, "utf8");
const map = new Map();
for (const line of md.split(/\r?\n/)) {
  // | `path` | bytes | ACTION | target |
  const m = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*(.+?)\s*\|$/.exec(line);
  if (!m) continue;
  const path = m[1];
  if (!path.startsWith("docs/")) continue;
  map.set(path, {
    provisional_action: m[3].trim(),
    target_bucket: m[4].trim(),
    baseline_bytes: Number(m[2]),
  });
}

const files = readFileSync(join(dir, "files.jsonl"), "utf8")
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));

let matched = 0;
let unmatched = 0;
const missingFromDisposition = [];
for (const f of files) {
  const d = map.get(f.source_path);
  if (d) {
    f.provisional_from_disposition = d;
    matched++;
  } else {
    f.provisional_from_disposition = null;
    unmatched++;
    missingFromDisposition.push(f.source_path);
  }
}

const dispositionOnly = [...map.keys()].filter((p) => !files.some((f) => f.source_path === p));

writeFileSync(join(dir, "files.jsonl"), files.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(
  join(dir, "disposition-join.json"),
  JSON.stringify(
    {
      disposition_rows: map.size,
      files_matched: matched,
      files_unmatched: unmatched,
      missing_from_disposition: missingFromDisposition,
      disposition_paths_absent_from_tree: dispositionOnly,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      disposition_rows: map.size,
      files_matched: matched,
      files_unmatched: unmatched,
      missing_count: missingFromDisposition.length,
      disposition_absent_count: dispositionOnly.length,
      missing_sample: missingFromDisposition.slice(0, 20),
    },
    null,
    2,
  ),
);
