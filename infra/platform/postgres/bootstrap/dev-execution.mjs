import { DEV_CNPG_CONTEXT } from '../config.mjs';
import { ensureDevCnpg } from './dev-plan.mjs';

export function executeAuthorizedDevCnpg(deps) {
  const first = deps.collect();
  const decision = ensureDevCnpg(first, { authorize: true });
  if (!decision.ok) return { ...decision, mutated: false };
  const manifest = deps.readOperatorManifest
    ? deps.readOperatorManifest()
    : { body: '', sha256: first.pin.sha256 };
  if (
    manifest.sha256 !== first.pin.sha256 ||
    !manifest.body.includes(`image: ${first.pin.operatorImage}`)
  ) {
    return {
      ...decision,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'operator-manifest-sha-mismatch',
          detail: 'downloaded operator manifest does not match operator.pin',
        },
      ],
      actions: [],
    };
  }
  const again = deps.collect();
  const recheck = ensureDevCnpg(again, {
    authorize: true,
    operatorManifestSha256: manifest.sha256,
  });
  if (!recheck.ok) return { ...recheck, mutated: false };
  const completed = [];
  for (const action of recheck.actions) {
    if (action.op === 'noop' || action.op === 'verify-operator') {
      completed.push(action);
      continue;
    }
    if (
      action.op === 'wait-established-crd' ||
      action.op === 'wait-operator-rollout'
    ) {
      const waited = deps.run(
        'kubectl',
        ['--context', DEV_CNPG_CONTEXT, ...action.args],
        { timeoutMs: 260000 },
      );
      completed.push(action);
      if (!waited.ok) {
        return {
          ...recheck,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: `${action.op}-failed`,
              detail: waited.stderr || `${action.op} failed`,
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    let applied = deps.run('kubectl', action.args, {
      input: action.op === 'apply-operator' ? manifest.body : action.manifest,
      timeoutMs: action.op === 'apply-operator' ? 180000 : 60000,
    });
    if (!applied.ok && action.op === 'apply-cluster') {
      for (let attempt = 0; attempt < 12 && !applied.ok; attempt += 1) {
        if (deps.sleep) deps.sleep(5000);
        applied = deps.run('kubectl', action.args, {
          input: action.manifest,
          timeoutMs: 60000,
        });
      }
    }
    completed.push(action);
    if (!applied.ok) {
      return {
        ...recheck,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: `${action.op}-failed`,
            detail: applied.stderr || `${action.op} failed`,
          },
        ],
        actions: completed,
      };
    }
  }
  return {
    ...recheck,
    ok: true,
    mutated: completed.some((action) => action.op.startsWith('apply-')),
    actions: completed,
  };
}
