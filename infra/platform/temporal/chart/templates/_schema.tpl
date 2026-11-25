{{- define "platform-temporal.schema-job-script" -}}
set -eu
i=0
while [ "$i" -lt 60 ]; do
  if nc -z "$POSTGRES_SEEDS" 5432; then
    break
  fi
  i=$((i + 1))
  sleep 2
done
nc -z "$POSTGRES_SEEDS" 5432
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal create
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal setup-schema -v 0.0
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal update-schema -d /etc/temporal/schema/postgresql/v12/temporal/versioned
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal_visibility create
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal_visibility setup-schema -v 0.0
temporal-sql-tool --plugin postgres12 --ep "$POSTGRES_SEEDS" -u "$POSTGRES_USER" -p 5432 --db temporal_visibility update-schema -d /etc/temporal/schema/postgresql/v12/visibility/versioned
echo "PostgreSQL schema setup complete"
{{- end -}}

{{- define "platform-temporal.doc.schema-job" -}}
{{- $release := eq .Values.mode "release" -}}
apiVersion: batch/v1
kind: Job
metadata:
  name: temporal-schema
  namespace: {{ .Values.namespace }}
  labels:
{{- if $release }}
    app: temporal-schema
{{- end }}
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
{{- if $release }}
        app: temporal-schema
{{- end }}
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
        - name: schema
          image: {{ .Values.images.admin | quote }}
          imagePullPolicy: IfNotPresent
          env:
            - name: SQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: temporal-db
                  key: password
            - name: POSTGRES_SEEDS
              value: temporal-postgres
            - name: POSTGRES_USER
              value: temporal
          command: ["/bin/sh", "-c"]
          args:
            - |
{{ include "platform-temporal.schema-job-script" . | nindent 14 }}
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
{{- if $release }}
          resources:
            requests:
              cpu: 20m
              memory: 64Mi
            limits:
              cpu: 500m
              memory: 320Mi
{{- end }}
{{- end -}}