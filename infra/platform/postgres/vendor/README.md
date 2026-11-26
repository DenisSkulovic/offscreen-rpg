# Pinned upstream operator artifact

This directory owns the byte-for-byte CNPG 1.30.2 upstream release manifest. The required file is `cnpg-1.30.2.yaml`; the expected SHA256 is:

```
ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c
```

The file is not yet committed. Populate it from the previously checksum-verified design evidence (or exact upstream release asset), never by rendering a chart or reserializing YAML. Verify the checksum before staging. Baseline ensure fails closed if this file is missing or different.

From the implementation worktree, using the owner's existing evidence:

```bash
install -m 0644 "$HOME/.local/state/offscreen-pg-design-proof/operator.yaml" infra/platform/postgres/vendor/cnpg-1.30.2.yaml
printf '%s  %s\n' ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c infra/platform/postgres/vendor/cnpg-1.30.2.yaml | sha256sum -c -
```

Do not proceed to installation until the verified file is committed and source checks pass.
