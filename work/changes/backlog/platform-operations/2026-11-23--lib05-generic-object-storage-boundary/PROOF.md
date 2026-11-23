# LIB05 | Zero-loss acceptance

Planning-only, NO tests executed.

| Guarantee | Required verification |
| --- | --- |
| Existing persistent objects accessible | Given same canonical document bytes, resulting local/S3 key `objects/sha256/<ab>/<hash>.json` and SHA identical to baseline; old stored blobs readable without migration |
| No overwrite | Two same-key concurrent local/S3 puts, S3 `IfNoneMatch:'*'` command verified; collision never replaces bytes; Documents rejects mismatched existing bytes |
| Missing/corrupt/unavailable | Missing key distinct from transport outage, hash mismatch/corrupt JSON rejected, oversize fails boundedly |
| Path safety | `../`, absolute, backslash, empty segments, control chars and dangerous prefixes rejected before disk/S3 access |
| Bounded resource use | `get(key,maxBytes)` enforces limit while consuming stream; no unbounded AWS `transformToString()` for media-sized content; never buffers unlimited bodies |
| Domain isolation | Raw package does not import Documents, zod document schemas, Story Engine, runtime policy; no public URL/delete, no Redis |
| Compatibility | Existing DocumentStore constructors/config/env errors and type exports remain unchanged, no new Pod/DB schema/provider spend |
| Quality | Raw transport tests; Documents fixture tests; dependent typecheck/build; changed-file lint/formatter |
| Honest scope | Supports bounded binary object blobs, not necessarily streaming uploads/presigned URLs or full Media platform; follow-on only with measured need |

**Ready gate:** When LIB03 integrates, recheck current source package graph, test split, all S3-client importers and exact SDK version. Resolve any drift before copying this packet from backlog into open. If raw Get cannot enforce streaming byte ceiling with available SDK body abstraction, mark planner-blocked and select safe stream consumption algorithm before execution.
