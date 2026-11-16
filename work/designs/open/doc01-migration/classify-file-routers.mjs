#!/usr/bin/env node
/**
 * File-router disposition pass for non-product/technical docs paths.
 * Marks whole-file atoms with a lifecycle disposition; does not claim section semantic certification.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const files = readFileSync(join(dir, "files.jsonl"), "utf8")
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const atoms = readFileSync(join(dir, "atoms.jsonl"), "utf8")
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));

function classify(path) {
  if (path.startsWith("docs/product/") || path.startsWith("docs/technical/")) {
    return null; // already seeded
  }
  if (path.includes("/2026-11-16--doc01-documentation-architecture/")) {
    return {
      disposition: "EXTRACT/RETIRE",
      kind: "transient",
      candidate_owner: "work/changes/ledger + Git after DOC01 Done",
      note: "DOC01 execution packet",
    };
  }
  if (path.startsWith("docs/changes/archive/")) {
    return {
      disposition: "SUMMARIZE/RETIRE",
      kind: "transient",
      candidate_owner: "work/changes/ledger/YYYY-MM.md + Git",
      note: "terminal Change archive",
    };
  }
  if (path.startsWith("docs/changes/open/") || path === "docs/changes/README.md") {
    return {
      disposition: "MOVE",
      kind: "transient",
      candidate_owner: "work/changes/",
      note: "active Change queue → work/changes after cutover",
    };
  }
  if (path.startsWith("docs/history/minutes/")) {
    return {
      disposition: "EXTRACT/EXPIRE",
      kind: "transient",
      candidate_owner: "work/sessions/ + promoted decisions",
      note: "session minutes",
    };
  }
  if (path.includes("canon-invention-policy")) {
    return {
      disposition: "PRESERVE/DRAFT",
      kind: "draft",
      candidate_owner: "work/designs/open/canon-invention-policy/",
      note: "owner-retained dormant design (C8)",
    };
  }
  if (path.startsWith("docs/history/legal/") || path.includes("rules-attribution")) {
    return {
      disposition: "MOVE",
      kind: "procedure",
      candidate_owner: "NOTICE.md / legal attribution owner",
      note: "legal attribution not chronological history",
    };
  }
  if (path.startsWith("docs/history/")) {
    return {
      disposition: "TRIAGE",
      kind: "draft",
      candidate_owner: "work/designs/ or evidence/",
      note: "legacy initiatives",
    };
  }
  if (path.startsWith("docs/operations/")) {
    return {
      disposition: "REWRITE",
      kind: "procedure",
      candidate_owner: "docs/runbooks/",
      note: "human runbooks",
    };
  }
  if (path === "docs/progress.md") {
    return {
      disposition: "REWRITE",
      kind: "transient",
      candidate_owner: "STATUS.md",
      note: "current demonstrated state",
    };
  }
  if (path === "docs/questions.md") {
    return {
      disposition: "TRIAGE",
      kind: "draft",
      candidate_owner: "work/designs/open/ + ROADMAP.md",
      note: "open questions mixed with history",
    };
  }
  if (path === "docs/README.md") {
    return {
      disposition: "REWRITE",
      kind: "procedure",
      candidate_owner: "docs/README.md",
      note: "subject/authority router",
    };
  }
  // assets
  if (/\.png$/i.test(path)) {
    return {
      disposition: "ASSET REVIEW",
      kind: "evidence",
      candidate_owner: "evidence/… or tests/snapshots",
      note: "binary visual asset",
    };
  }
  if (/\.json$/i.test(path) && path.includes("evaluations/")) {
    return {
      disposition: "MOVE",
      kind: "evidence",
      candidate_owner: "evidence/runs/2026-11-15--connected-forensic-trial/",
      note: "trial reproduction payload",
    };
  }
  // programs / engineering lifecycle
  if (/\/handoff\//.test(path) || /HANDOFF|CHECKPOINT|RUN-LOG/.test(path)) {
    return {
      disposition: "EXTRACT/RETIRE",
      kind: "transient",
      candidate_owner: "evidence/ or Git only",
      note: "expired handoff/checkpoint",
    };
  }
  if (/\/evidence\//.test(path) || /\/evaluations\//.test(path) || /\/audits\//.test(path)) {
    return {
      disposition: "MOVE",
      kind: "evidence",
      candidate_owner: "evidence/",
      note: "dated observation / trial",
    };
  }
  if (/\/decisions\//.test(path)) {
    return {
      disposition: "RECONCILE/ADR",
      kind: "decision",
      candidate_owner: "docs/decisions/ or work/designs/open/",
      note: "decision record — acceptance gate required",
    };
  }
  if (path.startsWith("docs/programs/") && /\/technical\//.test(path)) {
    return {
      disposition: "RECONCILE",
      kind: "technical",
      candidate_owner: "docs/technical/{admin,observability,…}/",
      note: "program technical target",
    };
  }
  if (path.startsWith("docs/engineering/targets/")) {
    return {
      disposition: "PROMOTE",
      kind: "technical",
      candidate_owner: path.includes("react-next")
        ? "docs/technical/client/architecture.md"
        : path.includes("chamber")
          ? "docs/technical/lab/"
          : "docs/technical/",
      note: "selected engineering target",
    };
  }
  if (path.startsWith("docs/engineering/") && /agentic|field-manual|long-story-memory|retrieval/.test(path)) {
    return {
      disposition: "CURATE",
      kind: "example",
      candidate_owner: "research/ or .agents/",
      note: "research / agent material",
    };
  }
  if (path.startsWith("docs/engineering/evidence/") || path.includes("connected-poc-proof")) {
    return {
      disposition: "MOVE",
      kind: "evidence",
      candidate_owner: "evidence/",
      note: "engineering evidence",
    };
  }
  if (path.startsWith("docs/engineering/")) {
    return {
      disposition: "TRIAGE",
      kind: "technical",
      candidate_owner: "docs/technical/ or .agents/ or research/",
      note: "mixed engineering folder",
    };
  }
  if (path.startsWith("docs/programs/admin/") && !/\/technical\//.test(path) && !/\/evidence\//.test(path) && !/\/handoff\//.test(path)) {
    return {
      disposition: "RECONCILE",
      kind: "product",
      candidate_owner: "docs/product/admin/",
      note: "admin product aspirational",
    };
  }
  if (path.startsWith("docs/programs/storyteller/") && !/\/evidence\//.test(path) && !/\/handoff\//.test(path)) {
    if (/vision-and-quality|target-operating|evaluation-and-playability/.test(path)) {
      return {
        disposition: "RECONCILE",
        kind: "product",
        candidate_owner: "docs/product/storyteller/",
        note: "storyteller product/proposed",
      };
    }
    return {
      disposition: "RECONCILE",
      kind: "technical",
      candidate_owner: "docs/technical/storyteller/",
      note: "storyteller runtime design",
    };
  }
  if (path.startsWith("docs/programs/engine/")) {
    if (/product-derived/.test(path)) {
      return {
        disposition: "RECONCILE",
        kind: "product",
        candidate_owner: "docs/product/gameplay/ + technical cross-links",
        note: "product-derived engine brief",
      };
    }
    return {
      disposition: "RECONCILE",
      kind: "technical",
      candidate_owner: "docs/technical/engine/",
      note: "engine program design",
    };
  }
  if (path.startsWith("docs/programs/experience/")) {
    if (/\/system\//.test(path) || /presentation/.test(path)) {
      return {
        disposition: "RECONCILE",
        kind: "technical",
        candidate_owner: "docs/technical/client/",
        note: "presentation/system → client technical",
      };
    }
    if (/implementation-program|mechanics-evolution|platform-entry/.test(path)) {
      return {
        disposition: "EXTRACT/RETIRE",
        kind: "transient",
        candidate_owner: "work/changes/ledger + Git",
        note: "execution program index",
      };
    }
    return {
      disposition: "RECONCILE",
      kind: "product",
      candidate_owner: "docs/product/experience/",
      note: "experience design → product experience",
    };
  }
  if (path.startsWith("docs/programs/observability/")) {
    if (/player-replay|product-vision/.test(path)) {
      return {
        disposition: "RECONCILE",
        kind: "product",
        candidate_owner: "docs/product/experience/replay.md or admin",
        note: "OBS product-facing",
      };
    }
    return {
      disposition: "RECONCILE",
      kind: "technical",
      candidate_owner: "docs/technical/observability/",
      note: "OBS program remainder",
    };
  }
  return {
    disposition: "TRIAGE",
    kind: "transient",
    candidate_owner: "",
    note: "unclassified docs path",
  };
}

const fileClass = new Map();
const counts = {};
for (const f of files) {
  const c = classify(f.source_path);
  if (!c) continue;
  fileClass.set(f.source_path, c);
  counts[c.disposition] = (counts[c.disposition] || 0) + 1;
  f.router_disposition = c;
}

let atomUpdates = 0;
for (const a of atoms) {
  const c = fileClass.get(a.source_path);
  if (!c) continue;
  if (a.disposition === "PENDING" || a.disposition === "TRIAGE" || a.disposition === "REVIEW") {
    a.disposition = c.disposition;
    a.kind = a.kind || c.kind;
    a.candidate_owner = a.candidate_owner || c.candidate_owner;
    a.reviewer = "classify-file-routers";
    a.file_router_note = c.note;
    // still not section-resolved
    a.resolved = false;
    atomUpdates++;
  }
}

writeFileSync(join(dir, "files.jsonl"), files.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(dir, "atoms.jsonl"), atoms.map((r) => JSON.stringify(r)).join("\n") + "\n");

const pending = atoms.filter((a) => a.disposition === "PENDING").length;
const summary = {
  files_classified: fileClass.size,
  disposition_counts: Object.fromEntries(Object.entries(counts).sort()),
  atom_rows_updated: atomUpdates,
  atoms_still_pending: pending,
  total_atoms: atoms.length,
};
writeFileSync(join(dir, "router-disposition-summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
