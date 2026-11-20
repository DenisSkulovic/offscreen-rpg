"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluate, verdictForModel } = require("./model-budget-guard.cjs");

const auto = "auto";
const composer = "composer-2.5[fast=false]";
const grokAllowedWithApproval = [
  "grok-4.6[effort=low,fast=false]",
  "grok-4.6[effort=medium,fast=false]",
  "grok-4.6[fast=false,effort=medium]"
];
const blocked = [
  null, "", "inherit", "composer-2.5", "composer-2.5[]",
  "composer-2.5[fast=true]", "composer-2.5-fast",
  "grok-4.6", "grok-4.6[effort=medium]", "grok-4.6[fast=false]",
  "grok-4.6[effort=high,fast=false]", "grok-4.6[effort=xhigh,fast=false]",
  "grok-4.6[effort=low,fast=true]",
  "grok-4.7[effort=medium,fast=false]", "claude-sonnet-5[effort=low,fast=false]",
  "grok-4.6[effort=medium,fast=false,context=256k]",
  "grok-4.6[effort=low,effort=medium,fast=false]",
  "cursor-grok-4.6-medium", "composer-2.5[fast=false,fast=true]"
];

test("Auto utility and Composer Standard are allowed default subagent routes", () => {
  assert.equal(verdictForModel(auto), null);
  assert.equal(evaluate({subagent_model:auto}, {grokApproved:false}).permission, "allow");
  assert.equal(verdictForModel(composer), null);
  assert.equal(evaluate({subagent_model: composer}, {grokApproved:false}).permission, "allow");
  for (const model of grokAllowedWithApproval) {
    assert.notEqual(verdictForModel(model), null);
    assert.equal(evaluate({subagent_model:model}, {grokApproved:false}).permission, "deny");
  }
});

test("named local approval enables ONLY pinned Grok low and medium variants", () => {
  for (const model of grokAllowedWithApproval) {
    assert.equal(verdictForModel(model, true), null, model);
    assert.equal(evaluate({subagent_model:model}, {grokApproved:true}).permission, "allow", model);
  }
  assert.equal(verdictForModel(auto, true), null);
  assert.equal(evaluate({subagent_model:auto}, {grokApproved:true}).permission, "allow");
  for (const model of blocked) {
    assert.notEqual(verdictForModel(model, true), null, String(model));
    assert.equal(evaluate({subagent_model:model}, {grokApproved:true}).permission, "deny", String(model));
  }
});

test("missing or malformed payload fails closed", () => {
  for (const payload of [null, undefined, {}, [], "oops", {subagent_model:{}}]) {
    assert.equal(evaluate(payload, {grokApproved:true}).permission, "deny");
  }
});

test("unapproved Grok cannot silently fall back and opt-in is not inherited via payload", () => {
  const model = grokAllowedWithApproval[1];
  assert.equal(evaluate({subagent_model:model, owner_approved:true}, {grokApproved:false}).permission, "deny");
  assert.equal(evaluate({subagent_model:composer, owner_approved:false}, {grokApproved:false}).permission, "allow");
});
