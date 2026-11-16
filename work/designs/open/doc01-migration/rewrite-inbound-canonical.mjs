#!/usr/bin/env node
/**
 * Rewrite common legacy doc path literals to DOC01 canonical owners.
 * Scoped to high-traffic non-docs consumers + root orientation files.
 * Does not touch docs/programs bodies (migration sources).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

const replacements = [
  ["docs/technical/client-and-identity.md", "docs/technical/platform/identities-and-access.md"],
  ["docs/technical/data.md", "docs/technical/platform/data-and-persistence.md"],
  ["docs/technical/execution.md", "docs/technical/platform/execution-and-delivery.md"],
  ["docs/technical/usage-policy.md", "docs/technical/platform/spending-and-entitlements.md"],
  ["docs/technical/architecture.md", "docs/technical/platform/topology.md"],
  ["docs/technical/delivery-and-validation.md", "docs/technical/platform/deployment-and-compatibility.md"],
  ["docs/technical/story-lifecycle.md", "docs/technical/engine/lifecycle-and-compatibility.md"],
  ["docs/technical/solo-gameplay-contract.md", "docs/technical/engine/authority-and-transitions.md"],
  ["docs/technical/rules-and-activities.md", "docs/technical/engine/mechanics-and-capabilities.md"],
  ["docs/technical/committed-time.md", "docs/technical/engine/chronology-and-activities.md"],
  ["docs/technical/storyteller-runtime.md", "docs/technical/storyteller/operation-and-controller.md"],
  ["docs/technical/canonical-files.md", "docs/technical/storyteller/context-and-memory.md"],
  ["docs/technical/provider-dispatch-review.md", "docs/technical/storyteller/provider-boundary.md"],
  ["docs/technical/context-and-cost.md", "docs/technical/storyteller/request-context-and-cost.md"],
  ["docs/technical/chamber-lab-protocol.md", "docs/technical/lab/experiment-protocol.md"],
  ["docs/engineering/targets/react-next.md", "docs/technical/client/architecture.md"],
  ["docs/engineering/targets/chamber-laboratory.md", "docs/technical/lab/chamber-and-fixtures.md"],
  ["docs/product/journeys/player-experience.md", "docs/product/experience/principles.md"],
  ["docs/product/journeys/time-and-autonomy.md", "docs/product/gameplay/time-and-autonomy.md"],
  ["docs/product/journeys/story-creation.md", "docs/product/experience/entry-and-onboarding.md"],
  ["docs/product/foundations/gameplay.md", "docs/product/gameplay/actions-and-commitments.md"],
  ["docs/product/foundations/game-rules.md", "docs/product/gameplay/rules.md"],
  ["docs/product/storytelling/storytelling.md", "docs/product/storyteller/behavior-and-quality.md"],
  ["docs/product/storytelling/storyteller-settings.md", "docs/product/storyteller/profiles-and-settings.md"],
  ["docs/product/storytelling/continuity-and-consequences.md", "docs/product/gameplay/continuity.md"],
  ["docs/operations/development.md", "docs/runbooks/local-development.md"],
  ["docs/progress.md", "STATUS.md"],
  ["docs/technical/persistence-and-caching.md", "docs/technical/platform/data-and-persistence.md"],
  ["docs/engineering/code-navigation.md", "docs/README.md"],
  ["docs/engineering/chamber-program.md", "docs/technical/lab/chamber-and-fixtures.md"],
  ["docs/engineering/frontend-execution-playbook.md", ".agents/skills/frontend-engineering/SKILL.md"],
  ["docs/engineering/qa-journeys.md", "docs/product/gameplay/acceptance-scenarios.md"],
  ["docs/engineering/storyteller-tuning.md", "research/storyteller/README.md"],
  ["docs/engineering/connected-poc-proof.md", "evidence/README.md"],
  ["docs/engineering/engine-model.md", "docs/technical/engine/authority-and-transitions.md"],
  ["docs/engineering/long-story-memory-and-retrieval.md", "docs/technical/storyteller/context-and-memory.md"],
  ["docs/engineering/coding-agent-target-standard.md", ".agents/HARNESS.md"],
  ["docs/engineering/coding-agent-evaluation.md", ".agents/references/context-economics.md"],
  ["docs/engineering/coding-agent-knowledge.md", ".agents/README.md"],
  ["docs/engineering/ai-development-system.md", ".agents/HARNESS.md"],
  ["docs/engineering/agentic-systems-field-manual.md", "research/README.md"],
  ["docs/engineering/code-quality.md", ".agents/rules/verification.md"],
  ["docs/engineering/offline-poc-acceptance.md", "docs/product/gameplay/acceptance-scenarios.md"],
  ["docs/history/minutes/README.md", "work/sessions/README.md"],
  ["work/changes/README.md", "work/changes/README.md"],
];

const scopes = [
  ".agents",
  "AGENTS.md",
  "README.md",
  "TODO.md",
  "STATUS.md",
  "ROADMAP.md",
  "apps",
  "packages",
  "tools",
];

const listed = execFileSync(
  "git",
  ["grep", "-l", "-E", "docs/(technical|engineering|product|operations|progress|history/minutes|changes/README)", "--", ...scopes],
  { cwd: repoRoot, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

let filesChanged = 0;
let replaceCount = 0;
for (const rel of listed) {
  // skip binary-ish
  if (!/\.(md|mdc|mjs|ts|tsx|js)$/i.test(rel) && !["AGENTS.md", "README.md", "TODO.md", "STATUS.md", "ROADMAP.md"].includes(rel)) {
    continue;
  }
  const abs = join(repoRoot, rel);
  let text = readFileSync(abs, "utf8");
  let next = text;
  for (const [from, to] of replacements) {
    if (next.includes(from)) {
      const parts = next.split(from);
      replaceCount += parts.length - 1;
      next = parts.join(to);
    }
  }
  if (next !== text) {
    writeFileSync(abs, next);
    filesChanged++;
  }
}

console.log(JSON.stringify({ filesScanned: listed.length, filesChanged, replaceCount }, null, 2));
