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
};
