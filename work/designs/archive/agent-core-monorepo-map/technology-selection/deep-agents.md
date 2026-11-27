# Deep Agents

## Fit
Closest to original investigative Storyteller concept: planning, file-style workspace, skills, memory, context summarization, synchronous and async subagents. [Deep Agents 1.17.1 source](https://github.com/langchain-ai/deepagentsjs/tree/669bbe32c38ea99efca8cab54ec727fd3b4e838f) MIT; [createDeepAgent](https://github.com/langchain-ai/deepagentsjs/blob/669bbe32c38ea99efca8cab54ec727fd3b4e838f/libs/deepagents/src/agent.ts) constructs middleware stack and child profiles. The source explicitly configures checkpointer and subagents, supplies filesystem/summarization machinery; custom skills and memory optional. Peer dependencies include LangChain, LangGraph, checkpoint, LangSmith and provider packages. This is a harness, not simply a loop.

## Product fit and mismatch
Our Workdesk and Library can expose file-like tools, but canonical document revisions, root membership, mounted read-only shelves, access revocation and staged publication are domain authority. A virtual filesystem backend could map to scoped read/stage operations; never grant direct canonical writes, ambient disk/shell or cross-tenant path lookup. Summarization may preserve relevant context but is not authoritative history; keep source handles and original revisions. Skills are instructions, not privilege. Child context isolation is not proof of tenant or budget isolation.
[Overview](https://docs.langchain.com/oss/javascript/deepagents/overview) documents customization, backends, permissions, context engineering, delegation. Temporal integrations index lists Deep Agents, but pinned integration tree/release observations show Python plugin, not equivalent TypeScript plugin. Its LangGraph execution has same checkpoint/Temporal authority issue.

## Specimen
Before full adoption, investigate custom Backend protocol (read/list/search/stage only), disable default filesystem/shell/network tools, inspect effective default subagent tool lists and middleware/profile resolution. Test document source root access, fork history, draft stage vs publish, compaction provenance, nested grants and explicit cost caps; crash/replay at chosen runtime boundary. Need actual source-level backend and tool allowlist audit, not done here. Use harness design patterns even if library not selected.

## Assessment
High value as inspiration/reference architecture and possible future harness. Defer adopting whole package until needed complexity warrants it and compatible durability route established. It might be a domain-specific layer atop agent engine rather than replacing generic engine; avoid stacking two unrelated loops. No runtime proof.
