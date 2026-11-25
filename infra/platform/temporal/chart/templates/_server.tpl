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