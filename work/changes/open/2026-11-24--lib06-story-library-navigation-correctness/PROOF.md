# LIB06 | Acceptance matrix

- **Normal:** v2 128, 129, 513 entries page fully and with raw continuation; find literal paths beyond index 128.
- **Privacy:** >512 private entries emit no path/titles/content and advance cursor; reviewer sees no private counts; later public entry reachable.
- **Authority:** deny authorization before any read; wrong story ID, revision, invalid root, corrupt/missing node refuse. Old v1 path remains valid.
- **Boundedness:** <=512 raw manifest/trie entries inspected per browse/find call; no infinite loop on empty visible page; pageSize <=128.
- **Integrity:** read/open enforce document-envelope identity and source-root membership; no arbitrary hash oracle.
- **Compatibility:** no Writer tool name/result schema change, no DB/S3/workspace changes, no release lab run. Planner has NOT run tests.
