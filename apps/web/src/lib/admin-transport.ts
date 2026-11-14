import {
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
  campaignMetadataPageV1Schema,
  redactedOperationPageV1Schema,
  redactedOperationEnvelopeV1Schema,
  usageStatusEnvelopeV1Schema,
  adminSelfV1Schema,
  type AdminSelfV1,
  type PlayerSearchPageV1,
  type PlayerSummaryEnvelopeV1,
  type CampaignMetadataPageV1,
  type RedactedOperationPageV1,
  type RedactedOperationEnvelopeV1,
  type UsageStatusEnvelopeV1,
} from '@offscreen/contracts/admin';

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

/** Browser Admin session enter. Same-origin so Origin CSRF is present. */
export async function enterAdminSession(): Promise<AdminSelfV1> {
  const response = await fetch('/api/admin/session/enter', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    const body = (await readJson(response).catch(() => null)) as {
      code?: string;
    } | null;
    throw new Error(body?.code ?? `enter_failed_${response.status}`);
  }
  return adminSelfV1Schema.parse(await readJson(response));
}

export async function exitAdminSession(): Promise<void> {
  await fetch('/api/admin/session/exit', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
  });
}

export async function searchAdminPlayers(
  ref: string,
  signal?: AbortSignal,
): Promise<PlayerSearchPageV1> {
  const response = await fetch(
    `/api/admin/players?ref=${encodeURIComponent(ref)}&limit=1`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`search_failed_${response.status}`);
  }
  return playerSearchPageV1Schema.parse(await readJson(response));
}

export async function readAdminPlayerSummary(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerSummaryEnvelopeV1> {
  const response = await fetch(
    `/api/admin/players/${encodeURIComponent(playerId)}`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`summary_failed_${response.status}`);
  }
  return playerSummaryEnvelopeV1Schema.parse(await readJson(response));
}

export async function listAdminPlayerCampaigns(
  playerId: string,
  signal?: AbortSignal,
): Promise<CampaignMetadataPageV1> {
  const response = await fetch(
    `/api/admin/players/${encodeURIComponent(playerId)}/campaigns`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`campaigns_failed_${response.status}`);
  }
  return campaignMetadataPageV1Schema.parse(await readJson(response));
}

export async function listAdminCampaignOperations(
  campaignId: string,
  signal?: AbortSignal,
): Promise<RedactedOperationPageV1> {
  const response = await fetch(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}/operations`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`operations_failed_${response.status}`);
  }
  return redactedOperationPageV1Schema.parse(await readJson(response));
}

export async function readAdminOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<RedactedOperationEnvelopeV1> {
  const response = await fetch(
    `/api/admin/operations/${encodeURIComponent(operationId)}`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`operation_failed_${response.status}`);
  }
  return redactedOperationEnvelopeV1Schema.parse(await readJson(response));
}

export async function readAdminUsageStatus(
  accountRef: string,
  signal?: AbortSignal,
): Promise<UsageStatusEnvelopeV1> {
  const response = await fetch(
    `/api/admin/usage/status?accountRef=${encodeURIComponent(accountRef)}`,
    { credentials: 'same-origin', signal, cache: 'no-store' },
  );
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`usage_failed_${response.status}`);
  }
  return usageStatusEnvelopeV1Schema.parse(await readJson(response));
}
