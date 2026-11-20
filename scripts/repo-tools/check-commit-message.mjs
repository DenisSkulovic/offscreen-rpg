#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_TYPES = new Set([
  'feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'policy',
  'build', 'ci', 'infra', 'lab', 'chore', 'revert',
]);
const AUTO_GIT_MESSAGES = /^(?:Merge\b|Revert "|(?:fixup|squash|amend|reword)! )/;
const HEADER = /^([a-z]+)\(([A-Za-z0-9][A-Za-z0-9._/-]*)\): (.+)$/;

/** Validate NEW human-authored commits. Historical commits are never rewritten. */
export function validateCommitMessage(raw) {
  const text = raw.replace(/\r\n?/g, '\n');
  const lines = text.split('\n').filter((line) => !line.startsWith('#'));
  while (lines.at(-1) === '') lines.pop();
  const subject = lines[0] ?? '';
  const errors = [];

  if (AUTO_GIT_MESSAGES.test(subject)) return errors;
  const match = HEADER.exec(subject);
  if (!match) {
    errors.push('Subject must be type(scope): achieved outcome (for example fix(STORY03/control): publish saved results through GA).');
  } else {
    const [, type, scope, outcome] = match;
    if (!ALLOWED_TYPES.has(type)) errors.push('Unknown type "'+type+'". Allowed: '+[...ALLOWED_TYPES].join(', ')+'.');
    if (/[/.]{2}|\/\//.test(scope) || /[./-]$/.test(scope)) errors.push('Scope must name a meaningful subsystem or Change code, without empty path segments.');
    if (outcome.trim().length < 12) errors.push('Subject outcome is too vague; describe the actual result in at least 12 characters.');
    if (/[.]$/.test(outcome)) errors.push('Do not end the subject with a period.');
    if (/^(?:update|changes|misc|stuff|wip|work|fixes|improvements)(?:\b|$)/i.test(outcome.trim())) {
      errors.push('Do not start the outcome with a catch-all word; state what changed.');
    }
  }
  if (subject.length > 100) errors.push('Subject is '+subject.length+' characters; maximum is 100.');
  if (lines[1] !== '') errors.push('Put exactly one blank line between subject and body.');
  const body = lines.slice(2);
  const why = body.find((line) => line.startsWith('Why:'))?.slice(4).trim();
  const evidence = body.find((line) => line.startsWith('Evidence:'))?.slice(9).trim();
  if (!why || why.length < 10 || /^(?:n\/?a|none|tbd|todo|unknown)$/i.test(why)) {
    errors.push('Add Why: with a concrete reason (at least 10 characters).');
  }
  if (!evidence || evidence.length < 10 || /^(?:n\/?a|none|tbd|todo|unknown)$/i.test(evidence)) {
    errors.push('Add Evidence: with an actual check/result or NOT RUN (reason).');
  } else if (/^NOT RUN\s*$/i.test(evidence)) {
    errors.push('Evidence: NOT RUN requires a reason, e.g. NOT RUN (needs Temporal).');
  }
  return errors;
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const path = process.argv[2];
  if (!path || path === '--help') {
    console.error('Usage: node scripts/repo-tools/check-commit-message.mjs <commit-message-file>');
    process.exitCode = path === '--help' ? 0 : 2;
  } else {
    try {
      const errors = validateCommitMessage(readFileSync(path, 'utf8'));
      if (errors.length) {
        console.error('\nCommit message rejected:\n' + errors.map((error) => '  - ' + error).join('\n'));
        console.error('\nExample:\nfix(STORY03/control): publish saved results through Game Authority\n\nWhy: Control-worker SQL writes bypassed the selected publication owner.\nEvidence: targeted custody tests PASS; connected browser run NOT RUN.\nRemaining: cold kind browser proof in TURN03.\n');
        process.exitCode = 1;
      }
    } catch (error) {
      console.error('Commit message check failed: '+error.message);
      process.exitCode = 2;
    }
  }
}
