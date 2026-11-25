import { ADMIN_IMAGE, SQL_IMAGE } from './config.mjs';
import { metadata, podSecurity, secretEnv, securityContext } from './deployment.mjs';

// Schema versions are taken from schema/postgresql/v12/version.go at v1.32.2.
// Deliberately require exact versions, not a guessed compatibility range.
export function classifySchema(output, expectedVersion) {
  if (output === 'empty') return 'empty';
  if (output === 'version:' + expectedVersion) return 'compatible';
  return 'incompatible';
}

function job(config, name, image, script, env) {
  return {
    apiVersion: 'batch/v1', kind: 'Job', metadata: metadata(config, name),
    spec: {
      backoffLimit: 0, activeDeadlineSeconds: 180, ttlSecondsAfterFinished: 600,
      template: {
        spec: {
          restartPolicy: 'Never', automountServiceAccountToken: false, enableServiceLinks: false,
          securityContext: { ...podSecurity, runAsUser: 1000 },
          containers: [{
            name: 'operation', image, imagePullPolicy: 'IfNotPresent',
            command: ['/bin/sh', '-c', script], env, securityContext,
            resources: { requests: { cpu: '20m', memory: '64Mi' }, limits: { cpu: '500m', memory: '320Mi' } },
          }],
        },
      },
    },
  };
}

function connectionEnv(config, store, passwordKey) {
  return [
    { name: 'PGHOST', value: config.endpoint },
    { name: 'PGPORT', value: String(config.port) },
    { name: 'PGDATABASE', value: store.database },
    secretEnv(config, 'PGUSER', 'username'),
    secretEnv(config, passwordKey, 'password'),
    { name: 'PGCONNECT_TIMEOUT', value: '5' },
  ];
}

export function inspectionJob(config, store, name) {
  const script = [
    'set -eu',
    'test "$(psql -w -Atqc \'SELECT NOT pg_is_in_recovery()\')" = t',
    'test "$(psql -w -Atqc \'SELECT current_database()\')" = "$PGDATABASE"',
    'if [ "$(psql -w -Atqc "SELECT to_regclass(\'public.schema_version\') IS NOT NULL")" = t ]; then',
    '  version="$(psql -w -Atqc \'SELECT curr_version FROM public.schema_version\')"',
    '  printf "version:%s\\n" "$version"',
    'else',
    '  count="$(psql -w -Atqc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN (\'pg_catalog\',\'information_schema\') AND n.nspname NOT LIKE \'pg_toast%\' AND c.relkind IN (\'r\',\'p\',\'v\',\'m\',\'f\',\'S\')")"',
    '  if [ "$count" = 0 ]; then echo empty; else echo partial; fi',
    'fi',
  ].join('\n');
  return job(config, name, SQL_IMAGE, script, connectionEnv(config, store, 'PGPASSWORD'));
}

export function initializationJob(config, store, name) {
  const directory = '/etc/temporal/schema/postgresql/v12/' + store.directory + '/versioned';
  const script = [
    'set -eu',
    'temporal-sql-tool --plugin postgres12 --ep "$PGHOST" -u "$PGUSER" -p "$PGPORT" --db "$PGDATABASE" setup-schema -v 0.0',
    'temporal-sql-tool --plugin postgres12 --ep "$PGHOST" -u "$PGUSER" -p "$PGPORT" --db "$PGDATABASE" update-schema -d ' + directory,
  ].join('\n');
  return job(config, name, ADMIN_IMAGE, script, connectionEnv(config, store, 'SQL_PASSWORD'));
}
