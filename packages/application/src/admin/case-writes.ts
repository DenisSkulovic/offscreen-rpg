import { and, desc, eq, lt } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import {
  adminAuditEvent,
  adminCase,
  adminCaseLink,
  adminStaffPrincipal,
} from '@offscreen/db/admin-schema';
import type {
  CaseCreateRequestV1,
  CaseSummaryPageV1,
  CaseSummaryV1,
} from '@offscreen/contracts/admin';
import { AdminSessionError } from './session.js';

const PAGE_SIZE = 20;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function sanitizeTitle(title: string): string {
  const cleaned = title.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
  if (!cleaned) throw new AdminSessionError('not_authorized', 'invalid_title');
  return cleaned;
}

export function projectCaseSummary(
  row: {
    id: string;
    status: CaseSummaryV1['status'];
    category: CaseSummaryV1['category'];
    title: string;
    createdByStaffId: string;
    assignedStaffId: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  links: CaseSummaryV1['links'],
): CaseSummaryV1 {
  return {
    id: row.id,
    status: row.status,
    category: row.category,
    title: row.title,
    createdByStaffId: row.createdByStaffId,
    assignedStaffId: row.assignedStaffId,
    links,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function createAdminCaseStore(database: Database) {
  async function loadLinks(caseId: string): Promise<CaseSummaryV1['links']> {
    const rows = await database.db
      .select({
        kind: adminCaseLink.subjectKind,
        id: adminCaseLink.subjectId,
      })
      .from(adminCaseLink)
      .where(eq(adminCaseLink.caseId, caseId))
      .limit(8);
    return rows;
  }

  async function loadSummary(caseId: string): Promise<CaseSummaryV1 | null> {
    const [row] = await database.db
      .select()
      .from(adminCase)
      .where(eq(adminCase.id, caseId))
      .limit(1);
    if (!row) return null;
    return projectCaseSummary(row, await loadLinks(caseId));
  }

  async function appendAudit(input: {
    kind: string;
    staffPrincipalId: string;
    payload?: unknown;
  }) {
    await database.db.insert(adminAuditEvent).values({
      kind: input.kind,
      staffPrincipalId: input.staffPrincipalId,
      payload: input.payload ?? {},
    });
  }

  return {
    async createCase(input: {
      actorStaffId: string;
      request: CaseCreateRequestV1;
    }): Promise<CaseSummaryV1> {
      const title = sanitizeTitle(input.request.title);
      const existing = await database.db
        .select()
        .from(adminCase)
        .where(eq(adminCase.idempotencyKey, input.request.idempotencyKey))
        .limit(1);
      if (existing[0]) {
        return (await loadSummary(existing[0].id))!;
      }

      const [row] = await database.db
        .insert(adminCase)
        .values({
          status: 'open',
          category: input.request.category,
          title,
          createdByStaffId: input.actorStaffId,
          idempotencyKey: input.request.idempotencyKey,
        })
        .returning();
      if (!row) throw new AdminSessionError('unavailable');

      if (input.request.link) {
        await database.db.insert(adminCaseLink).values({
          caseId: row.id,
          subjectKind: input.request.link.kind,
          subjectId: input.request.link.id,
        });
      }

      await appendAudit({
        kind: 'admin.case.created',
        staffPrincipalId: input.actorStaffId,
        payload: {
          caseId: row.id,
          category: row.category,
          linkedKind: input.request.link?.kind,
        },
      });

      return (await loadSummary(row.id))!;
    },

    async readCase(caseId: string): Promise<CaseSummaryV1> {
      const summary = await loadSummary(caseId);
      if (!summary) throw new AdminSessionError('not_authorized');
      return summary;
    },

    async listCases(input: {
      cursor?: string | null;
    }): Promise<CaseSummaryPageV1> {
      const filters = [];
      if (input.cursor) {
        filters.push(lt(adminCase.updatedAt, new Date(input.cursor)));
      }
      const rows = await database.db
        .select()
        .from(adminCase)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(adminCase.updatedAt))
        .limit(PAGE_SIZE + 1);

      const page = rows.slice(0, PAGE_SIZE);
      const items: CaseSummaryV1[] = [];
      for (const row of page) {
        items.push(projectCaseSummary(row, await loadLinks(row.id)));
      }
      const next =
        rows.length > PAGE_SIZE
          ? toIso(page[page.length - 1]!.updatedAt)
          : null;
      return { version: 1, items, nextCursor: next };
    },

    async assignCase(input: {
      actorStaffId: string;
      caseId: string;
      assignedStaffId: string;
    }): Promise<CaseSummaryV1> {
      const [assignee] = await database.db
        .select({ id: adminStaffPrincipal.id, status: adminStaffPrincipal.status })
        .from(adminStaffPrincipal)
        .where(eq(adminStaffPrincipal.id, input.assignedStaffId))
        .limit(1);
      if (!assignee || assignee.status !== 'active') {
        throw new AdminSessionError('not_authorized');
      }

      const [row] = await database.db
        .update(adminCase)
        .set({
          assignedStaffId: input.assignedStaffId,
          status: 'assigned',
          updatedAt: new Date(),
        })
        .where(eq(adminCase.id, input.caseId))
        .returning();
      if (!row) throw new AdminSessionError('not_authorized');

      await appendAudit({
        kind: 'admin.case.assigned',
        staffPrincipalId: input.actorStaffId,
        payload: {
          caseId: row.id,
          assignedStaffId: input.assignedStaffId,
        },
      });
      return (await loadSummary(row.id))!;
    },

    async updateStatus(input: {
      actorStaffId: string;
      caseId: string;
      status: CaseSummaryV1['status'];
    }): Promise<CaseSummaryV1> {
      const [row] = await database.db
        .update(adminCase)
        .set({
          status: input.status,
          updatedAt: new Date(),
          ...(input.status === 'open' ? { assignedStaffId: null } : {}),
        })
        .where(eq(adminCase.id, input.caseId))
        .returning();
      if (!row) throw new AdminSessionError('not_authorized');
      await appendAudit({
        kind: 'admin.case.status',
        staffPrincipalId: input.actorStaffId,
        payload: { caseId: row.id, status: input.status },
      });
      return (await loadSummary(row.id))!;
    },
  };
}

export type AdminCaseStore = ReturnType<typeof createAdminCaseStore>;
