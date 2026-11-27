# Version and evidence register

Observed 2026-11-27. Do not treat a moving branch, npm package or release tag as interchangeable. Integration repository [immutable main snapshot](https://github.com/temporalio/ai-integrations/tree/165fe93b5b4908a443076058b903d0f1b6aa3413); each of the four manifests has source version 0.0.0, MIT license, Temporal ^1.24.0 dependencies, long ^5.3.2 and protobufjs ^8.7.1 peers. Actual release artifacts not yet verified.

| Integration manifest | Relevant peers | Node |
|---|---|---|
| [Vercel](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/vercel-ai-sdk/package.json) | ai ^7.0.127, @ai-sdk/provider ^4.0.21, @ai-sdk/mcp ^2.0.66 | >=22.12 |
| [OpenAI](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/openai-agents/package.json) | @openai/agents-core and agents-openai ~0.22.0, openai ^7.45.1, optional OTel peer ^1.25.1 or ^2 | >=22.12 |
| [Strands](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/strands-agents/package.json) | @strands-agents/sdk ^1.13.0, zod ^4.0.0 | >=22.12 |
| [ADK](https://github.com/temporalio/ai-integrations/blob/165fe93b5b4908a443076058b903d0f1b6aa3413/typescript/google-adk/package.json) | @google/adk >=2.0.0 <2.4.0, @google/genai ^2.9.0, MCP ^1.26.0 | >=22.17 |

| Framework source/release evidence | Version/observation | License in inspected manifest |
|---|---|---|
| [AI SDK source](https://github.com/vercel/ai/tree/0411a13df36b20bf6c67c82c1056e99d0e48257b) | ai 7.0.183 tag, release Nov 26; zod ^3.25.76 or ^4.1.8 | Apache-2.0 |
| [OpenAI Agents tag](https://github.com/openai/openai-agents-js/tree/@openai/agents@0.22.0) | 0.22.0 release Nov 12; agents-core uses openai ^7.45.1, zod ^4 | MIT |
| [Strands current harness repo](https://github.com/strands-agents/harness-sdk/tree/8e3884657b62c6b989230265307794a5b1352e93) | core source 0.0.1-development; old sdk-typescript release listing returned 1.3.0 May 21, not evidence of current npm version | Apache-2.0 |
| [ADK tag source](https://github.com/google/adk-js/tree/b1b94c0d501c3d1eb028aa413d783d6573f6c785) | core 2.5.0 Nov 12, incompatible with inspected plugin peer range | Apache-2.0 |
| [LangChain](https://github.com/langchain-ai/langchainjs/tree/a22d0d0c4cb8ec345c2650e1a8aaec8a6a751f74) | 1.6.8 Nov 24; depends on langgraph ^1.7.2 | MIT |
| [LangGraph source](https://github.com/langchain-ai/langgraphjs/tree/61aad39ef67051aa04cacd57b75a60538c5fd72d) | inspected main; wrapper manifest 1.0.47 is NOT evidence of actual core release version | MIT |
| [Mastra tag](https://github.com/mastra-ai/mastra/tree/@mastra/core@1.86.0) | 1.86.0 Nov 25; aliases provider APIs v5/v6/v7; Node >=22.13 | Apache-2.0 |
| [Deep Agents](https://github.com/langchain-ai/deepagentsjs/tree/669bbe32c38ea99efca8cab54ec727fd3b4e838f) | 1.17.1 Nov 24; LangChain ^1.6.4, LangGraph ^1.6.1, checkpoint ^1.2.0, LangSmith peer | MIT |

Source anchors are read-only selected files, not exhaustive audits. Upstream GitHub releases API supplied release observations; registry endpoints failed. Some tagged commit URL resolution failed for OpenAI and Mastra; fetch_file by exact tag succeeded. No latest-version claim across all packages. Older rolling Temporal documentation and newer upstream main differ (especially OpenAI nested agent APIs). Use a release-matched README and source when selecting. Plugin documentation instructs aligned Temporal package versions; caret ranges in development manifests do not prove resolved lockfile alignment.

## Resolution evidence needed
For each surviving contender, obtain npm view exact version/time/engines/peerDependencies/dependencies/dist.integrity/license, match published tarball to release source, pin dependencies and verify pnpm lockfile including single intended Temporal SDK version and SDK identity where needed. Check supported Node version, Zod and protobuf peers, transitive licenses and advisories. Record actual dependency tree, Workflow bundle success, replay compatibility and version-upgrade plan. No real credentials; do not install into main or mutate production graph. Candidate release manifests/license only, no complete legal/security audit.
