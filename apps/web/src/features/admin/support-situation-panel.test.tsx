import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'vitest-axe';
import type {
  AdminSelfV1,
  CaseSummaryV1,
  SupportSituationV1,
} from '@offscreen/contracts/admin';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { AdminCaseQueue, investigableCampaignId } from './case-queue';
import { adminQueryKeys } from './admin-query-keys';
import { buildSafeReferral, WHY_TEMPLATES } from './support-situation-copy';
import { SUPPORT_REASON_CODES } from '@offscreen/contracts/admin';

const STAFF = '11111111-1111-4111-8111-111111111111';
const OTHER_STAFF = '22222222-2222-4222-8222-222222222222';
const CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const CAMPAIGN_ID = 'a0000000-0000-4000-8000-000000000001';
const GEN_ID = 'd0000000-0000-4000-8000-000000000001';
const OP_ID = 'd0000000-0000-4000-8000-000000000002';
const STAGE_ID = 'd0000000-0000-4000-8000-000000000003';
const EVENT_ID = 'e0000000-0000-4000-8000-000000000001';
const EXEC_ID = 'e0000000-0000-4000-8000-000000000002';
const PASSAGE_ID = 'f0000000-0000-4000-8000-000000000001';
const SENTINEL = 'SENTINEL-PRIVATE-PROMPT-BODY-8f3a';
const CASE_TITLE = 'Player says game froze after item action';

const SITUATION_URL = `/api/admin/cases/${CASE_ID}/campaigns/${CAMPAIGN_ID}/situation`;

function selfFor(epoch = 1): AdminSelfV1 {
  return {
    version: 1,
    staffPrincipalId: STAFF,
    status: 'active',
    accessEpoch: epoch,
    sessionExpiresAt: '2030-01-01T00:00:00.000Z',
    idleExpiresAt: '2030-01-01T00:30:00.000Z',
    workspaceFamilies: ['support'],
  };
}

function caseItem(overrides: Partial<CaseSummaryV1> = {}): CaseSummaryV1 {
  return {
    id: CASE_ID,
    status: 'assigned',
    category: 'campaign',
    title: CASE_TITLE,
    createdByStaffId: OTHER_STAFF,
    assignedStaffId: STAFF,
    links: [{ kind: 'campaign', id: CAMPAIGN_ID }],
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
    ...overrides,
  };
}

/** Synthetic UI fixture, not customer data. */
function situation(
  overrides: Partial<SupportSituationV1> = {},
): SupportSituationV1 {
  return {
    version: 1,
    caseId: CASE_ID,
    campaignId: CAMPAIGN_ID,
    observedAt: '2026-11-15T12:00:00.000Z',
    sourceFrontier: {
      storyRevision: 41,
      viewVersion: 7,
      latestPublishedPassageId: PASSAGE_ID,
      latestPublishedPassageSequence: 23,
      mechanicalHistoryCoverage: 'partial',
    },
    now: {
      kind: 'storyteller-generation',
      controllingRef: { kind: 'generation', id: GEN_ID },
      gameSecond: 900,
      held: true,
      sourceConfidence: 'direct-current-source',
      activeCommitment: {
        kind: 'finite-action',
        ref: { kind: 'action-execution', id: EXEC_ID },
        status: 'settled',
      },
    },
    activeGeneration: {
      generationId: GEN_ID,
      state: 'pending',
      capture: 'held',
      publication: 'pending',
      attemptCoverage: 'none-recorded',
      safeFailureCode: null,
      stageCoverage: 'recorded',
      stages: [
        {
          ref: { kind: 'storyteller-stage', id: STAGE_ID },
          stage: 'context-materialization-started',
          outcome: 'held',
          safeFailureCode: null,
          observedAt: '2026-11-15T11:59:00.000Z',
        },
      ],
    },
    recentDevelopments: [
      {
        sourceRef: { kind: 'story-passage', id: PASSAGE_ID },
        eventSequence: '57',
        kind: 'passage-published',
        gameSecond: 880,
        observedAt: '2026-11-15T11:00:00.000Z',
        observation: 'recorded',
      },
      {
        sourceRef: { kind: 'action-execution-event', id: EVENT_ID },
        eventSequence: '58',
        kind: 'action-settled',
        gameSecond: 900,
        observedAt: '2026-11-15T11:58:00.000Z',
        observation: 'recorded',
      },
    ],
    why: [
      {
        statementCode: 'action_settlement_recorded',
        class: 'recorded',
        sourceRefs: [{ kind: 'action-execution-event', id: EVENT_ID }],
        missing: [],
      },
      {
        statementCode: 'context_materialization_held',
        class: 'recorded',
        sourceRefs: [{ kind: 'storyteller-stage', id: STAGE_ID }],
        missing: [],
      },
      {
        statementCode: 'model_attempt_unverified',
        class: 'unknown',
        sourceRefs: [{ kind: 'generation', id: GEN_ID }],
        missing: ['attempt-not-recorded'],
      },
    ],
    coverage: {
      currentState: 'verified',
      gameHistory: 'since-enabled',
      storytellerStages: 'recorded',
      promptBody: 'not-included',
    },
    ...overrides,
  };
}

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Seen = { url: string; signalAborted: () => boolean; headers: string };

function useHandlers(opts: {
  cases?: CaseSummaryV1[];
  situation?: () => Response | Promise<Response>;
}): Seen[] {
  const seen: Seen[] = [];
  server.use(
    http.get('/api/admin/cases', () =>
      HttpResponse.json({
        version: 1,
        items: opts.cases ?? [caseItem()],
        nextCursor: null,
      }),
    ),
    http.get(SITUATION_URL, ({ request }) => {
      seen.push({
        url: new URL(request.url).pathname + new URL(request.url).search,
        signalAborted: () => request.signal.aborted,
        headers: JSON.stringify([...request.headers.entries()]),
      });
      return (
        opts.situation?.() ?? HttpResponse.json(situation())
      );
    }),
  );
  return seen;
}

function renderQueue(self: AdminSelfV1 = selfFor()) {
  const queryClient = createBrowserQueryClient();
  const ui = (s: AdminSelfV1) => (
    <QueryClientProvider client={queryClient} key={`${s.staffPrincipalId}:${s.accessEpoch}`}>
      <AdminCaseQueue self={s} />
    </QueryClientProvider>
  );
  const view = render(ui(self));
  return {
    queryClient,
    view,
    rerenderWith: (s: AdminSelfV1) => view.rerender(ui(s)),
  };
}

async function openSituation() {
  const user = userEvent.setup();
  const button = await screen.findByRole('button', {
    name: /open situation for case/i,
  });
  await user.click(button);
  return user;
}

describe('investigableCampaignId eligibility filter', () => {
  it('requires assigned-to-me plus a campaign link', () => {
    expect(investigableCampaignId(caseItem(), STAFF)).toBe(CAMPAIGN_ID);
    expect(investigableCampaignId(caseItem({ status: 'open' }), STAFF)).toBeNull();
    expect(investigableCampaignId(caseItem({ status: 'closed' }), STAFF)).toBeNull();
    expect(
      investigableCampaignId(caseItem({ assignedStaffId: OTHER_STAFF }), STAFF),
    ).toBeNull();
    expect(
      investigableCampaignId(caseItem({ links: [{ kind: 'player', id: CAMPAIGN_ID }] }), STAFF),
    ).toBeNull();
    expect(
      investigableCampaignId(caseItem({ links: [{ kind: 'campaign', id: 'not-a-uuid' }] }), STAFF),
    ).toBeNull();
  });

  it('keys by principal, epoch, case, campaign, situation and version without text', () => {
    const key = adminQueryKeys.supportSituation(STAFF, 3, CASE_ID, CAMPAIGN_ID);
    expect(key).toEqual([
      'admin', STAFF, 3, 'case', CASE_ID, 'campaign', CAMPAIGN_ID, 'situation', 1,
    ]);
    expect(JSON.stringify(key)).not.toContain(CASE_TITLE);
  });
});

describe('Support Situation UI (permitted)', () => {
  it('shows situation, why, developments, coverage from exactly one S1 fetch', async () => {
    const seen = useHandlers({});
    renderQueue();
    await openSituation();

    const now = await screen.findByRole('region', { name: /what’s happening now/i });
    expect(within(now).getByText(/narration preparation in progress or held/i)).toBeInTheDocument();
    expect(within(now).getByText(/900 \(committed, not projected due time\)/)).toBeInTheDocument();
    expect(within(now).getByText(/#23 · f0000000/)).toBeInTheDocument();
    expect(within(now).getByText('Held')).toBeInTheDocument();

    const why = screen.getByRole('region', { name: /^why\?/i });
    expect(within(why).getByText(WHY_TEMPLATES.context_materialization_held)).toBeInTheDocument();
    expect(within(why).getByText(WHY_TEMPLATES.model_attempt_unverified)).toBeInTheDocument();
    expect(within(why).getAllByText(/Action event e0000000/).length).toBeGreaterThan(0);

    const recent = screen.getByRole('region', { name: /recent developments/i });
    expect(within(recent).getAllByRole('listitem')).toHaveLength(2);
    expect(within(recent).getByText(/Scene published/)).toBeInTheDocument();

    const coverage = screen.getByRole('region', { name: /current coverage/i });
    expect(within(coverage).getByText(/Private prompt and story text are not included/)).toBeInTheDocument();

    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(SITUATION_URL);
    // Replay / rerun controls do not exist in S1.
    expect(screen.queryByRole('button', { name: /replay|rerun|retry|resend|run model/i })).toBeNull();
    // No free campaign-id entry.
    expect(screen.queryByLabelText(/campaign/i)).toBeNull();
  });

  it('has no axe violations in the rendered panel', async () => {
    useHandlers({});
    const { view } = renderQueue();
    await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    expect(await axe(view.container)).toHaveNoViolations();
  });

  it('answers the fictional ticket from the screen alone', async () => {
    // “Player says game froze after item action. Did the mechanic finish?
    // Has the model run? Did a new scene publish?”
    useHandlers({});
    renderQueue();
    await openSituation();
    const now = await screen.findByRole('region', { name: /what’s happening now/i });
    const why = screen.getByRole('region', { name: /^why\?/i });
    // Mechanic finished: settlement recorded, commitment settled.
    expect(within(now).getByText(/Finite action · Settled/)).toBeInTheDocument();
    expect(within(why).getByText(WHY_TEMPLATES.action_settlement_recorded)).toBeInTheDocument();
    // Model has not demonstrably run: none recorded, stated as coverage only.
    expect(within(now).getByText(/No model attempt recorded \(coverage statement/)).toBeInTheDocument();
    expect(within(why).getByText(/not proof that no provider was contacted/i)).toBeInTheDocument();
    // New scene did not publish: publication pending, latest stays #23.
    expect(within(now).getByText('Not published yet')).toBeInTheDocument();
    expect(within(now).getByText(/#23 ·/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/€|zero charge was|scene delivered/i);
  });
});

describe('Support Situation UI (not eligible / denied)', () => {
  it('offers no investigation for open, foreign, closed or player-only cases', async () => {
    const seen = useHandlers({
      cases: [
        caseItem({ id: 'c0000000-0000-4000-8000-000000000010', status: 'open', assignedStaffId: null }),
        caseItem({ id: 'c0000000-0000-4000-8000-000000000011', assignedStaffId: OTHER_STAFF }),
        caseItem({ id: 'c0000000-0000-4000-8000-000000000012', status: 'closed' }),
        caseItem({ id: 'c0000000-0000-4000-8000-000000000013', links: [{ kind: 'player', id: OTHER_STAFF }] }),
      ],
    });
    renderQueue();
    const list = await screen.findByRole('list', { name: /support cases/i });
    expect(within(list).queryAllByRole('button')).toHaveLength(0);
    expect(within(list).getAllByText(/Investigation not authorized or not yet linked/)).toHaveLength(4);
    expect(screen.queryByLabelText(/campaign/i)).toBeNull();
    expect(seen).toHaveLength(0);
  });

  it('shows a safe denied state without investigator grant (server 404), no data', async () => {
    const seen = useHandlers({
      situation: () => HttpResponse.json({ version: 1, code: 'not_found', requestId: 'r' }, { status: 404 }),
    });
    renderQueue();
    await openSituation();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Investigation not authorized or not yet linked/,
    );
    expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull();
    expect(seen).toHaveLength(1);
  });

  it('never requests before an explicit open (no silent broad-token request)', async () => {
    const seen = useHandlers({});
    renderQueue();
    await screen.findByRole('button', { name: /open situation for case/i });
    expect(seen).toHaveLength(0);
  });
});

describe('Support Situation UI (unknown, held, stale)', () => {
  it('held before G exists: narration intent pending, no fabricated generation', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json(
          situation({
            now: {
              kind: 'narration-intent',
              controllingRef: { kind: 'storyteller-operation', id: OP_ID },
              gameSecond: 900,
              held: true,
              sourceConfidence: 'direct-current-source',
              activeCommitment: null,
            },
            activeGeneration: null,
            why: [],
            recentDevelopments: [],
          }),
        ),
    });
    renderQueue();
    await openSituation();
    const now = await screen.findByRole('region', { name: /what’s happening now/i });
    expect(within(now).getByText('Narration intent pending')).toBeInTheDocument();
    expect(within(now).getByText(/no generation has been captured yet/i)).toBeInTheDocument();
    expect(within(now).queryByRole('list', { name: /generation/i })).toBeNull();
    expect(screen.getByText(/No source-backed explanation is available/)).toBeInTheDocument();
    expect(screen.getByText(/No recent developments recorded/)).toBeInTheDocument();
  });

  it('validated output with stale publication shows both facts, not “delivered”', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json(
          situation({
            activeGeneration: {
              generationId: GEN_ID,
              state: 'succeeded',
              capture: 'ready',
              publication: 'stale',
              attemptCoverage: 'recorded',
              safeFailureCode: null,
              stageCoverage: 'recorded',
              stages: [],
            },
            now: { ...situation().now, held: false, activeCommitment: null },
            why: [
              { statementCode: 'publication_stale', class: 'recorded', sourceRefs: [{ kind: 'generation', id: GEN_ID }], missing: [] },
            ],
          }),
        ),
    });
    renderQueue();
    await openSituation();
    const now = await screen.findByRole('region', { name: /what’s happening now/i });
    expect(within(now).getByText('Succeeded')).toBeInTheDocument();
    expect(within(now).getByText(/Stale — not published as a new scene/)).toBeInTheDocument();
    expect(screen.getByText(WHY_TEMPLATES.publication_stale)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/scene delivered/i);
  });

  it('legacy story shows not-instrumented coverage and unknown, not empty success', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json(
          situation({
            now: { kind: 'unknown', controllingRef: null, gameSecond: null, held: null, sourceConfidence: 'unknown', activeCommitment: null },
            activeGeneration: {
              generationId: GEN_ID, state: 'unknown', capture: 'not-recorded', publication: 'unknown',
              attemptCoverage: 'unknown', safeFailureCode: null, stageCoverage: 'not-instrumented', stages: [],
            },
            why: [{ statementCode: 'source_data_unavailable', class: 'unknown', sourceRefs: [], missing: ['stage-not-instrumented', 'mechanical-history-not-instrumented'] }],
            coverage: { currentState: 'partial', gameHistory: 'not-instrumented', storytellerStages: 'not-instrumented', promptBody: 'not-included' },
          }),
        ),
    });
    renderQueue();
    await openSituation();
    await screen.findByText('Current state unknown');
    expect(screen.getByText(WHY_TEMPLATES.source_data_unavailable)).toBeInTheDocument();
    expect(
      screen.getAllByText('Game history not instrumented').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Not instrumented \(legacy or pre-OBS02\)/)).toBeInTheDocument();
    expect(screen.getByText('Stage receipts not instrumented')).toBeInTheDocument();
  });

  it('interrupted action shows the source event and no success claim', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json(
          situation({
            why: [{ statementCode: 'action_interrupted', class: 'recorded', sourceRefs: [{ kind: 'action-execution-event', id: EVENT_ID }], missing: [] }],
          }),
        ),
    });
    renderQueue();
    await openSituation();
    await screen.findByText(WHY_TEMPLATES.action_interrupted);
    expect(screen.getAllByText(/Action event e0000000/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/transfer succeeded|reward granted/i);
  });

  it('has a deterministic template for every closed statement code', () => {
    for (const code of SUPPORT_REASON_CODES) {
      expect(WHY_TEMPLATES[code].length).toBeGreaterThan(20);
    }
  });

  it('server failure after data keeps earlier read, labelled not current', async () => {
    let calls = 0;
    useHandlers({
      situation: () =>
        ++calls === 1
          ? HttpResponse.json(situation())
          : new HttpResponse(null, { status: 500 }),
    });
    renderQueue();
    const user = await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    await user.click(screen.getByRole('button', { name: /^refresh$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/earlier and may no longer be current/i);
    expect(screen.getByRole('region', { name: /what’s happening now/i })).toBeInTheDocument();
  });

  it('manual refresh updates the pinned read; there is no polling', async () => {
    let calls = 0;
    const seen = useHandlers({
      situation: () =>
        HttpResponse.json(
          situation({ observedAt: ++calls === 1 ? '2026-11-15T12:00:00.000Z' : '2026-11-15T12:05:00.000Z' }),
        ),
    });
    renderQueue();
    const user = await openSituation();
    await screen.findByText('2026-11-15T12:00:00.000Z');
    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 50));
    expect(seen).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /^refresh$/i }));
    await screen.findByText('2026-11-15T12:05:00.000Z');
    expect(seen).toHaveLength(2);
  });
});

describe('Support Situation UI (revoke, epoch, abort)', () => {
  it('denial on refresh purges previously shown data', async () => {
    let calls = 0;
    useHandlers({
      situation: () =>
        ++calls === 1
          ? HttpResponse.json(situation())
          : HttpResponse.json({ version: 1, code: 'not_found', requestId: 'r' }, { status: 404 }),
    });
    const { queryClient } = renderQueue();
    const user = await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    await user.click(screen.getByRole('button', { name: /^refresh$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized or not yet linked/i);
    expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull();
    expect(screen.queryByText(/narration preparation/i)).toBeNull();
    await waitFor(() =>
      expect(
        queryClient.getQueryData(adminQueryKeys.supportSituation(STAFF, 1, CASE_ID, CAMPAIGN_ID)),
      ).toBeUndefined(),
    );
  });

  it('accessEpoch change drops the open panel and cached situation', async () => {
    const seen = useHandlers({});
    const { queryClient, rerenderWith } = renderQueue(selfFor(1));
    await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    expect(
      queryClient.getQueryData(adminQueryKeys.supportSituation(STAFF, 1, CASE_ID, CAMPAIGN_ID)),
    ).toBeDefined();

    rerenderWith(selfFor(2));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull(),
    );
    expect(document.body.textContent).not.toMatch(/narration preparation/i);
    // New epoch must not reuse the epoch-1 key.
    expect(
      queryClient.getQueryData(adminQueryKeys.supportSituation(STAFF, 2, CASE_ID, CAMPAIGN_ID)),
    ).toBeUndefined();
    expect(seen).toHaveLength(1);
  });

  it('closed or reassigned case after open removes the panel', async () => {
    let assigned = true;
    server.use(
      http.get('/api/admin/cases', () =>
        HttpResponse.json({
          version: 1,
          items: [caseItem(assigned ? {} : { status: 'closed' })],
          nextCursor: null,
        }),
      ),
      http.get(SITUATION_URL, () => HttpResponse.json(situation())),
    );
    const { queryClient } = renderQueue();
    await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    assigned = false;
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.cases(STAFF, 1) });
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull(),
    );
    expect(screen.getByText(/Investigation not authorized or not yet linked/)).toBeInTheDocument();
  });

  it('aborts the in-flight request when the panel unmounts', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const seen = useHandlers({
      situation: async () => {
        await gate;
        return HttpResponse.json(situation());
      },
    });
    const { view } = renderQueue();
    await openSituation();
    await waitFor(() => expect(seen).toHaveLength(1));
    view.unmount();
    await waitFor(() => expect(seen[0]!.signalAborted()).toBe(true));
    release();
  });
});

describe('Support Situation UI (sentinel, strict parse, safe copy)', () => {
  it('rejects a response carrying an unknown private field; sentinel never reaches DOM or cache', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json({ ...situation(), generationInput: SENTINEL }),
    });
    const { queryClient } = renderQueue();
    await openSituation();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Situation unavailable/);
    expect(document.body.textContent).not.toContain(SENTINEL);
    expect(document.body.innerHTML).not.toContain(SENTINEL);
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.state.data))).not.toContain(SENTINEL);
    expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull();
  });

  it('rejects a mismatched case/campaign pair instead of showing it', async () => {
    useHandlers({
      situation: () =>
        HttpResponse.json(situation({ campaignId: 'a0000000-0000-4000-8000-0000000000ff' })),
    });
    renderQueue();
    await openSituation();
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized or not yet linked/i);
    expect(screen.queryByRole('region', { name: /what’s happening now/i })).toBeNull();
  });

  it('copies only allowlisted ids and codes — no case title, prose or tokens', async () => {
    const seen = useHandlers({});
    renderQueue();
    const user = await openSituation();
    await screen.findByRole('region', { name: /what’s happening now/i });
    await user.click(screen.getByRole('button', { name: /copy safe source references/i }));
    expect(await screen.findByText(/Safe source references copied/)).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain(`case: ${CASE_ID}`);
    expect(copied).toContain(`campaign: ${CAMPAIGN_ID}`);
    expect(copied).toContain(`generation: ${GEN_ID}`);
    expect(copied).toContain(`stage: ${STAGE_ID}`);
    expect(copied).toContain('attempt=none-recorded');
    expect(copied).toContain('promptBody=not-included');
    expect(copied).not.toContain(CASE_TITLE);
    expect(copied).not.toMatch(/token|secret|hash|authorization|cookie|SENTINEL/i);
    // Every line is built from the DTO only.
    expect(copied).toBe(buildSafeReferral(situation()));
    // Network: one authorized S1 fetch, no secret/sentinel in the request.
    expect(seen).toHaveLength(1);
    expect(seen[0]!.headers).not.toContain(SENTINEL);
    expect(seen[0]!.url).not.toContain(SENTINEL);
  });
});
