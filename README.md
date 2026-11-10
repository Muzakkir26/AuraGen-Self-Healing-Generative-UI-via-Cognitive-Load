# AuraGen: Self-Healing Generative UI via Cognitive Load
**Infotact Solutions • Advanced Generative AI Engineering (Project 1)**

## 🎯 Week 1 Milestone: Telemetry Tracker & Friction Engine (Member 2 — Frontend & UI)

As defined in the Project 1 Development Plan:
> **Week 1: Frontend & Rendering (Next.js 14, React 18, TypeScript strict, Tailwind 3.4)**:
> *"Telemetry Tracker: Build a custom React hook to track mouse velocity, hesitation, and click patterns, streaming them via WebSockets."*

This repository is strictly scoped to **Week 1 only**. All Week 2–4 modules (AST Injector, Dynamic In-Browser Code Compilation, Framer Motion wizard morphing, and Generative UI component schemas) are deferred to subsequent weeks.

---

### 1. Key Capabilities & Design

#### A. Custom React Hook: `useCognitiveTelemetry.ts`
- **Continuous WebSocket Streaming**: Enabled by default (`NEXT_PUBLIC_TELEMETRY_WS_URL`, default `ws://localhost:5000/ws/telemetry`). Telemetry streams every **0.8 seconds** (within the 0.5s–1s specification) directly over the WebSocket. When connected, **zero HTTP telemetry requests** are dispatched.
- **Automatic HTTP Fallback**: If the WebSocket disconnects or is unreachable, the hook shows `"reconnecting"`, activates `"http-fallback"` mode via `POST /api/telemetry`, and automatically switches back to WebSocket once restored.
- **Field-Level Hesitation (`pauseTime`)**: Measures inactive seconds strictly on the currently focused input field. When the user blurs or types in the field, `pauseTime` immediately resets to 0.
- **Mouse Velocity Decay (`mouseSpeed`)**: Instantaneous cursor velocity smoothed via an Exponential Moving Average (EMA). Drops to **0 px/s within 250ms** once cursor movement stops.
- **Rage Click Decay (`rageClicks`)**: Detects frustrated click bursts (<45px radius in <700ms). Naturally decays by 1 click every 2 seconds of inactivity, allowing the cognitive score to recover.
- **Zero-Activity Baseline**: With zero activity (`mouseSpeed: 0, pauseTime: 0, rageClicks: 0`), the mock score evaluates to **0**, not 5.
- **No Simulation Button Hang**: Separate `isSimulating` state ensures continuous background streaming never locks the test buttons into permanent loading spinners.

#### B. User Mode vs. Debug Mode
- **Normal Mode (Default)**: Normal users see only the clean, accessible Infotact commercial underwriting form. All tracking runs silently in the background with neutral wording (*"Please complete the underwriting disclosures below."*).
- **Debug Mode (`?debug=true` or `NEXT_PUBLIC_SHOW_DEBUG=true`)**: Exposes developer diagnostics:
  - **Dockable Telemetry HUD**: Collapsed by default, toggleable between `bottom-right` and `bottom-left`.
  - **Single Connection Badge**: Explicitly shows `Connected`, `Reconnecting`, `HTTP Fallback`, or `Offline` without contradictory badges.
  - **Backend Contract Inspector**: Live JSON visualizer for outgoing payloads and incoming responses.

---

### 2. Strict Backend Telemetry Contract (Member 3 Agreement)

#### Outgoing Payload (Frontend $\to$ Backend)
Sent as JSON over WebSocket or fallback HTTP POST:
```json
{
  "mouseSpeed": 120,
  "pauseTime": 5,
  "rageClicks": 4,
  "fieldName": "annual_income",
  "userInput": "50000"
}
```

> **Strict Key Names**: `mouseSpeed`, `pauseTime`, `rageClicks`, `fieldName`, `userInput`.
> Any missing keys or invalid types (e.g. `mouse_speed` or non-numeric speed) are rejected with HTTP 400.

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

### 3. Environment Variables

Configure optional environment variables in `.env.local`:
```bash
# WebSocket endpoint for real-time telemetry streaming
NEXT_PUBLIC_TELEMETRY_WS_URL=ws://localhost:5000/ws/telemetry

# Enable debug UI by default without ?debug=true query parameter
NEXT_PUBLIC_SHOW_DEBUG=false
```

---

### 4. Running the Project

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Run Automated Contract Verification
```bash
npm run test:contract
```
*Validates exact contract payload (score 85, triggerAI: true), HTTP 400 rejection on wrong keys/types, and score 0 baseline.*

#### Step 3: Start the Local Mock WebSocket Server
```bash
npm run mock:ws
```
*Starts local WebSocket server on `ws://localhost:5000/ws/telemetry` implementing Member 3's scoring formula.*

#### Step 4: Start the Next.js Development Server
```bash
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) for **Normal User View**.
- Open [http://localhost:3000?debug=true](http://localhost:3000?debug=true) for **Developer / Reviewer Debug View**.

---

### 5. Manual Verification Steps

Follow these steps to test all Week 1 requirements:

1. **WebSocket Active Streaming**:
   - Start the mock server (`npm run mock:ws`) and dev server (`npm run dev`).
   - Open [http://localhost:3000?debug=true](http://localhost:3000?debug=true) in your browser.
   - Expand the Telemetry HUD: confirm connection badge displays **`Connected`** (or **`WS Live`**).
   - Open browser DevTools $\to$ **Network** tab $\to$ filter by `Fetch/XHR`. Confirm **zero HTTP telemetry POST calls** are sent while WebSocket is connected.
   - Switch to the **WS** tab to inspect continuous WebSocket messages streaming every 0.8s.

2. **Field-Level Hesitation**:
   - Click on the `annual_income` input field.
   - Stay idle for 5+ seconds without moving the mouse or typing.
   - In the HUD, observe `pauseTime` increment and `score` rise past 70 pts.
   - Type a digit into the input field: confirm `pauseTime` immediately resets to 0 and the score lowers.
   - Click outside the form (blur): confirm `pauseTime` resets to 0.

3. **Mouse Velocity & Rage Click Decay**:
   - Rapidly move your cursor: observe `mouseSpeed` rise in px/s. Stop moving cursor: observe speed drop to 0 within 250ms.
   - Click rapidly 4+ times on a field: observe `rageClicks` rise to 4 and score rise.
   - Stop clicking: observe `rageClicks` decay by 1 every 2 seconds until it reaches 0 and score returns to 0 baseline.

4. **WebSocket Disconnect & HTTP Fallback**:
   - Stop the mock WebSocket server (press `Ctrl+C` in its terminal).
   - Observe the HUD badge immediately change to **`Reconnecting`** / **`HTTP Fallback Active`**.
   - In the browser Network tab, confirm telemetry automatically streams via `POST /api/telemetry` as fallback.
   - Restart `npm run mock:ws`: observe the UI reconnects and returns to **`Connected`** WebSocket mode.

5. **Normal User Mode**:
   - Navigate to [http://localhost:3000](http://localhost:3000) (without `?debug=true`).
   - Confirm that no Telemetry HUD, no yellow connection banner, no Contract Inspector tab, and no developer badges are visible. The form displays clean, professional Infotact branding with tracking active silently in the background.

---

### 6. Codebase Structure

```
AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load/
├── scripts/
│   └── mock-ws-server.js        # Local Node.js WebSocket mock server (port 5000)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── telemetry/
│   │   │       └── route.ts     # Reference HTTP API route with contract validation
│   │   ├── globals.css          # Tailwind CSS styles
│   │   ├── layout.tsx           # App layout
│   │   └── page.tsx             # Main portal with ?debug=true query switch
│   ├── components/
│   │   ├── portal/
│   │   │   ├── ComplexFinancialForm.tsx # Clean underwriting form with empty placeholders
│   │   │   └── InfotactHeader.tsx       # Infotact branding & single connection badge
│   │   ├── telemetry/
│   │   │   └── TelemetryMonitorHUD.tsx  # Dockable HUD (bottom-right/left, collapsed by default)
│   │   └── ui/
│   │       ├── Badge.tsx        # Accessible status indicators
│   │       ├── Button.tsx       # Reusable button with separate simulation loading state
│   │       ├── Card.tsx         # Modular card containers
│   │       ├── Input.tsx        # Input with dynamic stuck-field highlighting
│   │       └── ProgressBar.tsx  # Real-time cognitive score meter
│   ├── hooks/
│   │   └── useCognitiveTelemetry.ts # Week 1 custom React telemetry tracker hook
│   ├── lib/
│   │   └── scoring.ts           # Shared contract validation & calibrated scoring formula
│   └── types/
│       └── telemetry.ts         # Strict contract TypeScript definitions
├── test-contract.js             # Automated contract verification test suite
├── package.json
└── tailwind.config.js
```
