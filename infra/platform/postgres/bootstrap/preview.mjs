/** Shared diagnostic intent only. Never grants authority or claims a mutation. */
export function previewBaselineEnsure(plan, probe, options = {}) {
  const refusals = [...plan.refusals];
  const refuse = (id, detail) => refusals.push({ id, detail });
  if (options.authorize !== true) refuse('ensure-not-authorized', 'Ensure not authorized');
  if (options.operatorManifestSha256 !== undefined && options.operatorManifestSha256 !== probe.pin?.sha256)
    refuse('operator-manifest-sha-mismatch', 'Manifest does not match pin');
  const state = probe.fullAssessment;
  if (!state) refuse('full-observation-required', 'Projected observations cannot authorize baseline creation');
  else {
    if (!['absent', 'ready', 'pending'].includes(state.operator) ||
      !['absent', 'compatible'].includes(state.namespace) ||
      !['absent', 'ready', 'pending'].includes(state.cluster))
      refuse('incomplete-baseline-state', 'Baseline observations do not establish safe intent');
    if (state.cluster !== 'absent' && state.namespace !== 'compatible')
      refuse('cluster-namespace-conflict', 'Existing Cluster requires compatible Namespace');
  }
  const actions = [];
  if (!refusals.length) {
    actions.push({ op: state.operator === 'absent' ? 'apply-operator' : 'verify-operator' });
    if (state.namespace === 'absent') actions.push({ op: 'create-namespace' });
    if (state.cluster === 'absent') actions.push({ op: 'create-cluster' });
    actions.push({ op: 'wait-cluster-ready' });
  }
  return { ...plan, mode: 'ensure', readOnly: true, ok: refusals.length === 0, mutated: false, refusals, actions };
}
