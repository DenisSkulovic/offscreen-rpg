import { createHash } from 'node:crypto';
import { SERVER_IMAGE } from './config.mjs';

export const OWNER_KEY = 'offscreen.rpg/temporal-next';
const APP = 'temporal-server';

export function metadata(config, name) {
  return { name, namespace: config.namespace, labels: { [OWNER_KEY]: config.owner } };
}

export function secretEnv(config, name, key) {
  return { name, valueFrom: { secretKeyRef: { name: config.secret, key } } };
}

export const securityContext = {
  allowPrivilegeEscalation: false,
  capabilities: { drop: ['ALL'] },
};

export const podSecurity = {
  runAsNonRoot: true,
  runAsUser: 1000,
  runAsGroup: 1000,
  seccompProfile: { type: 'RuntimeDefault' },
};

function sqlStore(config, store) {
  return {
    sql: {
      pluginName: 'postgres12',
      databaseName: store.database,
      connectAddr: config.endpoint + ':' + config.port,
      connectProtocol: 'tcp',
      user: '__SQL_USER__',
      password: '__SQL_PASSWORD__',
      maxConns: store.maxConns,
      maxIdleConns: Math.floor(store.maxConns / 2),
      maxConnLifetime: '1h',
    },
  };
}

// JSON is valid YAML. The startup script quotes credentials as JSON strings before
// substitution, rather than interpolating unescaped secrets into YAML or shell.
export function serverConfig(config) {
  const services = Object.fromEntries(
    [['frontend',7233,6933],['history',7234,6934],['matching',7235,6935],['worker',7239,6939]]
      .map(([name, grpcPort, membershipPort]) => [name, {
        rpc: { grpcPort, membershipPort, bindOnIP: '0.0.0.0', ...(name === 'frontend' ? { httpPort: 7243 } : {}) },
      }]),
  );
  return {
    log: { stdout: true, level: 'info' },
    persistence: {
      numHistoryShards: config.historyShards,
      defaultStore: 'default',
      visibilityStore: 'visibility',
      datastores: { default: sqlStore(config, config.execution), visibility: sqlStore(config, config.visibility) },
    },
    global: {
      membership: { maxJoinDuration: '30s', broadcastAddress: '__POD_IP__' },
      pprof: { port: 0 },
      metrics: { prometheus: { listenAddress: '0.0.0.0:9090' } },
    },
    services,
    clusterMetadata: {
      enableGlobalNamespace: false,
      failoverVersionIncrement: 10,
      masterClusterName: 'active',
      currentClusterName: 'active',
      clusterInformation: { active: { enabled: true, initialFailoverVersion: 1, rpcName: 'frontend', rpcAddress: '127.0.0.1:7233', httpAddress: '127.0.0.1:7243' } },
    },
    dcRedirectionPolicy: { policy: 'noop' },
    archival: { history: { state: 'disabled' }, visibility: { state: 'disabled' } },
    namespaceDefaults: { archival: { history: { state: 'disabled' }, visibility: { state: 'disabled' } } },
    dynamicConfigClient: { filepath: '/etc/offscreen-temporal/dynamic.yaml', pollInterval: '60s' },
  };
}

// Local credentials are intentionally restricted to an unambiguous ASCII alphabet.
// This avoids depending on unverified jq/python availability in the server image.
const START = [
  'set -eu',
  'umask 077',
  'for value in "$SQL_USER" "$SQL_PASSWORD" "$POD_IP"; do',
  '  case "$value" in ""|*[!a-zA-Z0-9_.:-]*) echo "unsupported credential or address encoding" >&2; exit 1;; esac',
  'done',
  'sed -e "s/__SQL_USER__/$SQL_USER/g" -e "s/__SQL_PASSWORD__/$SQL_PASSWORD/g" -e "s/__POD_IP__/$POD_IP/g" /etc/offscreen-temporal/server.json > /tmp/temporal-config.yaml',
  'exec temporal-server --config-file /tmp/temporal-config.yaml --allow-no-auth start',
].join('\n');

export function compactResources(config) {
  const data = {
    'server.json': JSON.stringify(serverConfig(config), null, 2),
    'dynamic.yaml': '{}\n',
    'start.sh': START,
  };
  const revision = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const labels = { app: APP, [OWNER_KEY]: config.owner };
  return [
    {
      apiVersion: 'v1', kind: 'ConfigMap',
      metadata: metadata(config, 'temporal-config'), data,
    },
    {
      apiVersion: 'v1', kind: 'Service',
      metadata: metadata(config, APP),
      spec: {
        selector: labels,
        ports: [{ name: 'grpc', port: 7233, targetPort: 'grpc' }, { name: 'metrics', port: 9090, targetPort: 'metrics' }],
      },
    },
    {
      apiVersion: 'apps/v1', kind: 'Deployment',
      metadata: metadata(config, APP),
      spec: {
        replicas: 1, strategy: { type: 'Recreate' }, selector: { matchLabels: labels },
        template: {
          metadata: { labels, annotations: { 'offscreen.rpg/config-sha256': revision } },
          spec: {
            automountServiceAccountToken: false, enableServiceLinks: false,
            securityContext: podSecurity,
            containers: [{
              name: APP, image: SERVER_IMAGE, imagePullPolicy: 'IfNotPresent',
              command: ['/bin/sh', '/etc/offscreen-temporal/start.sh'],
              env: [
                secretEnv(config, 'SQL_USER', 'username'),
                secretEnv(config, 'SQL_PASSWORD', 'password'),
                { name: 'POD_IP', valueFrom: { fieldRef: { fieldPath: 'status.podIP' } } },
                { name: 'GOMEMLIMIT', value: '640MiB' },
              ],
              ports: [{ name: 'grpc', containerPort: 7233 }, { name: 'metrics', containerPort: 9090 }],
              resources: config.resources, securityContext,
              startupProbe: { tcpSocket: { port: 'grpc' }, periodSeconds: 5, failureThreshold: 60 },
              readinessProbe: { grpc: { port: 7233 }, periodSeconds: 5, timeoutSeconds: 2 },
              volumeMounts: [{ name: 'configuration', mountPath: '/etc/offscreen-temporal', readOnly: true }],
            }],
            volumes: [{ name: 'configuration', configMap: { name: 'temporal-config' } }],
          },
        },
      },
    },
  ];
}
