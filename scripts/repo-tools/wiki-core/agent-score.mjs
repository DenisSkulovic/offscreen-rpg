/** Independent checks for a scripted answer. The model does not grade itself. */

const ARCHIVE = /work\/changes\/archive\//;

export function scoreAnswer(answer, rubric) {
  const text = String(answer ?? '');
  const violations = [];
  for (const claim of rubric.prohibited ?? []) {
    if (text.includes(claim)) violations.push(`prohibited:${claim}`);
  }
  if (ARCHIVE.test(text) && !rubric.allowArchive) {
    violations.push('cited-archive-as-authority');
  }
  for (const required of rubric.requiredPaths ?? []) {
    if (!text.includes(required)) violations.push(`missing-path:${required}`);
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
    evidenceClass: 'fake-harness-only',
  };
}
