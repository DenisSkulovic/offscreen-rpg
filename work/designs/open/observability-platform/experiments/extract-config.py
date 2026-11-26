"""Extract exact ConfigMap data; reject unexpected filenames and image mismatches."""
import pathlib, sys, yaml
src,out=map(pathlib.Path,sys.argv[1:])
keys={"collector":{"relay":"relay.yaml"},"prometheus":{"prometheus.yml":"prometheus.yml","alerting_rules.yml":"alerting_rules.yml","recording_rules.yml":"recording_rules.yml","rules":"rules","alerts":"alerts"},"loki":{"config.yaml":"config.yaml","runtime-config.yaml":"runtime-config.yaml"},"tempo":{"tempo.yaml":"tempo.yaml","overrides.yaml":"overrides.yaml"},"grafana":{"grafana.ini":"grafana.ini","datasources.yaml":"datasources.yaml"}}
images={}
for role, mapping in keys.items():
    for profile in ("dev","release"):
        docs=[d for d in yaml.safe_load_all((src/f"{role}.{profile}.yaml").read_text()) if isinstance(d,dict)]
        workloads=[d for d in docs if d.get("kind") in ("Deployment","StatefulSet")]
        assert len(workloads)==1
        image=workloads[0]["spec"]["template"]["spec"]["containers"][0]["image"]
        assert images.setdefault(role,image)==image
        data={}
        for d in docs:
            if d.get("kind")=="ConfigMap":
                for k,v in (d.get("data") or {}).items():
                    if k in mapping:
                        assert k not in data
                        assert isinstance(v,str)
                        data[k]=v
        assert set(data)==set(mapping),(role,profile,set(data))
        folder=out/role/profile
        folder.mkdir(parents=True)
        # Synthetic configs only; containers may run as non-root. Parent evidence dir stays private.
        folder.chmod(0o755)
        for k,v in data.items():
            file=folder/mapping[k]
            file.write_text(v)
            file.chmod(0o644)
        if role=="grafana":
            ds=yaml.safe_load(data["datasources.yaml"])
            assert {x["uid"]:x["url"] for x in ds["datasources"]}=={"offscreen-metrics":"http://obs-prometheus:9090","offscreen-logs":"http://obs-loki:3100","offscreen-traces":"http://obs-tempo:3200"}
(out/"roles.tsv").write_text("".join(f"{k}\t{v}\n" for k,v in images.items()))
