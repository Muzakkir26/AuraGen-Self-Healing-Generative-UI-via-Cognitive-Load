# AuraGen — Self-Healing Generative UI via Cognitive Load

> Infotact Solutions · Generative AI Internship · Project 1 (5 Nov – 4 Dec 2026)

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

Each member works inside their own folder so that branches merge into `main` without conflicts.

```
/frontend   Next.js app, telemetry hook, renderer       (Member-02)
/backend    Express + WebSocket server, scoring, API    (Member-03)
/ai         LangChain pipeline, prompts, Babel validator (Member-01)
/tests      Test cases, scenarios, evaluation scripts   (Member-04)
/docs       Contracts, architecture, reports            (all)
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

## Timeline

| Week | Dates | Focus |
|---|---|---|
| Week 1 | 5–11 Nov | Code-gen prompting · telemetry tracker |
| Week 2 | 12–18 Nov | Babel safety and compilation · dynamic injection |
| Mid review | 20–27 Nov | Generation audit · telemetry check |
| Week 3 | 19–25 Nov | Context awareness (keep typed data) · morphing animation |
| Week 4 | 26 Nov – 4 Dec | Latency under 2 s (caching, streaming) · fallback states |
| Final review | 5–10 Dec | Full secure real-time pipeline and demo |

## Setup

Setup steps will be added as each module lands. Secrets live in a local `.env` file, which is never committed. Copy [`.env.example`](.env.example) to start.

## Security principles

- All model output is treated as untrusted until the AST validator passes it.
- Generated code may only use components from our approved library.
- API keys stay on the server and are never sent to the browser.
