import { execFileSync } from 'node:child_process';
import { DEV_CNPG_CLUSTER, DEV_CNPG_CONTEXT, DEV_CNPG_NAMESPACE } from '../../../../infra/platform/postgres/config.mjs';

const MUTATION = /\b(REVOKE|GRANT|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|VACUUM)\b/i;

export const DEV_SQL_CATALOG_QUERIES = [
  `SELECT datname, pg_get_userbyid(datdba) AS owner, datallowconn, COALESCE(array_to_string(datacl, ','), '<default-public>') AS acl FROM pg_database ORDER BY datname`,
  `SELECT rolname, rolsuper, rolcreatedb, rolinherit, rolcanlogin FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname`,
  `SELECT r.rolname AS role, m.rolname AS member FROM pg_auth_members am JOIN pg_roles r ON r.oid = am.roleid JOIN pg_roles m ON m.oid = am.member ORDER BY 1, 2`,
  `SELECT count(*)::text AS default_acl_count FROM pg_default_acl`,
  `SELECT COALESCE(datname, '-') AS datname, COALESCE(usename, '-') AS usename, COALESCE(state, '-') AS state, count(*)::text AS sessions FROM pg_stat_activity GROUP BY 1, 2, 3 ORDER BY 1, 2`,
];

export function assertReadOnlyCatalogSql(queries = DEV_SQL_CATALOG_QUERIES) {
  for (const sql of queries) {
    if (MUTATION.test(sql) || /password|secret/i.test(sql)) {
      const error = new Error('catalog probe refused a non-select statement');
      error.code = 'catalog-probe-not-readonly';
      throw error;
    }
  }
}

export function collectDevSqlCatalog(options = {}) {
  assertReadOnlyCatalogSql();
  const run = options.run ?? ((file, args) => execFileSync(file, args, { encoding: 'utf8' }));
  const context = options.context ?? DEV_CNPG_CONTEXT;
  const namespace = options.namespace ?? DEV_CNPG_NAMESPACE;
  const pod = options.pod ?? `${DEV_CNPG_CLUSTER}-1`;
  const sections = DEV_SQL_CATALOG_QUERIES.map((sql) => {
    const output = run('kubectl', [
      '--context', context,
      '-n', namespace,
      'exec', pod,
      '-c', 'postgres',
      '--',
      'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-A', '-F', '|', '-c', sql,
    ]);
    return output.trim();
  });
  return { context, namespace, pod, readOnly: true, sections };
}
