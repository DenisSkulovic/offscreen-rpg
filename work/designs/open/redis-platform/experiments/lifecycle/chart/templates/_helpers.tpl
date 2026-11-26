{{- define "redis.specimen.selector" -}}
app.kubernetes.io/name: redis
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}
{{- define "redis.specimen.conf" -}}
bind 0.0.0.0
protected-mode no
port 6379
save ""
appendonly no
dir /data
maxmemory {{ .Values.redis.maxmemoryMiB }}mb
maxmemory-policy {{ .Values.redis.evictionPolicy }}
{{- end -}}
