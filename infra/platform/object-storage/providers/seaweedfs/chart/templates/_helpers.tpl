
{{- define "seaweedfs-object-store.validate" -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail (printf "unsupported profile mode %s" $mode) -}}{{- end -}}
{{- $_ := required "image is required" .Values.image -}}
{{- end -}}