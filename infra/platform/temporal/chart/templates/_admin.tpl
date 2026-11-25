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