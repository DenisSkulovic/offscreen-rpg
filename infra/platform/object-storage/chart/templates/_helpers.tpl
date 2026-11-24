
{{- define "platform-object-storage.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-object-storage.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- $allowed := list "all" "namespace" "workloads" -}}
{{- if not (has $section $allowed) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail (printf "unsupported profile mode %s" $mode) -}}{{- end -}}
{{- $_ := required "image is required" .Values.image -}}
{{- end -}}

{{- define "platform-object-storage.doc.namespace" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    offscreen.rpg/lab: disposable
{{- end }}
{{- end -}}

{{- define "platform-object-storage.doc.pvc" -}}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: object-store-data
  namespace: {{ .Values.namespace }}
  labels:
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    app: object-store
    offscreen.rpg/lab: disposable
{{- end }}
spec:
{{- if eq .Values.mode "development" }}
  accessModes: [ReadWriteOnce]
{{- else }}
  accessModes:
    - ReadWriteOnce
{{- end }}
  storageClassName: {{ .Values.storageClass }}
  resources:
    requests:
      storage: 2Gi
{{- end -}}

{{- define "platform-object-storage.doc.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: object-store
  namespace: {{ .Values.namespace }}
  labels:
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    app: object-store
    offscreen.rpg/lab: disposable
{{- end }}
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: object-store
  template:
    metadata:
      labels:
        app: object-store
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
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: seaweedfs
          image: {{ .Values.image | quote }}
          imagePullPolicy: IfNotPresent
          args: ["mini", "-dir=/data"]
          ports:
            - name: s3
              containerPort: 8333
{{- if eq .Values.mode "release" }}
              protocol: TCP
{{- end }}
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: object-store-s3
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: object-store-s3
                  key: secret-access-key
{{- if eq .Values.mode "release" }}
            - name: S3_BUCKET
              value: lab-objects
{{- end }}
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 768Mi
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8333/); [ "$code" = "200" ] || [ "$code" = "403" ]
            initialDelaySeconds: 3
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 36
{{- if eq .Values.mode "release" }}
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8333/); [ "$code" = "200" ] || [ "$code" = "403" ]
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 6
{{- end }}
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: object-store-data
{{- end -}}

{{- define "platform-object-storage.doc.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: object-store
  namespace: {{ .Values.namespace }}
  labels:
{{- if eq .Values.mode "development" }}
    offscreen.dev/owner: offscreen-dev
{{- else }}
    app: object-store
    offscreen.rpg/lab: disposable
{{- end }}
spec:
  type: ClusterIP
  selector:
    app: object-store
  ports:
    - name: s3
      port: 8333
      targetPort: s3
{{- if eq .Values.mode "release" }}
      protocol: TCP
{{- end }}
{{- end -}}