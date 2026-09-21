import { createHash } from 'node:crypto';
import {
  creativeDiscoveryRequestSchema,
  creativeDiscoveryResultSchema,
  type CreativeDiscoveryRequest,
  type CreativeDiscoveryResult,
} from '@offscreen/contracts/creative-exploration';

export function creativeDiscoveryRequestHash(
  rawRequest: CreativeDiscoveryRequest,
) {
  const request = creativeDiscoveryRequestSchema.parse(rawRequest);
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

/** Binds a private discovery result to its exact captured root and limits. */
export function validateCreativeDiscoveryResult(
  rawRequest: CreativeDiscoveryRequest,
  rawResult: CreativeDiscoveryResult,
) {
  const request = creativeDiscoveryRequestSchema.parse(rawRequest);
  const result = creativeDiscoveryResultSchema.parse(rawResult);
  if (result.requestHash !== creativeDiscoveryRequestHash(request)) {
    throw new Error('Creative discovery result does not match its request');
  }
  if (
    result.coverage.searchedQueries > request.searches.length ||
    result.leads.length > request.limits.maxLeads
  ) {
    throw new Error('Creative discovery result exceeds its captured limits');
  }
  const allowedLenses = new Set(request.need.lenses);
  const allowedVisibilities = new Set(request.need.scope.visibilities);
  for (const lead of result.leads) {
    if (!allowedLenses.has(lead.lens)) {
      throw new Error('Creative discovery result uses an undeclared lens');
    }
    for (const evidence of lead.evidence) {
      if (!allowedVisibilities.has(evidence.visibility)) {
        throw new Error('Creative discovery evidence exceeds visibility scope');
      }
      if (
        request.need.scope.branchKey !== null &&
        evidence.branchKey !== request.need.scope.branchKey
      ) {
        throw new Error('Creative discovery evidence crosses branch scope');
      }
      if (request.need.scope.currentVersionsOnly && !evidence.current) {
        throw new Error('Creative discovery evidence is not current');
      }
    }
  }
  return result;
}
