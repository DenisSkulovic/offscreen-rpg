'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSelfV1, CaseSummaryV1 } from '@offscreen/admin-interface/admin';
import { createAdminCase, listAdminCases } from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';
import {
  SITUATION_NOT_AUTHORIZED_COPY,
  SupportSituationPanel,
} from './support-situation-panel';

const CAMPAIGN_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * OBS07: a case may launch an investigation only when it is assigned to this
 * staff principal and carries a campaign link. This is a UX filter; the server
 * independently rechecks case, link and the exact steward-issued grant.
 */
export function investigableCampaignId(
  item: CaseSummaryV1,
  staffPrincipalId: string,
): string | null {
  if (item.status !== 'assigned') return null;
  if (item.assignedStaffId !== staffPrincipalId) return null;
  const link = item.links.find(
    (candidate) =>
      candidate.kind === 'campaign' && CAMPAIGN_UUID.test(candidate.id),
  );
  return link ? link.id : null;
}

/** Selection is bound to the principal+epoch it was made under. */
type Selection = Readonly<{
  staffPrincipalId: string;
  accessEpoch: number;
  caseId: string;
}>;

export function AdminCaseQueue({ self }: { self: AdminSelfV1 }) {
  const canSupport = self.workspaceFamilies.includes('support');
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [playerRef, setPlayerRef] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);

  const cases = useQuery({
    queryKey: adminQueryKeys.cases(self.staffPrincipalId, self.accessEpoch),
    queryFn: ({ signal }) => listAdminCases(signal),
    enabled: canSupport,
  });

  const create = useMutation({
    mutationFn: () =>
      createAdminCase({
        idempotencyKey: crypto.randomUUID(),
        category: 'account',
        title: title.trim(),
        ...(playerRef.trim()
          ? { link: { kind: 'player' as const, id: playerRef.trim() } }
          : {}),
      }),
    onSuccess: async () => {
      setTitle('');
      setPlayerRef('');
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.cases(
          self.staffPrincipalId,
          self.accessEpoch,
        ),
      });
    },
  });

  if (!canSupport) {
    return (
      <section aria-labelledby="admin-cases-heading">
        <h2 id="admin-cases-heading">Support cases</h2>
        <p role="status">Support workspace not in this session.</p>
      </section>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    create.mutate();
  }

  // The panel exists only while the selection matches this principal+epoch AND
  // the freshly listed case is still assigned to us with a campaign link.
  const selectedCase =
    selection &&
    selection.staffPrincipalId === self.staffPrincipalId &&
    selection.accessEpoch === self.accessEpoch
      ? (cases.data?.items.find((item) => item.id === selection.caseId) ?? null)
      : null;
  const selectedCampaignId = selectedCase
    ? investigableCampaignId(selectedCase, self.staffPrincipalId)
    : null;

  return (
    <section aria-labelledby="admin-cases-heading">
      <h2 id="admin-cases-heading">Support cases</h2>
      <p>
        Minimal internal cases. Linked player ids stay references only — case
        ownership never grants missing Player 360 rights.
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="admin-case-title">Title</label>
        <input
          id="admin-case-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
        />
        <label htmlFor="admin-case-player">Optional player id</label>
        <input
          id="admin-case-player"
          value={playerRef}
          onChange={(event) => setPlayerRef(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={create.isPending}>
          Create case
        </button>
      </form>
      {create.isError ? (
        <p role="alert">Case create failed or link not authorized.</p>
      ) : null}
      {cases.isFetching ? <p>Loading cases…</p> : null}
      {cases.data ? (
        <ul aria-label="Support cases">
          {cases.data.items.map((item) => {
            const campaignId = investigableCampaignId(
              item,
              self.staffPrincipalId,
            );
            const isSelected = selectedCase?.id === item.id;
            return (
              <li key={item.id}>
                {item.title} · {item.status}
                {item.links[0]
                  ? ` · ${item.links[0].kind} ${item.links[0].id}`
                  : ''}{' '}
                {campaignId ? (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Open situation for case ${item.id}`}
                    onClick={() =>
                      setSelection({
                        staffPrincipalId: self.staffPrincipalId,
                        accessEpoch: self.accessEpoch,
                        caseId: item.id,
                      })
                    }
                  >
                    Open situation
                  </button>
                ) : (
                  <span>{SITUATION_NOT_AUTHORIZED_COPY}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {selectedCase && selectedCampaignId ? (
        <SupportSituationPanel
          key={`${self.staffPrincipalId}:${self.accessEpoch}:${selectedCase.id}:${selectedCampaignId}`}
          self={self}
          caseId={selectedCase.id}
          campaignId={selectedCampaignId}
        />
      ) : null}
    </section>
  );
}
