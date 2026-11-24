
{{- define "platform-observability.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-observability.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- if ne $section "all" -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if ne $mode "release" -}}{{- fail "observability chart is release-only" -}}{{- end -}}
{{- $img := required "images.collector is required" .Values.images.collector -}}
{{- if eq $img "placeholder-collector" -}}{{- fail "images.collector must be resolved from profile" -}}{{- end -}}
{{- end -}}

{{- define "platform-observability.doc.configmap" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: {{ .Values.namespace }}
  labels:
    app: otel-collector
    offscreen.rpg/lab: disposable
data:
  config.yaml: |
{{ .Files.Get "files/collector-config.yaml" | nindent 4 }}
{{- end -}}

{{- define "platform-observability.doc.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: {{ .Values.namespace }}
  labels:
    app: otel-collector
    offscreen.rpg/lab: disposable
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
        offscreen.rpg/lab: disposable
    spec:
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 5
      containers:
        - name: otel-collector
          image: {{ .Values.images.collector | quote }}
          imagePullPolicy: IfNotPresent
          args: ["--config=/etc/otelcol/config.yaml"]
          ports:
            - name: otlp-http
              containerPort: 4318
            - name: health
              containerPort: 13133
          readinessProbe:
            httpGet:
              path: /
              port: health
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /
              port: health
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 6
          resources:
            requests:
              cpu: 20m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 192Mi
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
            runAsGroup: 10001
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
{{- end -}}

{{- define "platform-observability.doc.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: {{ .Values.namespace }}
  labels:
    app: otel-collector
    offscreen.rpg/lab: disposable
spec:
  type: ClusterIP
  selector:
    app: otel-collector
  ports:
    - name: otlp-http
      port: 4318
      targetPort: otlp-http
{{- end -}}