# AuraGen: Master Test Plan & Quality Invariants
## Autonomous Self-Healing Generative UI via Real-Time Cognitive Load

### 1. Project Overview & Quality Mission
AuraGen actively monitors client-side behavioral telemetry (Hick-Hyman decision latency, cursor trajectory entropy, and field backtracking) to compute a composite Extraneous Cognitive Load index (ECL in [0.0, 1.0]). When ECL > 0.70, it triggers progressive disclosure wizard transformations or LLM-driven generative layout healing.

### 2. The 5 Immutable Quality Invariants
- **I1 (Zero Data Loss)**: In-flight form keystrokes must never be erased during an AST heal or responsive resize.
- **I2 (Cognitive Monotonicity)**: Healing actions must yield an expected reduction in cognitive load (E[ECL_{t+1}] <= ECL_t).
- **I3 (Anti-Oscillation Stability)**: Dual-threshold hysteresis (tau_high=0.70, tau_low=0.55) and 3000ms cooldown prevent UI flickering.
- **I4 (WCAG 2.2 AA Compliance)**: Contrast ratio >= 4.5:1, keyboard focus containment, ARIA live region injection.
- **I5 (Real-time Latency Budget)**: Telemetry math <= 16.6ms (60 FPS), heuristic healing <= 80ms, LLM streaming TTFB <= 450ms.

### 3. Testing Scope
- **Test Cases**: Normal (nominal paths), Edge (boundaries/stress), Invalid (schema errors), Failure (timeouts/crashes).
- **Subsystems**: Functional Cognitive Engine, API Behavior & Schemas, UI Responsive Layouts, Failure & Fallbacks.
