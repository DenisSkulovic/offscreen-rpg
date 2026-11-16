#!/usr/bin/env node
/**
 * DOC01 G3: move docs/changes/{open,archive} → work/changes/{open,archive}
 * with relative-link rewrite inside packets, then inbound docs/changes/ → work/changes/.
 *
 *   node work/designs/open/doc01-migration/move-changes-to-work.mjs --dry-run
 *   node work/designs/open/doc01-migration/move-changes-to-work.mjs --apply
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rewriteMarkdownLinksInText } from "../../../../scripts/repo-tools/archive-changes.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const fromRoot = path.join(repoRoot, "docs", "changes");
const toRoot = path.join(repoRoot, "work", "changes");

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function gitMv(fromAbs, toAbs) {
  mkdirSync(path.dirname(toAbs), { recursive: true });
  const relFrom = path.relative(repoRoot, fromAbs).split(path.sep).join("/");
  const relTo = path.relative(repoRoot, toAbs).split(path.sep).join("/");
  const result = spawnSync("git", ["mv", relFrom, relTo], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git mv failed: ${relFrom} → ${relTo}\n${result.stderr || result.stdout}`,
    );
  }
}

function listTopMoves() {
  /** @type {{ kind: 'open-leaf'|'archive-tree'|'readme-keep', fromRel: string, toRel: string }[]} */
  const moves = [];
  const openDir = path.join(fromRoot, "open");
  if (existsSync(openDir)) {
    for (const entry of readdirSync(openDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const leaf = entry.name;
      moves.push({
        kind: "open-leaf",
        fromRel: `docs/changes/open/${leaf}`,
        toRel: `work/changes/open/${leaf}`,
      });
    }
  }
  const archiveDir = path.join(fromRoot, "archive");
  if (existsSync(archiveDir)) {
    moves.push({
      kind: "archive-tree",
      fromRel: "docs/changes/archive",
      toRel: "work/changes/archive",
    });
  }
  return moves;
}

function rewritePacketTree(fromRel, toRel) {
  const fromAbs = path.join(repoRoot, ...fromRel.split("/"));
  const toAbs = path.join(repoRoot, ...toRel.split("/"));
  const files = walkFiles(toAbs).filter((f) =>
    /\.(md|mdc|txt)$/i.test(f),
  );
  let rewritten = 0;
  for (const newFileAbs of files) {
    const relInside = path.relative(toAbs, newFileAbs);
    const oldFileAbs = path.join(fromAbs, relInside);
    const before = readFileSync(newFileAbs, "utf8");
    const after = rewriteMarkdownLinksInText(before, oldFileAbs, newFileAbs);
    if (after !== before) {
      writeFileSync(newFileAbs, after, "utf8");
      rewritten += 1;
    }
  }
  return { files: files.length, rewritten };
}

function rewriteInboundDocsChangesPrefix() {
  const scanRoots = [
    path.join(repoRoot, "docs"),
    path.join(repoRoot, "work"),
    path.join(repoRoot, ".agents"),
    path.join(repoRoot, ".cursor"),
    path.join(repoRoot, "apps"),
    path.join(repoRoot, "packages"),
    path.join(repoRoot, "tools"),
    path.join(repoRoot, "scripts"),
    path.join(repoRoot, "evidence"),
    path.join(repoRoot, "research"),
    path.join(repoRoot, "AGENTS.md"),
    path.join(repoRoot, "STATUS.md"),
    path.join(repoRoot, "TODO.md"),
    path.join(repoRoot, "ROADMAP.md"),
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "NOTICE.md"),
    path.join(repoRoot, "CLAUDE.md"),
  ];
  /** @type {string[]} */
  const targets = [];
  for (const scan of scanRoots) {
    if (!existsSync(scan)) continue;
    if (statSync(scan).isFile()) targets.push(scan);
    else targets.push(...walkFiles(scan));
  }
  // Keep stub router + do not rewrite the move script itself mid-flight beyond apply.
  const skip = new Set([
    path.join(repoRoot, "docs", "changes", "README.md"),
    path.join(
      repoRoot,
      "work",
      "designs",
      "open",
      "doc01-migration",
      "move-changes-to-work.mjs",
    ),
  ]);
  let filesChanged = 0;
  let replaceCount = 0;
  for (const fileAbs of targets) {
    if (skip.has(fileAbs)) continue;
    if (!/\.(md|mdc|mjs|ts|tsx|js|json)$/i.test(fileAbs)) continue;
    // Leave soft-retired docs/changes stub alone; skip empty leftover dirs.
    if (fileAbs.replace(/\\/g, "/").includes("/docs/changes/") && !fileAbs.replace(/\\/g, "/").endsWith("/docs/changes/README.md")) {
      // After move, only README should remain under docs/changes.
      continue;
    }
    let content = readFileSync(fileAbs, "utf8");
    if (!content.includes("docs/changes/")) continue;
    const parts = content.split("docs/changes/");
    replaceCount += parts.length - 1;
    const next = parts.join("work/changes/");
    if (next !== content) {
      writeFileSync(fileAbs, next, "utf8");
      filesChanged += 1;
    }
  }
  return { filesChanged, replaceCount };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = !apply;
  if (!args.includes("--dry-run") && !apply) {
    console.error(
      "Usage: node work/designs/open/doc01-migration/move-changes-to-work.mjs --dry-run | --apply",
    );
    process.exitCode = 1;
    return;
  }

  const moves = listTopMoves();
  const summary = {
    mode: apply ? "apply" : "dry-run",
    moves: moves.length,
    openLeaves: moves.filter((m) => m.kind === "open-leaf").length,
    archiveTrees: moves.filter((m) => m.kind === "archive-tree").length,
    packetFilesRewritten: 0,
    inboundFilesChanged: 0,
    inboundReplaces: 0,
  };

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          sample: moves.slice(0, 12),
        },
        null,
        2,
      ),
    );
    console.error(
      `Dry-run: ${summary.moves} moves (${summary.openLeaves} open leaves, ${summary.archiveTrees} archive tree). Re-run with --apply.`,
    );
    return;
  }

  if (existsSync(path.join(toRoot, "archive"))) {
    throw new Error("work/changes/archive already exists; refuse to overwrite");
  }
  mkdirSync(path.join(toRoot, "open"), { recursive: true });

  for (const move of moves) {
    const fromAbs = path.join(repoRoot, ...move.fromRel.split("/"));
    const toAbs = path.join(repoRoot, ...move.toRel.split("/"));
    if (!existsSync(fromAbs)) {
      throw new Error(`Missing source: ${move.fromRel}`);
    }
    if (existsSync(toAbs)) {
      throw new Error(`Target exists: ${move.toRel}`);
    }
    gitMv(fromAbs, toAbs);
    const { rewritten } = rewritePacketTree(move.fromRel, move.toRel);
    summary.packetFilesRewritten += rewritten;
  }

  const inbound = rewriteInboundDocsChangesPrefix();
  summary.inboundFilesChanged = inbound.filesChanged;
  summary.inboundReplaces = inbound.replaceCount;

  console.log(JSON.stringify(summary, null, 2));
}

if (
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("move-changes-to-work.mjs")
) {
  main();
}
