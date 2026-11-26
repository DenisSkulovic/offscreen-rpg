#!/usr/bin/env bash
# Design specimen only. Creates one isolated disposable Docker container;
# no ports, volumes, cluster access or existing Redis connection.
set -euo pipefail
image='docker.io/library/redis@sha256:987c376c727652f99625c7d205a1cba3cb2c53b92b0b62aade2bd48ee1593232'
if [[ "${1:-}" != "--confirm-disposable" || "$#" != 1 ]]; then
  echo 'Usage: bash memory.sh --confirm-disposable (one isolated <=128Mi container)' >&2
  exit 2
fi
if ! docker image inspect "$image" >/dev/null 2>&1; then
  echo "NOT RUN: immutable image not present locally: $image" >&2
  echo 'Do not substitute an unverified image; inspect/pull the pin separately.' >&2
  exit 3
fi
docker run --rm --pull=never --network none \
  --memory 128m --memory-swap 128m --cpus 0.5 --pids-limit 64 \
  --user 999:1000 --cap-drop ALL --security-opt no-new-privileges \
  --entrypoint sh "$image" -ec '
    redis-server --bind 127.0.0.1 --protected-mode yes \
      --save "" --appendonly no --dir /tmp \
      --maxmemory 32mb --maxmemory-policy allkeys-lru &
    pid=$!
    trap "kill $pid 2>/dev/null || true; wait $pid 2>/dev/null || true" EXIT
    for i in $(seq 1 20); do
      if [ "$(redis-cli --raw ping 2>/dev/null)" = PONG ]; then break; fi
      sleep 1
    done
    [ "$(redis-cli --raw ping)" = PONG ]
    echo "=== version and config ==="
    redis-server --version
    redis-cli CONFIG GET maxmemory maxmemory-policy maxclients maxmemory-clients
    snapshot() {
      echo "=== $1 ==="
      redis-cli --raw DBSIZE
      redis-cli INFO memory | tr -d "\r" | grep -E "^(used_memory|used_memory_rss|used_memory_peak|used_memory_dataset|allocator_frag_ratio|allocator_frag_bytes|allocator_rss_ratio|rss_overhead_ratio|mem_fragmentation_ratio|mem_not_counted_for_evict|mem_clients_normal|maxmemory):"
      redis-cli INFO stats | tr -d "\r" | grep -E "^(evicted_keys|evicted_clients|total_error_replies):"
      for f in /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.events /sys/fs/cgroup/memory/memory.usage_in_bytes /sys/fs/cgroup/memory/memory.max_usage_in_bytes /sys/fs/cgroup/memory/memory.limit_in_bytes; do
        if [ -r "$f" ]; then printf "%s: " "$f"; cat "$f"; fi
      done
    }
    snapshot idle
    for n in 2000 6000 12000; do
      echo "=== $n SET operations; 4096-byte values; 4 clients; pipeline 8 ==="
      timeout 45 redis-benchmark -h 127.0.0.1 -t set -n "$n" -r 1000000 -d 4096 -c 4 -P 8 -q
      snapshot "after $n additional writes"
    done
    [ "$(redis-cli --raw ping)" = PONG ]
  '
