#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const roots = [
  "docs/technical/platform",
  "docs/technical/engine",
  "docs/technical/storyteller",
  "docs/technical/client",
  "docs/technical/admin",
  "docs/technical/observability",
  "docs/technical/lab",
];

const sourceHint = {
  "platform/topology.md": "docs/technical/architecture.md",
  "platform/identities-and-access.md": "docs/technical/client-and-identity.md",
  "platform/data-and-persistence.md": "docs/technical/data.md (+ persistence-and-caching.md still sibling)",
  "platform/execution-and-delivery.md": "docs/technical/execution.md",
  "platform/spending-and-entitlements.md": "docs/technical/usage-policy.md",
  "platform/deployment-and-compatibility.md": "docs/technical/delivery-and-validation.md",
  "engine/authority-and-transitions.md": "docs/technical/solo-gameplay-contract.md",
  "engine/mechanics-and-capabilities.md": "docs/technical/rules-and-activities.md",
  "engine/chronology-and-activities.md": "docs/technical/committed-time.md (+ ticks-and-tags, calendars)",
  "engine/lifecycle-and-compatibility.md": "docs/technical/story-lifecycle.md",
  "storyteller/operation-and-controller.md": "docs/technical/storyteller-runtime.md",
  "storyteller/context-and-memory.md": "docs/technical/canonical-files.md (+ context-and-cost)",
  "storyteller/provider-boundary.md": "docs/technical/provider-dispatch-review.md",
  "client/architecture.md": "docs/engineering/targets/react-next.md",
  "client/presentation-runtime.md": "docs/programs/experience/system/presentation-runtime.md",
  "admin/topology-and-authorization.md": "docs/programs/admin/technical/control-plane-boundaries.md",
  "admin/investigation-and-privacy.md": "docs/programs/admin/technical/read-models-and-privacy.md",
  "observability/identities-and-evidence.md": "docs/programs/observability/technical/evidence-model.md",
  "lab/experiment-protocol.md": "docs/technical/chamber-lab-protocol.md",
  "lab/chamber-and-fixtures.md": "docs/engineering/targets/chamber-laboratory.md",
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith(".md")) out.push(p);
  }
  return out;
}

let n = 0;
for (const root of roots) {
  for (const file of walk(join(repoRoot, root))) {
    const rel = relative(join(repoRoot, "docs/technical"), file).replace(/\\/g, "/");
    const body = readFileSync(file, "utf8");
    if (body.includes("DOC01 P3 canonical technical owner")) continue;
    const hint = sourceHint[rel] || "prior technical/program source";
    const banner =
      `> **DOC01 P3 canonical technical owner.** Promoted from \`${hint}\`. Legacy path remains until P5 cutover. Reconcile program decisions (engine/OBS/Admin) claim-by-claim—do not invent acceptance.\n\n`;
    // insert after first heading line
    const updated = body.replace(/^(# .+\r?\n)/, `$1\n${banner}`);
    writeFileSync(file, updated);
    n++;
  }
}
console.log(JSON.stringify({ bannered: n }, null, 2));
