/**
 * Pure TURN03 live-eligibility proof adapter (K8S10 T01).
 * Injected inputs only — never kubectl, fs, or subprocess.
 */

import { TURN03_DISTRIBUTED_POC_PROOF_SCHEMA } from '../app-release/turn03/report.mjs';

/** Must match infra/kubernetes/lab/chaos/selector.mjs */
const CHAOS_ELIGIBLE_LABEL = 'offscreen.rpg/chaos-eligible';

const INADMISSIBLE_TIERS = new Set(['local', 'fixture', 'process']);

/**
 * @param {object | null | undefined} evidence
 */
function isInadmissibleGateEvidence(evidence) {
  if (evidence == null || typeof evidence !== 'object') {
    return false;
  }
  if (evidence.mocked === true || evidence.incomplete === true) {
    return true;
  }
  const tier = evidence.tier;
  if (typeof tier === 'string' && INADMISSIBLE_TIERS.has(tier)) {
    return true;
  }
  return false;
}

/**
 * @param {object | null | undefined} report
 */
function resolveReportClusterUid(report) {
  if (!report || typeof report !== 'object') {
    return undefined;
  }
  if (report.clusterUid != null && report.clusterUid !== '') {
    return String(report.clusterUid);
  }
  const preflightUid = report.preflight?.clusterUid;
  if (preflightUid != null && preflightUid !== '') {
    return String(preflightUid);
  }
  return undefined;
}

/**
 * @param {object | null | undefined} plan
 */
function planTargetMissingOptIn(plan) {
  if (!plan || typeof plan !== 'object') {
    return false;
  }
  const target = plan.target;
  if (!target || typeof target !== 'object') {
    return false;
  }
  const podLabels = target.podLabels ?? target.labels ?? {};
  const templateLabels = target.templateLabels ?? {};
  if (
    podLabels[CHAOS_ELIGIBLE_LABEL] !== 'true' ||
    templateLabels[CHAOS_ELIGIBLE_LABEL] !== 'true'
  ) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *   turn03Report?: object | null,
 *   expected?: { releaseSha?: string, clusterUid?: string, imageDigests?: Record<string, string> },
 *   plan?: object,
 * }} input
 */
export function evaluateTurn03LiveEligibility(input) {
  const expected = input?.expected ?? {};
  const releaseShaExpected = expected.releaseSha;

  if (releaseShaExpected == null || String(releaseShaExpected).length === 0) {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'missing-release-ref',
    };
  }

  const report = input?.turn03Report;
  if (report == null) {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-proof-missing',
    };
  }

  if (report.schema !== TURN03_DISTRIBUTED_POC_PROOF_SCHEMA) {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-schema-mismatch',
    };
  }

  const overall = report.overall;
  if (overall === 'FAIL') {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-proof-failed',
    };
  }
  if (overall === 'BLOCKED') {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-proof-blocked',
    };
  }
  if (overall !== 'PASS') {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-proof-not-pass',
    };
  }

  const gates = Array.isArray(report.gates) ? report.gates : [];
  for (const gate of gates) {
    if (isInadmissibleGateEvidence(gate?.evidence)) {
      return {
        eligible: false,
        liveStatus: 'NOT-ELIGIBLE',
        reason: 'turn03-inadmissible-evidence',
      };
    }
  }

  const reportSha = report.sourceSha;
  if (reportSha !== releaseShaExpected) {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'turn03-release-sha-mismatch',
    };
  }

  const expectedClusterUid = expected.clusterUid;
  const reportClusterUid = resolveReportClusterUid(report);
  if (expectedClusterUid != null && String(expectedClusterUid).length > 0) {
    if (reportClusterUid == null) {
      return {
        eligible: false,
        liveStatus: 'NOT-ELIGIBLE',
        reason: 'turn03-cluster-uid-missing',
      };
    }
    if (reportClusterUid !== String(expectedClusterUid)) {
      return {
        eligible: false,
        liveStatus: 'NOT-ELIGIBLE',
        reason: 'turn03-cluster-uid-mismatch',
      };
    }
  }

  const expectedDigests = expected.imageDigests ?? {};
  const reportDigests = report.imageDigests ?? {};
  for (const [name, digest] of Object.entries(expectedDigests)) {
    if (reportDigests[name] !== digest) {
      return {
        eligible: false,
        liveStatus: 'NOT-ELIGIBLE',
        reason: 'turn03-image-digest-mismatch',
      };
    }
  }

  if (input.plan != null && planTargetMissingOptIn(input.plan)) {
    return {
      eligible: false,
      liveStatus: 'NOT-ELIGIBLE',
      reason: 'missing-pod-opt-in',
    };
  }

  return {
    eligible: true,
    liveStatus: 'ELIGIBLE',
    reason: 'turn03-pass',
    releaseSha: releaseShaExpected,
    clusterUid: reportClusterUid ?? expectedClusterUid ?? undefined,
  };
}
