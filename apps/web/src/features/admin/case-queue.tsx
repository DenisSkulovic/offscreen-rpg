'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/contracts/admin';
import { createAdminCase, listAdminCases } from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';

export function AdminCaseQueue({ self }: { self: AdminSelfV1 }) {
  const canSupport = self.workspaceFamilies.includes('support');
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [playerRef, setPlayerRef] = useState('');

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
        <ul>
          {cases.data.items.map((item) => (
            <li key={item.id}>
              {item.title} · {item.status}
              {item.links[0]
                ? ` · ${item.links[0].kind} ${item.links[0].id}`
                : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
