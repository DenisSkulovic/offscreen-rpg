# AC08 | assigned proof boundary

**Standing:** NOT RUN. Construction source postcondition is the assigned gate unless a specific inexpensive command is listed. All source writes remain isolated from production. See the exact maintained source/test and live schedule in EXECUTION.md and the matrix/commands below. AC08 coding agent constructs harness, runs only assigned offline/source/build checks. Owner/acceptance lead performs live proof and final security/compatibility checks with exact integrated SHA; no live permission inferred from commission. Source gate may join isolated design branch if assigned offline checks pass and live joint proof remains recorded NOT RUN; design must not merge main until all required matrix rows pass. If a maintained requirement fails, do not archive as certified, record result and stop affected final integration. Preserve durable evidence before retiring dossier.

Actual commands, exit codes, source SHA, failed/unrun cases and durable owner belong in the closure receipt. Joint proof remains mandatory; no blanket waiver. No real providers, protected data, release/default cluster, migrations, destructive operations or unassigned heavy checks.

## Offline integration gate

On AC08 worktree after all source prerequisites: Node 24.19.x and pnpm 11.19.0 as root pins; `pnpm install --frozen-lockfile` under ordinary repo allowBuilds, no added script approvals, no force. Run once `pnpm --filter @offscreen/agent-core build`, `pnpm --filter @offscreen/agent-core typecheck`, `pnpm --filter @offscreen/agent-core exec tsc -p tsconfig.test.json`, and `pnpm --filter @offscreen/agent-core test` with no Temporal env/credentials. Tests match only *.test.mjs. Ensure new dist index/workflow JS+d.ts and exports resolve; use `pnpm --filter @offscreen/agent-core exec node --input-type=module -e "import('@offscreen/agent-core').then(m=>console.log(m.missionWorkflowId('fixture')))"` (helper pure; no production consumers); `import.meta.resolve('@offscreen/agent-core/workflow')` plus actual native bundle proof at live boundary. Inspect source/manifest exports/import graph: only new leaf, no production apps reference it, no Worker/client/plugin root/test imports in root/workflow source closure, no real provider dependency/credentials/effect imports, explicit rejecting downloader and no MCP. `node scripts/repo-tools/module-graph.mjs --json` on actual Git root; inspect reported errors relative to baseline. Re-run AC01/02 focused tests only if relevant source changed since their recorded passes. `node --test infra/images/release/test/warm-path.test.mjs` for deterministic release source/classifier checks. Do not run `infra/images/release/test/image-closure.test.mjs`, Docker builds, image inspection or container runs as part of this gate, even with `APP_RELEASE_SKIP_DOCKER=1`: `ensureBuilt` can build or reuse pinned tags and the second test can still inspect/run existing images. Such tags do not establish candidate provenance. The exact baseline/candidate workspace-closure comparison and four-app build/typecheck in the joint matrix remain mandatory. Record exact commands/exit; root tests not automatically run by construction. If baseline existing errors occur, identify exact unchanged evidence; do not waive introduced defect.

## Joint acceptance matrix

| Claim | Required proof | Owner / status |
| --- | --- | --- |
| Workspace/package compatibility | Offline integration gate; exact baseline vs candidate `workspaceGraph(root,'runtime'/'build')` four app closures unchanged; pnpm list recognizes new leaf, not placeholders, no new consumer; Turbo dry plan existing app graph preserved; affected app build/typecheck at joint boundary | Acceptance lead, NOT RUN |
| Dependencies and security | Exact importer pins/aligned Temporal, frozen lock, no unrelated importer changes; compare isolated patched npm evidence where available, actual pnpm new closure/version/license inventory and audit, no new relevant unresolved high/critical; separate baseline Worker issue retained | Acceptance lead, NOT RUN |
| Genericity, tool and bounds | `qualify` scenario matrix both definitions, correct output/actual model+tool counts, identity and unknown/ungranted/malformed/parallel/step failures | Owner/live acceptance lead, NOT RUN |
| Terminal semantics and cancellation | Failure/partial text never success, native cancellation/timeout no subsequent successful effects, duplicate start/reuse refusal | Owner/live acceptance lead, NOT RUN |
| Durability | Native same-bundle completed history replay and fresh Worker restart after recorded tool completion with no duplicate completed Activity | Owner/live acceptance lead, NOT RUN |
| No exposure | Source closure and runtime synthetic-only, no production app registration, no real provider or URL/MCP/file effect; rejecting download hook negative offline, no raw logging; ordinary tests offline | Coordinator + acceptance lead, NOT RUN |

### Compatibility and dependency evidence (no live services)

Use exact baseline `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c`, or actual approved pre-E1 implementation base if newer changes were reconciled; record both SHA. For closure comparison create a temporary read-only git archive/extraction of the baseline's `apps`, `packages`, `tools`, `infra/images/common/workspace-graph.mjs` (or linked clean baseline worktree only if owner permits); run Node import of baseline graph and current graph for runtime/build, JSON serialize sorted results and assert deep equality. Do not switch main or delete other's worktree. `pnpm -r list --depth -1 --json` check manifests, `pnpm --filter @offscreen/agent-core list --depth Infinity --json` save actual new closure. Run `pnpm exec turbo run build --filter=@offscreen/api --filter=@offscreen/web --filter=@offscreen/game-authority --filter=@offscreen/worker` once, then `pnpm exec turbo run typecheck --filter=@offscreen/api --filter=@offscreen/web --filter=@offscreen/game-authority --filter=@offscreen/worker` once (serial to avoid shared Next generated paths). No broad application or root test command: existing application test globs include live suites; E1 needs affected build/typecheck and closure proof, plus the explicit offline and native Agent Core matrix, not unrelated application live tests. Compare dry plan `pnpm exec turbo run build --dry=json` filtered four apps and dependency tasks against baseline if available. Audit `pnpm audit --json` and inspect dependency paths; do not force fix or claim whole repo clean. Inventory new closure actual installed package licenses and notices, inspect unknown SPDX metadata actual license file (unionfs Unlicense-style evidence retained), compare relevant patched versions and record lock SHA. Any new relevant high/critical security or incompatible peer/license finding stops E1; existing Worker Zod baseline finding remains separate and cannot be waived by E1. No paid provider calls. Actual release-image execution is not an E1 requirement; if separately selected, acceptance lead must obtain explicit operation authorization, bind images to the tested candidate SHA and immutable image identities, isolate image resources/tags and retain evidence. Existing tags cannot certify this candidate; do not run the legacy image-closure test by default.

## Owner-operated live procedure

Only after explicit owner live authorization, exact source SHA and clean isolation. Dev Temporal only. From repo root verify `kubectl --context kind-offscreen-dev -n offscreen-dev-temporal exec deploy/temporal-admintools -- temporal operator cluster health` returns SERVING. Generate fresh `export POC_NAMESPACE="offscreen-agent-poc-e1-$(date -u +%m%d%H%M%S)-$(openssl rand -hex 3)"`; use existing helper, confirm absence then create with 1d, confirm ready and retention 86400 before connection:

```bash
node --input-type=module <<'JS'
import {describeTemporalNamespace,createTemporalNamespace} from './infra/platform/temporal/namespaces.mjs';
const n=process.env.POC_NAMESPACE;
if(!n || describeTemporalNamespace('dev',n).status!=='absent') throw Error('namespace not fresh');
createTemporalNamespace('dev',n,1);
const v=describeTemporalNamespace('dev',n);
if(v.status!=='ready'||v.retentionSeconds!==86400) throw Error('namespace verification failed');
console.log(n,v);
JS
```

Run following subshell from exact accepted integration checkout; only its port-forward is cleaned up. `E1_QUALIFY=1` and sanitized environment required. Namespace already created/owned, no default/release/game slot. Use `node` direct rather than pnpm in sanitized env (same maintained qualify entrypoint). Capture logs/evidence outside repo until curated receipt; no deletion of history or cluster mutation beyond owner namespace creation.

```bash
(
  set -euo pipefail
  : "${POC_NAMESPACE:?owned namespace required}"
  LOG="$(mktemp -d /tmp/offscreen-e1-proof-XXXXXXXX)"
  kubectl --context kind-offscreen-dev -n offscreen-dev-temporal \
    port-forward --address 127.0.0.1 svc/temporal-frontend :7233 > "$LOG/forward.log" 2>&1 &
  PF=$!
  trap 'kill "$PF" 2>/dev/null || true; wait "$PF" 2>/dev/null || true' EXIT
  PORT=""
  for i in {1..30}; do
    kill -0 "$PF" || exit 1
    PORT="$(sed -nE 's/^Forwarding from 127\.0\.0\.1:([0-9]+) -> 7233$/\1/p' "$LOG/forward.log" | head -n1)"
    [[ -n "$PORT" ]] && break
    sleep 1
  done
  [[ -n "$PORT" ]]
  git rev-parse HEAD > "$LOG/source-sha.txt"
  env -i HOME="$HOME" PATH="$PATH" E1_QUALIFY=1 POC_NAMESPACE="$POC_NAMESPACE" \
    POC_TEMPORAL_ADDRESS="127.0.0.1:$PORT" \
    timeout --signal=TERM --kill-after=10s 240s \
    node packages/ai/agent-core/test/qualification.mjs 2>&1 | tee "$LOG/qualification.log"
  echo "Evidence: $LOG"
)
```

Outer bound allows 30s Workflow timeout + 10s Activity timeout + restart/replay and many short scenarios; no retry loop on failure. Each Workflow 30s, poll/restart bounded by deadline; only owned Worker/port-forward. If timeout or crash, inspect owned task queue/run IDs, do not stop shared dev cluster or delete namespace. Preserve exact logs, dependency lock hash, history IDs, source SHA and status in durable evidence under `evidence/runs/` (curated non-sensitive receipt, raw local evidence retained) and technical owner. Source join may precede live proof; no main integration until all rows pass, status reconciled, owner authorizes and no material drift. If qualification fails, record FAILED/NOT RUN honestly; route ordinary defects to the acceptance lead for a narrowly scoped, explicitly commissioned repair on a new Change branch/worktree off the latest design implementation target; retain failed evidence, use the existing lifecycle/archival and join procedures, and rerun affected proof on the corrected exact SHA. Reuse unaffected evidence only after drift/impact check. Material contract or architecture contradictions return to the planner; no repair directly on main. No certification of production behavior.
