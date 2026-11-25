{{- define "platform-redis.doc.configmap" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: {{ .Values.namespace }}
  labels:
{{ include "platform-redis.labels" . | nindent 4 }}
data:
  redis.conf: |
{{- include "platform-redis.redisConf" . | nindent 4 }}
{{- end -}}