"use strict";

// Invoked by Cursor subagentStart. Default allow ONLY Composer 2.5 Standard.
// Grok Low/Medium requires explicit user-controlled local opt-in in the hook
// process environment. This is a cost guard, not an authentication boundary:
// it does not control parent model selection or platform billing.
function verdictForModel(value, grokApproved = false) {
  if (typeof value !== "string") return "Missing Cursor subagent_model";
  const model = value.trim().toLowerCase();
  const match = /^([a-z0-9.-]+)\[([^\]]*)\]$/.exec(model);
  if (!match) return "Model variant must explicitly include effort/speed; bare model and aliases are denied";
  const [, base, raw] = match;
  const params = new Map();
  if (!raw) return "Empty model parameters cannot verify standard speed";
  for (const part of raw.split(",")) {
    const kv = /^([a-z_]+)\s*=\s*([a-z0-9.-]+)$/.exec(part.trim());
    if (!kv || params.has(kv[1])) return "Malformed or repeated model parameter";
    params.set(kv[1], kv[2]);
  }
  if (base === "composer-2.5" && params.size === 1 && params.get("fast") === "false") return null;
  if (base === "grok-4.6" && params.size === 2 &&
      params.get("fast") === "false" &&
      (params.get("effort") === "low" || params.get("effort") === "medium")) {
    return grokApproved ? null :
      "Grok requires an explicitly owner-approved task and OFFSCREEN_CURSOR_ALLOW_GROK=owner-approved in the hook environment";
  }
  return "Only Composer 2.5 Standard or opt-in Grok 4.6 Low/Medium Standard are permitted";
}

function evaluate(payload, options = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {permission: "deny", user_message: "Cost policy: missing/malformed subagent hook payload"};
  }
  const grokApproved = options.grokApproved ??
    (process.env.OFFSCREEN_CURSOR_ALLOW_GROK === "owner-approved");
  const problem = verdictForModel(payload.subagent_model, grokApproved);
  if (problem) return {
    permission: "deny",
    user_message: "Offscreen RPG subagent blocked: " + problem +
      ". Default to Composer Standard. Never disable this guard as a model fallback."
  };
  return {permission: "allow"};
}

module.exports = {verdictForModel, evaluate};

if (require.main === module) {
  let body = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => {
    body += chunk;
    if (body.length > 65536) {
      process.stdout.write(JSON.stringify(evaluate(null)) + "\n");
      process.exit(2);
    }
  });
  process.stdin.on("end", () => {
    try {
      process.stdout.write(JSON.stringify(evaluate(JSON.parse(body))) + "\n");
    } catch {
      process.stdout.write(JSON.stringify(evaluate(null)) + "\n");
      process.exitCode = 2;
    }
  });
  process.stdin.on("error", () => {
    process.stdout.write(JSON.stringify(evaluate(null)) + "\n");
    process.exitCode = 2;
  });
}
