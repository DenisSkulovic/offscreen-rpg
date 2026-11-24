# Developer profile for pnpm dev (tools/dev-environments/src/cli/dev-tilt.mjs).
# Release acceptance graph: infra/environments/release/Tiltfile

if os.getenv('OFFSCREEN_DEV_SLOT', '').startswith('dev-'):
    allow_k8s_contexts('kind-offscreen-dev')
else:
    allow_k8s_contexts('kind-offscreen-lab')

# Dev image install plus first tsc-watch can exceed the 5 minute CI default.
ci_settings(timeout='45m', readiness_timeout='45m')

# Parallel kind loads race on the WSL vsock into containerd.
update_settings(max_parallel_updates=1)

include('./infra/dev/Tiltfile')