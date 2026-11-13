# ENG03-M lock measurement evidence | 2026-11-14

Provider-free disposable SQL + LocalDocumentStore delay injection on `preparePendingActionNarration` path.

## Environment

- machine/os: `win32`
- node: `v24.19.0`
- db: disposable sandbox postgres
- document store: LocalDocumentStore + ENG03 delayed wrapper
- source shape: short documented opening (CAS passage + root)
- repeats per delay (after warmup): 3

## Results (medians, ms)

| delayMs | actionHold | competitorWait | documentRead | unrelatedLock |
| --- | ---: | ---: | ---: | ---: |
| 0 | 53.8 | 51.3 | 5.0 | 2.8 |
| 250 | 1064.5 | 1064.4 | 1259.2 | 3.0 |
| 2000 | 8072.1 | 8072.0 | 10009.6 | 3.2 |

## Decision inputs

- 2000ms − 0ms action-hold delta: **8018.3 ms** (threshold ≥ 1500)
- 2000ms − 0ms competitor-wait delta: **8020.7 ms** (threshold ≥ 1000)
- go/no-go: **`proceed-narrow-eng03-capture`**

## Negatives observed

- Unrelated story lock medians stayed low relative to same-story competitor waits under delay.
- No paid Storyteller dispatch.
- ~40-passage active-scene matrix left for a follow-up run if short-source go/no-go is ambiguous.

```json
{
  "holdDeltaMs": 8018.290299999998,
  "waitDeltaMs": 8020.7009,
  "decision": "proceed-narrow-eng03-capture",
  "byDelay": {
    "0": {
      "actionHoldMedian": 53.82010000000014,
      "competitorWaitMedian": 51.334100000000035,
      "documentReadMedian": 5.034699999999475,
      "unrelatedLockMedian": 2.8310999999998785
    },
    "250": {
      "actionHoldMedian": 1064.5163000000002,
      "competitorWaitMedian": 1064.3604999999998,
      "documentReadMedian": 1259.2466999999988,
      "unrelatedLockMedian": 3.0268999999998414
    },
    "2000": {
      "actionHoldMedian": 8072.110399999998,
      "competitorWaitMedian": 8072.035,
      "documentReadMedian": 10009.607500000002,
      "unrelatedLockMedian": 3.19369999999617
    }
  }
}
```
