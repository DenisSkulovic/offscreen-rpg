{{- define "redis.validateRelease" -}}
{{- if and (ne .Release.Name "redis") (ne .Release.Name "RELEASE-NAME") -}}
{{- fail "release name must be redis" -}}
{{- end -}}
{{- end -}}

{{- define "redis.validateResources" -}}
{{- if or (gt (int .Values.resources.requests.memoryMiB) (int .Values.resources.limits.memoryMiB)) (gt (int .Values.resources.requests.cpuMilli) (int .Values.resources.limits.cpuMilli)) (gt (int .Values.redis.maxmemoryMiB) (div (int .Values.resources.limits.memoryMiB) 2)) -}}
{{- fail "invalid resource envelope" -}}
{{- end -}}
{{- end -}}

{{- define "redis.selectorLabels" -}}
app.kubernetes.io/name: redis
app.kubernetes.io/instance: redis
{{- end -}}

{{- define "redis.labels" -}}
{{ include "redis.selectorLabels" . }}
{{ .Values.owner.key }}: {{ .Values.owner.value | quote }}
{{- end -}}

{{- define "redis.conf" -}}
bind 0.0.0.0
protected-mode no
port 6379
save ""
appendonly no
dir /data
maxmemory {{ .Values.redis.maxmemoryMiB }}mb
maxmemory-policy {{ .Values.redis.evictionPolicy }}
{{- end -}}

{{- define "redis.confSha256" -}}
{{- include "redis.conf" . | sha256sum -}}
{{- end -}}