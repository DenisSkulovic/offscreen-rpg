"""Freeze exact chart identities from a successful E01 render; no cluster access."""
import csv
import json
import pathlib
import sys
import yaml

root = pathlib.Path(sys.argv[1])
roles = ("prometheus", "loki", "tempo", "collector", "grafana")
with (root / "results.tsv").open() as f:
    rows = list(csv.DictReader(f, delimiter="\t"))
assert len(rows) == 10
assert {(r["chart"], r["profile"], r["state"]) for r in rows} == {
    (role, profile, "RENDERED") for role in roles for profile in ("dev", "release")
}
inventory = {}
for profile, namespace in (("dev", "offscreen-dev-observability"), ("release", "offscreen-observability")):
    direct, generated, seen = [], [], set()
    for role in roles:
        release = "obs-" + role
        for doc in yaml.safe_load_all((root / f"{role}.{profile}.yaml").read_text()):
            if doc is None:
                continue
            assert isinstance(doc, dict)
            meta = doc["metadata"]
            kind, name = doc["kind"], meta["name"]
            assert meta["namespace"] == namespace
            assert not (meta.get("annotations") or {}).get("helm.sh/hook")
            assert kind in {"ServiceAccount", "ConfigMap", "Service", "Deployment", "StatefulSet", "PersistentVolumeClaim"}
            key = (kind, name)
            assert key not in seen, key
            seen.add(key)
            direct.append([doc["apiVersion"], kind, namespace, name, release])
            if kind == "StatefulSet":
                assert doc["spec"]["replicas"] == 1
                for claim in doc["spec"].get("volumeClaimTemplates", []):
                    generated.append(["v1", "PersistentVolumeClaim", namespace, claim["metadata"]["name"] + "-" + name + "-0", release])
    claims = [row[3] for row in direct + generated if row[1] == "PersistentVolumeClaim"]
    assert sorted(claims) == ["obs-prometheus", "storage-obs-loki-0", "storage-obs-tempo-0"], claims
    assert len({(row[1], row[3]) for row in direct + generated}) == len(direct + generated)
    inventory[profile] = {"direct": sorted(direct), "generatedClaims": sorted(generated)}
print(json.dumps(inventory, indent=2, sort_keys=True))
