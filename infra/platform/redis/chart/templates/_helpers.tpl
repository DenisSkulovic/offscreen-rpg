
{{- define "platform-redis.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-redis.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- if ne $section "all" -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail (printf "unsupported profile mode %s" $mode) -}}{{- end -}}
{{- if and (eq $mode "development") (ne .Values.namespace "offscreen-dev-redis") -}}{{- fail "development profile requires namespace offscreen-dev-redis" -}}{{- end -}}
{{- $img := required "images.redis is required" .Values.images.redis -}}
{{- if eq $img "placeholder-redis" -}}{{- fail "images.redis must be resolved from profile" -}}{{- end -}}
{{- end -}}

{{- define "platform-redis.doc.configmap" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: {{ .Values.namespace }}
  labels:
    app: redis
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    offscreen.rpg/lab: disposable
{{- end }}
data:
  redis.conf: |
    bind 0.0.0.0
    protected-mode no
    port 6379
    appendonly no
    save ""
    dir /data
    maxmemory 32mb
    maxmemory-policy allkeys-lru
{{- end -}}

{{- define "platform-redis.doc.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: {{ .Values.namespace }}
  labels:
    app: redis
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    offscreen.rpg/lab: disposable
{{- end }}
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
        app: redis
{{- if eq .Values.mode "development" }}
        offscreen.dev/owner: offscreen-dev
{{- else }}
        offscreen.rpg/lab: disposable
{{- end }}
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
              cpu: 20m
              memory: 32Mi
            limits:
              cpu: 500m
              memory: 128Mi
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
            sizeLimit: 32Mi
{{- end -}}

{{- define "platform-redis.doc.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: {{ .Values.namespace }}
  labels:
    app: redis
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    offscreen.rpg/lab: disposable
{{- end }}
spec:
  type: ClusterIP
  selector:
    app: redis
  ports:
    - name: redis
      port: 6379
      targetPort: redis
      protocol: TCP
{{- end -}}