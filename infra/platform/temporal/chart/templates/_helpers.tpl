{{- define "platform-temporal.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-temporal.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- $allowed := list "all" "namespace" "postgres" "schema" "server" "admin" "namespace-job" -}}
{{- if not (has $section $allowed) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (eq $mode "development") (or (eq $section "admin") (eq $section "namespace-job")) -}}
{{- fail (printf "section %s is release-only" $section) -}}{{- end -}}
{{- $server := required "images.server overlay is required" .Values.images.server -}}
{{- $admin := required "images.admin overlay is required" .Values.images.admin -}}
{{- $postgres := required "images.postgres overlay is required" .Values.images.postgres -}}
{{- if eq $server "placeholder-server" -}}{{- fail "images.server must be resolved from pin overlay" -}}{{- end -}}
{{- if eq $admin "placeholder-admin" -}}{{- fail "images.admin must be resolved from pin overlay" -}}{{- end -}}
{{- if eq $postgres "placeholder-postgres" -}}{{- fail "images.postgres must be resolved from pin overlay" -}}{{- end -}}
{{- end -}}