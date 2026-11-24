import {
  playerSearchPageV1Schema,
  playerSummaryEnvelopeV1Schema,
  campaignMetadataPageV1Schema,
  redactedOperationPageV1Schema,
  redactedOperationEnvelopeV1Schema,
  usageStatusEnvelopeV1Schema,
  adminStaffAccessV1Schema,
  adminAuditPageV1Schema,
  caseSummaryPageV1Schema,
  caseSummaryV1Schema,
  adminSelfV1Schema,
  supportSituationV1Schema,
  type SupportSituationV1,
  type AdminSelfV1,
  type AdminStaffAccessV1,
  type AdminAuditPageV1,
  type CaseCreateRequestV1,
  type CaseSummaryPageV1,
  type CaseSummaryV1,
  type PlayerSearchPageV1,
  type PlayerSummaryEnvelopeV1,
  type CampaignMetadataPageV1,
  type RedactedOperationPageV1,
  type RedactedOperationEnvelopeV1,
  type UsageStatusEnvelopeV1,
} from '@offscreen/admin-interface/admin';

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

function getInit(signal?: AbortSignal): RequestInit {
  return {
    credentials: 'same-origin',
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  };
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
    getInit(signal),
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
    getInit(signal),
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
    getInit(signal),
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
    getInit(signal),
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
    getInit(signal),
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
    getInit(signal),
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

export async function readAdminStaffAccess(
  staffId: string,
  signal?: AbortSignal,
): Promise<AdminStaffAccessV1> {
  const response = await fetch(
    `/api/admin/staff/${encodeURIComponent(staffId)}/access`,
    getInit(signal),
  );
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`access_failed_${response.status}`);
  }
  return adminStaffAccessV1Schema.parse(await readJson(response));
}

export async function listAdminAuditEvents(
  signal?: AbortSignal,
): Promise<AdminAuditPageV1> {
  const response = await fetch(`/api/admin/audit`, getInit(signal));
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`audit_failed_${response.status}`);
  }
  return adminAuditPageV1Schema.parse(await readJson(response));
}

export async function listAdminCases(
  signal?: AbortSignal,
): Promise<CaseSummaryPageV1> {
  const response = await fetch(`/api/admin/cases`, getInit(signal));
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`cases_failed_${response.status}`);
  }
  return caseSummaryPageV1Schema.parse(await readJson(response));
}

const SITUATION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * OBS07: case-scoped S1 Support Situation. Both ids must be UUIDs (no free
 * entry). Every server denial is a privacy 404 → one non-enumerating error.
 */
export async function readAdminCaseSituation(
  caseId: string,
  campaignId: string,
  signal?: AbortSignal,
): Promise<SupportSituationV1> {
  if (!SITUATION_UUID.test(caseId) || !SITUATION_UUID.test(campaignId)) {
    throw new Error('situation_not_available');
  }
  const response = await fetch(
    `/api/admin/cases/${caseId}/campaigns/${campaignId}/situation`,
    getInit(signal),
  );
  if (response.status === 401) {
    throw new Error('staff_session_required');
  }
  if (response.status === 403 || response.status === 404) {
    throw new Error('situation_not_available');
  }
  if (!response.ok) {
    throw new Error(`situation_failed_${response.status}`);
  }
  const parsed = supportSituationV1Schema.parse(await readJson(response));
  // Never trust a response for a different pair than the one requested.
  if (parsed.caseId !== caseId || parsed.campaignId !== campaignId) {
    throw new Error('situation_not_available');
  }
  return parsed;
}

export async function createAdminCase(
  body: CaseCreateRequestV1,
): Promise<CaseSummaryV1> {
  const response = await fetch(`/api/admin/cases`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 404) {
    throw new Error('not_found');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('staff_session_required');
  }
  if (!response.ok) {
    throw new Error(`case_create_failed_${response.status}`);
  }
  return caseSummaryV1Schema.parse(await readJson(response));
}
