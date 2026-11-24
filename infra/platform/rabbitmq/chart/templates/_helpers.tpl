
{{- define "platform-rabbitmq.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-rabbitmq.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- if not (has $section (list "all" "namespace" "broker")) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if ne $mode "release" -}}{{- fail "rabbitmq chart is release-only" -}}{{- end -}}
{{- $img := required "images.broker is required" .Values.images.broker -}}
{{- if eq $img "placeholder-broker" -}}{{- fail "images.broker must be resolved from profile" -}}{{- end -}}
{{- end -}}

{{- define "platform-rabbitmq.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
    offscreen.rpg/lab: disposable
{{- end -}}

{{- define "platform-rabbitmq.doc.broker" -}}
# The password for lab-client is created by install.sh and is not stored in Git.
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: lab-broker
  namespace: {{ .Values.namespace }}
spec:
  replicas: 1
  image: {{ .Values.images.broker | quote }}
  delayStartSeconds: 5
  service:
    type: ClusterIP
  persistence:
    storageClassName: local-path
    storage: 1Gi
  resources:
    requests:
      cpu: 200m
      memory: 1Gi
    limits:
      cpu: 500m
      memory: 1Gi
  secretBackend:
    externalSecret:
      name: lab-broker-user
  rabbitmq:
    additionalConfig: |
      default_queue_type = classic
      loopback_users.guest = true
  override:
    statefulSet:
      spec:
        template:
          spec:
            containers:
              - name: rabbitmq
                volumeMounts:
                  - mountPath: /etc/rabbitmq/definitions.json
                    subPath: definitions.json
                    name: definitions
            volumes:
              - name: definitions
                configMap:
                  name: lab-broker-definitions
{{- end -}}