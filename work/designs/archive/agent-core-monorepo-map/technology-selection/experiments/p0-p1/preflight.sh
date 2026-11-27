#!/usr/bin/env bash
set -euo pipefail
echo '=== HOST ==='
node --version
npm --version
pnpm --version
free -h
echo '=== CLUSTER / SERVICES (read-only) ==='
kind get clusters
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal get svc temporal-frontend
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal exec deploy/temporal-admintools -- temporal operator cluster health
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get cluster dev-pg
kubectl --context kind-offscreen-dev -n offscreen-dev-redis get svc || true
echo '=== REGISTRY METADATA ==='
for p in @temporalio/vercel-ai-sdk @temporalio/openai-agents @temporalio/strands-agents ai @ai-sdk/provider @openai/agents-core @openai/agents-openai @strands-agents/sdk @temporalio/worker@1.24.0; do
  printf '\n=== %s ===\n' "$p"
  timeout 25s npm view "$p" version engines peerDependencies dependencies dist.integrity license --json --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=20000 || echo 'METADATA UNAVAILABLE'
done
