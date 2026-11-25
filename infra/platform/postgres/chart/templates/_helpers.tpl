
{{- define "platform-postgres.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-postgres.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- $allowed := list "all" "namespace" "cluster" -}}
{{- if not (has $section $allowed) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail "invalid mode" -}}{{- end -}}
{{- $img := required "images.postgres overlay is required" .Values.images.postgres -}}
{{- if eq $img "placeholder-postgres" -}}{{- fail "images.postgres must be resolved from pin overlay" -}}{{- end -}}
{{- end -}}

{{- define "platform-postgres.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace | quote }}
  labels:
{{- range $key, $value := .Values.namespaceLabels }}
    {{ $key }}: {{ $value | quote }}
{{- end }}
{{- end -}}

{{- define "platform-postgres.doc.cluster" -}}
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: {{ .Values.clusterName | quote }}
  namespace: {{ .Values.namespace | quote }}
{{- if .Values.clusterLabels }}
  labels:
{{- range $key, $value := .Values.clusterLabels }}
    {{ $key }}: {{ $value | quote }}
{{- end }}
{{- end }}
spec:
  instances: {{ .Values.instances }}
  imageName: {{ .Values.images.postgres | quote }}
  storage:
    size: {{ .Values.storage.size | quote }}
    storageClass: {{ .Values.storage.storageClass | quote }}
  resources:
    requests:
      cpu: {{ .Values.resources.requests.cpu | quote }}
      memory: {{ .Values.resources.requests.memory | quote }}
    limits:
      cpu: {{ .Values.resources.limits.cpu | quote }}
      memory: {{ .Values.resources.limits.memory | quote }}
  postgresql:
    parameters:
{{- range $key, $value := .Values.postgresql.parameters }}
      {{ $key }}: {{ $value | quote }}
{{- end }}
  bootstrap:
    initdb:
      database: {{ .Values.bootstrap.initdb.database | quote }}
      owner: {{ .Values.bootstrap.initdb.owner | quote }}
      localeCType: {{ .Values.bootstrap.initdb.localeCType | quote }}
      localeCollate: {{ .Values.bootstrap.initdb.localeCollate | quote }}
{{- end -}}