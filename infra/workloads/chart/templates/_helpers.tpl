
{{- define "offscreen-app.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "offscreen-app.validate" -}}
{{- $mode := required "profile must set mode" .Values.mode -}}
{{- $section := default "all" .Values.section -}}
{{- $allowed := list "all" "deployments" "namespaces" "services" "migration" "edge" "authority" "workers" -}}
{{- if not (has $section $allowed) -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- if eq $mode "development" -}}
{{- if has $section (list "migration" "edge" "authority" "workers") -}}{{- fail "release section is not valid for development" -}}{{- end -}}
{{- $b := required "development bindings are required" .Values.bindings -}}
{{- $slot := required "bindings.slotId" $b.slotId -}}
{{- if not (regexMatch "^dev-[1-9][0-9]*$" $slot) -}}{{- fail "invalid slotId" -}}{{- end -}}
{{- $digits := trimPrefix "dev-" $slot -}}
{{- $expected := printf "offscreen-dev-%s" $digits -}}
{{- if ne (toString $b.namespace) (toString $expected) -}}{{- fail "bindings.namespace must derive from slotId" -}}{{- end -}}
{{- if ne $b.cookiePrefix $slot -}}{{- fail "bindings.cookiePrefix must equal slotId" -}}{{- end -}}
{{- if ne $b.temporalNamespace $b.namespace -}}{{- fail "bindings.temporalNamespace must equal namespace" -}}{{- end -}}
{{- if not $b.schemaReady -}}{{- fail "schemaReady must be true" -}}{{- end -}}
{{- if not $b.dbSecret -}}{{- fail "missing bindings.dbSecret" -}}{{- end -}}
{{- if not $b.appSecret -}}{{- fail "missing bindings.appSecret" -}}{{- end -}}
{{- if not $b.s3Secret -}}{{- fail "missing bindings.s3Secret" -}}{{- end -}}
{{- else if eq $mode "release" -}}
{{- if .Values.bindings -}}
{{- if gt (len .Values.bindings) 0 -}}{{- fail "release profile does not accept bindings" -}}{{- end -}}
{{- end -}}
{{- else -}}{{- fail "invalid mode" -}}{{- end -}}
{{- end -}}

{{- define "offscreen-app.dev.labels" -}}
app: {{ .app | quote }}
offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
offscreen.dev/owner: offscreen-dev
offscreen.rpg/profile: dev-slot
{{- end -}}

{{- define "offscreen-app.release.labels.metadata" -}}
app: {{ .app | quote }}
offscreen.rpg/lab: disposable
{{- end -}}

{{- define "offscreen-app.release.labels.pod" -}}
app: {{ .app | quote }}
offscreen.rpg/lab: disposable
offscreen.rpg/chaos-eligible: "true"
{{- end -}}

{{- define "offscreen-app.dev.security.pod" -}}
runAsNonRoot: true
runAsUser: {{ .Values.podSecurity.runAsUser }}
runAsGroup: {{ .Values.podSecurity.runAsGroup }}
seccompProfile:
  type: RuntimeDefault
{{- end -}}

{{- define "offscreen-app.dev.security.container" -}}
allowPrivilegeEscalation: {{ .Values.podSecurity.allowPrivilegeEscalation }}
capabilities:
  drop:
    - ALL
{{- end -}}

{{- define "offscreen-app.release.security.pod" -}}
runAsNonRoot: {{ .Values.podSecurity.runAsNonRoot }}
runAsUser: {{ .Values.podSecurity.runAsUser }}
runAsGroup: {{ .Values.podSecurity.runAsGroup }}
seccompProfile:
  type: {{ .Values.podSecurity.seccompProfile.type | quote }}
{{- end -}}

{{- define "offscreen-app.release.security.pod.web" -}}
runAsNonRoot: {{ .Values.podSecurity.runAsNonRoot }}
runAsUser: {{ .Values.release.webRunAsUser }}
runAsGroup: {{ .Values.release.webRunAsGroup }}
seccompProfile:
  type: {{ .Values.podSecurity.seccompProfile.type | quote }}
{{- end -}}

{{- define "offscreen-app.release.security.container" -}}
allowPrivilegeEscalation: {{ .Values.podSecurity.allowPrivilegeEscalation }}
capabilities:
  drop:
    - ALL
{{- end -}}

{{- define "offscreen-app.podSpecFlags" -}}
automountServiceAccountToken: {{ .Values.automountServiceAccountToken }}
enableServiceLinks: {{ .Values.enableServiceLinks }}
{{- end -}}

{{- define "offscreen-app.doc.namespace.dev" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.bindings.namespace }}
  labels:
    {{- include "offscreen-app.dev.labels" (dict "app" "slot" "Values" .Values) | nindent 4 }}
{{- end -}}


{{- define "offscreen-app.doc.namespace.release.edge" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespaces.edge | quote }}
  labels:
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
{{- end -}}


{{- define "offscreen-app.doc.namespace.release.authority" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespaces.authority | quote }}
  labels:
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
{{- end -}}


{{- define "offscreen-app.doc.namespace.release.workers" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespaces.workers | quote }}
  labels:
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
{{- end -}}

{{- define "offscreen-app.doc.service.game-web.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.catalog.deployments.web | quote }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.web | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: {{ .Values.catalog.deployments.web | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: {{ .Values.catalog.httpPorts.web }}
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-api.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.catalog.deployments.api | quote }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.api | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: {{ .Values.catalog.deployments.api | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: {{ .Values.catalog.httpPorts.api }}
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-authority.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.catalog.deployments.authority | quote }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.authority | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: {{ .Values.catalog.deployments.authority | quote }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: {{ .Values.catalog.httpPorts.authority }}
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-web.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: {{ .Values.catalog.deployments.web | quote }}
  namespace: {{ .Values.namespaces.edge | quote }}
  labels:
    app: {{ .Values.catalog.deployments.web | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  type: "ClusterIP"
  selector:
    app: {{ .Values.catalog.deployments.web | quote }}
  ports:
    -
      name: "http"
      port: {{ .Values.catalog.httpPorts.web }}
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.service.game-api.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: {{ .Values.catalog.deployments.api | quote }}
  namespace: {{ .Values.namespaces.edge | quote }}
  labels:
    app: {{ .Values.catalog.deployments.api | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  type: "ClusterIP"
  selector:
    app: {{ .Values.catalog.deployments.api | quote }}
  ports:
    -
      name: "http"
      port: {{ .Values.catalog.httpPorts.api }}
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.service.game-authority.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: {{ .Values.catalog.deployments.authority | quote }}
  namespace: {{ .Values.namespaces.authority | quote }}
  labels:
    app: {{ .Values.catalog.deployments.authority | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  type: "ClusterIP"
  selector:
    app: {{ .Values.catalog.deployments.authority | quote }}
  ports:
    -
      name: "http"
      port: {{ .Values.catalog.httpPorts.authority }}
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.job.migrate.release" -}}
apiVersion: "batch/v1"
kind: "Job"
metadata:
  name: "game-migrate"
  namespace: {{ .Values.namespaces.edge | quote }}
  labels:
    app: "game-migrate"
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: "game-migrate"
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
    spec:
      restartPolicy: "Never"
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: "migrate"
          image: {{ .Values.images.migrate | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          command:
{{- toYaml .Values.release.migrateCommand | nindent 12 }}
          env:
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.dbSecret | quote }}
                  key: "uri"
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.release.migrateResources.requests.cpu | quote }}
              memory: {{ .Values.release.migrateResources.requests.memory | quote }}
            limits:
              memory: {{ .Values.release.migrateResources.limits.memory | quote }}
{{- end -}}













{{- define "offscreen-app.doc.deployment.game-web.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.web | quote }}
  namespace: {{ .Values.namespaces.edge | quote }}
  labels:
    app: {{ .Values.catalog.deployments.web | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.web | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.web | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod.web" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.web | quote }}
          image: {{ .Values.images.web | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          ports:
            -
              name: "http"
              containerPort: {{ .Values.catalog.httpPorts.web }}
          env:
            -
              name: "HOSTNAME"
              value: "0.0.0.0"
            -
              name: "API_PROXY_ORIGIN"
              value: {{ .Values.release.apiProxyOrigin | quote }}
            -
              name: "API_INTERNAL_ORIGIN"
              value: {{ .Values.release.apiProxyOrigin | quote }}
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: {{ .Values.readiness.periodSeconds }}
            timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
            failureThreshold: {{ .Values.readiness.web.failureThreshold }}
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.web.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.web.memory | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-api.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.api | quote }}
  namespace: {{ .Values.namespaces.edge | quote }}
  labels:
    app: {{ .Values.catalog.deployments.api | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.api | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.api | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.api | quote }}
          image: {{ .Values.images.api | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          ports:
            -
              name: "http"
              containerPort: {{ .Values.catalog.httpPorts.api }}
          env:
            -
              name: "API_HOST"
              value: "0.0.0.0"
            -
              name: "API_PORT"
              value: {{ .Values.catalog.httpPorts.api | quote }}
            -
              name: "APP_ORIGIN"
              value: {{ .Values.release.appOrigin | quote }}
            -
              name: "GAME_AUTHORITY_MODE"
              value: "distributed"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: {{ .Values.release.authorityOrigin | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: {{ .Values.release.s3Bucket | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: {{ .Values.release.s3Endpoint | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: {{ .Values.release.s3ForcePathStyle | quote }}
            -
              name: "OFFSCREEN_DEFAULT_RULE_ROOT_HASH"
              value: {{ .Values.release.ruleRootHash | quote }}
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.dbSecret | quote }}
                  key: "uri"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "secret-access-key"
            -
              name: "GAME_AUTHORITY_SERVICE_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-service-token"
            -
              name: "BETTER_AUTH_SECRET"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "better-auth-secret"
            -
              name: "GITHUB_CLIENT_ID"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "github-client-id"
            -
              name: "GITHUB_CLIENT_SECRET"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "github-client-secret"
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: {{ .Values.readiness.periodSeconds }}
            timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
            failureThreshold: {{ .Values.readiness.api.failureThreshold }}
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.api.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.api.memory | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-authority.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.authority | quote }}
  namespace: {{ .Values.namespaces.authority | quote }}
  labels:
    app: {{ .Values.catalog.deployments.authority | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.authority | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.authority | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.authority | quote }}
          image: {{ .Values.images.authority | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          ports:
            -
              name: "http"
              containerPort: {{ .Values.catalog.httpPorts.authority }}
          env:
            -
              name: "GAME_AUTHORITY_HOST"
              value: "0.0.0.0"
            -
              name: "GAME_AUTHORITY_PORT"
              value: {{ .Values.catalog.httpPorts.authority | quote }}
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.dbSecret | quote }}
                  key: "uri"
            -
              name: "OFFSCREEN_WRITER_EXECUTION_MODE"
              value: {{ .Values.release.writerExecutionMode | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: {{ .Values.release.s3Bucket | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: {{ .Values.release.s3Endpoint | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: {{ .Values.release.s3ForcePathStyle | quote }}
            -
              name: "OFFSCREEN_DEFAULT_RULE_ROOT_HASH"
              value: {{ .Values.release.ruleRootHash | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "secret-access-key"
            -
              name: "GAME_AUTHORITY_SERVICE_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-service-token"
            -
              name: "GAME_AUTHORITY_CONTROL_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-control-token"
            -
              name: "GAME_AUTHORITY_EXECUTOR_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-executor-token"
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: {{ .Values.readiness.periodSeconds }}
            timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
            failureThreshold: {{ .Values.readiness.authority.failureThreshold }}
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.authority.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.authority.memory | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-control.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.control | quote }}
  namespace: {{ .Values.namespaces.workers | quote }}
  labels:
    app: {{ .Values.catalog.deployments.control | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.control | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.control | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.control | quote }}
          image: {{ .Values.images.worker | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          command:
{{- toYaml .Values.workerCommands.control | nindent 12 }}
          env:
            -
              name: "TEMPORAL_ADDRESS"
              value: {{ .Values.release.temporalAddress | quote }}
            -
              name: "TEMPORAL_NAMESPACE"
              value: {{ .Values.release.temporalNamespace | quote }}
            -
              name: "TEMPORAL_TASK_QUEUE"
              value: "control"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: {{ .Values.release.authorityOrigin | quote }}
            -
              name: "GAME_AUTHORITY_CONTROL_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-control-token"
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.control.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.control.memory | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-executor.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.executor | quote }}
  namespace: {{ .Values.namespaces.workers | quote }}
  labels:
    app: {{ .Values.catalog.deployments.executor | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.executor | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.executor | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.executor | quote }}
          image: {{ .Values.images.worker | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          command:
{{- toYaml .Values.workerCommands.executor | nindent 12 }}
          env:
            -
              name: "TEMPORAL_ADDRESS"
              value: {{ .Values.release.temporalAddress | quote }}
            -
              name: "TEMPORAL_NAMESPACE"
              value: {{ .Values.release.temporalNamespace | quote }}
            -
              name: "TEMPORAL_TASK_QUEUE"
              value: "storyteller-execute-v1"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: {{ .Values.release.authorityOrigin | quote }}
            -
              name: "GAME_AUTHORITY_EXECUTOR_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "game-authority-executor-token"
            -
              name: "OFFSCREEN_WRITER_EXECUTION_MODE"
              value: {{ .Values.release.writerExecutionMode | quote }}
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.executor.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.executor.memory | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-relay.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: {{ .Values.catalog.deployments.relay | quote }}
  namespace: {{ .Values.namespaces.workers | quote }}
  labels:
    app: {{ .Values.catalog.deployments.relay | quote }}
    offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.relay | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.relay | quote }}
        offscreen.rpg/lab: {{ .Values.release.labLabel | quote }}
        offscreen.rpg/chaos-eligible: "true"
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.release.security.pod" . | nindent 8 }}
      containers:
        -
          name: {{ .Values.catalog.containers.relay | quote }}
          image: {{ .Values.images.worker | quote }}
          imagePullPolicy: {{ .Values.imagePullPolicy | quote }}
          command:
{{- toYaml .Values.workerCommands.relay | nindent 12 }}
          env:
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.dbSecret | quote }}
                  key: "uri"
            -
              name: "TEMPORAL_ADDRESS"
              value: {{ .Values.release.temporalAddress | quote }}
            -
              name: "TEMPORAL_NAMESPACE"
              value: {{ .Values.release.temporalNamespace | quote }}
            -
              name: "STORYTELLER_DISTRIBUTED_V1"
              value: {{ .Values.release.relayDistributed | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: {{ .Values.release.s3Bucket | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: {{ .Values.release.s3Endpoint | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: {{ .Values.release.s3ForcePathStyle | quote }}
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.release.runtimeSecret | quote }}
                  key: "secret-access-key"
          securityContext:
            {{- include "offscreen-app.release.security.container" . | nindent 12 }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu | quote }}
              memory: {{ .Values.resources.requests.relay.memory | quote }}
            limits:
              memory: {{ .Values.resources.limits.relay.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.web" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: API_PROXY_ORIGIN
  value: {{ .Values.bindings.apiOrigin | quote }}
- name: API_INTERNAL_ORIGIN
  value: {{ .Values.bindings.apiOrigin | quote }}
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-web.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.web }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.web }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.web }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.web }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.web }}
        image: {{ .Values.bindings.images.web | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.web | quote }}
        {{/* Host web READY: pod image + HTTP /sign-in — not compiled-generation proof. */}}
        command:
{{- toYaml .Values.commands.web | nindent 10 }}
        ports:
          - name: http
            containerPort: {{ .Values.catalog.httpPorts.web }}
        env:
          {{- include "offscreen-app.dev.env.web" . | nindent 10 }}
        readinessProbe:
          tcpSocket:
            port: http
          periodSeconds: {{ .Values.readiness.periodSeconds }}
          timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
          failureThreshold: {{ .Values.readiness.web.failureThreshold }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.web.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.api" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_WATCHED_COMPILATION
  value: "1"
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: DB_POOL_MAX
  value: {{ .Values.bindings.dbPoolMax | quote }}
- name: APP_ORIGIN
  value: {{ printf "http://127.0.0.1:%v" .Values.bindings.gamePort | quote }}
- name: BETTER_AUTH_COOKIE_PREFIX
  value: {{ .Values.bindings.cookiePrefix | quote }}
- name: GAME_AUTHORITY_ORIGIN
  value: {{ .Values.bindings.authorityOrigin | quote }}
- name: GAME_AUTHORITY_MODE
  value: {{ .Values.dev.authorityMode | quote }}
- name: API_HOST
  value: "0.0.0.0"
- name: API_PORT
  value: {{ .Values.catalog.httpPorts.api | quote }}
- name: OFFSCREEN_DOCUMENT_STORE
  value: {{ .Values.dev.documentStore | quote }}
- name: OFFSCREEN_DOCUMENT_S3_BUCKET
  value: {{ .Values.bindings.s3Bucket | quote }}
- name: OFFSCREEN_DOCUMENT_S3_ENDPOINT
  value: {{ .Values.bindings.s3Endpoint | quote }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.dbSecret }}
      key: uri
- name: OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: access-key-id
- name: OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: secret-access-key
- name: GAME_AUTHORITY_SERVICE_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-service-token
- name: BETTER_AUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: better-auth-secret
- name: GITHUB_CLIENT_ID
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: github-client-id
- name: GITHUB_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: github-client-secret
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-api.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.api }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.api }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.api }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.api }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.api }}
        image: {{ .Values.bindings.images.api | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.api | quote }}
        command:
{{- toYaml .Values.commands.api | nindent 10 }}
        ports:
          - name: http
            containerPort: {{ .Values.catalog.httpPorts.api }}
        env:
          {{- include "offscreen-app.dev.env.api" . | nindent 10 }}
        readinessProbe:
          tcpSocket:
            port: http
          periodSeconds: {{ .Values.readiness.periodSeconds }}
          timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
          failureThreshold: {{ .Values.readiness.api.failureThreshold }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.api.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.authority" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_WATCHED_COMPILATION
  value: "1"
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: DB_POOL_MAX
  value: {{ .Values.bindings.dbPoolMax | quote }}
- name: OFFSCREEN_DOCUMENT_STORE
  value: {{ .Values.dev.documentStore | quote }}
- name: GAME_AUTHORITY_HOST
  value: "0.0.0.0"
- name: GAME_AUTHORITY_PORT
  value: {{ .Values.catalog.httpPorts.authority | quote }}
- name: OFFSCREEN_DOCUMENT_S3_BUCKET
  value: {{ .Values.bindings.s3Bucket | quote }}
- name: OFFSCREEN_DOCUMENT_S3_ENDPOINT
  value: {{ .Values.bindings.s3Endpoint | quote }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.dbSecret }}
      key: uri
- name: OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: access-key-id
- name: OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: secret-access-key
- name: GAME_AUTHORITY_SERVICE_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-service-token
- name: GAME_AUTHORITY_CONTROL_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-control-token
- name: GAME_AUTHORITY_EXECUTOR_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-executor-token
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-authority.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.authority }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.authority }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.authority }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.authority }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.authority }}
        image: {{ .Values.bindings.images.authority | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.authority | quote }}
        command:
{{- toYaml .Values.commands.authority | nindent 10 }}
        ports:
          - name: http
            containerPort: {{ .Values.catalog.httpPorts.authority }}
        env:
          {{- include "offscreen-app.dev.env.authority" . | nindent 10 }}
        readinessProbe:
          tcpSocket:
            port: http
          periodSeconds: {{ .Values.readiness.periodSeconds }}
          timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
          failureThreshold: {{ .Values.readiness.authority.failureThreshold }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.authority.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.control" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_WATCHED_COMPILATION
  value: "1"
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: TEMPORAL_ADDRESS
  value: {{ .Values.bindings.temporalAddress | quote }}
- name: TEMPORAL_NAMESPACE
  value: {{ .Values.bindings.temporalNamespace | quote }}
- name: TEMPORAL_TASK_QUEUE
  value: {{ .Values.dev.temporalTaskQueues.control | quote }}
- name: GAME_AUTHORITY_ORIGIN
  value: {{ .Values.bindings.authorityOrigin | quote }}
- name: GAME_AUTHORITY_CONTROL_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-control-token
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-control.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.control }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.control }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.control }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.control }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.control }}
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.control | quote }}
        command:
{{- toYaml .Values.commands.control | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.control" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.control.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.executor" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_WATCHED_COMPILATION
  value: "1"
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: TEMPORAL_ADDRESS
  value: {{ .Values.bindings.temporalAddress | quote }}
- name: TEMPORAL_NAMESPACE
  value: {{ .Values.bindings.temporalNamespace | quote }}
- name: TEMPORAL_TASK_QUEUE
  value: {{ .Values.dev.temporalTaskQueues.executor | quote }}
- name: GAME_AUTHORITY_ORIGIN
  value: {{ .Values.bindings.authorityOrigin | quote }}
- name: GAME_AUTHORITY_EXECUTOR_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-executor-token
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-executor.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.executor }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.executor }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.executor }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.executor }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.executor }}
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.executor | quote }}
        command:
{{- toYaml .Values.commands.executor | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.executor" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.executor.memory | quote }}
{{- end -}}

{{- define "offscreen-app.dev.env.relay" -}}
- name: OFFSCREEN_DEV_SLOT
  value: {{ .Values.bindings.slotId | quote }}
- name: OFFSCREEN_DEV_WATCHED_COMPILATION
  value: "1"
- name: OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR
  value: {{ .Values.bindings.receiptDir | quote }}
- name: DB_POOL_MAX
  value: {{ .Values.bindings.dbPoolMax | quote }}
- name: OFFSCREEN_DOCUMENT_STORE
  value: {{ .Values.dev.documentStore | quote }}
- name: TEMPORAL_ADDRESS
  value: {{ .Values.bindings.temporalAddress | quote }}
- name: TEMPORAL_NAMESPACE
  value: {{ .Values.bindings.temporalNamespace | quote }}
- name: OFFSCREEN_DOCUMENT_S3_BUCKET
  value: {{ .Values.bindings.s3Bucket | quote }}
- name: OFFSCREEN_DOCUMENT_S3_ENDPOINT
  value: {{ .Values.bindings.s3Endpoint | quote }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.dbSecret }}
      key: uri
- name: OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: access-key-id
- name: OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.s3Secret }}
      key: secret-access-key
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-relay.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.catalog.deployments.relay }}
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: {{ .Values.catalog.deployments.relay }}
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.catalog.deployments.relay }}
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: {{ .Values.catalog.deployments.relay }}
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      {{- include "offscreen-app.podSpecFlags" . | nindent 6 }}
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: {{ .Values.catalog.containers.relay }}
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: {{ .Values.imagePullPolicy }}
        workingDir: {{ .Values.workingDirs.relay | quote }}
        command:
{{- toYaml .Values.commands.relay | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.relay" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: {{ .Values.resources.requests.cpu | quote }}
            memory: {{ .Values.resources.requests.relay.memory | quote }}
{{- end -}}
