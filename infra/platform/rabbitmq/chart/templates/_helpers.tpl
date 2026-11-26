
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
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail (printf "unsupported profile mode %s" $mode) -}}{{- end -}}
{{- $img := required "images.broker is required" .Values.images.broker -}}
{{- if eq $img "placeholder-broker" -}}{{- fail "images.broker must be resolved from profile" -}}{{- end -}}
{{- $sc := required "storage.storageClass is required" .Values.storage.storageClass -}}
{{- if eq $sc "placeholder" -}}{{- fail "storage.storageClass must be resolved from profile" -}}{{- end -}}
{{- end -}}

{{- define "platform-rabbitmq.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace | quote }}
  labels:
{{- range $key, $value := .Values.namespaceLabels }}
    {{ $key }}: {{ $value | quote }}
{{- end }}
{{- end -}}

{{- define "platform-rabbitmq.doc.broker" -}}
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: {{ .Values.brokerName | quote }}
  namespace: {{ .Values.namespace | quote }}
  labels:
{{- range $key, $value := .Values.brokerLabels }}
    {{ $key }}: {{ $value | quote }}
{{- end }}
spec:
  replicas: 1
  image: {{ .Values.images.broker | quote }}
  service:
    type: ClusterIP
  persistence:
    storageClassName: {{ .Values.storage.storageClass | quote }}
    storage: 5Gi
  resources:
    requests:
      cpu: 200m
      memory: 1Gi
    limits:
      cpu: 500m
      memory: 1Gi
{{- end -}}