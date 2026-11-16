#!/usr/bin/env node
/**
 * DOC01 P1 helper: programmatic docs inventory (files, headings, inbound/outbound md links).
 * Read-only against the git worktree. Does not mutate docs/.
 *
 * Usage: node work/designs/open/doc01-migration/build-inventory.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// this file lives at work/designs/open/doc01-migration/ → four levels up is repo root
const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const outDir = join(repoRoot, "work/designs/open/doc01-migration");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function classifyPath(path) {
  if (path.startsWith("docs/product/")) return "product";
  if (path.startsWith("docs/technical/")) return "technical";
  if (path.startsWith("docs/programs/")) return "program";
  if (path.startsWith("docs/engineering/")) return "engineering";
  if (path.startsWith("docs/changes/")) return "change";
  if (path.startsWith("docs/history/")) return "history";
  if (path.startsWith("docs/operations/")) return "procedure";
  if (path === "docs/progress.md" || path === "docs/questions.md" || path === "docs/README.md") {
    return "docs-root";
  }
  return "other-docs";
}

function extractHeadings(markdown) {
  const headings = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\s+#+\s*$/, "").trim();
    headings.push({
      level,
      text,
      anchor: slugify(text),
      line: i + 1,
    });
  }
  return headings;
}

function extractMdLinks(markdown, sourcePath) {
  const links = [];
  const re = /(!?\[[^\]]*\]\()([^)\s]+)(\))/g;
  let m;
  while ((m = re.exec(markdown))) {
    const raw = m[2];
    if (/^(https?:|mailto:|data:)/i.test(raw)) continue;
    const [pathPart, hash = ""] = raw.split("#");
    links.push({
      raw,
      path: pathPart || "",
      hash: hash || "",
      image: m[0].startsWith("!["),
    });
  }
  // bare path mentions for common docs roots (coarse inbound signal)
  return links;
}

function resolveRelative(fromFile, target) {
  if (!target) return fromFile;
  if (target.startsWith("/")) return target.slice(1);
  const base = dirname(fromFile);
  const resolved = resolve(repoRoot, base, target).replace(/\\/g, "/");
  const rel = relative(repoRoot, resolved).replace(/\\/g, "/");
  return rel;
}

const head = git(["rev-parse", "HEAD"]);
const docsFiles = git(["ls-files", "docs"]).split(/\r?\n/).filter(Boolean);

const files = [];
const atoms = [];
const linkEdges = [];
const inbound = new Map();

for (const path of docsFiles) {
  const abs = join(repoRoot, path);
  let body = "";
  let blobSha = "";
  try {
    blobSha = git(["hash-object", path]);
    body = readFileSync(abs);
  } catch {
    continue;
  }
  const isBinary = /\.(png|jpg|jpeg|gif|webp|pdf)$/i.test(path);
  const bytes = body.length;
  const contentSha = createHash("sha256").update(body).digest("hex");
  const kindGuess = classifyPath(path);
  const fileRow = {
    source_path: path,
    source_blob_sha: blobSha,
    content_sha256: contentSha,
    bytes,
    kind_guess: kindGuess,
    binary: isBinary,
    heading_count: 0,
    provisional_from_disposition: null,
  };
  files.push(fileRow);

  if (isBinary || !/\.md$/i.test(path)) {
    atoms.push({
      source_path: path,
      source_blob_sha: blobSha,
      heading_anchor: "",
      question_answered: "",
      kind: isBinary ? "evidence" : "transient",
      approval: "unknown",
      implementation_claim: "none",
      claim_or_invariant: isBinary ? "non-markdown asset; retention review required" : "non-md tracked docs file",
      candidate_owner: "",
      disposition: "TRIAGE",
      target_path: "",
      target_heading: "",
      competing_sources: "",
      incoming_links: 0,
      unique_fact_preserved: false,
      evidence_ref: "",
      reviewer: "inventory-script",
      resolved: false,
    });
    continue;
  }

  const text = body.toString("utf8");
  const headings = extractHeadings(text);
  fileRow.heading_count = headings.length;

  if (headings.length === 0) {
    atoms.push({
      source_path: path,
      source_blob_sha: blobSha,
      heading_anchor: "(file)",
      question_answered: "",
      kind: kindGuess === "product" ? "product" : kindGuess === "technical" ? "technical" : "transient",
      approval: "unknown",
      implementation_claim: "none",
      claim_or_invariant: "markdown file with no ATX headings; review whole body",
      candidate_owner: "",
      disposition: "REVIEW",
      target_path: "",
      target_heading: "",
      competing_sources: "",
      incoming_links: 0,
      unique_fact_preserved: false,
      evidence_ref: "",
      reviewer: "inventory-script",
      resolved: false,
    });
  } else {
    for (const h of headings) {
      atoms.push({
        source_path: path,
        source_blob_sha: blobSha,
        heading_anchor: h.anchor,
        heading_level: h.level,
        heading_line: h.line,
        heading_text: h.text,
        question_answered: "",
        kind: "",
        approval: "unknown",
        implementation_claim: "none",
        claim_or_invariant: "",
        candidate_owner: "",
        disposition: "PENDING",
        target_path: "",
        target_heading: "",
        competing_sources: "",
        incoming_links: 0,
        unique_fact_preserved: false,
        evidence_ref: "",
        reviewer: "inventory-script",
        resolved: false,
      });
    }
  }

  const links = extractMdLinks(text, path);
  for (const link of links) {
    const resolved = resolveRelative(path, link.path);
    const edge = {
      from: path,
      to_raw: link.raw,
      to_resolved: resolved,
      hash: link.hash,
      image: link.image,
    };
    linkEdges.push(edge);
    if (!inbound.has(resolved)) inbound.set(resolved, []);
    inbound.get(resolved).push(path);
  }
}

// Attach inbound counts onto atoms by source file
const inboundCountByFile = new Map();
for (const [target, sources] of inbound) {
  const uniq = [...new Set(sources)];
  inboundCountByFile.set(target, uniq.length);
}
for (const atom of atoms) {
  atom.incoming_links = inboundCountByFile.get(atom.source_path) || 0;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "files.jsonl"), files.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(outDir, "atoms.jsonl"), atoms.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(outDir, "links.jsonl"), linkEdges.map((r) => JSON.stringify(r)).join("\n") + "\n");

const summary = {
  head,
  generated_at: new Date().toISOString(),
  docs_file_count: files.length,
  atom_row_count: atoms.length,
  link_edge_count: linkEdges.length,
  by_kind_guess: Object.fromEntries(
    [...files.reduce((m, f) => m.set(f.kind_guess, (m.get(f.kind_guess) || 0) + 1), new Map())].sort(),
  ),
  heading_atoms: atoms.filter((a) => a.heading_anchor && a.heading_anchor !== "(file)").length,
  binary_or_non_md: files.filter((f) => f.binary || !/\.md$/i.test(f.source_path)).length,
};
writeFileSync(join(outDir, "inventory-summary.json"), JSON.stringify(summary, null, 2) + "\n");

console.log(JSON.stringify(summary, null, 2));
