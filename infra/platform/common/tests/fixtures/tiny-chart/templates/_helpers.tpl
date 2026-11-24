
{{- define "platform-fixture.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-fixture.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- $allowed := list "all" "namespace" "cluster" -}}
{{- if not (has $section $allowed) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- $img := required "images.postgres overlay is required" .Values.images.postgres -}}
{{- if eq $img "placeholder-postgres" -}}{{- fail "images.postgres must be resolved from pin overlay" -}}{{- end -}}
{{- end -}}

{{- define "platform-fixture.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
{{- end -}}

{{- define "platform-fixture.doc.cluster" -}}
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: fixture-pg
  namespace: {{ .Values.namespace }}
spec:
  instances: 1
  imageName: {{ .Values.images.postgres | quote }}
{{- end -}}