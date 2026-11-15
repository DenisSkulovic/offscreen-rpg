/**
 * Admin TanStack Query keys. Always start with staff principal + access epoch.
 * Never put cookies, tokens, or private narrative text in keys.
 */
export const adminQueryKeys = {
  self: (staffPrincipalId: string, accessEpoch: number) =>
    ['admin', staffPrincipalId, accessEpoch, 'self'] as const,
  playerSearch: (
    staffPrincipalId: string,
    accessEpoch: number,
    ref: string,
  ) => ['admin', staffPrincipalId, accessEpoch, 'player', 'search', ref] as const,
  playerSummary: (
    staffPrincipalId: string,
    accessEpoch: number,
    playerId: string,
  ) =>
    ['admin', staffPrincipalId, accessEpoch, 'player', playerId, 'summary'] as const,
  playerCampaigns: (
    staffPrincipalId: string,
    accessEpoch: number,
    playerId: string,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'player',
      playerId,
      'campaigns',
    ] as const,
  campaignOperations: (
    staffPrincipalId: string,
    accessEpoch: number,
    campaignId: string,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'campaign',
      campaignId,
      'operations',
    ] as const,
  operation: (
    staffPrincipalId: string,
    accessEpoch: number,
    operationId: string,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'operation',
      operationId,
    ] as const,
  usageStatus: (
    staffPrincipalId: string,
    accessEpoch: number,
    accountRef: string,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'usage',
      accountRef,
    ] as const,
  staffAccess: (
    staffPrincipalId: string,
    accessEpoch: number,
    targetStaffId: string,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'staff',
      targetStaffId,
      'access',
    ] as const,
  audit: (staffPrincipalId: string, accessEpoch: number) =>
    ['admin', staffPrincipalId, accessEpoch, 'audit'] as const,
  cases: (staffPrincipalId: string, accessEpoch: number) =>
    ['admin', staffPrincipalId, accessEpoch, 'cases'] as const,
  /**
   * OBS07 S1 Support Situation. Ids + response version only — never a case
   * title, player text or any payload field.
   */
  supportSituation: (
    staffPrincipalId: string,
    accessEpoch: number,
    caseId: string,
    campaignId: string,
    responseVersion: number = 1,
  ) =>
    [
      'admin',
      staffPrincipalId,
      accessEpoch,
      'case',
      caseId,
      'campaign',
      campaignId,
      'situation',
      responseVersion,
    ] as const,
};
