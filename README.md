# AuraGen: Self-Healing Generative UI via Cognitive Load
**Infotact Solutions • Advanced Generative AI Engineering (Project 1)**

## 🎯 Week 1 Milestone: Telemetry Tracker & Friction Engine

As specified in the Project 1 Week-wise Development Plan:
> **Week 1: Frontend & Rendering (Next.js, React)**:
> *"Telemetry Tracker: Build a custom React hook to track mouse velocity, hesitation, and click patterns, streaming them via WebSockets."*

All Week 2–4 modules (AST Injector, Dynamic In-Browser Compilation, Framer Motion wizard morphing, and generative schemas) are deferred to subsequent development weeks.

---

### 1. Week 1 Implementation Details

#### A. Custom React Hook: `useCognitiveTelemetry.ts`
- **Continuous WebSocket Streaming**: Enabled by default (`enableWebSocket: true`), streaming interaction telemetry continuously every 0.8 seconds (within the 0.5s–1s requirement). Automatically falls back to HTTP POST if the WebSocket server is unavailable.
- **Field-Level Hesitation (`pauseTime`)**: Measures pause time strictly on the currently focused input field. When blurred or while typing, the pause timer resets to 0.
- **Mouse Velocity Decay (`mouseSpeed`)**: Instantaneous cursor velocity smoothed via Exponential Moving Average (EMA). Automatically drops to 0 when the mouse stops moving (250ms threshold).
- **Rage Click Decay (`rageClicks`)**: Frustration click bursts (< 45px radius within < 700ms) are detected and naturally decay by 1 every 2 seconds of inactivity, allowing the cognitive score to recover.
- **Dynamic Field Binding**: No hardcoded defaults inside the hook (`activeFieldName` and `activeUserInput` default to empty strings and bind dynamically to user focus).
- **Fallback & Error States**: Surfaces real-time connection status (`websocket`, `http-fallback`, `offline`) and displays descriptive connection alerts in the UI.

#### B. User-Facing Portal & Diagnostics
- **Infotact Underwriting Form ([`ComplexFinancialForm.tsx`](file:///src/components/portal/ComplexFinancialForm.tsx))**: Commercial credit facility application with field-level telemetry listeners on `annual_income`, `tax_id`, `monthly_debt`, and `collateral_valuation`. Compliance checkbox defaults to unchecked.
- **Telemetry Monitor HUD ([`TelemetryMonitorHUD.tsx`](file:///src/components/telemetry/TelemetryMonitorHUD.tsx))**: Real-time diagnostics HUD showing live `mouseSpeed`, field `pauseTime`, `rageClicks`, connection status, and 1-click contract test triggers.
- **Contract Inspector Tab ([`page.tsx`](file:///src/app/page.tsx))**: Live JSON inspector verifying outgoing payload and incoming backend response.

---

### 2. Strict Backend Contract Compliance (Member 3 Agreement)

#### Outgoing Payload (Frontend $\to$ Backend)
Sent as JSON via WebSocket stream or HTTP POST:
```json
{
  "mouseSpeed": 120,
  "pauseTime": 5,
  "rageClicks": 4,
  "fieldName": "annual_income",
  "userInput": "50000"
}
```

> **Strict Key Names**: `mouseSpeed`, `pauseTime`, `rageClicks`, `fieldName`, `userInput`. Any change (e.g., `mouse_speed`) is rejected with HTTP 400.

#### Incoming Response (Backend $\to$ Frontend)
```json
{
  "success": true,
  "score": 85,
  "triggerAI": true,
  "stuckField": "annual_income",
  "savedValue": "50000"
}
```

---

### 3. Deliverables Status Spreadsheet

The tracking workbook [`Week1_Member2_Status.xlsx`](file:///Week1_Member2_Status.xlsx) is available in the root workspace with four sheets:
1. **Summary**: Formula-driven counters (`COUNTIF`) and progress percentage.
2. **Requirement Check**: Status dropdowns and implementation notes for all 6 requirements.
3. **Action Items**: Priority and status tracking for the 4 additions and 4 cleanup items.
4. **Not Needed in Week 1**: Clear categorization of deferred modules (Weeks 2 to 4).

---

### 4. Running & Verification

#### Run Contract Unit Tests
```bash
npm run test:contract
```

#### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application and test live telemetry streaming.
