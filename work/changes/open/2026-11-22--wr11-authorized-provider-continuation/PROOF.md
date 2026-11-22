# WR11 proof matrix

| Case | Required |
| --- | --- |
| default scripted | existing scripted mission/topic/capture remains valid |
| provider admission | exact model + policy-version pin frozen before enqueue |
| same choreography | provider mission still uses writer.scene.v1 / writerSceneDistributedV2 / writer-scene/<missionId> |
| tool round | first fake response executes one granted Library tool exactly once |
| next round | latest parent ordinal/revision is planned from durable state |
| final | second fake response publishes one v3 passage/checkpoint/offer |
| replay | workflow/activity restart causes no third fake invoke |
| uncertain | possibly-sent attempt never creates replacement send |
| policy negative | model/policy-version/budget mismatch holds before send |
| auth negative | player cannot select provider/model/price |
| research negative | research.delegate held unsupported |
| spend | zero external provider calls in required proof |
| regression | WR10/WR10B scripted path remains green |

Paid OpenRouter quality is optional, separately authorized, and not a closure gate.
