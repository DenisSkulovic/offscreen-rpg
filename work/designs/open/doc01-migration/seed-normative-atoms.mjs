#!/usr/bin/env node
/**
 * Seed kind/candidate_owner for product + technical heading atoms (first-pass heuristics).
 * Does NOT mark resolved=true except for empty README router stubs with no claims filled.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const atomsPath = join(dir, "atoms.jsonl");
const atoms = readFileSync(atomsPath, "utf8")
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));

function productOwner(path) {
  if (path.includes("/foundations/vision")) return "docs/product/foundations/vision.md";
  if (path.includes("/foundations/concepts")) return "docs/product/foundations/concepts.md";
  if (path.includes("/foundations/gameplay") || path.includes("/foundations/game-rules")) {
    return "docs/product/gameplay/rules.md";
  }
  if (path.includes("time-and-autonomy")) return "docs/product/gameplay/time-and-autonomy.md";
  if (path.includes("continuity")) return "docs/product/gameplay/continuity.md";
  if (path.includes("player-experience")) return "docs/product/experience/principles.md";
  if (path.includes("/storytelling/")) return "docs/product/storyteller/behavior-and-quality.md";
  if (path.endsWith("docs/product/README.md")) return "docs/product/README.md";
  return "docs/product/";
}

function technicalOwner(path) {
  const map = [
    ["architecture.md", "docs/technical/platform/topology.md"],
    ["rules-and-activities.md", "docs/technical/engine/mechanics-and-capabilities.md"],
    ["solo-gameplay-contract.md", "docs/technical/engine/authority-and-transitions.md"],
    ["story-lifecycle.md", "docs/technical/engine/lifecycle-and-compatibility.md"],
    ["committed-time.md", "docs/technical/engine/chronology-and-activities.md"],
    ["ticks-and-tags.md", "docs/technical/engine/chronology-and-activities.md"],
    ["calendars-and-world-time.md", "docs/technical/engine/chronology-and-activities.md"],
    ["storyteller-runtime.md", "docs/technical/storyteller/operation-and-controller.md"],
    ["canonical-files.md", "docs/technical/storyteller/context-and-memory.md"],
    ["context-and-cost.md", "docs/technical/storyteller/context-and-memory.md"],
    ["story-settings.md", "docs/technical/storyteller/prompts-and-tools.md"],
    ["provider-dispatch-review.md", "docs/technical/storyteller/provider-boundary.md"],
    ["client-and-identity.md", "docs/technical/platform/identities-and-access.md"],
    ["persistence-and-caching.md", "docs/technical/platform/data-and-persistence.md"],
    ["delivery-and-validation.md", "docs/technical/platform/execution-and-delivery.md"],
    ["usage-policy.md", "docs/technical/platform/spending-and-entitlements.md"],
    ["data.md", "docs/technical/platform/data-and-persistence.md"],
    ["execution.md", "docs/technical/platform/execution-and-delivery.md"],
    ["chamber-lab-protocol.md", "docs/technical/lab/"],
  ];
  for (const [needle, owner] of map) {
    if (path.endsWith(needle) || path.includes(`/playthroughs/`)) {
      if (path.includes("/playthroughs/")) return "evidence/ or tests/ (scenario; not technical norm)";
      return owner;
    }
  }
  if (path.endsWith("docs/technical/README.md")) return "docs/technical/README.md";
  return "docs/technical/";
}

let seeded = 0;
for (const a of atoms) {
  const p = a.source_path;
  if (p.startsWith("docs/product/")) {
    a.kind = a.kind || "product";
    a.candidate_owner = productOwner(p);
    a.disposition = a.disposition === "PENDING" ? "PROMOTE/RECONCILE" : a.disposition;
    a.reviewer = "seed-normative-atoms";
    seeded++;
  } else if (p.startsWith("docs/technical/")) {
    if (p.includes("/playthroughs/")) {
      a.kind = "example";
      a.candidate_owner = "evidence/ or tests/ (scenario; not technical norm)";
      a.disposition = "HISTORICIZE";
    } else {
      a.kind = a.kind || "technical";
      a.candidate_owner = technicalOwner(p);
      a.disposition = a.disposition === "PENDING" ? "PROMOTE/RECONCILE" : a.disposition;
    }
    a.reviewer = "seed-normative-atoms";
    seeded++;
  }
}

writeFileSync(atomsPath, atoms.map((r) => JSON.stringify(r)).join("\n") + "\n");

const pending = atoms.filter((a) => a.disposition === "PENDING").length;
const product = atoms.filter((a) => a.source_path.startsWith("docs/product/")).length;
const technical = atoms.filter((a) => a.source_path.startsWith("docs/technical/")).length;
console.log(
  JSON.stringify(
    {
      seeded_rows: seeded,
      product_atoms: product,
      technical_atoms: technical,
      still_pending_disposition: pending,
      total_atoms: atoms.length,
    },
    null,
    2,
  ),
);
