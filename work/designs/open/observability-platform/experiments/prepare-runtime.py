"""Build isolated runtime specimen from E01 dev manifests and observed image locks."""
import pathlib, sys, yaml, secrets, json
src,out,lock=map(pathlib.Path,sys.argv[1:])
locks=dict(line.split("\t") for line in lock.read_text().splitlines()[1:])
assert set(locks)=={"collector","prometheus","loki","tempo","grafana"}
ns="offscreen-dev-observability"
for role in locks:
    docs=[d for d in yaml.safe_load_all((src/f"{role}.dev.yaml").read_text()) if isinstance(d,dict)]
    for d in docs:
        assert d["metadata"]["namespace"]==ns
        if d["kind"]=="Service":
            assert d["spec"].get("type","ClusterIP")=="ClusterIP"
            assert not d["spec"].get("externalIPs")
        if d["kind"] in ("Deployment","StatefulSet"):
            p=d["spec"]["template"]["spec"]
            assert p.get("automountServiceAccountToken") is False
            assert not any(p.get(x) for x in ("hostNetwork","hostPID","hostIPC"))
            assert not any("hostPath" in v for v in p.get("volumes",[]))
            assert len(p["containers"])==1 and not p.get("initContainers")
            c=p["containers"][0]
            assert not c.get("securityContext",{}).get("privileged")
            assert not any(x.get("hostPort") for x in c.get("ports",[]))
            orig=c["image"].rsplit(":",1)[0].removeprefix("docker.io/")
            assert orig==locks[role].split("@")[0].removeprefix("docker.io/")
            c["image"]=locks[role]
            c["imagePullPolicy"]="IfNotPresent"
    (out/f"{role}.yaml").write_text(yaml.safe_dump_all(docs,sort_keys=False))
password=secrets.token_urlsafe(32)
(out/"admin.json").write_text(json.dumps({"apiVersion":"v1","kind":"Secret","metadata":{"name":"obs-grafana-admin","namespace":ns},"type":"Opaque","stringData":{"admin-user":"admin","admin-password":password}}))
(out/"grafana.netrc").write_text(f"machine 127.0.0.1 login admin password {password}\n")
