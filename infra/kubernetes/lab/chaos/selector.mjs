/**
 * Pure chaos target selector. Side-effect-free; never shells out to kubectl.
 *
 * Input `pods` are normalized Pod records (already parsed from Kubernetes JSON).
 * Input `releaseOwners` is the selected release allowlist: pinned Deployment metadata
 * including namespace, name, uid, image digest, and release labels.
 */

/** @typedef {Record<string, string>} StringMap */

/**
 * @typedef {{
 *   uid: string,
 *   name: string,
 *   namespace: string,
 *   labels?: StringMap,
 *   deletionTimestamp?: string | null,
 *   owner?: { kind: string, name: string, uid: string },
 *   ownerReferences?: Array<{ kind: string, name: string, uid: string }>,
 *   containerImageIds?: string[],
 *   ready?: boolean,
 * }} PodRecord
 */

/**
 * @typedef {{
 *   namespace: string,
 *   name: string,
 *   uid: string,
 *   kind: string,
 *   imageDigest: string,
 *   labels: StringMap,
 * }} ReleaseOwner
 */

export const BLOCKED_DATA_NAMESPACES = new Set([
  'lab-postgres',
  'lab-objects',
  'messaging',
  'temporal',
  'lab-temporal',
]);

const CHAOS_ELIGIBLE_LABEL = 'offscreen.rpg/chaos-eligible';

const FORBIDDEN_LABEL_KEYS = [
  'offscreen.rpg/skeleton',
  'offscreen.rpg/fixture',
  'offscreen.rpg/system',
];

/** @param {string | undefined} imageId */
export function normalizeImageDigest(imageId) {
  if (!imageId || typeof imageId !== 'string') {
    return '';
  }
  const at = imageId.lastIndexOf('@sha256:');
  if (at >= 0) {
    return imageId.slice(at + 1).toLowerCase();
  }
  const bare = imageId.match(/sha256:[a-f0-9]{64}/i);
  return bare ? bare[0].toLowerCase() : imageId.trim().toLowerCase();
}

/** @param {PodRecord} pod */
function resolveDeploymentOwner(pod) {
  if (pod.owner?.kind === 'Deployment') {
    return pod.owner;
  }
  for (const ref of pod.ownerReferences ?? []) {
    if (ref.kind === 'Deployment') {
      return ref;
    }
  }
  return pod.owner ?? null;
}

/**
 * @param {ReleaseOwner[]} releaseOwners
 */
function buildOwnerIndex(releaseOwners) {
  /** @type {Map<string, ReleaseOwner>} */
  const byKey = new Map();
  /** @type {Set<string>} */
  const allowlistedNamespaces = new Set();
  for (const owner of releaseOwners ?? []) {
    const key = `${owner.namespace}\0${owner.name}\0${owner.uid}`;
    byKey.set(key, owner);
    if (owner.namespace) {
      allowlistedNamespaces.add(owner.namespace);
    }
  }
  return { byKey, allowlistedNamespaces };
}

/**
 * @param {PodRecord} pod
 * @param {{ allowlistedNamespaces: Set<string>, ownerIndex: Map<string, ReleaseOwner> }} ctx
 * @returns {{ eligible: true, owner: ReleaseOwner } | { eligible: false, reason: string, detail?: string }}
 */
function evaluatePod(pod, ctx) {
  if (pod.deletionTimestamp) {
    return { eligible: false, reason: 'terminating' };
  }
  if (pod.ready !== true) {
    return { eligible: false, reason: 'not-ready' };
  }

  const ns = pod.namespace ?? '';
  if (BLOCKED_DATA_NAMESPACES.has(ns)) {
    return { eligible: false, reason: 'data-workload-namespace', detail: ns };
  }
  if (!ctx.allowlistedNamespaces.has(ns)) {
    return { eligible: false, reason: 'namespace-not-allowlisted', detail: ns };
  }

  const ownerRef = resolveDeploymentOwner(pod);
  if (!ownerRef || ownerRef.kind !== 'Deployment') {
    return { eligible: false, reason: 'owner-not-deployment' };
  }

  const ownerKey = `${ns}\0${ownerRef.name}\0${ownerRef.uid}`;
  const pinned = ctx.ownerIndex.get(ownerKey);
  if (!pinned) {
    return { eligible: false, reason: 'owner-not-pinned', detail: ownerRef.uid };
  }
  if (pinned.kind !== 'Deployment') {
    return { eligible: false, reason: 'owner-not-deployment' };
  }

  if (pinned.labels?.[CHAOS_ELIGIBLE_LABEL] !== 'true') {
    return { eligible: false, reason: 'missing-chaos-eligibility' };
  }

  for (const key of FORBIDDEN_LABEL_KEYS) {
    if (pod.labels?.[key] !== undefined && pod.labels[key] !== '') {
      return { eligible: false, reason: 'forbidden-label', detail: key };
    }
  }

  const podDigests = (pod.containerImageIds ?? [])
    .map(normalizeImageDigest)
    .filter(Boolean);
  const pinnedDigest = normalizeImageDigest(pinned.imageDigest);
  if (!pinnedDigest || podDigests.length === 0) {
    return { eligible: false, reason: 'image-digest-mismatch' };
  }
  if (!podDigests.some((d) => d === pinnedDigest)) {
    return { eligible: false, reason: 'image-digest-mismatch' };
  }

  return { eligible: true, owner: pinned };
}

/** @param {string | number} seed @param {number} length */
export function seedIndex(seed, length) {
  if (length <= 0) {
    return 0;
  }
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

/** @param {PodRecord} a @param {PodRecord} b */
function comparePods(a, b) {
  if (a.namespace !== b.namespace) {
    return a.namespace < b.namespace ? -1 : 1;
  }
  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }
  if (a.uid !== b.uid) {
    return a.uid < b.uid ? -1 : 1;
  }
  return 0;
}

/**
 * @param {{
 *   pods: PodRecord[],
 *   releaseOwners: ReleaseOwner[],
 *   seed: string | number,
 *   excludedUids?: string[],
 * }} input
 */
export function selectTarget({ pods, releaseOwners, seed, excludedUids = [] }) {
  const excluded = new Set(excludedUids ?? []);
  const { byKey: ownerIndex, allowlistedNamespaces } = buildOwnerIndex(
    releaseOwners ?? [],
  );
  const ctx = { allowlistedNamespaces, ownerIndex };

  /** @type {Array<{ pod: PodRecord, owner: ReleaseOwner, sortKey: string }>} */
  const eligible = [];

  for (const pod of pods ?? []) {
    if (!pod?.uid || excluded.has(pod.uid)) {
      continue;
    }
    const verdict = evaluatePod(pod, ctx);
    if (verdict.eligible) {
      eligible.push({
        pod,
        owner: verdict.owner,
        sortKey: `${pod.namespace}\0${pod.name}\0${pod.uid}`,
      });
    }
  }

  eligible.sort((a, b) => comparePods(a.pod, b.pod));

  if (eligible.length === 0) {
    return {
      status: 'refused',
      reason: 'no-eligible-targets',
      allowlistedNamespaces: [...allowlistedNamespaces].sort(),
    };
  }

  const index = seedIndex(seed, eligible.length);
  const choice = eligible[index];
  const imageDigest = normalizeImageDigest(choice.owner.imageDigest);

  return {
    status: 'selected',
    podUid: choice.pod.uid,
    podName: choice.pod.name,
    namespace: choice.pod.namespace,
    ownerKind: 'Deployment',
    ownerName: choice.owner.name,
    ownerUid: choice.owner.uid,
    imageDigest,
    seed: String(seed),
    index,
    candidateCount: eligible.length,
  };
}

/**
 * Classify a single pod for diagnostics (refusal reason), without selecting.
 *
 * @param {PodRecord} pod
 * @param {ReleaseOwner[]} releaseOwners
 */
export function classifyPod(pod, releaseOwners) {
  const { byKey: ownerIndex, allowlistedNamespaces } = buildOwnerIndex(
    releaseOwners ?? [],
  );
  const verdict = evaluatePod(pod, { allowlistedNamespaces, ownerIndex });
  if (verdict.eligible) {
    return { status: 'eligible' };
  }
  return {
    status: 'refused',
    reason: verdict.reason,
    detail: verdict.detail,
  };
}