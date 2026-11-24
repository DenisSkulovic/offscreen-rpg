# Developer profile for pnpm dev (tools/dev-environments/src/cli/dev-tilt.mjs).
# Release acceptance: explicit image build plus pnpm stack:up (see runbooks).

def assert_dev_slot_env():
    slot = os.getenv('OFFSCREEN_DEV_SLOT', '').strip()
    if not slot.startswith('dev-'):
        fail(
            'OFFSCREEN_DEV_SLOT is missing or invalid. '
            + 'Use pnpm dev to launch the owned dev slot; do not run tilt up directly.',
        )
    local(
        'node tools/dev-environments/src/rendering/dev-slot-app-graph.mjs --tilt-deployments >/dev/null',
        dir=config.main_dir,
    )

assert_dev_slot_env()
allow_k8s_contexts('kind-offscreen-dev')

# Dev image install plus first tsc-watch can exceed the 5 minute CI default.
ci_settings(timeout='45m', readiness_timeout='45m')

# Parallel kind loads race on the WSL vsock into containerd.
update_settings(max_parallel_updates=1)

include('./infra/dev/Tiltfile')