const DEV_DELTA_PATHS = [
  ['spec', 'template', 'spec', 'securityContext'],
  ['spec', 'template', 'spec', 'containers', 0, 'securityContext'],
  ['spec', 'template', 'spec', 'containers', 0, 'readinessProbe'],
  ['spec', 'template', 'spec', 'containers', 0, 'resources'],
];

function clone(value) {
  return structuredClone(value);
}

function unsetPath(target, path) {
  let node = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    if (node == null) return;
    node = node[path[i]];
  }
  if (node != null) delete node[path.at(-1)];
}

export function normalizeEnvList(env) {
  if (!Array.isArray(env)) return env;
  return [...env].sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeDevDocument(doc) {
  const next = clone(doc);
  if (next.kind === 'Deployment') {
    for (const path of DEV_DELTA_PATHS) unsetPath(next, path);
    const env = next.spec?.template?.spec?.containers?.[0]?.env;
    if (env) next.spec.template.spec.containers[0].env = normalizeEnvList(env);
  }
  return next;
}

export function normalizeReleaseDocument(doc) {
  const next = clone(doc);
  if (next.kind === 'Deployment' && Array.isArray(next.spec?.template?.spec?.containers?.[0]?.env)) {
    next.spec.template.spec.containers[0].env = normalizeEnvList(
      next.spec.template.spec.containers[0].env,
    );
  }
  return next;
}

export function indexDocuments(docs) {
  const map = new Map();
  for (const doc of docs) map.set(`${doc.kind}/${doc.metadata?.namespace}/${doc.metadata?.name}`, doc);
  return map;
}