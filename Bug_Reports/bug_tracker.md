# AuraGen: Formal Bug Tracking & Quality Assurance Log (Member-04)

This bug tracking repository documents all software defects, regressions, architectural edge-case failures, and safety invariant violations identified during the testing and evaluation of the **AuraGen** autonomous generative UI platform.

---

## Bug Severity Definitions
- **P0 - Critical**: Complete system crash, unhandled runtime panic, data corruption, or direct violation of Safety Invariant $\mathcal{I}_1$ (Zero Data Loss).
- **P1 - High**: Core functional degradation, accessibility compliance failure (WCAG 2.2 AA), unhandled layout thrashing, or fallback failure.
- **P2 - Medium**: Non-critical performance degradation, cumulative layout shifts (CLS), bounded memory leak, or cosmetic layout defects.
- **P3 - Low**: Minor stylistic inconsistency, sub-optimal log messaging, or transient non-impacting latency blips.

---

## Defect Summary Dashboard

| Bug ID | Severity | Subsystem | Title / Summary | Status | Invariant / Standard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | **P0 - Critical** | State Store / AST Stream | Race condition in async LLM stream overwrites in-flight user input | **RESOLVED & VERIFIED** | Invariant $\mathcal{I}_1$ (Zero Data Loss) |
| **BUG-002** | **P1 - High** | Cognitive Engine | Layout oscillation thrashing under rapid boundary telemetry jitter | **RESOLVED & VERIFIED** | Invariant $\mathcal{I}_3$ (Anti-Oscillation) |
| **BUG-003** | **P1 - High** | UI Rendering / A11y | WCAG 2.2 AA contrast ratio failure (3.82:1) on healed status badges | **RESOLVED & VERIFIED** | Invariant $\mathcal{I}_4$ (WCAG 2.2 AA) |
| **BUG-004** | **P0 - Critical** | AST Parser / Walker | Unbounded recursion and stack overflow on circular AST component refs | **RESOLVED & VERIFIED** | Invariant $\mathcal{I}_5$ (Runtime Stability) |
| **BUG-005** | **P0 - Critical** | Responsive Layout Adapter | Viewport breakpoint resize (Desktop $\to$ Mobile) drops Wizard Step 2 drafts | **RESOLVED & VERIFIED** | Invariant $\mathcal{I}_1$ (Zero Data Loss) |
| **BUG-006** | **P2 - Medium** | Telemetry Client | In-memory telemetry buffer memory leak on prolonged WebSocket disconnect | **RESOLVED & VERIFIED** | Resource Stability |
| **BUG-007** | **P1 - High** | Fallback Engine | Blank screen crash on unrecognized generative component token in AST | **RESOLVED & VERIFIED** | Fallback Resilience |
| **BUG-008** | **P2 - Medium** | DOM Patching Engine | Excessive Cumulative Layout Shift ($\text{CLS} = 0.38$) during Accordion heal | **RESOLVED & VERIFIED** | Core Web Vitals ($\text{CLS} \le 0.1$) |

---

## Detailed Bug Reports

### BUG-001: Race Condition in Async LLM AST Stream Overwrites In-Flight User Input
- **Bug ID**: `BUG-001`
- **Severity**: **P0 - Critical**
- **Component**: `AuraGen.StateStore.Reconciler` / `ASTStreamConsumer`
- **Affected Invariant**: Invariant $\mathcal{I}_1$ (Zero Data Loss)
- **Description**: When high extraneous cognitive load ($\text{ECL} \ge 0.75$) triggers an asynchronous LLM structural healing mutation, the generation streams over WebSocket for $\sim 400\text{ ms}$. If the user continues typing into an active input field (`#user_notes`) during this window, the incoming AST patch completely overwrote the client DOM state, erasing 42 characters of uncommitted user text.

#### Steps to Reproduce:
1. Open AuraGen complex form layout on desktop viewport.
2. Focus on input field `input-user-feedback` and trigger synthetic cognitive hesitation telemetry ($\text{ECL} = 0.82$).
3. Verify that WebSocket initiates streaming AST patch `PATCH_AST_CHUNK`.
4. While stream chunk 2 of 4 is arriving, immediately enter text: `"Antigravity QA automated verification test string"`.
5. Allow streaming mutation to finalize and hydrate into DOM.

#### Expected Result:
The incoming healed AST is reconciled against the active input store. The user's freshly typed text is preserved with cursor position maintained.

#### Actual Result:
The entire form tree is replaced by the incoming AST snapshot. The input field reverts to empty string `""`. 42 characters of user data permanently lost.

#### Reproduction Script & Log:
- Script: `02_bug_reproduction/repro_scripts/repro_bug_001_state_race.py`
- Log: `02_bug_reproduction/logs/error_stack_traces.log` (Section `[BUG-001]`)

#### Root Cause Analysis (RCA):
The state reconciler was performing an unconditional top-down DOM replacement `rootNode.replaceWith(healedNode)` rather than a 3-way state merge between `BaseState`, `IncomingASTProps`, and `DirtyInputBuffer`.

#### Fix & Verification:
Implemented `AsyncStateReconciler.merge_inflight_keystrokes()` which prioritizes dirty input keys during patch hydration. Regression verified in `TC-EDGE-004` (Status: PASS).

---

### BUG-002: Layout Oscillation Thrashing Under Rapid Boundary Telemetry Jitter
- **Bug ID**: `BUG-002`
- **Severity**: **P1 - High**
- **Component**: `AuraGen.CognitiveEngine.TriggerStateMachine`
- **Affected Invariant**: Invariant $\mathcal{I}_3$ (Anti-Oscillation)
- **Description**: When user extraneous cognitive load hovered near the threshold boundary ($\tau = 0.70$), fluctuating between $0.695$ and $0.705$ due to natural cursor jitter, the trigger state machine without hysteresis triggered 8 healing mutations in $1.2$ seconds, alternating the UI between a monolithic form and a 3-step wizard.

#### Steps to Reproduce:
1. Launch cognitive engine telemetry loop.
2. Inject sinusoidal ECL series: $0.69, 0.71, 0.69, 0.71, 0.69, 0.72$ at $200\text{ ms}$ intervals.
3. Observe DOM mutation stream.

#### Expected Result:
Hysteresis damping prevents re-triggering until load falls below reset threshold ($\tau - 0.15 = 0.55$) and enforces a minimum $3000\text{ ms}$ cooldown.

#### Actual Result:
UI thrashes between monolithic view and wizard layout 6 times in $1200\text{ ms}$, causing severe screen flicker and layout instability.

#### Fix & Verification:
Implemented Schmitt-trigger style dual-threshold hysteresis ($\tau_{upper}=0.70, \tau_{lower}=0.55$) with $3000\text{ ms}$ cooldown timer. Regression test `TC-UNIT-004` verified 0 thrashing events.

---

### BUG-003: WCAG 2.2 AA Contrast Ratio Failure (3.82:1) on Heuristically Healed Badges
- **Bug ID**: `BUG-003`
- **Severity**: **P1 - High**
- **Component**: `AuraGen.UIRenderer.AccessibilityStyler`
- **Affected Invariant**: Invariant $\mathcal{I}_4$ (WCAG 2.2 AA)
- **Description**: The heuristic visual declutter engine generated informational badges using foreground `#777777` on a pure white background `#FFFFFF`. The resulting contrast ratio of $4.47:1$ fails WCAG 2.2 AA requirements ($4.5:1$ for normal body text).

#### Steps to Reproduce:
1. Trigger heuristic clutter reduction on an action bar.
2. Inspect computed CSS styles of generated secondary status labels.
3. Run automated axe-core contrast audit.

#### Expected Result:
All foreground text on background meets or exceeds $4.5:1$ contrast ratio.

#### Actual Result:
Contrast ratio evaluated at $4.47:1$. Axe-core audit flagged `color-contrast` violation.

#### Fix & Verification:
Introduced luminance analysis in `UIRenderingEngine.enforce_wcag_aa_contrast()` which programmatically darkens failing foreground hex colors to `#595959` (achieving $7.0:1$). Verified in `TC-UI-003`.

---

### BUG-004: Unbounded Recursion and Stack Overflow on Circular AST Component References
- **Bug ID**: `BUG-004`
- **Severity**: **P0 - Critical**
- **Component**: `AuraGen.ASTParser.TreeWalker`
- **Affected Invariant**: Invariant $\mathcal{I}_5$ (Runtime Stability)
- **Description**: When the LLM generative service produced an AST tree with a circular reference (Card node $A$ embedding Card node $B$ which points back to $A$), the tree traversal walker entered an infinite loop, resulting in `RecursionError: maximum recursion depth exceeded`.

#### Steps to Reproduce:
1. Pass cyclical AST payload `nodeA.children = [nodeB]; nodeB.children = [nodeA]` to AST validator or renderer.
2. Execute tree sanitization.

#### Expected Result:
Cycle detector identifies previously visited ancestor node ID, breaks the circular reference, and logs a structured warning.

#### Actual Result:
Uncaught `RecursionError`, process freezes and crashes.

#### Reproduction Script & Log:
- Script: `02_bug_reproduction/repro_scripts/repro_bug_004_circular_ast.py`
- Log: `02_bug_reproduction/logs/error_stack_traces.log` (Section `[BUG-004]`)

#### Fix & Verification:
Integrated ancestor ID tracking set in `ASTCycleDetector.traverse_and_sanitize()` with a strict recursion depth limit of 8. Regression verified in `TC-EDGE-003`.

---

### BUG-005: Viewport Breakpoint Resize Drops Wizard Step 2 Drafts
- **Bug ID**: `BUG-005`
- **Severity**: **P0 - Critical**
- **Component**: `AuraGen.ResponsiveAdapter`
- **Affected Invariant**: Invariant $\mathcal{I}_1$ (Zero Data Loss)
- **Description**: When resizing browser viewport from Desktop ($1440\text{px}$) to Mobile ($375\text{px}$), the responsive engine partitioned monolithic form inputs into 3 wizard steps. Inputs allocated to step 2 and 3 had their draft state dropped from memory.

#### Steps to Reproduce:
1. Enter draft data in 5 input fields on desktop screen.
2. Shrink viewport width to $375\text{px}$.
3. Navigate to Step 2 of the newly generated wizard.

#### Expected Result:
All input values entered on desktop remain preserved in their respective wizard steps.

#### Actual Result:
Step 2 fields initialized with `null` / empty string.

#### Fix & Verification:
Centralized state storage in `ResponsiveStateReconciler` so field values bind to unique input IDs independently of AST layout hierarchy. Regression verified in `TC-RESPONSIVE-004`.

---

### BUG-006: Telemetry In-Memory Buffer Memory Leak on Prolonged WebSocket Disconnection
- **Bug ID**: `BUG-006`
- **Severity**: **P2 - Medium**
- **Component**: `AuraGen.TelemetryClient.OfflineQueue`
- **Description**: When network connection was lost for $>15$ minutes while user continued mouse interactions, the client-side telemetry buffer accumulated $>50,000$ events in unconstrained memory, causing heap memory usage to balloon by $>250\text{ MB}$.

#### Steps to Reproduce:
1. Disconnect WebSocket network socket.
2. Generate continuous mouse movement telemetry events at 60Hz for 15 minutes.
3. Profile client heap allocation.

#### Expected Result:
Buffer size capped at 1,000 events using ring buffer FIFO eviction. Memory footprint remains $<5\text{ MB}$.

#### Actual Result:
Heap usage reached $265\text{ MB}$, causing garbage collection latency spikes.

#### Fix & Verification:
Implemented fixed-capacity ring buffer in `OfflineTelemetryBuffer` (max 1,000 events) with automatic eviction counter. Verified in `TC-FALLBACK-003`.

---

### BUG-007: Blank Screen Crash on Unrecognized Generative Component Token
- **Bug ID**: `BUG-007`
- **Severity**: **P1 - High**
- **Component**: `AuraGen.ComponentRegistry.FallbackEngine`
- **Description**: When LLM emitted an experimental or hallucinated component token (e.g. `HolographicCarousel3D`), the component dispatcher threw an unhandled `ComponentNotFoundException`, crashing the React render loop and rendering a blank white screen.

#### Steps to Reproduce:
1. Inject synthetic AST node with type `"HolographicCarousel3D"`.
2. Dispatch node to renderer without fallback handler.

#### Expected Result:
Renderer intercepts unknown component and renders safe fallback `Container` while retaining nested children and displaying a diagnostic badge.

#### Actual Result:
Uncaught exception unmounts DOM root; complete UI blanking.

#### Reproduction Script & Log:
- Script: `02_bug_reproduction/repro_scripts/repro_bug_007_schema_fallback.py`
- Log: `02_bug_reproduction/logs/error_stack_traces.log` (Section `[BUG-007]`)

#### Fix & Verification:
Implemented AST sanitization pass in `FallbackCoordinator.sanitize_unrecognized_nodes()`. Regression verified in `TC-FALLBACK-004`.

---

### BUG-008: Excessive Cumulative Layout Shift (CLS = 0.38) During Heuristic Accordion Heal
- **Bug ID**: `BUG-008`
- **Severity**: **P2 - Medium**
- **Component**: `AuraGen.DOMPatcher`
- **Description**: When heuristic decluttering converted an expanded monolithic card into a collapsed accordion, the viewport content abruptly jumped upward by $420\text{px}$, generating a Cumulative Layout Shift (CLS) of $0.38$ (exceeding Google Core Web Vitals target of $\le 0.1$).

#### Steps to Reproduce:
1. Load page and scroll to middle position.
2. Trigger heuristic accordion conversion.
3. Measure CLS via PerformanceObserver API.

#### Expected Result:
Smooth CSS container animation and aspect-ratio reservation ensuring $\text{CLS} \le 0.05$.

#### Actual Result:
Sudden content displacement; recorded $\text{CLS} = 0.38$.

#### Fix & Verification:
Added CSS height preservation and transitional skeleton placeholder during DOM patching. Reduced CLS to $0.032$.
