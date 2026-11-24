
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

{{- define "offscreen-app.dev.readiness" -}}
readinessProbe:
  tcpSocket:
    port: http
  periodSeconds: {{ .Values.readiness.periodSeconds }}
  timeoutSeconds: {{ .Values.readiness.timeoutSeconds }}
  failureThreshold: {{ .failureThreshold }}
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
  name: lab-edge
  labels:
    offscreen.rpg/lab: disposable
{{- end -}}


{{- define "offscreen-app.doc.namespace.release.authority" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: lab-authority
  labels:
    offscreen.rpg/lab: disposable
{{- end -}}


{{- define "offscreen-app.doc.namespace.release.workers" -}}
apiVersion: v1
kind: Namespace
metadata:
  name: lab-workers
  labels:
    offscreen.rpg/lab: disposable
{{- end -}}

{{- define "offscreen-app.doc.service.game-web.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: game-web
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-web
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: game-web
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: 3000
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-api.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: game-api
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-api
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: game-api
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: 3001
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-authority.dev" -}}
apiVersion: v1
kind: Service
metadata:
  name: game-authority
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-authority
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  type: ClusterIP
  selector:
    app: game-authority
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  ports:
    - name: http
      port: 3002
      targetPort: http
{{- end -}}

{{- define "offscreen-app.doc.service.game-web.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: "game-web"
  namespace: "lab-edge"
  labels:
    app: "game-web"
    offscreen.rpg/lab: "disposable"
spec:
  type: "ClusterIP"
  selector:
    app: "game-web"
  ports:
    -
      name: "http"
      port: 3000
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.service.game-api.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: "game-api"
  namespace: "lab-edge"
  labels:
    app: "game-api"
    offscreen.rpg/lab: "disposable"
spec:
  type: "ClusterIP"
  selector:
    app: "game-api"
  ports:
    -
      name: "http"
      port: 3001
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.service.game-authority.release" -}}
apiVersion: "v1"
kind: "Service"
metadata:
  name: "game-authority"
  namespace: "lab-authority"
  labels:
    app: "game-authority"
    offscreen.rpg/lab: "disposable"
spec:
  type: "ClusterIP"
  selector:
    app: "game-authority"
  ports:
    -
      name: "http"
      port: 3002
      targetPort: "http"
{{- end -}}

{{- define "offscreen-app.doc.job.migrate.release" -}}
apiVersion: "batch/v1"
kind: "Job"
metadata:
  name: "game-migrate"
  namespace: "lab-edge"
  labels:
    app: "game-migrate"
    offscreen.rpg/lab: "disposable"
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        app: "game-migrate"
        offscreen.rpg/lab: "disposable"
    spec:
      restartPolicy: "Never"
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "migrate"
          image: "offscreen-lab-app-release-api:turn02"
          imagePullPolicy: "Never"
          command:
            - "node"
            - "packages/db/dist/src/migrate-cli.js"
          env:
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: "game-db"
                  key: "uri"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "128Mi"
            limits:
              memory: "512Mi"
{{- end -}}













{{- define "offscreen-app.doc.deployment.game-web.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-web"
  namespace: "lab-edge"
  labels:
    app: "game-web"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-web"
  template:
    metadata:
      labels:
        app: "game-web"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "web"
          image: "offscreen-lab-game-web:turn02"
          imagePullPolicy: "Never"
          ports:
            -
              name: "http"
              containerPort: 3000
          env:
            -
              name: "HOSTNAME"
              value: "0.0.0.0"
            -
              name: "API_PROXY_ORIGIN"
              value: "http://game-api.lab-edge.svc.cluster.local:3001"
            -
              name: "API_INTERNAL_ORIGIN"
              value: "http://game-api.lab-edge.svc.cluster.local:3001"
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 12
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "256Mi"
            limits:
              memory: "768Mi"
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-api.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-api"
  namespace: "lab-edge"
  labels:
    app: "game-api"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-api"
  template:
    metadata:
      labels:
        app: "game-api"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "api"
          image: "offscreen-lab-app-release-api:turn02"
          imagePullPolicy: "Never"
          ports:
            -
              name: "http"
              containerPort: 3001
          env:
            -
              name: "API_HOST"
              value: "0.0.0.0"
            -
              name: "API_PORT"
              value: "3001"
            -
              name: "APP_ORIGIN"
              value: "http://127.0.0.1:3000"
            -
              name: "GAME_AUTHORITY_MODE"
              value: "distributed"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: "http://game-authority.lab-authority.svc.cluster.local:3002"
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: "lab-objects"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: "http://object-store.lab-objects.svc.cluster.local:8333"
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: "true"
            -
              name: "OFFSCREEN_DEFAULT_RULE_ROOT_HASH"
              value: "d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab"
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: "game-db"
                  key: "uri"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "secret-access-key"
            -
              name: "GAME_AUTHORITY_SERVICE_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-service-token"
            -
              name: "BETTER_AUTH_SECRET"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "better-auth-secret"
            -
              name: "GITHUB_CLIENT_ID"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "github-client-id"
            -
              name: "GITHUB_CLIENT_SECRET"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "github-client-secret"
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 24
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "384Mi"
            limits:
              memory: "1024Mi"
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-authority.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-authority"
  namespace: "lab-authority"
  labels:
    app: "game-authority"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-authority"
  template:
    metadata:
      labels:
        app: "game-authority"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "authority"
          image: "offscreen-lab-app-release-ga:turn02"
          imagePullPolicy: "Never"
          ports:
            -
              name: "http"
              containerPort: 3002
          env:
            -
              name: "GAME_AUTHORITY_HOST"
              value: "0.0.0.0"
            -
              name: "GAME_AUTHORITY_PORT"
              value: "3002"
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: "game-db"
                  key: "uri"
            -
              name: "OFFSCREEN_WRITER_EXECUTION_MODE"
              value: "scripted-offline-lab"
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: "lab-objects"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: "http://object-store.lab-objects.svc.cluster.local:8333"
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: "true"
            -
              name: "OFFSCREEN_DEFAULT_RULE_ROOT_HASH"
              value: "d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "secret-access-key"
            -
              name: "GAME_AUTHORITY_SERVICE_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-service-token"
            -
              name: "GAME_AUTHORITY_CONTROL_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-control-token"
            -
              name: "GAME_AUTHORITY_EXECUTOR_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-executor-token"
          readinessProbe:
            tcpSocket:
              port: "http"
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 24
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "384Mi"
            limits:
              memory: "1024Mi"
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-control.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-control"
  namespace: "lab-workers"
  labels:
    app: "game-control"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-control"
  template:
    metadata:
      labels:
        app: "game-control"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "control"
          image: "offscreen-lab-app-release-worker:turn02"
          imagePullPolicy: "Never"
          command:
            - "node"
            - "apps/worker/dist/src/bootstrap/control-main.js"
          env:
            -
              name: "TEMPORAL_ADDRESS"
              value: "temporal-server.lab-temporal.svc.cluster.local:7233"
            -
              name: "TEMPORAL_NAMESPACE"
              value: "default"
            -
              name: "TEMPORAL_TASK_QUEUE"
              value: "control"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: "http://game-authority.lab-authority.svc.cluster.local:3002"
            -
              name: "GAME_AUTHORITY_CONTROL_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-control-token"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "256Mi"
            limits:
              memory: "768Mi"
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-executor.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-executor"
  namespace: "lab-workers"
  labels:
    app: "game-executor"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-executor"
  template:
    metadata:
      labels:
        app: "game-executor"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "executor"
          image: "offscreen-lab-app-release-worker:turn02"
          imagePullPolicy: "Never"
          command:
            - "node"
            - "apps/worker/dist/src/bootstrap/executor-main.js"
          env:
            -
              name: "TEMPORAL_ADDRESS"
              value: "temporal-server.lab-temporal.svc.cluster.local:7233"
            -
              name: "TEMPORAL_NAMESPACE"
              value: "default"
            -
              name: "TEMPORAL_TASK_QUEUE"
              value: "storyteller-execute-v1"
            -
              name: "GAME_AUTHORITY_ORIGIN"
              value: "http://game-authority.lab-authority.svc.cluster.local:3002"
            -
              name: "GAME_AUTHORITY_EXECUTOR_TOKEN"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "game-authority-executor-token"
            -
              name: "OFFSCREEN_WRITER_EXECUTION_MODE"
              value: "scripted-offline-lab"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "256Mi"
            limits:
              memory: "768Mi"
{{- end -}}

{{- define "offscreen-app.doc.deployment.game-relay.release" -}}
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "game-relay"
  namespace: "lab-workers"
  labels:
    app: "game-relay"
    offscreen.rpg/lab: "disposable"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: "game-relay"
  template:
    metadata:
      labels:
        app: "game-relay"
        offscreen.rpg/lab: "disposable"
        offscreen.rpg/chaos-eligible: "true"
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: "RuntimeDefault"
      containers:
        -
          name: "relay"
          image: "offscreen-lab-app-release-worker:turn02"
          imagePullPolicy: "Never"
          command:
            - "node"
            - "apps/worker/dist/src/bootstrap/main.js"
          env:
            -
              name: "DATABASE_URL"
              valueFrom:
                secretKeyRef:
                  name: "game-db"
                  key: "uri"
            -
              name: "TEMPORAL_ADDRESS"
              value: "temporal-server.lab-temporal.svc.cluster.local:7233"
            -
              name: "TEMPORAL_NAMESPACE"
              value: "default"
            -
              name: "STORYTELLER_DISTRIBUTED_V1"
              value: "true"
            -
              name: "OFFSCREEN_DOCUMENT_STORE"
              value: "s3"
            -
              name: "OFFSCREEN_DOCUMENT_S3_BUCKET"
              value: "lab-objects"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ENDPOINT"
              value: "http://object-store.lab-objects.svc.cluster.local:8333"
            -
              name: "OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE"
              value: "true"
            -
              name: "OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "access-key-id"
            -
              name: "OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY"
              valueFrom:
                secretKeyRef:
                  name: "game-runtime"
                  key: "secret-access-key"
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          resources:
            requests:
              cpu: "50m"
              memory: "256Mi"
            limits:
              memory: "768Mi"
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
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-web.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-web
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-web
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-web
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-web
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: web
        image: {{ .Values.bindings.images.web | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.web | quote }}
        {{/* Host web READY: pod image + HTTP /sign-in — not compiled-generation proof. */}}
        command:
{{- toYaml .Values.commands.web | nindent 10 }}
        ports:
          - name: http
            containerPort: 3000
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
            cpu: 50m
            memory: {{ .Values.resources.requests.web.memory | quote }}
{{- end -}}}

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
  value: "distributed"
- name: API_HOST
  value: "0.0.0.0"
- name: API_PORT
  value: "3001"
- name: OFFSCREEN_DOCUMENT_STORE
  value: "s3"
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
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-api.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-api
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-api
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-api
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-api
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: api
        image: {{ .Values.bindings.images.api | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.api | quote }}
        command:
{{- toYaml .Values.commands.api | nindent 10 }}
        ports:
          - name: http
            containerPort: 3001
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
            cpu: 50m
            memory: {{ .Values.resources.requests.api.memory | quote }}
{{- end -}}}

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
  value: "s3"
- name: GAME_AUTHORITY_HOST
  value: "0.0.0.0"
- name: GAME_AUTHORITY_PORT
  value: "3002"
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
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-authority.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-authority
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-authority
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-authority
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-authority
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: authority
        image: {{ .Values.bindings.images.authority | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.authority | quote }}
        command:
{{- toYaml .Values.commands.authority | nindent 10 }}
        ports:
          - name: http
            containerPort: 3002
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
            cpu: 50m
            memory: {{ .Values.resources.requests.authority.memory | quote }}
{{- end -}}}

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
  value: "control"
- name: GAME_AUTHORITY_ORIGIN
  value: {{ .Values.bindings.authorityOrigin | quote }}
- name: GAME_AUTHORITY_CONTROL_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-control-token
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-control.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-control
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-control
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-control
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-control
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: control
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.control | quote }}
        command:
{{- toYaml .Values.commands.control | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.control" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: 50m
            memory: {{ .Values.resources.requests.control.memory | quote }}
{{- end -}}}

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
  value: "storyteller-execute-v1"
- name: GAME_AUTHORITY_ORIGIN
  value: {{ .Values.bindings.authorityOrigin | quote }}
- name: GAME_AUTHORITY_EXECUTOR_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ .Values.bindings.appSecret }}
      key: game-authority-executor-token
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-executor.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-executor
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-executor
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-executor
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-executor
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: executor
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.executor | quote }}
        command:
{{- toYaml .Values.commands.executor | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.executor" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: 50m
            memory: {{ .Values.resources.requests.executor.memory | quote }}
{{- end -}}}

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
  value: "s3"
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
{{- end -}}}

{{- define "offscreen-app.doc.deployment.game-relay.dev" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-relay
  namespace: {{ .Values.bindings.namespace }}
  labels:
    app: game-relay
    offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
    offscreen.dev/owner: offscreen-dev
    offscreen.rpg/profile: dev-slot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: game-relay
      offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
  template:
    metadata:
      labels:
        app: game-relay
        offscreen.dev/slot: {{ .Values.bindings.slotId | quote }}
        offscreen.dev/owner: offscreen-dev
        offscreen.rpg/profile: dev-slot
    spec:
      automountServiceAccountToken: false
      enableServiceLinks: false
      securityContext:
        {{- include "offscreen-app.dev.security.pod" . | nindent 8 }}
      containers:
      - name: relay
        image: {{ .Values.bindings.images.worker | quote }}
        imagePullPolicy: Never
        workingDir: {{ .Values.workingDirs.relay | quote }}
        command:
{{- toYaml .Values.commands.relay | nindent 10 }}
        env:
          {{- include "offscreen-app.dev.env.relay" . | nindent 10 }}
        securityContext:
          {{- include "offscreen-app.dev.security.container" . | nindent 10 }}
        resources:
          requests:
            cpu: 50m
            memory: {{ .Values.resources.requests.relay.memory | quote }}
{{- end -}}}
