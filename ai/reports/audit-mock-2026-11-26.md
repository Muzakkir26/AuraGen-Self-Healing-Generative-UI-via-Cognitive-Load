# Generation audit: mock (mock-wizard-v1)

Run at 2026-11-26T11:47:15.817Z · 3 run(s) per scenario · 21 generations in total

> **Mock provider.** This run tests the pipeline (prompt → extract → validate → compile), not LLM quality.
> Run again with `LLM_PROVIDER=openai` for real model numbers.

| Metric | Value |
|---|---|
| Valid on first try | 100% |
| Valid after one repair | 100% |
| Rejected (falls back to static wizard) | 0 |
| Errors (timeout / LLM failure) | 0 |
| Latency mean / p95 / max | 18 / 25 / 176 ms |

## By scenario

| Scenario | Runs | First try | After repair |
|---|---|---|---|
| text: Full name | 3 | 3 | 3 |
| text: PAN Number | 3 | 3 | 3 |
| date: Date of birth | 3 | 3 | 3 |
| number: Annual income | 3 | 3 | 3 |
| select: Employment type | 3 | 3 | 3 |
| text: IFSC code | 3 | 3 | 3 |
| checkbox: I agree to the credit check | 3 | 3 | 3 |

## Violations seen

None.
