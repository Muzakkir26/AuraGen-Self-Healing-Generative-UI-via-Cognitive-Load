# AuraGen — Self-Healing Generative UI via Cognitive Load

> A user interface that notices when people are struggling and rebuilds itself to help them.

## Problem

Standard user interfaces are static. When a user gets confused by a complex screen, they have to read tooltips, open a separate chatbot, or give up on the task. AI help usually sits next to the UI instead of inside it.

## What AuraGen does

AuraGen watches how a user interacts with a complex form: cursor velocity, hesitation and rage clicks. From these signals it computes a real-time **Cognitive Load Score**. When the score crosses a threshold, an LLM generates a simplified, custom React component for the exact point where the user is stuck, for example a step-by-step wizard. The component is validated, compiled and swapped into the page live, without a refresh and without losing anything the user already typed.

**Demo use case:** a user struggling with a complex financial form is moved to a conversational, step-by-step wizard that is generated on the fly.

## Key modules

| Module | Tech | Purpose |
|---|---|---|
| Friction Engine | React hook + WebSockets | Streams cursor, hesitation and click telemetry and computes the Cognitive Load Score |
| Code-Gen Agent | LangChain + LLM | Prompted with our design system (Tailwind + component library) to generate pre-styled React components |
| AST Injector | Babel + Node.js | Parses generated code into an AST, rejects unsafe or invalid code, compiles it and pushes it to the client |
| Dynamic Renderer | Next.js + React Suspense | Loads the compiled component into the page without a refresh, with a fallback if it fails |

## Architecture (request flow)

```
Browser (Next.js)                      Server (Node.js)
─────────────────                      ────────────────
useTelemetry hook ──telemetry.batch──▶ Friction Engine ──score──▶ trigger?
        ▲                                                     │ yes
        │                                                     ▼
        │                               Code-Gen Agent (LangChain + LLM)
        │                                                     │ JSX source
        │                                                     ▼
        │                               AST Injector (Babel: parse → validate → compile)
        │                                                     │
Dynamic Renderer ◀────ui.generated / ui.fallback──────────────┘
(Suspense + ErrorBoundary + Framer Motion)
```

The message formats between these parts are defined in [`docs/contracts.md`](docs/contracts.md).

## Repository layout

```
/src        Next.js app: financial form, telemetry hook, UI kit, HUD   (Member-02, guide: docs/frontend.md)
/server     Express API: scoring, validation, /api/generate, /api/heal-ui (Member-03, AI routes: Member-01)
/ai         Prompt builder, Code-Gen Agent, Babel validator, compiler  (Member-01, guide: ai/README.md)
/tests      Test cases, scenarios, evaluation scripts                  (Member-04)
/docs       Contracts, frontend guide, progress logs                   (all)
```

## Branches and team roles

| Branch | Role |
|---|---|
| `main` | Stable, integrated code. Changes come in only through pull requests the Team Lead has reviewed |
| `Member-01` | Team Lead: AI/LLM layer, prompt design, code validation, integration |
| `Member-02` | Frontend/UI: components, telemetry capture, dynamic rendering, animation |
| `Member-03` | Backend/API: WebSocket server, scoring, request validation, configuration |
| `Member-04` | Testing, evaluation, documentation, report and PPT |

Clone with:

```bash
git clone https://github.com/Muzakkir26/AuraGen-Self-Healing-Generative-UI-via-Cognitive-Load.git
```

## Setup

```bash
npm install                 # frontend + backend
cd ai && npm install && cd ..   # AI layer
cp .env.example .env        # fill in values; leave OPENAI_API_KEY empty to use the mock LLM
npm run dev                 # Next.js frontend on :3000
node server/index.js        # backend API
npm run test:ai             # AI layer tests
npm run test:server         # backend trigger tests (/api/heal-ui, /api/generate)
npm run demo:heal-ui        # end-to-end demo with the mock LLM: telemetry -> wizard -> typed value kept
```

`npm run demo:heal-ui -- --url http://localhost:3001` runs the same demo against a server that is already running (start it with `LLM_PROVIDER=mock` if the API key has no quota).

Frontend details and manual test steps are in [`docs/frontend.md`](docs/frontend.md). Secrets live in a local `.env` file, which is never committed.

## Security principles

- All model output is treated as untrusted until the AST validator passes it.
- Generated code may only use components from our approved library.
- API keys stay on the server and are never sent to the browser.