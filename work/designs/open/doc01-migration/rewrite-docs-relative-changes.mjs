#!/usr/bin/env node
/**
 * After G3 packet move: rewrite relative markdown links under docs/
 * that still resolve to docs/changes/* → work/changes/*.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const docsRoot = path.join(repoRoot, "docs");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      // do not recurse into empty/stub docs/changes beyond README handling
      if (path.relative(docsRoot, full).split(path.sep).join("/") === "changes") {
        continue;
      }
      walk(full, out);
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let filesChanged = 0;
let replaceCount = 0;
for (const abs of walk(docsRoot)) {
  const relFromDocs = path.relative(docsRoot, abs).split(path.sep).join("/");
  if (relFromDocs === "changes/README.md") continue;

  const dirRel = path
    .relative(repoRoot, path.dirname(abs))
    .split(path.sep)
    .filter(Boolean);
  const prefix = "../".repeat(dirRel.length) + "work/changes/";

  const before = readFileSync(abs, "utf8");
  const after = before.replace(
    /(!?\[[^\]]*]\()([^)\s]+)(\))/g,
    (full, left, target, right) => {
      if (/^(https?:|mailto:|data:|#|\/)/i.test(target)) return full;
      const hashIdx = target.indexOf("#");
      const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
      const hash = hashIdx >= 0 ? target.slice(hashIdx) : "";
      const norm = pathPart.replace(/\\/g, "/");
      if (norm.includes("work/changes/")) return full;
      if (norm.startsWith("docs/changes/")) {
        replaceCount += 1;
        return left + "work/changes/" + norm.slice("docs/changes/".length) + hash + right;
      }
      const resolved = path.resolve(path.dirname(abs), pathPart);
      const resolvedRel = path
        .relative(repoRoot, resolved)
        .split(path.sep)
        .join("/");
      if (resolvedRel.startsWith("docs/changes/")) {
        const rest = resolvedRel.slice("docs/changes/".length);
        replaceCount += 1;
        return left + prefix + rest + hash + right;
      }
      return full;
    },
  );
  if (after !== before) {
    writeFileSync(abs, after, "utf8");
    filesChanged += 1;
  }
}

console.log(JSON.stringify({ filesChanged, replaceCount }, null, 2));
