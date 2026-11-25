{{- define "platform-temporal.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
{{- end -}}