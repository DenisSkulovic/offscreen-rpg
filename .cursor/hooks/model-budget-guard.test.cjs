"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const {evaluate, verdictForModel} = require("./model-budget-guard.cjs");

const allowed = [
  "composer-2.5[fast=false]",
  "grok-4.6[effort=low,fast=false]",
  "grok-4.6[effort=medium,fast=false]",
  "grok-4.6[fast=false,effort=medium]"
];
const blocked = [
  null, "", "inherit", "auto", "composer-2.5", "composer-2.5[]",
  "composer-2.5[fast=true]", "composer-2.5-fast",
  "grok-4.6", "grok-4.6[effort=medium]", "grok-4.6[fast=false]",
  "grok-4.6[effort=high,fast=false]", "grok-4.6[effort=xhigh,fast=false]",
  "grok-4.6[effort=low,fast=true]",
  "grok-4.7[effort=medium,fast=false]", "claude-sonnet-5[effort=low,fast=false]",
  "grok-4.6[effort=medium,fast=false,context=256k]",
  "grok-4.6[effort=low,effort=medium,fast=false]",
  "cursor-grok-4.6-medium", "composer-2.5[fast=false,fast=true]"
];

test("only explicitly pinned allowlist variants are admitted", () => {
  for (const model of allowed) {
    assert.equal(verdictForModel(model), null, model);
    assert.equal(evaluate({subagent_model:model}).permission, "allow", model);
  }
});
test("blocked models and ambiguous/default variants fail closed", () => {
  for (const model of blocked) {
    assert.notEqual(verdictForModel(model), null, String(model));
    assert.equal(evaluate({subagent_model:model}).permission, "deny", String(model));
  }
});
test("missing/malformed hook payload fails closed", () => {
  for (const payload of [null, undefined, {}, [], "oops", {subagent_model:{}}]) {
    assert.equal(evaluate(payload).permission, "deny");
  }
});
