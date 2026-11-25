{{- define "platform-temporal.namespace-job-script" -}}
set -eu
i=0
while [ "$i" -lt 60 ]; do
  if temporal operator cluster health --address "$TEMPORAL_ADDRESS"; then
    break
  fi
  i=$((i + 1))
  sleep 3
done
temporal operator cluster health --address "$TEMPORAL_ADDRESS"
if temporal operator namespace describe --address "$TEMPORAL_ADDRESS" --namespace default; then
  echo "Namespace default already exists."
else
  temporal operator namespace create --address "$TEMPORAL_ADDRESS" --namespace default --retention 1d
fi
{{- end -}}

{{- define "platform-temporal.doc.namespace-job" -}}
apiVersion: batch/v1
kind: Job
metadata:
  name: temporal-namespace
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-namespace
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  backoffLimit: 6
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app: temporal-namespace
        {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
    spec:
      restartPolicy: Never
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: namespace
          image: {{ .Values.images.admin | quote }}
          imagePullPolicy: IfNotPresent
          env:
            - name: TEMPORAL_ADDRESS
              value: temporal-server:7233
          command: ["/bin/sh", "-c"]
          args:
            - |
{{ include "platform-temporal.namespace-job-script" . | nindent 14 }}
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 10m
              memory: 32Mi
            limits:
              cpu: 300m
              memory: 192Mi
{{- end -}}