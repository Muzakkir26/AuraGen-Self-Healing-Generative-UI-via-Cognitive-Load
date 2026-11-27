# AuraGen — Self-Healing Generative UI via Cognitive Load

> A user interface that notices when people are struggling and rebuilds itself to help them.

## 1. Project Overview

AuraGen is an AI-powered self-healing user interface that dynamically adapts to a user's cognitive load. It detects interaction difficulties, calculates a real-time Cognitive Load Score, and generates simplified React interfaces to help users complete complex tasks.

Unlike traditional interfaces, AuraGen does not simply display help messages or tooltips. It changes the interface itself to reduce user effort and improve usability.

## 2. Problem Statement

Standard user interfaces are static. When users become confused by complex forms or workflows, they must read tooltips, search for help, or abandon the task.

Traditional AI assistants generally operate separately from the interface and cannot directly simplify the screen where the user is experiencing difficulty.

AuraGen addresses this problem by integrating cognitive-load detection, AI-generated components, code validation and dynamic rendering into one adaptive system.

## 3. Project Objectives

- Detect user interaction difficulties in real time.
- Calculate a Cognitive Load Score from interaction telemetry.
- Identify when an interface needs simplification.
- Generate context-aware React components using an LLM.
- Validate generated code before execution.
- Replace complex interfaces with simplified alternatives.
- Preserve user-entered data during interface transitions.
- Provide fallback interfaces when generation or validation fails.

## 4. What AuraGen Does

AuraGen monitors interaction signals such as cursor movement, hesitation and repeated clicks. These signals are processed by the Friction Engine to calculate a Cognitive Load Score.

When the score crosses a configured threshold, the AI generation pipeline creates a simplified interface for the area where the user is experiencing difficulty.

The generated component is validated, compiled and dynamically loaded into the application without a full-page refresh.

**Demo use case:** A user struggling with a complex financial form is moved to a conversational, step-by-step wizard while preserving previously entered information.

## 5. Key Modules

| Module | Technology | Purpose |
|---|---|---|
| Friction Engine | React Hooks, WebSockets, Node.js | Collects interaction telemetry and calculates cognitive load |
| Code-Gen Agent | LangChain, LLM | Generates simplified React components |
| AST Injector | Babel, Node.js | Parses, validates and compiles generated code |
| Dynamic Renderer | Next.js, React Suspense | Loads generated components dynamically |
| Self-Healing Validator | Validation and repair logic | Detects invalid UI output and provides safe fallbacks |
| Telemetry Service | Node.js | Processes interaction events and calculates scores |

## 6. System Architecture

```text
Browser (Next.js)                    Server (Node.js)
─────────────────                    ────────────────
useTelemetry Hook
       |
       | telemetry.batch
       v
                              Friction Engine
                                    |
                              Cognitive Score
                                    |
                              Threshold Check
                                    |
                                    v
                              Code-Gen Agent
                               (LLM / Mock)
                                    |
                              Generated JSX
                                    |
                                    v
                              AST Validator
                                    |
                           Parse → Validate
                                    |
                              Compile / Repair
                                    |
                                    v
Dynamic Renderer <──────── ui.generated / ui.fallback
(React Suspense + Error Boundary)
```

The message formats and API contracts are documented in `docs/contracts.md`.

## 7. Repository Structure

```text
AuraGen/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── styles/
│
├── server/
│   ├── index.js
│   └── telemetryService.js
│
├── ai/
│   ├── prompt/
│   ├── validator/
│   ├── compiler/
│   ├── reports/
│   └── README.md
│
├── tests/
│
├── Integration_Testing/
│
├── docs/
│   ├── contracts.md
│   ├── frontend.md
│   └── technical documentation
│
├── package.json
├── package-lock.json
├── README.md
└── .env.example
```

*Note: This is a high-level structure. Existing project folders and filenames should be retained.*

## 8. Branches and Team Roles

| Branch | Responsibility |
|---|---|
| `main` | Stable integrated project |
| `Member-01` | AI/LLM integration, prompt design and code validation |
| `Member-02` | Frontend/UI, telemetry capture and dynamic rendering |
| `Member-03` | Backend/API, WebSocket server and scoring |
| `Member-04` | Testing, evaluation, bug reproduction, documentation and PPT |

Changes are integrated into `main` through reviewed pull requests.

## 9. Technology Stack

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express
- **Communication:** WebSockets
- **AI integration:** LangChain and LLM/mock provider
- **Code processing:** Babel and AST validation
- **UI rendering:** React Suspense and Error Boundaries
- **Testing:** Node.js test runner and project-specific integration tests
- **Version control:** Git and GitHub

## 10. Installation and Setup

### Prerequisites

- Node.js and npm
- Git
- A code editor such as Visual Studio Code

### Clone the repository

```bash
git clone https://github.com/Muzakkir26/AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load.git

cd AuraGen
```

### Install dependencies

```bash
npm install
```

If the AI layer has separate dependencies:

```bash
cd ai
npm install
cd ..
```

### Configure environment variables

```bash
cp .env.example .env
```

Configure the required values in `.env`. Keep API keys private and do not commit the `.env` file.

### Start the application

```bash
npm run dev
```

Start the backend in a separate terminal (port 3001). `LLM_PROVIDER=mock` needs no API key:

```bash
npm run server
```

Open http://localhost:3000, type in a field (e.g. Gross Annual Operating Income), keep still for about 5 seconds, then click quickly 4 or more times on the same spot. A pause alone gives at most 35 points, so it takes pause plus rage clicks to reach 70. With `?debug=true`, the HUD's **Send Contract Spec** button sends the contract example (score 85) in one click. At 70 or more the page calls `/api/heal-ui` and shows the generated step-by-step help under the alert. Press **Done** and the values from the help are copied back into the form.

### Run tests

```bash
npm run test:ai       # AI layer: validator, prompt, agent, runtime
npm run test:server   # backend routes
npm test              # frontend components and the telemetry hook (jest)
npm run test:contract
npm run test:all      # the first three together
```

Run the AI audit when required:

```bash
npm run audit:ai
```

Run the healing demo if configured:

```bash
npm run demo:heal-ui
```

## 11. Cognitive Load Analysis

AuraGen evaluates user interaction signals to estimate cognitive load.

The system uses configured thresholds to classify the interaction state:

| Cognitive Level | Score Range | Interface Behaviour |
|---|---:|---|
| LOW | 0–30 | Normal interface |
| MEDIUM | 31–60 | Simplified interface |
| HIGH | 61–80 | Minimal interface |
| VERY HIGH | Above 80 | Critical simplified interface |

The thresholds and response behaviour are configurable.

## 12. Self-Healing Mechanism

The self-healing process follows these steps:

1. Detect interaction difficulties.
2. Collect telemetry events.
3. Calculate the Cognitive Load Score.
4. Check whether the score crosses the configured threshold.
5. Generate a simplified UI using the AI engine.
6. Validate the generated UI schema and code.
7. Repair invalid output when possible.
8. Use a safe fallback if validation or repair fails.
9. Render the new interface dynamically.
10. Preserve the user's existing form data.

## 13. Testing and Quality Assurance

The Member-04 testing and evaluation work focuses on validating the functionality, reliability, responsiveness and safety of AuraGen.

### Testing objectives

- Verify individual modules.
- Validate communication between frontend and backend.
- Test AI-generated UI output.
- Verify cognitive-load scoring.
- Check self-healing and repair behaviour.
- Identify and reproduce bugs.
- Evaluate responsive UI behaviour.
- Verify safe fallback behaviour.

### Testing phases

**Phase 1 — Test Planning**

Define testing objectives, scope, test environment, scenarios and expected results.

**Phase 2 — Test Case Design**

Prepare test cases for telemetry, scoring, AI generation, validation, rendering and error handling.

**Phase 3 — Functional Testing**

Verify that individual features work according to the expected requirements.

**Phase 4 — Integration Testing**

Test communication between the frontend, backend, telemetry service and AI modules.

**Phase 5 — Cognitive Load Testing**

Check the system's response to different interaction patterns and cognitive-load levels.

**Phase 6 — Self-Healing Testing**

Verify generated UI validation, repair behaviour and fallback handling.

**Phase 7 — UI and Responsive Testing**

Check layout consistency, usability and responsiveness across screen sizes.

**Phase 8 — Bug Reproduction**

Reproduce identified issues using documented steps and input conditions.

**Phase 9 — Regression Testing**

Re-run relevant tests after code changes to ensure existing features remain functional.

**Phase 10 — Evaluation and Documentation**

Record results, test evidence, observations and recommendations.

## 14. Automated Testing Results

The following results were recorded during the project testing process:

| Test Area | Recorded Result |
|---|---|
| Backend tests | 24 passed, 0 failed |
| AI tests | 65 passed, 0 failed |
| Integration test | 2 passed |
| Contract tests | Passed |
| AI audit | 21 generations |
| First-attempt AI audit success | 100% |
| Success after repair | 100% |
| AI audit p95 | 25 ms |

**Important:** These are recorded results from the executed test runs. They should not be interpreted as proof that every possible production scenario has been tested.

### AI Audit Reports

```text
ai/reports/
├── audit-mock-2026-11-26.json
└── audit-mock-2026-11-26.md
```

## 15. Bug Reproduction and Fix Verification

The testing process includes:

- Recording the bug description.
- Identifying the affected module.
- Documenting steps to reproduce.
- Recording expected and actual results.
- Identifying the root cause.
- Applying the correction.
- Re-running the affected test.
- Recording the final verification result.

### Example issue: Contact Form Textarea

**Issue:** The `Input` component did not support the `as="textarea"` property.

**Correction:** Replaced the unsupported component usage with a native HTML `<textarea>` element.

**Verification:** The project build and TypeScript checks were run after the correction.

## 16. Quality Invariants

| Quality Invariant | Expected Guarantee |
|---|---|
| Code validation | Generated code must pass validation before execution |
| Approved components | Generated UI must follow the approved component rules |
| Data preservation | Existing user input should remain available during UI transitions |
| Safe fallback | Invalid generated UI should not break the application |
| API security | Secret keys must remain on the server |

## 17. Security Principles

- All AI-generated output is treated as untrusted.
- Generated code must pass validation before use.
- Only approved components and permitted operations should be allowed.
- API keys must remain on the server.
- Environment files containing secrets must not be committed.
- Invalid generated output must be rejected or replaced with a safe fallback.

## 18. Expected Outcomes

AuraGen aims to provide:

- Reduced user confusion when working with complex interfaces.
- Adaptive and context-aware user experiences.
- Faster completion of complex forms.
- Reduced dependence on external help.
- Improved accessibility and usability.
- Safer AI-generated interface integration.

## 19. Future Enhancements

- More accurate cognitive-load estimation.
- Additional adaptive UI patterns.
- Improved support for different LLM providers.
- Expanded automated security testing.
- Real-user usability evaluation.
- Enhanced telemetry analytics and reporting.

## 20. Final QA Evaluation

AuraGen demonstrates an approach to adaptive user interfaces by combining telemetry-based cognitive-load estimation with AI-generated React components and self-healing validation.

The testing work covers backend functionality, AI generation, integration, contract validation and error handling. Further real-user testing and production-scale security evaluation are recommended before deployment.

**Project:** AuraGen — Self-Healing Generative UI via Cognitive Load
**Testing and Documentation:** Member-04
**Repository:** [GitHub — AuraGen](https://github.com/Muzakkir26/AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load)
