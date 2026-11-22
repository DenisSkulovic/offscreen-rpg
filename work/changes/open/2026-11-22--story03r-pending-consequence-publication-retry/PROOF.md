# STORY03R proof

| Case | Expected |
| --- | --- |
| reason preservation | pending-consequence detail crosses saved-generation publish result |
| transient mapping | only pending-consequence-not-settled is retryable |
| terminal blocked | unrelated blocked reason remains non-retryable |
| execution isolation | executeFrozenStoryteller activity is not rerun by publication retry |
| eventual publish | settlement followed by retry publishes exactly one passage |
| ACK loss | repeated publication returns published/already_published without duplicate passage |
| provider safety | no provider transport call occurs |
| regression | existing STORY03 control publication and causal suites remain green |

No paid provider, production deployment, schema migration, or TURN03 gate claim is part of this Change.
