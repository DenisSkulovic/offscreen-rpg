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