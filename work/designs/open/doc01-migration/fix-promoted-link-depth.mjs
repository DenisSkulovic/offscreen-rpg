#!/usr/bin/env node
/**
 * Only files promoted from flat docs/technical/*.md gained one path segment.
 * Program/engineering-sourced copies keep the same depth — do not bump those.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

// flat technical → nested technical/<area>/
const fromFlatTechnical = [
  "docs/technical/platform/topology.md",
  "docs/technical/platform/identities-and-access.md",
  "docs/technical/platform/data-and-persistence.md",
  "docs/technical/platform/execution-and-delivery.md",
  "docs/technical/platform/spending-and-entitlements.md",
  "docs/technical/platform/deployment-and-compatibility.md",
  "docs/technical/engine/authority-and-transitions.md",
  "docs/technical/engine/mechanics-and-capabilities.md",
  "docs/technical/engine/chronology-and-activities.md",
  "docs/technical/engine/lifecycle-and-compatibility.md",
  "docs/technical/storyteller/operation-and-controller.md",
  "docs/technical/storyteller/context-and-memory.md",
  "docs/technical/storyteller/provider-boundary.md",
  "docs/technical/lab/experiment-protocol.md",
];

let filesChanged = 0;
let linkRewrites = 0;
for (const rel of fromFlatTechnical) {
  const file = join(repoRoot, rel);
  const original = readFileSync(file, "utf8");
  const updated = original.replace(
    /(!?\[[^\]]*\]\()(\.\.\/[^)\s]+)(\))/g,
    (full, pre, target, post) => {
      linkRewrites++;
      return `${pre}../${target}${post}`;
    },
  );
  if (updated !== original) {
    writeFileSync(file, updated);
    filesChanged++;
  }
}
console.log(JSON.stringify({ filesChanged, linkRewrites }, null, 2));
