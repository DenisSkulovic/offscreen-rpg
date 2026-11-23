# Admin HTTP routes

Global prefix: `/api`. All controllers use `@Controller('admin')`. Staff gates flow through `AdminActorService` (`admin-actor-service.ts`); HTTP envelopes use `admin-http-errors.ts` (`mapAdminError`, `adminError`).

Registration order via [`bootstrap/api-controllers.ts`](../../bootstrap/api-controllers.ts) `buildApiControllers`: `ADMIN_HTTP_CONTROLLERS` from `controllers/registry.ts` (session → cases → players → evidence) after health/identity and before drafts/stories.

## Session (`controllers/admin-session.ts`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `admin/session/enter` | Sets admin cookie; `@HttpCode(200)` |
| GET | `admin/me` | Current staff self |
| POST | `admin/session/exit` | Idempotent; clears cookie; `@HttpCode(200)` |
| GET | `admin/staff/:staffId/access` | Self or `staff.access.inspect` |

## Cases (`controllers/admin-cases.ts`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `admin/cases` | `case.create`; player link needs `player.summary.read`; `@HttpCode(200)` |
| GET | `admin/cases` | `case.summary.read` list |
| GET | `admin/cases/:caseId` | Privacy 404 on deny |
| GET | `admin/cases/:caseId/campaigns/:campaignId/situation` | OBS06 forensics gate |
| POST | `admin/cases/:caseId/assign` | `case.assign`; `@HttpCode(200)` |
| POST | `admin/cases/:caseId/status` | `case.create` on case; `@HttpCode(200)` |

## Players (`controllers/admin-players.ts`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `admin/players?ref=&limit=` | Exact ref search; unauthorized → empty page |
| GET | `admin/players/:playerId` | `player.summary.read`; privacy 404 |
| GET | `admin/players/:playerId/campaigns` | Campaign list scoped by assignments |

## Evidence & diagnostics (`controllers/admin-evidence.ts`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `admin/audit` | `audit.events.read` |
| POST | `admin/access/check` | Access Inspector; `@HttpCode(200)` |
| GET | `admin/usage/status?accountRef=` | `commercial.usage.read` or `platform.spend.read` |
| GET | `admin/campaigns/:campaignId/operations` | Legacy campaign visibility + `ai.operation.read` |
| GET | `admin/operations/:operationId` | Redacted operation detail |

## DI tokens

Provider factories and `ADMIN_*` injection tokens are re-exported from `controller.ts`. Nest registers `AdminActorService` and session/access/read stores in [`bootstrap/api-providers.ts`](../../bootstrap/api-providers.ts) `buildApiProviders`, wired from `createApp`.