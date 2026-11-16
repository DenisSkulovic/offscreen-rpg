#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

const map = {
  // admin commands/console — were docs/programs/admin/technical/*
  "../operations-and-workflows.md": "docs/programs/admin/operations-and-workflows.md",
  "../authority-operating-policy.md": "docs/programs/admin/authority-operating-policy.md",
  "../access-and-governance-product.md": "docs/programs/admin/access-and-governance-product.md",
  "../product-adversarial-review.md": "docs/programs/admin/product-adversarial-review.md",
  "../command-center-product.md": "docs/programs/admin/command-center-product.md",
  "../personas-and-workspaces.md": "docs/programs/admin/personas-and-workspaces.md",
  // observability
  "../evidence/writer-closure-and-sequence-2026-11-15.md":
    "docs/programs/observability/evidence/writer-closure-and-sequence-2026-11-15.md",
  "physical-evidence-storage-v1.md":
    "docs/programs/observability/technical/physical-evidence-storage-v1.md",
  "capture-transaction-protocol.md":
    "docs/programs/observability/technical/capture-transaction-protocol.md",
  "reconstruction-algorithm-v1.md":
    "docs/programs/observability/technical/reconstruction-algorithm-v1.md",
  "../admin-investigation-experience.md":
    "docs/programs/observability/admin-investigation-experience.md",
  "../../admin/technical/staff-identity-and-policy.md":
    "docs/programs/admin/technical/staff-identity-and-policy.md",
  "../../admin/technical/read-models-and-privacy.md":
    "docs/technical/admin/investigation-and-privacy.md",
  "../../admin/technical/action-approval-and-audit.md":
    "docs/technical/admin/commands-and-audit.md",
  "../product-policy-recommendations-v1.md":
    "docs/programs/observability/product-policy-recommendations-v1.md",
  "evidence-model.md": "docs/technical/observability/identities-and-evidence.md",
  "../../../engineering/targets/chamber-laboratory.md":
    "docs/technical/lab/chamber-and-fixtures.md",
  "../references.md": "docs/programs/observability/references.md",
  "../../storyteller/evidence/sa01-operation-trace-sample-2026-11-14.md":
    "docs/programs/storyteller/evidence/sa01-operation-trace-sample-2026-11-14.md",
  // storyteller request-context leftovers
  "playthroughs/storyteller.md": "docs/technical/playthroughs/storyteller.md",
  "usage-policy.md": "docs/technical/platform/spending-and-entitlements.md",
  "canonical-files.md": "docs/technical/storyteller/context-and-memory.md",
  "story-lifecycle.md": "docs/technical/engine/lifecycle-and-compatibility.md",
  "context-and-cost.md": "docs/technical/storyteller/request-context-and-cost.md",
};

const files = [
  "docs/technical/admin/commands-and-audit.md",
  "docs/technical/admin/console-and-read-models.md",
  "docs/technical/observability/capture-and-provenance.md",
  "docs/technical/observability/investigation-and-reconstruction.md",
  "docs/technical/observability/retention-and-access.md",
  "docs/technical/observability/telemetry-and-diagnostics.md",
  "docs/technical/storyteller/request-context-and-cost.md",
  "docs/technical/storyteller/operation-and-controller.md",
  "docs/technical/storyteller/context-and-memory.md",
  "docs/technical/platform/spending-and-entitlements.md",
];

function relLink(fromFile, toRepoPath, hash) {
  let rel = relative(dirname(fromFile), join(repoRoot, toRepoPath)).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return hash ? `${rel}#${hash}` : rel;
}

let rewrites = 0;
for (const rel of files) {
  const file = join(repoRoot, rel);
  const original = readFileSync(file, "utf8");
  const updated = original.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (full, pre, target, post) => {
    if (/^(https?:|mailto:|#)/i.test(target)) return full;
    const [pathPart, hash = ""] = target.split("#");
    // basename-only context-and-cost etc.
    const base = pathPart.split("/").pop();
    const key = map[pathPart] ? pathPart : map[base] && !pathPart.includes("/") ? base : null;
    const dest = key ? map[key] : map[pathPart];
    if (!dest) return full;
    // avoid rewriting already-correct deep links
    if (pathPart.includes("docs/")) return full;
    rewrites++;
    return `${pre}${relLink(file, dest, hash)}${post}`;
  });
  if (updated !== original) writeFileSync(file, updated);
}
console.log(JSON.stringify({ rewrites }, null, 2));
