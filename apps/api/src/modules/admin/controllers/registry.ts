import { AdminSessionController } from './admin-session.js';
import { AdminCasesController } from './admin-cases.js';
import { AdminPlayersController } from './admin-players.js';
import { AdminEvidenceController } from './admin-evidence.js';

/** Registration order: session and list routes before parameterized reads/evidence. */
export const ADMIN_HTTP_CONTROLLERS = [
  AdminSessionController,
  AdminCasesController,
  AdminPlayersController,
  AdminEvidenceController,
] as const;
