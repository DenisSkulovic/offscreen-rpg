{{- define "platform-redis.jsonFrom" -}}
{{- $yaml := include .name .ctx -}}
{{- $doc := fromYaml $yaml -}}
{{- if and (kindIs "map" $doc) (hasKey $doc "Error") -}}
{{- fail (printf "fromYaml Error: %s" ($doc.Error | toString)) -}}
{{- end -}}
---
{{ $doc | toJson | println }}
{{- end -}}

{{- define "platform-redis.formatCpuMilli" -}}
{{- printf "%dm" (int .cpuMilli) -}}
{{- end -}}

{{- define "platform-redis.formatMemoryMiB" -}}
{{- printf "%dMi" (int .memoryMiB) -}}
{{- end -}}

{{- define "platform-redis.formatMaxmemoryMb" -}}
{{- printf "%dmb" (int .Values.redis.maxmemoryMiB) -}}
{{- end -}}

{{- define "platform-redis.redisConf" -}}
bind 0.0.0.0
protected-mode no
port 6379
appendonly no
save ""
dir /data
maxmemory {{ include "platform-redis.formatMaxmemoryMb" . }}
maxmemory-policy {{ .Values.redis.evictionPolicy }}
{{- end -}}

{{- define "platform-redis.labels" -}}
app: redis
{{- if eq .Values.mode "development" }}
offscreen.dev/owner: offscreen-dev
{{- else }}
offscreen.rpg/lab: disposable
{{- end }}
{{- end -}}

{{- define "platform-redis.validate" -}}
{{- $section := default "all" .Values.section -}}
{{- if ne $section "all" -}}{{- fail (printf "unsupported section %s" $section) -}}{{- end -}}
{{- $mode := required "profile mode is required" .Values.mode -}}
{{- if and (ne $mode "development") (ne $mode "release") -}}{{- fail (printf "unsupported profile mode %s" $mode) -}}{{- end -}}
{{- if and (eq $mode "development") (ne .Values.namespace "offscreen-dev-redis") -}}{{- fail "development profile requires namespace offscreen-dev-redis" -}}{{- end -}}
{{- if and (eq $mode "release") (ne .Values.namespace "lab-a") -}}{{- fail "release profile requires namespace lab-a" -}}{{- end -}}
{{- $img := required "images.redis is required" .Values.images.redis -}}
{{- if eq $img "placeholder-redis" -}}{{- fail "images.redis must be resolved from profile" -}}{{- end -}}
{{- $eviction := required "redis.evictionPolicy is required" .Values.redis.evictionPolicy -}}
{{- if and (ne $eviction "allkeys-lru") (ne $eviction "allkeys-lfu") -}}{{- fail (printf "unsupported redis.evictionPolicy %s" $eviction) -}}{{- end -}}
{{- $reqCpu := required "resources.requests.cpuMilli is required" .Values.resources.requests.cpuMilli -}}
{{- $limCpu := required "resources.limits.cpuMilli is required" .Values.resources.limits.cpuMilli -}}
{{- $reqMem := required "resources.requests.memoryMiB is required" .Values.resources.requests.memoryMiB -}}
{{- $limMem := required "resources.limits.memoryMiB is required" .Values.resources.limits.memoryMiB -}}
{{- $maxMem := required "redis.maxmemoryMiB is required" .Values.redis.maxmemoryMiB -}}
{{- if gt (int $reqCpu) (int $limCpu) -}}{{- fail "resources.requests.cpuMilli must be <= resources.limits.cpuMilli" -}}{{- end -}}
{{- if gt (int $reqMem) (int $limMem) -}}{{- fail "resources.requests.memoryMiB must be <= resources.limits.memoryMiB" -}}{{- end -}}
{{- $halfMemLimit := div (int $limMem) 2 -}}
{{- if gt (int $maxMem) $halfMemLimit -}}{{- fail (printf "redis.maxmemoryMiB must be <= floor(memory limit/2) (%d)" $halfMemLimit) -}}{{- end -}}
{{- end -}}