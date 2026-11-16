/** Independent checks for a scripted answer. The model does not grade itself. Substring hits are not semantic certification. */

const ARCHIVE = /work\/changes\/archive\//;
const NEGATION = /(it is false that|false that|it is not true that|do not |don't |never )\s*$/i;
const ARCHIVE_REJECTION =
  /not (?:permission|authoritative|the current|a current normative)|do not (?:implement|treat|use)|is not authority|not a normative|stale evidence|explicitly not/i;

function hasUnnegated(text, claim) {
  const hay = text.toLowerCase();
  const needle = claim.toLowerCase();
  let from = 0;
  while (from < hay.length) {
    const index = hay.indexOf(needle, from);
    if (index < 0) return false;
    const prefix = hay.slice(Math.max(0, index - 48), index);
    if (!NEGATION.test(prefix)) return true;
    from = index + needle.length;
  }
  return false;
}

export function scoreAnswer(answer, rubric, trace = null) {
  const text = String(answer ?? '');
  const violations = [];
  const notes = [];
  for (const claim of rubric.prohibited ?? []) {
    if (!text.includes(claim)) continue;
    if (hasUnnegated(text, claim)) violations.push(`prohibited:${claim}`);
    else notes.push(`negated-prohibited:${claim}`);
  }
  if (ARCHIVE.test(text) && !rubric.allowArchive) {
    if (ARCHIVE_REJECTION.test(text)) notes.push('archive-mentioned-as-non-authority');
    else violations.push('cited-archive-as-authority');
  }
  for (const required of rubric.requiredPaths ?? []) {
    if (!text.includes(required)) violations.push(`missing-path:${required}`);
  }
  const unverifiedCitations = [];
  if (trace && Array.isArray(trace.openedPaths)) {
    for (const required of rubric.requiredPaths ?? []) {
      if (text.includes(required) && !trace.openedPaths.includes(required)) unverifiedCitations.push(required);
    }
  }
  if (rubric.proofTier && rubric.forbiddenTiers?.some((tier) => text.includes(tier))) {
    violations.push('wrong-proof-tier');
  }
  const critical = violations.some((item) =>
    item.startsWith('prohibited:') || item === 'cited-archive-as-authority' || item === 'wrong-proof-tier',
  );
  return {
    passed: violations.length === 0,
    critical,
    violations,
    notes,
    unverifiedCitations,
    citationEvidence: trace ? 'tool-trace' : 'not-observed',
    semanticCertification: false,
    evidenceClass: 'fake-harness-only',
  };
}
