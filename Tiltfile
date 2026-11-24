# Developer profile for pnpm dev (tools/dev-environments/src/cli/dev-tilt.mjs).
# Release acceptance: explicit image build plus pnpm stack:up (see runbooks).

def assert_dev_slot_env():
    slot = os.getenv('OFFSCREEN_DEV_SLOT', '').strip()
    if not slot.startswith('dev-'):
        fail(
            'OFFSCREEN_DEV_SLOT is missing or invalid. '
            + 'Use pnpm dev to launch the owned dev slot; do not run tilt up directly.',
        )

assert_dev_slot_env()
allow_k8s_contexts('kind-offscreen-dev')

# Dev image install plus first tsc-watch can exceed the 5 minute CI default.
ci_settings(timeout='45m', readiness_timeout='45m')

# Parallel kind loads race on the WSL vsock into containerd.
update_settings(max_parallel_updates=1)

OFFSCREEN_DEV_SLOT = os.getenv('OFFSCREEN_DEV_SLOT', 'unassigned')
OFFSCREEN_DEV_NAMESPACE = os.getenv('OFFSCREEN_DEV_NAMESPACE', 'unassigned')
OFFSCREEN_DEV_GAME_PORT = os.getenv('OFFSCREEN_DEV_GAME_PORT', '3000')

DEV_WORKSPACE_IMAGE = 'offscreen-dev-workspace:' + OFFSCREEN_DEV_SLOT + '-web'
DEV_WORKSPACE_API_IMAGE = 'offscreen-dev-workspace:' + OFFSCREEN_DEV_SLOT + '-api'
DEV_WORKSPACE_GA_IMAGE = 'offscreen-dev-workspace:' + OFFSCREEN_DEV_SLOT + '-authority'
DEV_WORKSPACE_WORKER_IMAGE = 'offscreen-dev-workspace:' + OFFSCREEN_DEV_SLOT + '-worker'
REPO_ROOT = config.main_dir

SYNC_CONFIG = decode_json(str(local(
    'node infra/images/development/sync-plan.mjs --tilt',
    dir=REPO_ROOT,
    quiet=True,
)).strip())

def repo_path(rel):
    return REPO_ROOT + '/' + rel

DEV_RECEIPT_MODULES = [
    'infra/dev/dev-watched-compilation-receipt.mjs',
    'infra/dev/dev-watch-compilation.mjs',
    'infra/dev/dev-image-runtime-modules.mjs',
]

def is_under_synced_app(rel, image_key):
    for sub in SYNC_CONFIG['sync_dirs_by_image'][image_key]:
        base = sub.lstrip('/')
        if rel == base or rel.startswith(base + '/'):
            return True
    return False

def fallbacks_for_image(image_key):
    kept = []
    for rel in SYNC_CONFIG['rebuild_paths_by_image'][image_key]:
        if not is_under_synced_app(rel, image_key):
            continue
        if rel.endswith('package.json') or 'tsconfig' in rel:
            kept.append(repo_path(rel))
    return kept

def dev_live_update(image_key):
    steps = []
    fallbacks = fallbacks_for_image(image_key)
    if len(fallbacks) > 0:
        steps.append(fall_back_on(fallbacks))
    for sub in SYNC_CONFIG['sync_dirs_by_image'][image_key]:
        steps.append(sync(REPO_ROOT + sub, '/app' + sub))
    for rel in DEV_RECEIPT_MODULES:
        steps.append(sync(REPO_ROOT + '/' + rel, '/app/' + rel))
    return steps

def rebuild_deps_for_image(image_key):
    deps = []
    seen = {}
    for rel in SYNC_CONFIG['rebuild_paths_by_image'][image_key]:
        path = repo_path(rel)
        if path not in seen:
            seen[path] = True
            deps.append(path)
    for sub in SYNC_CONFIG['sync_dirs_by_image'][image_key]:
        path = repo_path(sub.lstrip('/'))
        if path not in seen:
            seen[path] = True
            deps.append(path)
    for rel in DEV_RECEIPT_MODULES:
        path = repo_path(rel)
        if path not in seen:
            seen[path] = True
            deps.append(path)
    return deps

def dev_workspace_docker_build(image, image_key):
    rebuild_deps = rebuild_deps_for_image(image_key)
    steps = dev_live_update(image_key)
    ref_file = REPO_ROOT + '/.offscreen/tilt-image-refs/' + OFFSCREEN_DEV_SLOT + '/' + image_key + '.ref'
    loader = REPO_ROOT + '/infra/images/development/load-dev-slot-image.sh'
    custom_build(
        image,
        'OFFSCREEN_DEV_SLOT=' + OFFSCREEN_DEV_SLOT + ' bash ' + loader + ' --tilt-ref ' + image,
        deps=rebuild_deps,
        ignore=[
            '**/node_modules',
            '**/dist',
            '**/.next',
            '**/.turbo',
            '**/*.md',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
        ],
        live_update=steps,
        skips_local_docker=True,
        outputs_image_ref_to=ref_file,
    )

dev_workspace_docker_build(DEV_WORKSPACE_IMAGE, 'web')
if os.getenv('OFFSCREEN_DEV_TILT_ROLE', '') != 'web':
    dev_workspace_docker_build(DEV_WORKSPACE_API_IMAGE, 'api')
    dev_workspace_docker_build(DEV_WORKSPACE_GA_IMAGE, 'game-authority')
    dev_workspace_docker_build(DEV_WORKSPACE_WORKER_IMAGE, 'worker')

watch_file(REPO_ROOT + '/infra/workloads/render.mjs')
watch_file(REPO_ROOT + '/infra/workloads/profiles/development.yaml')
watch_file(REPO_ROOT + '/infra/workloads/chart/Chart.yaml')
watch_file(REPO_ROOT + '/infra/workloads/chart/values.yaml')
watch_file(REPO_ROOT + '/infra/workloads/chart/values.schema.json')
watch_file(REPO_ROOT + '/infra/workloads/chart/templates/_helpers.tpl')
watch_file(REPO_ROOT + '/infra/workloads/chart/templates/deployments.yaml')
watch_file(REPO_ROOT + '/infra/workloads/chart/templates/services.yaml')
watch_file(REPO_ROOT + '/infra/workloads/chart/templates/migration-job.yaml')
watch_file(REPO_ROOT + '/tools/dev-environments/src/rendering/dev-slot-app-graph.mjs')
watch_file(REPO_ROOT + '/infra/images/development/sync-plan.mjs')
watch_file(REPO_ROOT + '/infra/images/common/workspace-graph.mjs')

rendered = local(
    'node tools/dev-environments/src/rendering/dev-slot-app-graph.mjs --tilt-deployments',
    dir=REPO_ROOT,
    quiet=True,
)
k8s_yaml(rendered)
for name in ['game-web', 'game-api', 'game-authority', 'game-control', 'game-executor', 'game-relay']:
    k8s_resource(name)