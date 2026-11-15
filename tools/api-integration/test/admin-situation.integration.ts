/* eslint-disable @typescript-eslint/no-explicit-any -- raw SQL fixture rows and pg client patching are untyped by design */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { bootstrapAdminStaff } from '@offscreen/application/admin';
import {
  supportSituationV1Schema,
  type SupportSituationV1,
} from '@offscreen/contracts/admin';
import { withApiOnlyAuth, type ApiOnlyAuth } from './helpers/api-only-auth.js';

const SENTINEL = 'SENTINEL-OBS06-PRIVATE-9f3c';
const FORBIDDEN_KEYS = [
  'title',
  'summary',
  'manifest',
  'narrative',
  'prompt',
  'content',
  'input',
  'output',
  'cost',
  'premise',
];
const HEX64 = 'a'.repeat(64);

function combineCookies(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join('; ');
}

function adminCookieFrom(response: Response): string | null {
  const raw = response.headers.getSetCookie?.() ?? [];
  const line =
    raw.find((entry) => entry.startsWith('offscreen-admin=')) ??
    raw.find((entry) => entry.startsWith('__Host-offscreen-admin='));
  return line ? (line.split(';', 1)[0] ?? null) : null;
}

type Query = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;

function queryOf(context: ApiOnlyAuth): Query {
  return (sql, params) =>
    context.database.db.$client.query(sql, params) as Promise<{ rows: any[] }>;
}

/** Disposable fixture ledger so cleanup stays inside this suite's own rows. */
class Fixtures {
  readonly storyIds: string[] = [];
  readonly generationIds: string[] = [];
  readonly attemptIds: string[] = [];
  readonly runIds: string[] = [];
  readonly fundingIds: string[] = [];
  readonly caseIds: string[] = [];
  readonly assignmentIds: string[] = [];

  constructor(
    private readonly q: Query,
    readonly ownerId: string,
    readonly staffId: string,
  ) {}

  async story(opts: {
    ownerId?: string;
    revision?: number;
    withCampaign?: boolean;
    holds?: unknown[];
    gameSecond?: number;
    activeActionOperationId?: string | null;
  }) {
    const id = randomUUID();
    this.storyIds.push(id);
    await this.q(
      `INSERT INTO story (id, owner_id, source, revision, view_version, document_root_revision, premise)
       VALUES ($1, $2, $3, $4, 3, 0, $5::jsonb)`,
      [
        id,
        opts.ownerId ?? this.ownerId,
        `${SENTINEL}-source`,
        opts.revision ?? 1,
        JSON.stringify({ hidden: `${SENTINEL}-premise` }),
      ],
    );
    if (opts.withCampaign !== false) {
      await this.q(
        `INSERT INTO campaign (
           story_id, settings_revision, character, story_facts, game_second, clock,
           clock_anchor_at, clock_pace, holds, situation_authorization,
           world_conditions, active_action_operation_id
         ) VALUES (
           $1, 1, $2::jsonb, $3::jsonb, $4, '{}'::jsonb, now(), '{}'::jsonb,
           $5::jsonb, '{}'::jsonb, $6::jsonb, $7
         )`,
        [
          id,
          JSON.stringify({ name: `${SENTINEL}-character` }),
          JSON.stringify([`${SENTINEL}-fact`]),
          opts.gameSecond ?? 120,
          JSON.stringify(opts.holds ?? []),
          JSON.stringify([`${SENTINEL}-world`]),
          opts.activeActionOperationId ?? null,
        ],
      );
    }
    return id;
  }

  async passage(
    storyId: string,
    sequence: number,
    sourceGenerationId?: string,
  ) {
    const id = randomUUID();
    await this.q(
      `INSERT INTO story_passage (id, story_id, sequence, content, source_generation_id, source_generation_part, response)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb)`,
      [
        id,
        storyId,
        sequence,
        JSON.stringify({ text: `${SENTINEL}-passage` }),
        sourceGenerationId ?? null,
        sourceGenerationId ? 'current' : null,
        sourceGenerationId ? JSON.stringify({ text: SENTINEL }) : null,
      ],
    );
    return id;
  }

  async generation(opts: {
    state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';
    failureCode?: string;
    ownerId?: string;
    updatedAt?: string;
  }) {
    const id = randomUUID();
    this.generationIds.push(id);
    const needsAttempt = opts.state !== 'pending';
    await this.q(
      `INSERT INTO generation (id, owner_id, kind, status_revision, input, state, attempt_id, output, failure_code, updated_at)
       VALUES ($1, $2, 'storyteller.action.v1', 1, $3::jsonb, $4, $5, $6::jsonb, $7, COALESCE($8::timestamptz, now()))`,
      [
        id,
        opts.ownerId ?? this.ownerId,
        JSON.stringify({ prompt: `${SENTINEL}-input` }),
        opts.state,
        needsAttempt ? randomUUID() : null,
        opts.state === 'succeeded'
          ? JSON.stringify({ narrative: `${SENTINEL}-output` })
          : null,
        opts.state === 'failed' ? (opts.failureCode ?? 'invalid_output') : null,
        opts.updatedAt ?? null,
      ],
    );
    return id;
  }

  async capture(
    generationId: string,
    storyId: string,
    state: string,
    failureCode?: string,
  ) {
    await this.q(
      `INSERT INTO storyteller_context_capture (capture_id, story_id, operation_id, capture, capture_sha256, state, failure_code)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [
        generationId,
        storyId,
        randomUUID(),
        JSON.stringify({ secret: `${SENTINEL}-capture` }),
        HEX64,
        state,
        failureCode ?? null,
      ],
    );
  }

  async publication(generationId: string, state: string) {
    await this.q(
      `INSERT INTO storyteller_publication (generation_id, state) VALUES ($1, $2)`,
      [generationId, state],
    );
  }

  async stage(
    generationId: string,
    stage: string,
    outcome: string,
    failureClass: string | null,
    createdAt?: string,
  ) {
    const id = randomUUID();
    await this.q(
      `INSERT INTO storyteller_execution_stage (
         id, generation_id, stage, outcome, source_kind, failure_class,
         idempotency_key, producer_build_id, created_at
       ) VALUES ($1, $2, $3, $4, 'generation', $5, $6, 'obs06-test', COALESCE($7::timestamptz, now()))`,
      [
        id,
        generationId,
        stage,
        outcome,
        failureClass,
        randomUUID(),
        createdAt ?? null,
      ],
    );
    return id;
  }

  async attempt(generationId: string, storyId: string) {
    const fundingId = randomUUID();
    const runId = randomUUID();
    const attemptId = randomUUID();
    this.fundingIds.push(fundingId);
    this.runIds.push(runId);
    this.attemptIds.push(attemptId);
    await this.q(
      `INSERT INTO storyteller_funding (id, limit_microusd, settled_microusd, reserved_microusd, stopped, verified_at)
       VALUES ($1, 0, 0, 0, true, now())`,
      [fundingId],
    );
    await this.q(
      `INSERT INTO storyteller_run (id, account_id, limit_microusd, settled_microusd, reserved_microusd, max_attempts, admitted_attempts, enabled)
       VALUES ($1, $2, 0, 0, 0, 1, 0, false)`,
      [runId, fundingId],
    );
    await this.q(
      `INSERT INTO storyteller_attempt (
         id, generation_id, account_id, run_id, owner_id, story_id, purpose,
         storyteller_profile_id, storyteller_profile_revision,
         task_input_version, prompt_version, recipe_version, resource_policy_version,
         requested_model, requested_provider, price_version,
         attribution, state,
         reserved_microusd, reserved_input_tokens, reserved_generated_tokens,
         reserved_reasoning_tokens, estimated_microusd, estimated_input_tokens,
         estimation_method, reconciliation, request_bytes, policy
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'action', 'fixture', 1, 1, 'p1', 'r1', 'rp1',
         'fixture-model', 'fixture-provider', 'price-1', '{}'::jsonb, 'reserved',
         0, 0, 0, 0, 0, 0, 'fixture', 'pending', 0, '{}'::jsonb
       )`,
      [attemptId, generationId, fundingId, runId, this.ownerId, storyId],
    );
  }

  async publicEvent(
    storyId: string,
    sequence: number,
    kind: string,
    sourceKind: string,
    sourceId: string,
  ) {
    await this.q(
      `INSERT INTO story_public_event (id, story_id, event_sequence, kind, game_second, title, summary, source_kind, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        storyId,
        sequence,
        kind,
        sequence * 10,
        `${SENTINEL}-title`,
        `${SENTINEL}-summary`,
        sourceKind,
        sourceId,
      ],
    );
  }

  async execution(storyId: string, state: string) {
    const operationId = randomUUID();
    await this.q(
      `INSERT INTO game_action_execution (
         operation_id, story_id, offer_id, action_key, base_revision, offer, plan,
         start_game_second, target_game_second, state
       ) VALUES ($1, $2, $3, 'obs06', 1, '{}'::jsonb, $4::jsonb, 0, 100, $5)`,
      [
        operationId,
        storyId,
        randomUUID(),
        JSON.stringify({ secret: `${SENTINEL}-plan` }),
        state,
      ],
    );
    return operationId;
  }

  async executionEvent(storyId: string, executionId: string, kind: string) {
    const id = randomUUID();
    await this.q(
      `INSERT INTO game_action_execution_event (id, story_id, execution_id, execution_revision, game_second, kind, label)
       VALUES ($1, $2, $3, 1, 50, $4, $5)`,
      [id, storyId, executionId, kind, `${SENTINEL}-label`],
    );
    return id;
  }

  /** Trusted-steward fixture: the only path that mints a situation grant. */
  async grant(opts: {
    scope: Record<string, unknown>;
    provenance: Record<string, unknown>;
    status?: 'active' | 'inert' | 'revoked';
    pkg?: string;
    staffId?: string;
  }) {
    const id = randomUUID();
    this.assignmentIds.push(id);
    await this.q(
      `INSERT INTO admin_capability_assignment (id, staff_principal_id, package_id, package_version, status, scope, provenance, created_at)
       VALUES ($1, $2, $3, 1, $4, $5::jsonb, $6::jsonb, now())`,
      [
        id,
        opts.staffId ?? this.staffId,
        opts.pkg ?? 'support-investigator',
        opts.status ?? 'active',
        JSON.stringify(opts.scope),
        JSON.stringify(opts.provenance),
      ],
    );
    return id;
  }

  async assignedCase(campaignId: string, assignedStaffId?: string) {
    const id = randomUUID();
    this.caseIds.push(id);
    await this.q(
      `INSERT INTO admin_case (id, status, category, title, created_by_staff_id, assigned_staff_id, idempotency_key)
       VALUES ($1, 'assigned', 'campaign', 'obs06 fixture case', $2, $3, $4)`,
      [id, this.staffId, assignedStaffId ?? this.staffId, randomUUID()],
    );
    await this.q(
      `INSERT INTO admin_case_link (case_id, subject_kind, subject_id) VALUES ($1, 'campaign', $2)`,
      [id, campaignId],
    );
    return id;
  }

  /** Case + link + exact steward grant for one case/campaign pair. */
  async boundCase(campaignId: string) {
    const caseId = await this.assignedCase(campaignId);
    await this.grant({
      scope: {
        environments: ['local'],
        campaignIds: [campaignId],
        requireAuthorizedCaseAssignment: true,
      },
      provenance: {
        kind: 'steward-case-binding',
        authorizedCaseIds: [caseId],
      },
    });
    return caseId;
  }

  async cleanup() {
    const q = this.q;
    const stories = [this.storyIds];
    const gens = [this.generationIds];
    await q(
      `DELETE FROM story_public_event WHERE story_id = ANY($1::uuid[])`,
      stories,
    );
    await q(
      `DELETE FROM game_action_execution_event WHERE story_id = ANY($1::uuid[])`,
      stories,
    );
    await q(
      `DELETE FROM game_action_receipt WHERE story_id = ANY($1::uuid[])`,
      stories,
    );
    await q(
      `DELETE FROM game_action_execution WHERE story_id = ANY($1::uuid[])`,
      stories,
    );
    await q(
      `DELETE FROM storyteller_execution_stage WHERE generation_id = ANY($1::uuid[])`,
      gens,
    );
    await q(
      `DELETE FROM storyteller_publication WHERE generation_id = ANY($1::uuid[])`,
      gens,
    );
    await q(
      `DELETE FROM storyteller_context_capture WHERE capture_id = ANY($1::uuid[])`,
      gens,
    );
    await q(`DELETE FROM storyteller_attempt WHERE id = ANY($1::uuid[])`, [
      this.attemptIds,
    ]);
    await q(`DELETE FROM storyteller_run WHERE id = ANY($1::uuid[])`, [
      this.runIds,
    ]);
    await q(`DELETE FROM storyteller_funding WHERE id = ANY($1::uuid[])`, [
      this.fundingIds,
    ]);
    await q(
      `DELETE FROM story_passage WHERE story_id = ANY($1::uuid[])`,
      stories,
    );
    await q(`DELETE FROM story WHERE id = ANY($1::uuid[])`, stories);
    await q(`DELETE FROM generation WHERE id = ANY($1::uuid[])`, gens);
    await q(`DELETE FROM admin_case_link WHERE case_id = ANY($1::uuid[])`, [
      this.caseIds,
    ]);
    await q(`DELETE FROM admin_case WHERE id = ANY($1::uuid[])`, [
      this.caseIds,
    ]);
    await q(
      `DELETE FROM admin_capability_assignment WHERE id = ANY($1::uuid[])`,
      [this.assignmentIds],
    );
  }
}

async function staffSession(context: ApiOnlyAuth) {
  const { database, origin, user, cookie } = context;
  const boot = await bootstrapAdminStaff(database, {
    authUserId: user.id,
    environment: 'local',
    actorLabel: 'obs06-integration',
  });
  // Keep admin-reader narrow so it cannot widen anything in these proofs.
  await database.db.$client.query(
    `UPDATE admin_capability_assignment SET scope = $2::jsonb WHERE id = $1`,
    [
      boot.assignmentId,
      JSON.stringify({ environments: ['local'], playerIds: [user.id] }),
    ],
  );
  const q = queryOf(context);
  const fixtures = new Fixtures(q, user.id, boot.staffPrincipalId);
  // Existing Support Operator v1: case.summary.read/create only. NOT mutated.
  await fixtures.grant({
    pkg: 'support-operator',
    scope: { environments: ['local'] },
    provenance: { kind: 'obs06-fixture-support' },
  });
  await fixtures.grant({
    pkg: 'support-lead',
    scope: { environments: ['local'] },
    provenance: { kind: 'obs06-fixture-lead' },
  });
  const enter = await fetch(`${origin}/api/admin/session/enter`, {
    method: 'POST',
    headers: { cookie, origin },
  });
  assert.equal(enter.status, 200);
  const adminCookie = adminCookieFrom(enter);
  assert.ok(adminCookie);
  const headers = {
    cookie: combineCookies(cookie, adminCookie),
    origin,
    'content-type': 'application/json',
  };
  const get = (caseId: string, campaignId: string) =>
    fetch(
      `${origin}/api/admin/cases/${caseId}/campaigns/${campaignId}/situation`,
      { headers },
    );
  const read = async (caseId: string, campaignId: string) => {
    const response = await get(caseId, campaignId);
    const text = await response.text();
    assert.equal(response.status, 200, text);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.ok(!text.includes(SENTINEL), 'sentinel leaked into S1 JSON');
    const parsed = supportSituationV1Schema.parse(JSON.parse(text));
    const keys = JSON.stringify(Object.keys(flattenKeys(JSON.parse(text))));
    for (const forbidden of FORBIDDEN_KEYS) {
      assert.ok(!keys.includes(`"${forbidden}"`), `forbidden key ${forbidden}`);
    }
    return parsed;
  };
  return { boot, q, fixtures, headers, get, read, ...context };
}

function flattenKeys(value: unknown, out: Record<string, true> = {}) {
  if (Array.isArray(value)) {
    for (const entry of value) flattenKeys(entry, out);
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      out[key] = true;
      flattenKeys(entry, out);
    }
  }
  return out;
}

async function denied(response: Response) {
  const text = await response.text();
  assert.equal(response.status, 404, text);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.ok(!text.includes(SENTINEL));
  return JSON.parse(text) as { code: string };
}

test(
  'OBS06 authorization: operator denied, steward-bound investigator allowed, self-created links never authorize',
  { timeout: 180000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const s = await staffSession(context);
      const { fixtures, q } = s;
      try {
        const storyA = await fixtures.story({});
        const foreignStory = await fixtures.story({
          ownerId: context.otherUser.id,
        });
        await fixtures.passage(storyA, 1);
        const case1 = await fixtures.assignedCase(storyA);

        // 1. support-operator-v1 (case.summary.read) alone is denied.
        assert.equal(
          (await denied(await s.get(case1, storyA))).code,
          'not_found',
        );

        // 2. Steward-issued investigator grant for the exact pair is allowed.
        const grantId = await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [storyA],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [case1],
          },
        });
        const ok = await s.read(case1, storyA);
        assert.equal(ok.caseId, case1);
        assert.equal(ok.campaignId, storyA);
        assert.equal(ok.now.kind, 'idle');
        assert.equal(ok.coverage.promptBody, 'not-included');
        assert.equal(ok.sourceFrontier.latestPublishedPassageSequence, 1);

        // Strict contract: unknown fields are rejected.
        assert.throws(() =>
          supportSituationV1Schema.parse({ ...ok, prompt: 'x' }),
        );

        // 3. Self-created foreign campaign-linked case via the real API.
        const assignmentsBefore = (
          await q(
            `SELECT count(*)::int AS n FROM admin_capability_assignment WHERE staff_principal_id = $1`,
            [s.boot.staffPrincipalId],
          )
        ).rows[0].n;
        const created = await fetch(`${s.origin}/api/admin/cases`, {
          method: 'POST',
          headers: s.headers,
          body: JSON.stringify({
            idempotencyKey: randomUUID(),
            category: 'campaign',
            title: 'Self-made foreign link',
            link: { kind: 'campaign', id: foreignStory },
          }),
        });
        const createdBody = (await created.json()) as { id: string };
        assert.equal(created.status, 200);
        fixtures.caseIds.push(createdBody.id);
        const assign = await fetch(
          `${s.origin}/api/admin/cases/${createdBody.id}/assign`,
          {
            method: 'POST',
            headers: s.headers,
            body: JSON.stringify({ assignedStaffId: s.boot.staffPrincipalId }),
          },
        );
        assert.equal(assign.status, 200);
        const selfMade = createdBody.id;
        await denied(await s.get(selfMade, foreignStory));
        // Existing grant for case1/storyA does not leak to other pairs.
        await denied(await s.get(case1, foreignStory));
        await denied(await s.get(selfMade, storyA));
        assert.equal(
          (
            await q(
              `SELECT count(*)::int AS n FROM admin_capability_assignment WHERE staff_principal_id = $1`,
              [s.boot.staffPrincipalId],
            )
          ).rows[0].n,
          assignmentsBefore,
          'case create/assign must not mint grants',
        );

        // 4. No grant composition / untrusted shapes for the self-made pair.
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [foreignStory],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [case1], // proves a different case
          },
        });
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [storyA],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [selfMade], // proves self-made case, wrong campaign
          },
        });
        await denied(await s.get(selfMade, foreignStory));
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [selfMade],
          },
        });
        await fixtures.grant({
          scope: { environments: ['local'], campaignIds: [foreignStory] },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [selfMade],
          },
        });
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [foreignStory],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'case-create',
            authorizedCaseIds: [selfMade],
          },
        });
        await denied(await s.get(selfMade, foreignStory));

        // 5. Closed / open / reassigned case denies; restore allows again.
        const setCase = (status: string, assignee: string | null) =>
          q(
            `UPDATE admin_case SET status = $2, assigned_staff_id = $3 WHERE id = $1`,
            [case1, status, assignee],
          );
        await setCase('closed', s.boot.staffPrincipalId);
        await denied(await s.get(case1, storyA));
        await setCase('open', null);
        await denied(await s.get(case1, storyA));
        const other = await bootstrapAdminStaff(context.database, {
          authUserId: context.otherUser.id,
          environment: 'local',
          actorLabel: 'obs06-other-staff',
        });
        await setCase('assigned', other.staffPrincipalId);
        await denied(await s.get(case1, storyA));
        await setCase('assigned', s.boot.staffPrincipalId);
        await s.read(case1, storyA);

        // 6. Revoked / inert / wrong-environment grants deny.
        await q(
          `UPDATE admin_capability_assignment SET status = 'revoked' WHERE id = $1`,
          [grantId],
        );
        await denied(await s.get(case1, storyA));
        await q(
          `UPDATE admin_capability_assignment SET status = 'inert' WHERE id = $1`,
          [grantId],
        );
        await denied(await s.get(case1, storyA));
        await q(
          `UPDATE admin_capability_assignment SET status = 'active', scope = $2::jsonb WHERE id = $1`,
          [
            grantId,
            JSON.stringify({
              environments: ['production'],
              campaignIds: [storyA],
              requireAuthorizedCaseAssignment: true,
            }),
          ],
        );
        await denied(await s.get(case1, storyA));

        // 7. Missing story with otherwise valid-looking pair is the same 404.
        const ghost = randomUUID();
        const ghostCase = await fixtures.assignedCase(ghost);
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [ghost],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [ghostCase],
          },
        });
        await denied(await s.get(ghostCase, ghost));

        // 7b. Steward grant names the pair, but the case has no actual campaign link
        //     (or links a player only): the DB link gate still denies.
        const storyUnlinked = await fixtures.story({});
        const unlinkedCase = await fixtures.assignedCase(storyUnlinked);
        await q(`DELETE FROM admin_case_link WHERE case_id = $1`, [
          unlinkedCase,
        ]);
        await q(
          `INSERT INTO admin_case_link (case_id, subject_kind, subject_id) VALUES ($1, 'player', $2)`,
          [unlinkedCase, context.user.id],
        );
        await fixtures.grant({
          scope: {
            environments: ['local'],
            campaignIds: [storyUnlinked],
            requireAuthorizedCaseAssignment: true,
          },
          provenance: {
            kind: 'steward-case-binding',
            authorizedCaseIds: [unlinkedCase],
          },
        });
        await denied(await s.get(unlinkedCase, storyUnlinked));
        await q(`DELETE FROM admin_case_link WHERE case_id = $1`, [
          unlinkedCase,
        ]);
        await q(
          `INSERT INTO admin_case_link (case_id, subject_kind, subject_id) VALUES ($1, 'campaign', $2)`,
          [unlinkedCase, storyUnlinked],
        );
        await s.read(unlinkedCase, storyUnlinked);

        // 8. Malformed ids and absent staff cookie fail before data access.
        const bad = await fetch(
          `${s.origin}/api/admin/cases/not-a-uuid/campaigns/${storyA}/situation`,
          { headers: s.headers },
        );
        assert.equal(bad.status, 400);
        const noStaff = await fetch(
          `${s.origin}/api/admin/cases/${case1}/campaigns/${storyA}/situation`,
          { headers: { cookie: context.cookie, origin: s.origin } },
        );
        assert.equal(noStaff.status, 403);

        await q(
          `DELETE FROM admin_capability_assignment WHERE staff_principal_id = $1 AND package_id = 'support-investigator'`,
          [other.staffPrincipalId],
        );
      } finally {
        await fixtures.cleanup();
      }
    });
  },
);

test(
  'OBS06 situation states, Why codes, bounded rows and body-free JSON',
  { timeout: 240000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const s = await staffSession(context);
      const { fixtures, q } = s;
      try {
        // narrative-only: story without campaign row.
        const narrative = await fixtures.story({ withCampaign: false });
        await fixtures.passage(narrative, 1);
        const narrativeCase = await fixtures.boundCase(narrative);
        const n = await s.read(narrativeCase, narrative);
        assert.equal(n.now.kind, 'narrative-only');
        assert.equal(n.now.gameSecond, null);
        assert.equal(n.activeGeneration, null);
        assert.equal(n.coverage.gameHistory, 'not-instrumented');
        assert.equal(n.why[0]?.statementCode, 'source_data_unavailable');

        // storyteller-intent before any G: no fabricated generation/attempt.
        const intentOp = randomUUID();
        const intent = await fixtures.story({
          holds: [
            {
              kind: 'storyteller-intent',
              operationId: intentOp,
              reason: 'required-turn',
            },
          ],
        });
        const intentView = await s.read(
          await fixtures.boundCase(intent),
          intent,
        );
        assert.equal(intentView.now.kind, 'narration-intent');
        assert.equal(intentView.now.held, true);
        assert.deepEqual(intentView.now.controllingRef, {
          kind: 'storyteller-operation',
          id: intentOp,
        });
        assert.equal(intentView.activeGeneration, null);
        assert.ok(
          !intentView.why.some(
            (w) => w.statementCode === 'model_attempt_unverified',
          ),
        );

        // held G with a newer historical G that is NOT controlling; 15 stages -> 12.
        const heldStory = await fixtures.story({});
        const heldG = await fixtures.generation({
          state: 'pending',
          updatedAt: '2026-01-01T00:00:00Z',
        });
        await fixtures.capture(heldG, heldStory, 'held', 'scripted_hold');
        const histG = await fixtures.generation({
          state: 'succeeded',
          updatedAt: '2026-12-01T00:00:00Z',
        });
        await fixtures.capture(histG, heldStory, 'ready');
        await fixtures.publication(histG, 'published');
        await fixtures.passage(heldStory, 1, histG);
        let heldStageId = '';
        for (let i = 0; i < 15; i += 1) {
          const id = await fixtures.stage(
            heldG,
            i === 14 ? 'stage-held' : 'cause-captured',
            i === 14 ? 'held' : 'completed',
            i === 14 ? 'scripted_hold' : null,
            `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
          );
          if (i === 14) heldStageId = id;
        }
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          heldStory,
          JSON.stringify([
            {
              kind: 'storyteller',
              generationId: heldG,
              reason: 'required-turn',
            },
          ]),
        ]);
        const held = await s.read(
          await fixtures.boundCase(heldStory),
          heldStory,
        );
        assert.equal(held.now.kind, 'storyteller-generation');
        assert.equal(held.now.held, true);
        assert.equal(held.activeGeneration?.generationId, heldG);
        assert.notEqual(held.activeGeneration?.generationId, histG);
        assert.equal(held.activeGeneration?.capture, 'held');
        assert.equal(held.activeGeneration?.safeFailureCode, 'scripted_hold');
        assert.equal(held.activeGeneration?.stages.length, 12);
        assert.equal(held.activeGeneration?.stageCoverage, 'partial');
        assert.equal(held.activeGeneration?.attemptCoverage, 'none-recorded');
        const heldWhy = held.why.find(
          (w) => w.statementCode === 'context_materialization_held',
        );
        assert.ok(heldWhy);
        assert.ok(heldWhy.sourceRefs.some((r) => r.id === heldStageId));
        const unverified = held.why.find(
          (w) => w.statementCode === 'model_attempt_unverified',
        );
        assert.ok(
          unverified,
          'no attempt row must be unverified, never "model not run"',
        );
        assert.ok(unverified.missing.includes('attempt-not-recorded'));
        assert.ok(
          !held.why.some(
            (w) => w.statementCode === 'scripted_provider_skipped',
          ),
        );

        // scripted provider skipped is source-attested only by the OBS02 stage.
        const scriptedStory = await fixtures.story({});
        const scriptedG = await fixtures.generation({ state: 'pending' });
        await fixtures.capture(scriptedG, scriptedStory, 'ready');
        const skipId = await fixtures.stage(
          scriptedG,
          'stage-skipped',
          'not-run',
          'scripted_execution',
        );
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          scriptedStory,
          JSON.stringify([
            {
              kind: 'storyteller',
              generationId: scriptedG,
              reason: 'required-turn',
            },
          ]),
        ]);
        const scripted = await s.read(
          await fixtures.boundCase(scriptedStory),
          scriptedStory,
        );
        const skip = scripted.why.find(
          (w) => w.statementCode === 'scripted_provider_skipped',
        );
        assert.ok(skip);
        assert.equal(skip.sourceRefs[0]?.id, skipId);
        assert.ok(
          !scripted.why.some(
            (w) => w.statementCode === 'model_attempt_unverified',
          ),
        );
        assert.equal(scripted.activeGeneration?.stageCoverage, 'recorded');

        // Output succeeded vs publication states stay distinct.
        const seen = new Map<string, SupportSituationV1>();
        for (const state of [
          'pending',
          'published',
          'stale',
          'blocked',
        ] as const) {
          const storyId = await fixtures.story({ revision: 1 });
          await fixtures.passage(storyId, 1);
          const g = await fixtures.generation({ state: 'succeeded' });
          await fixtures.capture(g, storyId, 'ready');
          await fixtures.attempt(g, storyId);
          await fixtures.publication(g, state);
          if (state === 'published') await fixtures.passage(storyId, 2, g);
          await q(`UPDATE story SET revision = $2 WHERE id = $1`, [
            storyId,
            state === 'published' ? 2 : 1,
          ]);
          await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
            storyId,
            JSON.stringify([
              { kind: 'storyteller', generationId: g, reason: 'required-turn' },
            ]),
          ]);
          const view = await s.read(await fixtures.boundCase(storyId), storyId);
          seen.set(state, view);
          assert.equal(view.activeGeneration?.state, 'succeeded');
          assert.equal(view.activeGeneration?.publication, state);
          assert.equal(view.activeGeneration?.attemptCoverage, 'recorded');
        }
        const stale = seen.get('stale')!;
        assert.ok(
          stale.why.some((w) => w.statementCode === 'publication_stale'),
        );
        assert.ok(
          !stale.why.some((w) => w.statementCode === 'published_passage'),
        );
        assert.equal(stale.sourceFrontier.latestPublishedPassageSequence, 1);
        const published = seen.get('published')!;
        assert.ok(
          published.why.some((w) => w.statementCode === 'published_passage'),
        );
        assert.equal(
          published.sourceFrontier.latestPublishedPassageSequence,
          2,
        );
        assert.ok(
          !seen
            .get('blocked')!
            .why.some((w) => w.statementCode === 'publication_stale'),
        );

        // Failed validation is explicit and carries only an allowlisted code.
        const failedStory = await fixtures.story({});
        const failedG = await fixtures.generation({
          state: 'failed',
          failureCode: 'invalid_output',
        });
        await fixtures.capture(failedG, failedStory, 'ready');
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          failedStory,
          JSON.stringify([
            {
              kind: 'storyteller',
              generationId: failedG,
              reason: 'required-turn',
            },
          ]),
        ]);
        const failedView = await s.read(
          await fixtures.boundCase(failedStory),
          failedStory,
        );
        assert.equal(failedView.activeGeneration?.state, 'failed');
        assert.equal(
          failedView.activeGeneration?.safeFailureCode,
          'invalid_output',
        );
        assert.ok(
          failedView.why.some((w) => w.statementCode === 'validation_failed'),
        );
        // Free-text failure codes collapse to the generic code.
        await q(`UPDATE generation SET failure_code = $2 WHERE id = $1`, [
          failedG,
          `${SENTINEL}-free-text-failure`,
        ]);
        const generic = await s.read(
          await fixtures.boundCase(failedStory),
          failedStory,
        );
        assert.equal(generic.activeGeneration?.safeFailureCode, 'failed');

        // Interrupted action: no receipt, no settlement claim; events cap at 8.
        const actionStory = await fixtures.story({});
        await fixtures.passage(actionStory, 1);
        const execution = await fixtures.execution(actionStory, 'interrupted');
        const interruptedEvent = await fixtures.executionEvent(
          actionStory,
          execution,
          'interrupted',
        );
        await fixtures.publicEvent(
          actionStory,
          100,
          'action-interrupted',
          'action-execution',
          interruptedEvent,
        );
        for (let i = 1; i <= 9; i += 1) {
          await fixtures.publicEvent(
            actionStory,
            i,
            'world-development',
            'world-obligation',
            randomUUID(),
          );
        }
        const actionView = await s.read(
          await fixtures.boundCase(actionStory),
          actionStory,
        );
        assert.equal(actionView.recentDevelopments.length, 8);
        assert.equal(
          actionView.recentDevelopments[0]?.kind,
          'action-interrupted',
        );
        assert.equal(actionView.recentDevelopments[0]?.eventSequence, '100');
        const interrupted = actionView.why.find(
          (w) => w.statementCode === 'action_interrupted',
        );
        assert.ok(interrupted);
        assert.ok(interrupted.sourceRefs.some((r) => r.id === execution));
        assert.ok(
          !actionView.why.some(
            (w) => w.statementCode === 'action_settlement_recorded',
          ),
        );
        assert.equal(actionView.coverage.gameHistory, 'partial');

        // Active finite action alongside no hold; hold + action shown separately.
        const runningStory = await fixtures.story({});
        const runningOp = await fixtures.execution(runningStory, 'running');
        await q(
          `UPDATE campaign SET active_action_operation_id = $2 WHERE story_id = $1`,
          [runningStory, runningOp],
        );
        const running = await s.read(
          await fixtures.boundCase(runningStory),
          runningStory,
        );
        assert.equal(running.now.kind, 'finite-action');
        assert.equal(running.now.held, false);
        assert.equal(running.now.activeCommitment?.status, 'running');
        const decisionOffer = randomUUID();
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          runningStory,
          JSON.stringify([
            {
              kind: 'decision',
              offerId: decisionOffer,
              reason: 'player-choice',
            },
          ]),
        ]);
        const both = await s.read(
          await fixtures.boundCase(runningStory),
          runningStory,
        );
        assert.equal(both.now.kind, 'decision-hold');
        assert.equal(both.now.activeCommitment?.kind, 'finite-action');

        // Multiple holds are a visible conflict, never silently ordered.
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          runningStory,
          JSON.stringify([
            {
              kind: 'decision',
              offerId: decisionOffer,
              reason: 'player-choice',
            },
            {
              kind: 'storyteller-intent',
              operationId: randomUUID(),
              reason: 'required-turn',
            },
          ]),
        ]);
        const conflict = await s.read(
          await fixtures.boundCase(runningStory),
          runningStory,
        );
        assert.equal(conflict.now.kind, 'conflicting-sources');
        assert.equal(conflict.now.controllingRef, null);

        // A hold naming another story's G exposes no generation detail.
        const foreignStory = await fixtures.story({
          ownerId: context.otherUser.id,
        });
        const foreignG = await fixtures.generation({
          state: 'pending',
          ownerId: context.otherUser.id,
        });
        await fixtures.capture(foreignG, foreignStory, 'held', 'blocked');
        const mismatchStory = await fixtures.story({});
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          mismatchStory,
          JSON.stringify([
            {
              kind: 'storyteller',
              generationId: foreignG,
              reason: 'required-turn',
            },
          ]),
        ]);
        const mismatch = await s.read(
          await fixtures.boundCase(mismatchStory),
          mismatchStory,
        );
        assert.equal(mismatch.now.kind, 'conflicting-sources');
        assert.equal(mismatch.activeGeneration, null);
        assert.ok(!JSON.stringify(mismatch).includes(foreignG));

        // Corrupt holds JSON is "unknown", not a 500 and not "idle".
        await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
          mismatchStory,
          JSON.stringify([{ kind: 'mystery' }]),
        ]);
        const corrupt = await s.read(
          await fixtures.boundCase(mismatchStory),
          mismatchStory,
        );
        assert.equal(corrupt.now.kind, 'unknown');
        assert.equal(corrupt.now.sourceConfidence, 'unknown');
      } finally {
        await fixtures.cleanup();
      }
    });
  },
);

test(
  'OBS06 GET performs zero writes and query/row work is independent of history size',
  { timeout: 240000 },
  async () => {
    await withApiOnlyAuth(async (context) => {
      const s = await staffSession(context);
      const { fixtures, q } = s;

      // Count real client.query calls (BEGIN..COMMIT included) per request.
      const pool = context.database.db.$client as unknown as {
        connect: (cb?: unknown) => unknown;
      };
      const counter = { n: 0 };
      const originalConnect = pool.connect.bind(pool) as (
        cb?: unknown,
      ) => unknown;
      const patch = (client: any) => {
        if (client && !client.__obs06Counted) {
          const original = client.query.bind(client);
          client.query = (...args: unknown[]) => {
            counter.n += 1;
            return original(...args);
          };
          client.__obs06Counted = true;
        }
        return client;
      };
      pool.connect = ((cb?: unknown) => {
        if (typeof cb === 'function') {
          return originalConnect(
            (err: unknown, client: unknown, done: unknown) =>
              (cb as (...a: unknown[]) => unknown)(
                err,
                client && patch(client),
                done,
              ),
          );
        }
        return (originalConnect() as Promise<unknown>).then(patch);
      }) as typeof pool.connect;

      try {
        async function heldFixture(scale: 'small' | 'large') {
          const storyId = await fixtures.story({
            revision: scale === 'large' ? 2000 : 3,
          });
          const g = await fixtures.generation({ state: 'pending' });
          await fixtures.capture(g, storyId, 'held', 'blocked');
          const stageCount = scale === 'large' ? 40 : 3;
          for (let i = 0; i < stageCount; i += 1) {
            await fixtures.stage(g, 'cause-captured', 'completed', null);
          }
          await q(`UPDATE campaign SET holds = $2::jsonb WHERE story_id = $1`, [
            storyId,
            JSON.stringify([
              { kind: 'storyteller', generationId: g, reason: 'required-turn' },
            ]),
          ]);
          if (scale === 'large') {
            await q(
              `INSERT INTO story_passage (id, story_id, sequence, content)
               SELECT gen_random_uuid(), $1, s, '{}'::jsonb FROM generate_series(1, 2000) s`,
              [storyId],
            );
            await q(
              `INSERT INTO story_public_event (id, story_id, event_sequence, kind, game_second, title, source_kind, source_id)
               SELECT gen_random_uuid(), $1, s, 'world-development', s, 'x', 'world-obligation', gen_random_uuid()
               FROM generate_series(1, 400) s`,
              [storyId],
            );
            const filler = await q(
              `INSERT INTO generation (id, owner_id, kind, status_revision, input, state)
               SELECT gen_random_uuid(), $1, 'storyteller.action.v1', 1, '{}'::jsonb, 'pending'
               FROM generate_series(1, 1000) RETURNING id`,
              [context.user.id],
            );
            for (const row of filler.rows) fixtures.generationIds.push(row.id);
          } else {
            await fixtures.passage(storyId, 3);
          }
          return { storyId, caseId: await fixtures.boundCase(storyId), g };
        }

        const small = await heldFixture('small');
        const large = await heldFixture('large');

        async function measure(fixture: { storyId: string; caseId: string }) {
          await s.read(fixture.caseId, fixture.storyId); // warm
          const samples: number[] = [];
          let queries = 0;
          for (let i = 0; i < 5; i += 1) {
            counter.n = 0;
            const start = performance.now();
            await s.read(fixture.caseId, fixture.storyId);
            samples.push(performance.now() - start);
            queries = counter.n;
          }
          samples.sort((a, b) => a - b);
          return { queries, p50: samples[2]!, max: samples[4]! };
        }

        // Zero-write proof: row hashes + counts before/after repeated GETs.
        const fingerprint = async () =>
          (
            await q(
              `SELECT
                 (SELECT count(*) FROM story)::int AS stories,
                 (SELECT count(*) FROM generation)::int AS generations,
                 (SELECT count(*) FROM story_passage)::int AS passages,
                 (SELECT count(*) FROM story_public_event)::int AS events,
                 (SELECT count(*) FROM storyteller_execution_stage)::int AS stages,
                 (SELECT count(*) FROM storyteller_attempt)::int AS attempts,
                 (SELECT count(*) FROM outbox)::int AS outbox,
                 (SELECT count(*) FROM game_action_receipt)::int AS receipts,
                 (SELECT count(*) FROM admin_audit_event)::int AS audits,
                 (SELECT md5(coalesce(string_agg(to_jsonb(c)::text, '|' ORDER BY c.story_id), '')) FROM campaign c) AS campaigns,
                 (SELECT md5(coalesce(string_agg(to_jsonb(g)::text, '|' ORDER BY g.id), '')) FROM generation g) AS generation_rows,
                 (SELECT md5(coalesce(string_agg(to_jsonb(c)::text, '|' ORDER BY c.capture_id), '')) FROM storyteller_context_capture c) AS captures,
                 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text, '|' ORDER BY s.id), '')) FROM story s) AS story_rows`,
            )
          ).rows[0];
        const before = await fingerprint();
        const smallStats = await measure(small);
        const largeStats = await measure(large);
        const after = await fingerprint();
        assert.deepEqual(
          after,
          before,
          'GET must not write any game/generation/outbox/audit row',
        );

        // Query count is identical for 3-passage and 2,000-passage / 1,400-G worlds.
        assert.equal(largeStats.queries, smallStats.queries);
        // Whole-request count: auth/session/grant lookups + one snapshot read (~17).
        assert.ok(
          smallStats.queries <= 40,
          `query count ${smallStats.queries}`,
        );

        const large2 = await s.read(large.caseId, large.storyId);
        assert.equal(large2.activeGeneration?.stages.length, 12);
        assert.equal(large2.recentDevelopments.length, 8);
        assert.equal(large2.recentDevelopments[0]?.eventSequence, '400');
        assert.equal(
          large2.sourceFrontier.latestPublishedPassageSequence,
          2000,
        );

        // Access-path evidence for the receipt (indexes, not assumptions).
        const explain = async (sql: string, params: unknown[]) =>
          JSON.stringify(
            (await q(`EXPLAIN (FORMAT JSON) ${sql}`, params)).rows[0][
              'QUERY PLAN'
            ],
          );
        const plans = {
          passage: await explain(
            `SELECT id, sequence FROM story_passage WHERE story_id = $1 AND sequence = $2 LIMIT 1`,
            [large.storyId, 2000],
          ),
          events: await explain(
            `SELECT id FROM story_public_event WHERE story_id = $1 ORDER BY event_sequence DESC LIMIT 8`,
            [large.storyId],
          ),
          stages: await explain(
            `SELECT id FROM storyteller_execution_stage WHERE generation_id = $1 ORDER BY created_at DESC, id DESC LIMIT 13`,
            [large.g],
          ),
        };
        console.log(
          'OBS06_PERF',
          JSON.stringify({
            small: smallStats,
            large: largeStats,
            plans: Object.fromEntries(
              Object.entries(plans).map(([key, value]) => [
                key,
                [...value.matchAll(/"Node Type":"([^"]+)"/g)]
                  .map((m) => m[1])
                  .join('>'),
              ]),
            ),
          }),
        );
      } finally {
        pool.connect = originalConnect as typeof pool.connect;
        await fixtures.cleanup();
      }
    });
  },
);
