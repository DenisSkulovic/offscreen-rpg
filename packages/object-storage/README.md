# @offscreen/object-storage

Physical byte transport for one private bucket or one local directory. Keys are opaque relative paths. This package does not parse documents, choose hashes, or publish stories.

`get(key, maxBytes)` stops while reading a stream once the caller ceiling is passed. The hard ceiling is 32 MiB. Puts use a conditional create (`IfNoneMatch: *` on S3, exclusive hard-link locally) and never replace an existing object.
