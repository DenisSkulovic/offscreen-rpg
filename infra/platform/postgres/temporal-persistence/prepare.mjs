import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseAllDocuments } from 'yaml';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../../common/commands.mjs';
import { readPlatformProfile } from '../../common/profile.mjs';
import { baselineCnpgClusterName, parseCnpgPin } from '../config.mjs';
import { assessCnpgClusterTopologyReadiness } from '../cluster-readiness.mjs';

const ROLE = 'temporal';
const SECRET = 'temporal-db';
const DATABASES = ['temporal', 'temporal_visibility'];
const ROLE_RESOURCE = 'databaserole.postgresql.cnpg.io';
const DATABASE_RESOURCE = 'database.postgresql.cnpg.io';
const CLUSTER_RESOURCE = 'cluster.postgresql.cnpg.io';
const RECONCILE_TIMEOUT_MS = 180_000;
const POLL_MS = 1_000;

function readResources(profile) {
  const source = readFileSync(new URL('./resources.yaml', import.meta.url), 'utf8');
  const documents = parseAllDocuments(source);
  if (documents.length !== 3 || documents.some((doc) => doc.errors.length)) {
    throw new Error('invalid Temporal persistence declarations');
  }
  const expected = [
    ['DatabaseRole', ROLE, ROLE],
    ['Database', 'temporal', 'temporal'],
    ['Database', 'temporal-visibility', 'temporal_visibility'],
  ];
  return documents.map((doc, index) => {
    const resource = doc.toJS();
    const [kind, name, sqlName] = expected[index];
    if (
      resource?.apiVersion !== 'postgresql.cnpg.io/v1' ||
      resource.kind !== kind ||
      resource.metadata?.name !== name ||
      resource.spec?.name !== sqlName
    ) {
      throw new Error('unexpected Temporal persistence resource identity');
    }
    const spec = resource.spec;
    if (
      spec.ensure !== 'present' ||
      (kind === 'DatabaseRole' &&
        (spec.login !== false || spec.inherit !== false ||
          ['superuser', 'createdb', 'createrole', 'replication', 'bypassrls'].some((key) => spec[key] !== false) ||
          !Array.isArray(spec.inRoles) || spec.inRoles.length !== 0 ||
          spec.databaseRoleReclaimPolicy !== 'retain' || spec.passwordSecret?.name !== SECRET)) ||
      (kind === 'Database' &&
        (spec.owner !== ROLE || spec.allowConnections !== false || spec.databaseReclaimPolicy !== 'retain'))
    ) {
      throw new Error('unsafe Temporal persistence declaration');
    }
    resource.metadata.namespace = profile.namespaces.postgres;
    resource.metadata.labels = {
      [profile.id === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab']:
        profile.ownerValue,
      'app.kubernetes.io/part-of': 'temporal',
    };
    resource.spec.cluster = { name: baselineCnpgClusterName(profile.id) };
    return resource;
  });
}

function createAccess(profile, run) {
  const namespace = profile.namespaces.postgres;
  const clusterName = baselineCnpgClusterName(profile.id);
  const read = (resource, name, clusterScoped = false) =>
    readPlatformObject(
      {
        profileId: profile.id,
        resource,
        name,
        ...(clusterScoped ? {} : { namespace }),
      },
      { run },
    );

  function requireObject(resource, name, clusterScoped = false) {
    const observation = read(resource, name, clusterScoped);
    if (observation.state !== 'present') {
      throw new Error(`Temporal prerequisite ${resource}/${name} is not readable and present`);
    }
    return observation.object;
  }

  function kubectl(args, options = {}) {
    const result = run(
      'kubectl',
      ['--context', profile.contextName, '-n', namespace, ...args],
      options,
    );
    // Never forward raw subprocess output: Secret creation and authentication
    // errors can contain credentials or input manifests.
    if (!result.ok) throw new Error(`Temporal persistence kubectl ${args[0]} failed`);
    return result.stdout ?? '';
  }

  const namespaceObject = requireObject('namespace', namespace, true);
  const ownerKey = profile.id === 'dev' ? 'offscreen.dev/owner' : 'offscreen.rpg/lab';
  if (
    !namespaceObject.metadata?.uid ||
    namespaceObject.metadata?.labels?.[ownerKey] !== profile.ownerValue ||
    namespaceObject.metadata?.deletionTimestamp
  ) {
    throw new Error('foreign or terminating PostgreSQL namespace');
  }
  const namespaceUid = namespaceObject.metadata.uid;
  const cluster = requireObject(CLUSTER_RESOURCE, clusterName);
  const clusterUid = cluster.metadata?.uid;
  const pin = parseCnpgPin(readFileSync(new URL('../operator.pin', import.meta.url), 'utf8'));
  const bootstrap = profile.id === 'dev' ? 'dev' : 'lab';
  if (
    !clusterUid ||
    cluster.spec?.imageName !== pin.postgresImage ||
    cluster.spec?.bootstrap?.initdb?.database !== bootstrap ||
    cluster.spec?.bootstrap?.initdb?.owner !== bootstrap ||
    (profile.id === 'dev' && cluster.metadata?.labels?.[ownerKey] !== profile.ownerValue)
  ) {
    throw new Error('foreign PostgreSQL baseline cluster');
  }

  function assertNamespace() {
    const current = requireObject('namespace', namespace, true);
    if (
      current.metadata?.uid !== namespaceUid ||
      current.metadata?.labels?.[ownerKey] !== profile.ownerValue ||
      current.metadata?.deletionTimestamp
    ) {
      throw new Error('PostgreSQL namespace identity changed');
    }
  }

  function primary() {
    assertNamespace();
    const current = requireObject(CLUSTER_RESOURCE, clusterName);
    if (current.metadata?.uid !== clusterUid || current.metadata?.deletionTimestamp) {
      throw new Error('PostgreSQL cluster identity changed');
    }
    const readiness = assessCnpgClusterTopologyReadiness(current, current.spec?.instances);
    if (!readiness.ok) throw new Error('PostgreSQL cluster is not healthy');
    const pod = requireObject('pod', readiness.currentPrimary);
    if (
      pod.metadata?.labels?.['cnpg.io/cluster'] !== clusterName ||
      pod.metadata?.labels?.['cnpg.io/instanceRole'] !== 'primary' ||
      pod.metadata?.deletionTimestamp
    ) {
      throw new Error('PostgreSQL primary identity mismatch');
    }
    return readiness.currentPrimary;
  }

  function sql(statement, database = 'postgres') {
    return kubectl([
      'exec', primary(), '-c', 'postgres', '--',
      'psql', '-X', '-w', '-U', 'postgres', '-d', database,
      '-v', 'ON_ERROR_STOP=1', '-Atc', statement,
    ]).trim();
  }

  function authenticate(database, password, statement) {
    // Password travels only on stdin, not in argv or a temporary file.
    return kubectl([
      'exec', '-i', primary(), '-c', 'postgres', '--', 'sh', '-c',
      'IFS= read -r PGPASSWORD || exit 1; export PGPASSWORD; export PGCONNECT_TIMEOUT=5; exec psql "$@"',
      'sh', '-X', '-w', '-h', `${clusterName}-rw.${namespace}.svc`,
      '-U', ROLE, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atc', statement,
    ], { input: password + '\n' }).trim();
  }

  function create(resource) {
    primary();
    const created = JSON.parse(kubectl(['create', '-f', '-', '-o', 'json'], {
      input: JSON.stringify(resource),
    }));
    if (
      created.kind !== resource.kind ||
      created.metadata?.name !== resource.metadata.name ||
      created.metadata?.namespace !== namespace ||
      !created.metadata?.uid ||
      !created.metadata?.resourceVersion
    ) {
      throw new Error('created Temporal resource identity mismatch');
    }
    return created;
  }

  function patch(type, name, object, spec) {
    primary();
    const updated = JSON.parse(kubectl([
      'patch', type, name, '--type=merge', '-p', JSON.stringify({
        metadata: { resourceVersion: object.metadata.resourceVersion },
        spec,
      }), '-o', 'json',
    ]));
    if (
      updated.metadata?.uid !== object.metadata?.uid ||
      updated.metadata?.name !== name ||
      updated.metadata?.namespace !== namespace ||
      Object.entries(spec).some(([key, value]) => updated.spec?.[key] !== value)
    ) {
      throw new Error('patched Temporal resource identity or spec mismatch');
    }
    return updated;
  }

  return { read, requireObject, kubectl, sql, authenticate, create, patch };
}

function assertFresh(access) {
  if (access.read('secret', SECRET).state !== 'absent') {
    throw new Error('Temporal source Secret already exists or is unreadable; manual review required');
  }
  for (const [type, names] of [
    [ROLE_RESOURCE, [ROLE]],
    [DATABASE_RESOURCE, ['temporal', 'temporal-visibility']],
  ]) {
    const body = JSON.parse(access.kubectl(['get', type, '-o', 'json']));
    if (!Array.isArray(body.items)) throw new Error('unreadable CNPG resource inventory');
    if (body.items.some((item) =>
      names.includes(item.metadata?.name) ||
      [ROLE, ...DATABASES].includes(item.spec?.name))) {
      throw new Error('Temporal CNPG declarations already exist; manual review required');
    }
  }
  if (access.sql(`SELECT NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'temporal'
  ) AND NOT EXISTS (
    SELECT FROM pg_database WHERE datname IN ('temporal', 'temporal_visibility')
  )`) !== 't') {
    throw new Error('Temporal SQL identities already exist or could not be verified');
  }

  // Do not silently grant an additional login access to unrelated application DBs.
  // In particular, the observed release baseline has default PUBLIC grants.
  if (access.sql(`SELECT NOT EXISTS (
    SELECT FROM pg_database d,
      LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
    WHERE NOT d.datistemplate AND d.datallowconn
      AND a.grantee = 0 AND a.privilege_type = 'CONNECT'
  )`) !== 't') {
    throw new Error('unrelated databases permit PUBLIC CONNECT; resolve PostgreSQL isolation before Temporal provisioning');
  }
}

function waitApplied(access, type, created, deadline, secretVersion) {
  const name = created.metadata?.name;
  const uid = created.metadata?.uid;
  if (!uid) throw new Error('CNPG resource UID is missing');
  while (Date.now() < deadline) {
    const current = access.requireObject(type, name);
    if (
      current.metadata?.uid !== uid ||
      current.metadata?.deletionTimestamp ||
      current.metadata?.generation !== created.metadata?.generation
    ) {
      throw new Error(`CNPG resource ${name} changed during reconciliation`);
    }
    if (
      current.status?.applied === true &&
      current.status?.observedGeneration === current.metadata.generation &&
      (secretVersion === undefined || current.status?.secretResourceVersion === secretVersion)
    ) {
      return current;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, POLL_MS);
  }
  throw new Error(`CNPG reconciliation timed out: ${name}`);
}

function verifyDatabase(access, database, open) {
  const expectedConnections = open ? 'true' : 'false';
  if (access.sql(`SELECT EXISTS (
    SELECT FROM pg_database d
    WHERE d.datname = '${database}' AND pg_get_userbyid(d.datdba) = 'temporal'
      AND d.datallowconn = ${expectedConnections}
      AND NOT EXISTS (
        SELECT FROM aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
        WHERE a.grantee <> d.datdba
      )
  )`) !== 't') {
    throw new Error(`Temporal database ownership or ACL mismatch: ${database}`);
  }
}

const FRESH_SCHEMA_CHECK = `SELECT
  has_schema_privilege('temporal', 'public', 'USAGE') AND
  has_schema_privilege('temporal', 'public', 'CREATE') AND
  NOT EXISTS (
    SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
  )`;

/**
 * Prepare new Temporal stores only. The calling installer owns the shared
 * operation lock, host admission and explicit fresh-install authorization.
 * Never repairs, adopts or closes an existing store. No standalone CLI.
 * @param {'dev' | 'release'} profileId
 * @param {{ confirmContext: string }} authorization
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function prepareFreshTemporalPersistence(
  profileId,
  authorization,
  { run = runPlatformCommand } = {},
) {
  const profile = readPlatformProfile(profileId);
  if (authorization?.confirmContext !== profile.contextName) {
    throw new Error('Temporal persistence context confirmation required');
  }
  assertPlatformTarget(profileId, { run });
  const resources = readResources(profile);
  const access = createAccess(profile, run);

  // Refuse all pre-existing identities before generating credentials or writing.
  assertFresh(access);
  const deadline = Date.now() + RECONCILE_TIMEOUT_MS;
  const password = randomBytes(32).toString('base64url');
  const secret = access.create({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: SECRET,
      namespace: profile.namespaces.postgres,
      labels: { ...resources[0].metadata.labels, 'cnpg.io/reload': 'true' },
    },
    type: 'kubernetes.io/basic-auth',
    stringData: { username: ROLE, password },
  });
  const secretVersion = secret.metadata?.resourceVersion;
  if (!secret.metadata?.uid || !secretVersion) {
    throw new Error('Temporal credential identity is missing');
  }

  // CNPG owns role/database creation. Keep the login disabled and stores closed.
  let role = waitApplied(access, ROLE_RESOURCE, access.create(resources[0]), deadline);
  for (const declaration of resources.slice(1)) {
    const database = declaration.spec.name;
    let created = waitApplied(
      access, DATABASE_RESOURCE, access.create(declaration), deadline,
    );
    if (access.sql(`SELECT EXISTS (SELECT FROM pg_database
      WHERE datname = '${database}' AND NOT datallowconn
        AND pg_get_userbyid(datdba) = 'temporal')`) !== 't') {
      throw new Error(`Temporal database did not reconcile closed: ${database}`);
    }
    access.sql(`REVOKE CONNECT, TEMPORARY ON DATABASE "${database}" FROM PUBLIC`);
    verifyDatabase(access, database, false);
    created = access.patch(DATABASE_RESOURCE, created.metadata.name, created, {
      allowConnections: true,
    });
    waitApplied(access, DATABASE_RESOURCE, created, deadline);
    verifyDatabase(access, database, true);
    if (access.sql(FRESH_SCHEMA_CHECK, database) !== 't') {
      throw new Error(`Temporal database is not an empty owner-writable store: ${database}`);
    }
  }

  // Verify the login cannot reach unrelated non-template stores before enabling it.
  if (access.sql(`SELECT NOT EXISTS (
    SELECT FROM pg_database WHERE NOT datistemplate AND datallowconn
      AND datname NOT IN ('temporal', 'temporal_visibility')
      AND has_database_privilege('temporal', oid, 'CONNECT')
  )`) !== 't') {
    throw new Error('Temporal role can connect to unrelated databases');
  }
  if (access.sql(`SELECT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'temporal' AND NOT rolcanlogin
      AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit)
      AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member = pg_roles.oid)
  )`) !== 't') {
    throw new Error('Temporal non-login role privilege mismatch');
  }
  const beforeLogin = access.requireObject('secret', SECRET);
  if (beforeLogin.metadata?.uid !== secret.metadata.uid ||
      beforeLogin.metadata?.resourceVersion !== secretVersion) {
    throw new Error('Temporal source credential changed before enabling login');
  }
  role = access.patch(ROLE_RESOURCE, ROLE, role, { login: true });
  waitApplied(access, ROLE_RESOURCE, role, deadline, secretVersion);
  if (access.sql(`SELECT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'temporal' AND rolcanlogin
      AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit)
      AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member = pg_roles.oid)
  )`) !== 't') {
    throw new Error('Temporal role privilege mismatch');
  }
  for (const database of DATABASES) {
    if (access.authenticate(database, password, FRESH_SCHEMA_CHECK) !== 't') {
      throw new Error(`Temporal credential or schema verification failed: ${database}`);
    }
  }
  const currentSecret = access.requireObject('secret', SECRET);
  if (currentSecret.metadata?.uid !== secret.metadata.uid ||
      currentSecret.metadata?.resourceVersion !== secretVersion) {
    throw new Error('Temporal source credential changed during provisioning');
  }

  // Return only identity; the Temporal namespace owner projects the Secret.
  return { namespace: profile.namespaces.postgres, secretName: SECRET, secretVersion };
}
