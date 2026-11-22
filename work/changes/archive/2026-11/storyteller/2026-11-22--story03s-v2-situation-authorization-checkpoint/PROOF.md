# STORY03S proof

| Case | Expected |
| --- | --- |
| none authorization | existing checkpoint semantics preserved |
| selected access | checkpoint stores versioned selected activityAccess |
| prepared process plan | each plan stored as versioned payload |
| historical decode | reconstructs live situationAuthorizationSchema exactly |
| malformed wrapper | fails closed |
| consequence stage | sceneCheckpointSchema accepts the predicted v2 state |
| post-state fence | assertV2PostStateMatches remains green |
| regression | STORY03 causal/checkpoint tests remain green |
| live TURN03 | fresh mechanics-enabled action publishes scene 2 |

No paid provider/network call is required for Change acceptance. The live TURN03 rerun is the operational unblock proof.
