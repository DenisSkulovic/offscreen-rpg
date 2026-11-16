# DOC01 migration working store

Regenerable inventory scripts and local dumps for DOC01.

```bash
node work/designs/open/doc01-migration/build-inventory.mjs
node work/designs/open/doc01-migration/join-disposition.mjs
node work/designs/open/doc01-migration/seed-normative-atoms.mjs
node work/designs/open/doc01-migration/classify-file-routers.mjs
```

Large `*.jsonl` dumps are gitignored; tracked summaries live in the DOC01 Change packet.
