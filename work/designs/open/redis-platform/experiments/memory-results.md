# Memory pressure results | 2026-11-26

Owner-operated specimen at 2cf00a6a2a379b68dcc412e07452f9cdf1f8ff61. bash -n succeeded and Docker experiment exited normally. Redis 8.2.1 jemalloc 5.3.0; 128MiB memory.max, 0.5 CPU, four benchmark clients, pipeline 8, synthetic 4096-byte values, 20k total SET attempts. No cluster or baseline cache touched. This is disposable Docker evidence, not Kubernetes capacity or application acceptance.

| Metric | Idle | 2k cumulative | 8k cumulative | 20k cumulative |
| --- | ---: | ---: | ---: | ---: |
| Keys retained | 0 | 2000 | 6303 | 6312 |
| used_memory bytes | 764136 | 11164312 | 33439712 | 33498152 |
| used_memory_rss bytes | 12324864 | 12324864 | 45355008 | 45486080 |
| used_memory_dataset bytes | 47920 | 10364816 | 32436088 | 32511520 |
| allocator_frag_ratio | 1.10 | 1.10 | 1.01 | 1.01 |
| allocator_frag_bytes | 102208 | 102208 | 283816 | 320680 |
| allocator_rss_ratio | 3.57 | 3.57 | 1.20 | 1.20 |
| mem_fragmentation_ratio | 17.69 | 17.69 | 1.36 | 1.36 |
| evicted_keys | 0 | 0 | 1665 | 13567 |
| evicted_clients | 0 | 0 | 0 | 0 |
| total_error_replies | 0 | 0 | 0 | 0 |
| cgroup memory.current bytes | 33992704 | 51511296 | 72884224 | 73662464 |
| cgroup memory.peak bytes | 34803712 | 52342784 | 75255808 | 76009472 |

All memory.events low/high/max/oom/oom_kill/oom_group_kill zero throughout. Final PING check passed by script successful exit; shutdown log normal SIGTERM. Peak 72.49MiB, 56.6% of 128MiB limit; headroom 55.51MiB. Allocated memory settled ~31.95MiB, RSS ~43.38MiB, 6312 keys. RSS snapshots can lag instantaneous allocation; cgroup includes server, shell and benchmark clients, not identical to a K8s Redis container. No long-duration or slow-client proof. Short synthetic throughput output is not a capacity/SLO benchmark. Retained payload ~24.66MiB; nominal 32MiB/4KiB ignores allocation overhead. No key identities recorded.

## Disposition
- Retain 32MiB maxmemory, 128MiB container limit, allkeys-lru and disabled persistence for initial baseline candidate. No active defrag tuning justified. No production sizing claim.
- Keep 32MiB request provisionally; consider 64MiB after separate server-only cgroup measurement and workstation aggregate admission check. CPU request/limit not tuned by brief throughput. No arbitrary maxclients or maxmemory-clients tuning without consumer census and pressure proof.
- Existing image digest and pinned version worked for this disposable Docker run. Registry availability/Kind distribution still unverified.
- Essential structural proof remains fresh native Helm install, repeat no-op, foreign matching-metadata refusal and partial failure. Legacy cutover separate. Next owner checkpoint should exercise a uniquely named isolated namespace with actual context guard, bounded resource admission and explicit UID custody; no default cache operations.

No formal defense or implementation authorization.
