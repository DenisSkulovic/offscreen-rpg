"""Design-only local Helm output inventory. No cluster client."""
import pathlib, sys, yaml
root = pathlib.Path(sys.argv[1])
lines = []
bad = False
def say(s): lines.append(s)
for path in sorted(root.glob("*.yaml")):
    say("\n### " + path.name)
    try:
        docs = [x for x in yaml.safe_load_all(path.read_text()) if isinstance(x, dict)]
    except Exception as e:
        say("PARSE_ERROR " + str(e))
        bad = True
        continue
    if not docs:
        say("EMPTY_RENDER")
        bad = True
    for d in docs:
        kind = d.get("kind", "")
        meta = d.get("metadata") or {}
        spec = d.get("spec") or {}
        say(f"{kind} {meta.get('namespace','-')}/{meta.get('name','-')}")
        if kind == "Service":
            say("  service " + str(spec.get("type", "ClusterIP")) + " " + str(spec.get("ports", [])))
            if spec.get("type") in ("NodePort","LoadBalancer","ExternalName") or spec.get("externalIPs"):
                say("  UNEXPECTED_EXPOSURE")
                bad = True
        if kind in ("ClusterRole","ClusterRoleBinding","Role","RoleBinding","CustomResourceDefinition","Ingress","HTTPRoute"):
            say("  UNEXPECTED_AUTHORITY_OR_ROUTE")
            bad = True
        if kind == "PersistentVolumeClaim":
            say("  pvc " + str(spec))
        if kind == "StatefulSet":
            say("  claimTemplates " + str(spec.get("volumeClaimTemplates", [])))
            say("  retention " + str(spec.get("persistentVolumeClaimRetentionPolicy", "default")))
        if kind in ("Deployment","StatefulSet","DaemonSet","Job","CronJob","Pod"):
            pod = spec if kind == "Pod" else (spec.get("template") or {}).get("spec", {})
            if kind == "CronJob":
                pod = spec.get("jobTemplate",{}).get("spec",{}).get("template",{}).get("spec",{})
            say("  replicas " + str(spec.get("replicas", "n/a")))
            say("  serviceAccount " + str(pod.get("serviceAccountName")) + " automount " + str(pod.get("automountServiceAccountToken","inherited")))
            if pod.get("automountServiceAccountToken") is not False:
                say("  TOKEN_MOUNT_NOT_EXPLICITLY_DISABLED")
                bad = True
            if pod.get("hostNetwork") or pod.get("hostPID") or pod.get("hostIPC"):
                say("  UNEXPECTED_HOST_ACCESS")
                bad = True
            for v in pod.get("volumes",[]):
                if "hostPath" in v:
                    say("  UNEXPECTED_HOST_PATH")
                    bad = True
            for c in pod.get("initContainers",[]) + pod.get("containers",[]):
                say("  image " + str(c.get("image")) + " resources " + str(c.get("resources",{})))
                if c.get("securityContext",{}).get("privileged"):
                    say("  UNEXPECTED_PRIVILEGED")
                    bad = True
                if any(p.get("hostPort") for p in c.get("ports",[])):
                    say("  UNEXPECTED_HOST_PORT")
                    bad = True
        if kind == "ConfigMap":
            say("  config keys " + str(sorted((d.get("data") or {}).keys())))
        if kind == "Secret":
            say("  SECRET_PRESENT (values withheld)")
            bad = True
(root/"inventory.txt").write_text("\n".join(lines)+"\n")
sys.exit(int(bad))
