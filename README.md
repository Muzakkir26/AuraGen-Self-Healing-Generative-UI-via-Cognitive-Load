# AuraGen: Self-Healing Generative UI via Cognitive Load

> A user interface that notices when people are struggling and rebuilds itself to help them.

## Overview

AuraGen is a self-healing user interface. It watches how a person uses a complex form and, when it detects that they are confused or frustrated, it generates a simpler piece of UI for exactly the field they are stuck on and swaps it into the page live. The user keeps everything they already typed and carries on without reloading, reading help text or opening a chatbot.

**Demo:** a user struggling with a complex financial form gets a calm, step-by-step wizard for the difficult field, generated on the fly.

## The problem

Most interfaces are static. When a screen is confusing, the user has to read tooltips, search for help or give up. AI assistance usually sits beside the interface in a chat window instead of improving the interface itself.

## How it works

1. **Sense:** a telemetry hook in the browser tracks cursor speed, pauses (hesitation) and rage clicks on each field.
2. **Score:** the server turns these signals into a **Cognitive Load Score** from 0 to 100.
3. **Generate:** when the score reaches the threshold (70 by default), an LLM is asked to write a small React component, such as a wizard, for the field the user is stuck on. The prompt describes our design system, so the result already matches the app's look.
4. **Validate:** the generated code is parsed into a Babel AST and checked against strict rules: only approved components, no imports, no network or DOM access, no dangerous globals. Unsafe code is rejected, and the model gets one chance to repair it.
5. **Render:** the compiled component is loaded into the page without a refresh. The user's typed values carry over, and a fallback is shown if anything fails.

## Key modules

| Module | Tech | Purpose |
|---|---|---|
| Friction Engine | React hook + Node.js | Captures interaction telemetry and computes the Cognitive Load Score |
| Code-Gen Agent | LangChain + LLM | Generates pre-styled React components from a design-system prompt |
| AST Validator | Babel | Rejects unsafe or invalid generated code and compiles the safe code |
| Dynamic Renderer | Next.js + React Suspense | Swaps the generated component into the page and keeps the user's data |

## Architecture

```
Browser (Next.js)                         Server (Node.js)
─────────────────                         ────────────────
Telemetry hook ──── telemetry ─────────▶  Friction Engine ──score──▶ score ≥ 70?
       ▲                                                              │ yes
       │                                                              ▼
       │                                  Code-Gen Agent (LangChain + LLM)
       │                                                              │ JSX source
       │                                                              ▼
       │                                  AST Validator (Babel: parse → check → compile)
       │                                                              │
Dynamic Renderer ◀──── generated UI or fallback ──────────────────────┘
```

The main endpoint is `POST /api/heal-ui`: it takes telemetry and returns the score plus, when needed, the generated UI. The message formats are defined in [`docs/contracts.md`](docs/contracts.md).

## Highlights

- **Safe by design:** model output is treated as untrusted until the AST validator passes it, and the compiled code runs with dangerous globals removed.
- **Private:** what the user typed is never sent to the LLM. The prompt only says whether a field is filled or empty; the real values reach the new component in the browser.
- **Fast:** responses are cached per form field, and a cool-down stops the UI from changing too often.
- **Works without an API key:** a mock LLM mode lets the whole flow run and be tested offline.

## Tech stack

Next.js, React, Tailwind CSS · Node.js, Express, zod · LangChain, OpenAI GPT-4o · Babel · node:test

## Repository layout

```
/src        Next.js app: financial form, telemetry hook, UI components
/server     Express API: scoring, validation, /api/heal-ui, /api/generate
/ai         Prompt builder, Code-Gen Agent, AST validator, compiler, renderer runtime (see ai/README.md)
/tests      Test plans, scenarios and evaluation scripts
/docs       Interface contracts and frontend guide
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