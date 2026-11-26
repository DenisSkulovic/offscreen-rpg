"""E01 exact workload/service/storage assertions, no cluster operations."""
import pathlib, sys, yaml
root = pathlib.Path(sys.argv[1])
failures = []
def require(condition, message):
    if not condition:
        failures.append(message)
roles = {"collector": ("Deployment", {4317,4318,8888}), "prometheus": ("Deployment",{9090}), "loki": ("StatefulSet",{3100,9095,9096}), "tempo": ("StatefulSet",{3200,4317,9411,55680,55681}), "grafana": ("Deployment",{80})}
for profile, ns, sc in [("dev","offscreen-dev-observability","standard"),("release","offscreen-observability","local-path")]:
    seen = set()
    for role,(kind,ports) in roles.items():
        prefix = f"{profile}/{role}"
        try:
            docs = list(d for d in yaml.safe_load_all((root/f"{role}.{profile}.yaml").read_text()) if isinstance(d,dict))
        except Exception as e:
            failures.append(f"{prefix}: parse/read failed: {e}")
            continue
        workloads = [d for d in docs if d.get("kind") in ("Deployment","StatefulSet","DaemonSet","Job","CronJob","Pod")]
        require(len(workloads)==1, prefix+": expected one workload")
        for w in workloads:
            require(w["kind"]==kind and w["metadata"]["name"]=="obs-"+role,prefix+": workload identity")
            p=w["spec"]["template"]["spec"] if w["kind"] in ("Deployment","StatefulSet","DaemonSet") else {}
            require(w["spec"].get("replicas")==1,prefix+": singleton")
            require(len(p.get("containers",[]))==1 and not p.get("initContainers"),prefix+": unexpected containers")
            require(p.get("automountServiceAccountToken") is False,prefix+": token mount")
        service=[d for d in docs if d.get("kind")=="Service" and d["metadata"]["name"]=="obs-"+role]
        require(len(service)==1,prefix+": primary service identity")
        if len(service)==1:
            require({x["port"] for x in service[0]["spec"]["ports"]}==ports,prefix+": primary service ports")
        claims=[d["spec"] for d in docs if d.get("kind")=="PersistentVolumeClaim"]
        for w in workloads:
            claims.extend(x["spec"] for x in w.get("spec",{}).get("volumeClaimTemplates",[]))
        require(len(claims)==int(role in ("prometheus","loki","tempo")),prefix+": storage count")
        for c in claims:
            require(c.get("storageClassName")==sc and c.get("resources",{}).get("requests",{}).get("storage")=="5Gi",prefix+": storage contract")
        for d in docs:
            m=d.get("metadata",{})
            require(m.get("namespace")==ns,prefix+": namespace "+str(m.get("name")))
            identity=(d.get("kind"),m.get("namespace"),m.get("name"))
            require(identity not in seen,prefix+": duplicate identity "+str(identity))
            seen.add(identity)
            require(not (m.get("annotations") or {}).get("helm.sh/hook"),prefix+": unexpected hook")
            require(d.get("kind") in ("ServiceAccount","ConfigMap","Service","Deployment","StatefulSet","PersistentVolumeClaim"),prefix+": unexpected kind "+str(d.get("kind")))
        if role=="loki":
            require(not any(d.get("metadata",{}).get("name")=="obs-loki-memcached" for d in docs),prefix+": unused memcached identity")
print("STRUCTURAL_ASSERTIONS:", "FAIL" if failures else "PASS")
for f in failures: print(" -",f)
sys.exit(bool(failures))
