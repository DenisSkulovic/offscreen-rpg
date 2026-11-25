{{- define "platform-redis.doc.deployment" -}}
{{- $configSha := include "platform-redis.redisConf" . | sha256sum -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: {{ .Values.namespace }}
  labels:
{{ include "platform-redis.labels" . | nindent 4 }}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
{{ include "platform-redis.labels" . | nindent 8 }}
      annotations:
        offscreen.rpg/redis-config-sha256: {{ $configSha }}
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: redis
          image: {{ .Values.images.redis | quote }}
          imagePullPolicy: IfNotPresent
          command: ["redis-server", "/config/redis.conf"]
          ports:
            - name: redis
              containerPort: 6379
              protocol: TCP
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: {{ include "platform-redis.formatCpuMilli" .Values.resources.requests }}
              memory: {{ include "platform-redis.formatMemoryMiB" .Values.resources.requests }}
            limits:
              cpu: {{ include "platform-redis.formatCpuMilli" .Values.resources.limits }}
              memory: {{ include "platform-redis.formatMemoryMiB" .Values.resources.limits }}
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 2
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 6
          volumeMounts:
            - name: config
              mountPath: /config
              readOnly: true
            - name: data
              mountPath: /data
      volumes:
        - name: config
          configMap:
            name: redis-config
        - name: data
          emptyDir:
            sizeLimit: {{ include "platform-redis.formatMemoryMiB" (dict "memoryMiB" .Values.data.emptyDirMiB) }}
{{- end -}}