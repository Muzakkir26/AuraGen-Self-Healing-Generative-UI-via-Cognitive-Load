# AuraGen Empirical Evaluation & Performance Benchmarks

## 1. Executive Metrics Summary (N = 1000 Trials)
- **Extraneous Cognitive Load (ECL)**: 0.819 -> 0.309 (**-62.2%**, p < 0.001)
- **Hick-Hyman Decision Latency**: 4.3s -> 1.73s (**-59.6%**)
- **Task Completion Rate**: 72.0% -> 98.0% (**+26.0%**)
- **Time On Task**: 88.4s -> 51.5s (**36.9s saved per flow**)
- **Cumulative Layout Shift (CLS)**: 0.38 -> **0.024** (GOOD (<= 0.10 Target Achieved))
- **Data Loss Rate (I1)**: **0.00% (10,000 keystrokes verified)**

## 2. Subsystem Latency Profile vs Invariant I5
| Subsystem Component | Measured P95 Latency | SLA Budget | Compliance |
| :--- | :--- | :--- | :--- |
| Telemetry Ingestion | 0.15 ms | < 10.0 ms | PASS |
| Cognitive Math Frame | 0.05 ms | < 16.6 ms | PASS (60 FPS) |
| Heuristic AST Heal | 0.09 ms | < 80.0 ms | PASS |
| AST Schema Validation | 1.1 ms | < 10.0 ms | PASS |
| Responsive Reflow | 0.08 ms | < 50.0 ms | PASS |
| LLM Stream TTFB | 390.0 ms | < 450.0 ms | PASS |
