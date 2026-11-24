
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

{{- define "platform-temporal.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
{{- end -}}

{{- define "platform-temporal.doc.postgres-init" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: temporal-postgres-init
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-postgres
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
data:
  01-lab.sh: |
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE lab;"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname lab -c "CREATE TABLE lab_effect (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, workflow_id text NOT NULL, run_id text NOT NULL);"
{{- end -}}

{{- define "platform-temporal.doc.postgres-pvc" -}}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: temporal-postgres
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-postgres
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: {{ .Values.storageClass | quote }}
  resources:
    requests:
      storage: 1Gi
{{- end -}}

{{- define "platform-temporal.doc.postgres-deployment" -}}
{{- $release := eq .Values.mode "release" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-postgres
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-postgres
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: temporal-postgres
  template:
    metadata:
      labels:
        app: temporal-postgres
        {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        fsGroup: 999
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: postgres
          image: {{ .Values.images.postgres | quote }}
{{- if $release }}
          imagePullPolicy: IfNotPresent
{{- end }}
          ports:
            - name: postgres
              containerPort: 5432
              protocol: TCP
          env:
            - name: POSTGRES_USER
              value: temporal
            - name: POSTGRES_DB
              value: postgres
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: temporal-db
                  key: password
{{- if $release }}
          securityContext:
            allowPrivilegeEscalation: false
          resources:
            requests:
              cpu: 20m
              memory: 64Mi
            limits:
              cpu: 500m
              memory: 384Mi
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "temporal", "-d", "postgres"]
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 12
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "temporal", "-d", "postgres"]
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 6
{{- else }}
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            tcpSocket:
              port: postgres
{{- end }}
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
{{- if $release }}
            - name: init
              mountPath: /docker-entrypoint-initdb.d
              readOnly: true
{{- end }}
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: temporal-postgres
{{- if $release }}
        - name: init
          configMap:
            name: temporal-postgres-init
{{- end }}
{{- end -}}

{{- define "platform-temporal.doc.postgres-service" -}}
apiVersion: v1
kind: Service
metadata:
  name: temporal-postgres
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-postgres
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  type: ClusterIP
  selector:
    app: temporal-postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: postgres
      protocol: TCP
{{- end -}}

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

{{- define "platform-temporal.doc.server-scripts" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: temporal-server-scripts
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-server
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
data:
  start.sh: |
{{ .Files.Get "files/start.sh" | nindent 4 }}
{{- end -}}

{{- define "platform-temporal.doc.server-dynamic" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: temporal-dynamic
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-server
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
data:
  lab.yaml: |
{{ .Files.Get "files/lab.yaml" | nindent 4 }}
{{- end -}}

{{- define "platform-temporal.doc.server-deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-server
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-server
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: temporal-server
  template:
    metadata:
      labels:
        app: temporal-server
        {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: temporal-server
          image: {{ .Values.images.server | quote }}
          imagePullPolicy: IfNotPresent
          command: ["/bin/sh", "/etc/temporal/lab/start.sh"]
          ports:
            - name: grpc
              containerPort: 7233
              protocol: TCP
          env:
            - name: POSTGRES_PWD
              valueFrom:
                secretKeyRef:
                  name: temporal-db
                  key: password
            - name: GOMEMLIMIT
              value: 640MiB
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 50m
              memory: 256Mi
            limits:
              cpu: 700m
              memory: 768Mi
          readinessProbe:
            tcpSocket:
              port: grpc
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 36
          livenessProbe:
            tcpSocket:
              port: grpc
            initialDelaySeconds: 40
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 6
          volumeMounts:
            - name: scripts
              mountPath: /etc/temporal/lab
              readOnly: true
            - name: dynamic
              mountPath: /etc/temporal/config/dynamicconfig
              readOnly: true
      volumes:
        - name: scripts
          configMap:
            name: temporal-server-scripts
            defaultMode: 0555
        - name: dynamic
          configMap:
            name: temporal-dynamic
{{- end -}}

{{- define "platform-temporal.doc.server-service" -}}
apiVersion: v1
kind: Service
metadata:
  name: temporal-server
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-server
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  type: ClusterIP
  selector:
    app: temporal-server
  ports:
    - name: grpc
      port: 7233
      targetPort: grpc
      protocol: TCP
{{- end -}}

{{- define "platform-temporal.doc.admin-deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-admin
  namespace: {{ .Values.namespace }}
  labels:
    app: temporal-admin
    {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: temporal-admin
  template:
    metadata:
      labels:
        app: temporal-admin
        {{ .Values.ownerLabelKey }}: {{ .Values.ownerValue | quote }}
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: admin
          image: {{ .Values.images.admin | quote }}
          imagePullPolicy: IfNotPresent
          command: ["sleep", "infinity"]
          env:
            - name: TEMPORAL_ADDRESS
              value: temporal-server:7233
            - name: TEMPORAL_NAMESPACE
              value: default
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