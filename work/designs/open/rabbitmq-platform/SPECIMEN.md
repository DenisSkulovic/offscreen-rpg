# R3 owner read-only specimen
Run from the existing primary repository, no branch checkout, no cluster mutation, no credential output. Capture output for planner; do not dump Secrets or kubeconfig.
```bash
git rev-parse HEAD
git grep -n -i -E 'rabbitmq|amqplib|amqp://|amqps://|lab-broker|lab\.durable|cert-manager' HEAD -- apps packages tools infra scripts package.json pnpm-lock.yaml ':!infra/platform/rabbitmq/vendor/**' ':!**/vendor/**' || test "$?" = 1
for ctx in kind-offscreen-dev kind-offscreen-release; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" --request-timeout=10s get ns cert-manager rabbitmq-system messaging offscreen-dev-rabbitmq offscreen-rabbitmq --ignore-not-found
  kubectl --context "$ctx" --request-timeout=10s get crd rabbitmqclusters.rabbitmq.com certificates.cert-manager.io --ignore-not-found
  kubectl --context "$ctx" --request-timeout=10s get deploy -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,IMAGE:.spec.template.spec.containers[*].image' | grep -E '(^NS|cert-manager|rabbitmq)' || true
  kubectl --context "$ctx" --request-timeout=10s get pv -o custom-columns='NAME:.metadata.name,CLAIM_NS:.spec.claimRef.namespace,CLAIM:.spec.claimRef.name,STATUS:.status.phase' | grep -E '(^NAME|messaging|rabbitmq)' || true
  kubectl --context "$ctx" --request-timeout=10s get rabbitmqclusters.rabbitmq.com -A --ignore-not-found || true
done
for image in docker.io/library/rabbitmq:4.3.4-management ghcr.io/rabbitmq/cluster-operator:2.23.3 quay.io/jetstack/cert-manager-controller:v1.21.3 quay.io/jetstack/cert-manager-cainjector:v1.21.3 quay.io/jetstack/cert-manager-webhook:v1.21.3 docker.io/library/python:3.12-alpine; do
  echo "=== $image ==="
  docker buildx imagetools inspect "$image" | head -n 12
done
```
Only use known local Kind contexts; if target identity has changed or context missing, skip and report. Registry inspect is read-only network access; no image pulls or cluster writes. Grep output may include secrets if repository has accidentally tracked them; inspect/redact before returning. This is initial inventory, not full comparator proof. Subsequent specimen should collect safe non-secret actual objects only after known ownership and source comparison. All checks NOT RUN by planner.