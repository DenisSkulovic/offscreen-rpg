#!/usr/bin/env node
/**
 * AD01 out-of-band staff bootstrap. Never auto-run at API startup.
 * Usage:
 *   node scripts/repo-tools/admin-bootstrap-staff.mjs \
 *     --auth-user-id <better-auth-user-id> \
 *     --environment local|staging \
 *     --actor-label <operator>
 *
 * Requires DATABASE_URL. Rejects --environment production.
 */
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { bootstrapAdminStaff } from '@offscreen/application/admin';

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

const authUserId = arg('--auth-user-id');
const environment = arg('--environment');
const actorLabel = arg('--actor-label');

if (!authUserId || !environment || !actorLabel) {
  console.error(
    'Required: --auth-user-id <id> --environment local|staging --actor-label <label>',
  );
  process.exit(2);
}

if (environment !== 'local' && environment !== 'staging') {
  console.error('Only local|staging are allowed for this CLI');
  process.exit(2);
}

const database = createDatabase(readDatabaseConfig(process.env), (error) => {
  console.error(error);
});

try {
  const result = await bootstrapAdminStaff(database, {
    authUserId,
    environment,
    actorLabel,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        created: result.created,
        staffPrincipalId: result.staffPrincipalId,
        assignmentId: result.assignmentId,
        assignmentStatus: 'active',
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await database.close();
}
