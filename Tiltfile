# Real lab app release for kind-offscreen-lab: build app-release images and apply
# TURN02 overlays. Does not use Docker Compose or gateway synthetic skeleton workloads.

APP_RELEASE = 'infra/kubernetes/lab/app-release'

allow_k8s_contexts('kind-offscreen-lab')

WEB_IMAGE = 'offscreen-lab-game-web:turn02'
API_IMAGE = 'offscreen-lab-app-release-api:turn02'
GA_IMAGE = 'offscreen-lab-app-release-ga:turn02'
WORKER_IMAGE = 'offscreen-lab-app-release-worker:turn02'

# Full image rebuild only: no live_update. Dockerfiles, pnpm-lock, generated code,
# and DB schema must not hot-swap in the dev loop.
docker_build(
    WEB_IMAGE,
    '.',
    dockerfile=APP_RELEASE + '/Dockerfile.web',
)

docker_build(
    API_IMAGE,
    '.',
    dockerfile=APP_RELEASE + '/Dockerfile.api',
)

docker_build(
    GA_IMAGE,
    '.',
    dockerfile=APP_RELEASE + '/Dockerfile.game-authority',
)

docker_build(
    WORKER_IMAGE,
    '.',
    dockerfile=APP_RELEASE + '/Dockerfile.worker',
)

k8s_yaml(APP_RELEASE + '/overlay/authority.yaml')
k8s_yaml(APP_RELEASE + '/overlay/workers.yaml')
k8s_yaml(APP_RELEASE + '/overlay/edge.yaml')

k8s_resource('game-authority')

k8s_resource(
    'game-api',
    resource_deps=['game-authority'],
)

k8s_resource(
    'game-web',
    resource_deps=['game-api'],
    port_forwards=['127.0.0.1:3000:3000'],
)

k8s_resource(
    'game-control',
    resource_deps=['game-authority'],
)

k8s_resource(
    'game-executor',
    resource_deps=['game-authority'],
)

k8s_resource(
    'game-relay',
    resource_deps=['game-authority'],
)