#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const techRoot = join(repoRoot, "docs/technical");

/** Map old basename (or path prefix) → new absolute repo-relative path */
const targets = {
  "architecture.md": "docs/technical/platform/topology.md",
  "client-and-identity.md": "docs/technical/platform/identities-and-access.md",
  "data.md": "docs/technical/platform/data-and-persistence.md",
  "execution.md": "docs/technical/platform/execution-and-delivery.md",
  "usage-policy.md": "docs/technical/platform/spending-and-entitlements.md",
  "delivery-and-validation.md": "docs/technical/platform/deployment-and-compatibility.md",
  "solo-gameplay-contract.md": "docs/technical/engine/authority-and-transitions.md",
  "rules-and-activities.md": "docs/technical/engine/mechanics-and-capabilities.md",
  "committed-time.md": "docs/technical/engine/chronology-and-activities.md",
  "story-lifecycle.md": "docs/technical/engine/lifecycle-and-compatibility.md",
  "storyteller-runtime.md": "docs/technical/storyteller/operation-and-controller.md",
  "canonical-files.md": "docs/technical/storyteller/context-and-memory.md",
  "provider-dispatch-review.md": "docs/technical/storyteller/provider-boundary.md",
  "chamber-lab-protocol.md": "docs/technical/lab/experiment-protocol.md",
  // still flat for now
  "ticks-and-tags.md": "docs/technical/ticks-and-tags.md",
  "calendars-and-world-time.md": "docs/technical/calendars-and-world-time.md",
  "persistence-and-caching.md": "docs/technical/persistence-and-caching.md",
  "context-and-cost.md": "docs/technical/context-and-cost.md",
  "story-settings.md": "docs/technical/story-settings.md",
  "notifications.md": "docs/technical/notifications.md",
};

const programRewrites = {
  // from docs/technical/admin/*
  "../player-360-service-blueprint.md": "docs/programs/admin/player-360-service-blueprint.md",
  "../gameplay-worlds-product.md": "docs/programs/admin/gameplay-worlds-product.md",
  "../ai-engineering-operations-product.md": "docs/programs/admin/ai-engineering-operations-product.md",
  "../trust-and-privacy-product.md": "docs/programs/admin/trust-and-privacy-product.md",
  "../product-acceptance-and-scope.md": "docs/programs/admin/product-acceptance-and-scope.md",
  "source-baseline-2026-11-14.md": "docs/programs/admin/technical/source-baseline-2026-11-14.md",
  "core-v1-contracts.md": "docs/programs/admin/technical/core-v1-contracts.md",
  "architecture-decisions.md": "docs/programs/admin/technical/architecture-decisions.md",
  // observability
  "../product-vision.md": "docs/programs/observability/product-vision.md",
  "../evidence/current-source-inventory-2026-11-15.md":
    "evidence/runs/observability-program-2026-11-15/current-source-inventory-2026-11-15.md",
  "../../engine/README.md": "docs/programs/engine/README.md",
  "../../storyteller/README.md": "docs/programs/storyteller/README.md",
  "../../admin/technical/control-plane-boundaries.md":
    "docs/technical/admin/topology-and-authorization.md",
  // client presentation leftovers
  "../spaces/living-stage-blueprint.md": "docs/programs/experience/spaces/living-stage-blueprint.md",
  "visual-direction-and-tokens.md": "docs/programs/experience/system/visual-direction-and-tokens.md",
  "component-strategy.md": "docs/programs/experience/system/component-strategy.md",
  "motion.md": "docs/programs/experience/system/motion.md",
  "accessibility-and-voice.md": "docs/programs/experience/system/accessibility-and-voice.md",
  "../../../engineering/targets/react-next.md": "docs/technical/client/architecture.md",
  "presentation-media-and-motion.md": "docs/programs/experience/system/presentation-media-and-motion.md",
  // engineering audits
  "../audits/react-next-gap-2026-11-12.md": "research/legacy-audits/react-next-gap-2026-11-12.md",
  "../audits/chamber-gap-2026-11-12.md": "research/legacy-audits/chamber-gap-2026-11-12.md",
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "playthroughs") continue;
      out.push(...walk(p));
    } else if (name.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function relLink(fromFile, toRepoPath, hash) {
  let rel = relative(dirname(fromFile), join(repoRoot, toRepoPath)).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return hash ? `${rel}#${hash}` : rel;
}

const areaDirs = [
  "platform",
  "engine",
  "storyteller",
  "client",
  "admin",
  "observability",
  "lab",
].map((d) => join(techRoot, d));

let rewrites = 0;
let files = 0;
for (const dir of areaDirs) {
  for (const file of walk(dir)) {
    const original = readFileSync(file, "utf8");
    let updated = original.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (full, pre, target, post) => {
      if (/^(https?:|mailto:|#)/i.test(target)) return full;
      const [pathPart, hash = ""] = target.split("#");
      if (programRewrites[pathPart]) {
        rewrites++;
        return `${pre}${relLink(file, programRewrites[pathPart], hash)}${post}`;
      }
      // basename match for former flat technical siblings
      const base = pathPart.split("/").pop();
      if (targets[base] && !pathPart.includes("product/") && !pathPart.includes("programs/")) {
        // only rewrite if it looks like a same-tree technical relative (no deep ../../product)
        if (pathPart.startsWith("http")) return full;
        if (pathPart.includes("docs/")) return full;
        rewrites++;
        return `${pre}${relLink(file, targets[base], hash)}${post}`;
      }
      // playthroughs relative
      if (pathPart.startsWith("playthroughs/")) {
        rewrites++;
        return `${pre}${relLink(file, `docs/technical/${pathPart}`, hash)}${post}`;
      }
      return full;
    });
    if (updated !== original) {
      writeFileSync(file, updated);
      files++;
    }
  }
}
console.log(JSON.stringify({ files, rewrites }, null, 2));
