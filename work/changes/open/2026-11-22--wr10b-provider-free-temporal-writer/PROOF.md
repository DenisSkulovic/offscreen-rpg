# WR10B proof matrix

| Proof | Required observation |
| --- | --- |
| wake dispatch | `writer.scene.v1` starts v2 workflow |
| real executor | Temporal activity executes on `storyteller-execute-v1` |
| no broad authority | execution worker has no DB/DocumentStore credentials |
| provider-free | scripted lab transport invokes no fetch/provider endpoint |
| exact custody | WR10 prepare/outcome persists one attempt + one response pointer |
| zero cost | delivered scripted result reports zero usage/cost; no second charge |
| GA publication | control finalize rehydrates private result and publishes next scene |
| idempotent retry | workflow/activity/finalize replay yields one scene and no second fake send |
| provider negative | default/provider mode still rejects `scripted-offline` |
| auth negative | story token cannot prepare/finalize; executor cannot finalize; control cannot submit outcome |
| config negative | missing/mixed scripted-lab config fails closed |
| compatibility | historical `writerSceneV1` export/replay tests remain intact |
| TURN03 handoff | joined SHA permits existing TURN03 T04 rerun; WR10B does not self-claim its gates |

No live OpenRouter request, provider key, protected database mutation or production deployment is part of acceptance.
