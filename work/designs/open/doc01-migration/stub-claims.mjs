#!/usr/bin/env node
/** Fill claim_or_invariant from heading_text for rows still empty (provisional). */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const atoms = readFileSync(join(dir, "atoms.jsonl"), "utf8")
  .trim()
  .split(/\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));

let filled = 0;
for (const a of atoms) {
  if (!a.claim_or_invariant && a.heading_text) {
    a.claim_or_invariant = `[heading stub] ${a.heading_text}`;
    a.question_answered = a.question_answered || a.heading_text;
    filled++;
  }
}
writeFileSync(join(dir, "atoms.jsonl"), atoms.map((r) => JSON.stringify(r)).join("\n") + "\n");
const empty = atoms.filter((a) => !a.claim_or_invariant).length;
console.log(JSON.stringify({ filled, still_empty_claim: empty, total: atoms.length }, null, 2));
