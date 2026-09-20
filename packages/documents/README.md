# Campaign documents

`@offscreen/documents` owns immutable, content-addressed campaign documents and
published manifests. The first adapter stores private runtime objects beneath an
explicit local root such as `data/documents`; live campaign data never belongs in
the source tree.

Documents contain a validated envelope and a Markdown body. A manifest maps
stable document IDs and friendly logical paths to exact object hashes. Updating a
document writes a new object and manifest; it never overwrites an old version.
PostgreSQL selects the published manifest root atomically with admitted changes.

Reusable world and rule libraries use separate immutable manifests over the same
object store. Rule manifests contain a compact orientation, topic/heading
metadata and an exact executable-adapter identity. They make rule evidence
cheap to discover but never make Markdown executable; application mechanics
must still validate through the matching adapter.

The adapter accepts only hashes when resolving physical objects. Logical paths
are validated, relative navigation labels and are used only during bounded
export. `exportPublishedRoot` writes into a caller-selected empty destination
using exclusive creates, including `manifest.json` and `checksums.json`.
