#!/bin/sh
set -eu
if [ -z "${POSTGRES_PWD:-}" ]; then
  echo "POSTGRES_PWD is empty." >&2
  exit 1
fi
broadcast="$(getent hosts "$(hostname)" | awk '{print $1; exit}')"
if [ -z "$broadcast" ]; then
  echo "Pod address was not resolved." >&2
  exit 1
fi
umask 077
cat > /tmp/temporal-config.yaml <<EOF
log:
  stdout: true
  level: info
persistence:
  numHistoryShards: 4
  defaultStore: default
  visibilityStore: visibility
  datastores:
    default:
      sql:
        pluginName: "postgres12"
        databaseName: "temporal"
        connectAddr: "temporal-postgres:5432"
        connectProtocol: "tcp"
        user: "temporal"
        password: "${POSTGRES_PWD}"
        maxConns: 8
        maxIdleConns: 4
        maxConnLifetime: "1h"
    visibility:
      sql:
        pluginName: "postgres12"
        databaseName: "temporal_visibility"
        connectAddr: "temporal-postgres:5432"
        connectProtocol: "tcp"
        user: "temporal"
        password: "${POSTGRES_PWD}"
        maxConns: 4
        maxIdleConns: 2
        maxConnLifetime: "1h"
global:
  membership:
    maxJoinDuration: 30s
    broadcastAddress: "${broadcast}"
  pprof:
    port: 0
services:
  frontend:
    rpc:
      grpcPort: 7233
      membershipPort: 6933
      bindOnIP: "0.0.0.0"
      httpPort: 7243
  matching:
    rpc:
      grpcPort: 7235
      membershipPort: 6935
      bindOnIP: "0.0.0.0"
  history:
    rpc:
      grpcPort: 7234
      membershipPort: 6934
      bindOnIP: "0.0.0.0"
  worker:
    rpc:
      grpcPort: 7239
      membershipPort: 6939
      bindOnIP: "0.0.0.0"
clusterMetadata:
  enableGlobalNamespace: false
  failoverVersionIncrement: 10
  masterClusterName: "active"
  currentClusterName: "active"
  clusterInformation:
    active:
      enabled: true
      initialFailoverVersion: 1
      rpcName: "frontend"
      rpcAddress: "127.0.0.1:7233"
      httpAddress: "127.0.0.1:7243"
dcRedirectionPolicy:
  policy: "noop"
archival:
  history:
    state: "disabled"
  visibility:
    state: "disabled"
namespaceDefaults:
  archival:
    history:
      state: "disabled"
    visibility:
      state: "disabled"
dynamicConfigClient:
  filepath: "/etc/temporal/config/dynamicconfig/lab.yaml"
  pollInterval: "60s"
EOF
exec temporal-server --config-file /tmp/temporal-config.yaml --allow-no-auth start