#!/usr/bin/env node
/** Build compact monthly ledger rows from work/changes/archive CHANGE.md packets. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

const files = git(["ls-files", "work/changes/archive"]).split(/\r?\n/).filter((p) =>
  p.endsWith("/CHANGE.md"),
);

const rows = [];
for (const file of files) {
  const text = readFileSync(join(repoRoot, file), "utf8");
  const title = (text.match(/^#\s+(.+)$/m) || [, ""])[1].trim();
  const state =
    (text.match(/\*\*State:\*\*\s*([^\n]+)/i) ||
      text.match(/^State:\s*([^\n]+)/im) ||
      [, "unknown"])[1]
      .replace(/\*+/g, "")
      .trim()
      .slice(0, 80);
  const parts = file.split("/");
  // work/changes/archive/YYYY-MM/program/leaf/CHANGE.md
  const month = parts[3] || "";
  const program = parts[4] || "";
  const leaf = parts[5] || "";
  rows.push({ month, program, leaf, title, state, path: file });
}

rows.sort((a, b) => a.path.localeCompare(b.path));

const byMonth = new Map();
for (const r of rows) {
  if (!byMonth.has(r.month)) byMonth.set(r.month, []);
  byMonth.get(r.month).push(r);
}

for (const [month, list] of [...byMonth.entries()].sort()) {
  const lines = [
    `# Change ledger | ${month}`,
    "",
    `**Generated:** DOC01 P6 compact index of ${list.length} archived packets. Full text remains in Git at the listed paths until P6 deletion after no-loss proof.`,
    "",
    "| Leaf | Program | State (truncated) | Title |",
    "| --- | --- | --- | --- |",
  ];
  for (const r of list) {
    const title = r.title.replace(/\|/g, "/").slice(0, 100);
    const state = r.state.replace(/\|/g, "/");
    lines.push(
      `| \`${r.leaf}\` | ${r.program} | ${state} | ${title} |`,
    );
  }
  lines.push("");
  lines.push(`Git recover: \`git show HEAD:${list[0].path}\` (example path).`);
  lines.push("");
  writeFileSync(
    join(repoRoot, "work/changes/ledger", `${month}.md`),
    lines.join("\n"),
    "utf8",
  );
}

writeFileSync(
  join(repoRoot, "work/designs/open/doc01-migration/archive-ledger-summary.json"),
  JSON.stringify({ packetCount: rows.length, months: [...byMonth.keys()] }, null, 2) +
    "\n",
);
console.log(JSON.stringify({ packetCount: rows.length, months: [...byMonth.keys()] }, null, 2));
