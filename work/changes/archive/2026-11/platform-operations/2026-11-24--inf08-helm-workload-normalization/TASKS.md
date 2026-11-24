# INF08 bounded execution

Read relevant section of EXECUTION.md. Sequential T01→T02→T03→T04→T05. Parent coordinates one child at a time; no live operations. Start only after INF07 receipt and source gates.

| Task | Primary read anchors | Exit proof |
| --- | --- | --- |
| T01 Chart | dev-slot-app-graph.mjs; infra/workloads/release/{edge,authority,workers,migrate}.yaml; EXECUTION T01 | Real Helm render fixtures both profiles, exact release equivalence and only selected dev deltas; schema refusals |
| T02 Dev render | infra/workloads/render.mjs; dev-slot-app-graph.mjs; dev-slot-project.mjs; dev-slot-startup.mjs; dev-tilt.mjs | Same startup/Tilt graph, slot isolation and failed inventory/render/preflight refusal before mutation |
| T03 Release | release/install.sh; release/Tiltfile; render.mjs; release/test/overlay-guard.test.mjs | Exact selected group render/apply/wait order; failed render/migration no later apply; no competing Helm writer |
| T04 Legacy retirement | root Tiltfile; infra/dev/Tiltfile; infra/dev/load-dev-image.sh; distribution/kind-image-loader.mjs; dev-tilt.mjs | Slot-only context/tag/namespace; old manifests removed; no release readiness polling; old dev launch refusal |
| T05 Parent acceptance | check-lab-manifests.mjs; infra-layout.test.mjs; code.yml; focused test list | Real Helm lint/template, guards and tests; source-only receipt, archive/integrate |

No child chooses architecture. Stop on actual contradiction, missing required offline render tool, failing required tests, or foreign-resource risk. Ordinary INF07 ordering is not planner-blocked.
