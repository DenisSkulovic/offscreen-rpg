# MA05 | acceptance and negative regression
- Package/source runtime graph: no authority → Storyteller-runtime edge, no authority → developer-tools; Writer-runtime may reference narrow authority ports and adapters. No new runtime import SCC. Type-only edges reviewed separately.
- Identical story response and retry result codes, stale expected revision denial, exactly-once generation/retry request, no duplicate outbox message on conflict, same ownership and privacy refusal.
- SQL transaction boundaries unchanged: read/re-check under the same lock and commit sequence; replay after crash remains idempotent. Publication remains controlled by Game Authority and does not grant model-generated state directly.
- Verify with existing focused unit and authorized disposable story/Writer integration fixtures, plus typecheck for API, GA and worker. If after-source current fixtures do not exercise a critical fence, ChatGPT prepares targeted negative proof before readiness.
- Do not mark Done simply because graph becomes acyclic by placing service calls behind an `any` callback.
