# Runbooks

Human-executable operating procedures (commands, prerequisites, safety).  
Source-adjacent package procedures may remain beside code.

| Runbook | Question |
| --- | --- |
| [Local development](local-development.md) | How do I start the portfolio locally without a model call or a disposable-database reset? |
| [Game Authority seam](local-development.md#game-authority-seam) | How does the optional private story process stay off the public API and off Compose? |
| [Kubernetes lab](kubernetes-lab.md) | How do I create and delete the disposable kind cluster without touching Compose volumes? |
| [Kubernetes Postgres](kubernetes-postgres.md) | How do I run one disposable CloudNativePG primary, and what does a Pod deletion keep? |
| [Kubernetes RabbitMQ](kubernetes-rabbitmq.md) | How do I run one disposable RabbitMQ broker, and what does a consumer crash redeliver? |
| [Kubernetes fault harness](kubernetes-fault.md) | How do I delete one broker consumer before ack, and what does a replay prove? |
| [Kubernetes object storage](kubernetes-object-storage.md) | How do I run one disposable SeaweedFS store, and what survives a Pod deletion? |
| [Kubernetes document access](kubernetes-document-access.md) | How do two isolated Jobs share one object, and what fails closed? |
| [Kubernetes content bootstrap](kubernetes-content-bootstrap.md) | How does a disposable Job import the pinned Seyda Neen fixture into the lab object store? |
| [Kubernetes observability](kubernetes-observability.md) | How do I record one synthetic two-hop trace and a missing hop on the disposable cluster? |
| [Kubernetes Temporal](kubernetes-temporal.md) | How do I run one disposable Temporal server, and what survives a worker stop and a server Pod replacement? |
| [Kubernetes service skeletons](kubernetes-skeletons.md) | How do I run four synthetic placeholders, and what does a duplicate operation id do? |
| [Local integration tests](local-integration-tests.md) | How do I run provider-free database and identity checks on a disposable database? |
| [Local Storyteller rehearsal](local-storyteller-rehearsal.md) | How do I run a provider-free Chamber demo, and where does an explicitly authorized paid rehearsal stay separated? |
| [ChatGPT design snapshot](chatgpt-design-snapshot.md) | How do I export a source ZIP for design investigation in ordinary ChatGPT? |
| [Agent-native harness evaluation](agent-native-harness-evaluation.md) | Where is the historical A/B method after the fake runner was removed? |
| [Content package authoring](content-package-authoring.md) | How do I author, validate and pin a world, rule or start package? |
| [Uncertain work recovery](uncertain-work-recovery.md) | What do I read before holding, recording unknown, or escalating an uncertain Storyteller or workflow operation? |
| [Release and restore readiness](release-restore-readiness.md) | Which backup and restore checks are a selected requirement, a local record, hosted-unproven, or blocked? |
