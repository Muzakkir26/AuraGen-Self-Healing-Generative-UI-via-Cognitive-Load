# Member-01 progress log (AI/LLM layer + integration)

Running log of what is done, what's next and open issues. Update it with every work session so the next task can start straight away.

Key dates: Mid review Nov 20–27 (commits on ≥10 of the prior 14 days) · Final review Dec 5–10 (a commit every day for the prior 20 days).

---

## Task queue

| # | Task | Week | Status |
|---|---|---|---|
| 1 | Interface contracts v0.1, README, env template | W1 | ✅ Nov 10 |
| 2 | Babel AST safety validator + compiler + tests (`ai/validator`) | W2 | ✅ Nov 15 |
| 3 | Prompt builder: design system + form schema + friction point → system/user prompt (`ai/agent/prompt.js`) | W1 (catch-up) | ✅ Nov 15 |
| 4 | LangChain Code-Gen Agent: LLM call → extract code → validate → one repair retry → result per contracts §4 | W1–W2 | ✅ Nov 15 |
| 5 | Mock LLM mode (no API key) returning `examples/PanWizard.jsx`, so the team can integrate before the key is approved | W2 | ✅ Nov 15 |
| 6 | Integration: wire `compileComponent` into the backend trigger, push `ui.generated` / `ui.fallback` | W2 | ✅ Nov 15 (`POST /api/generate`; WebSocket push waits on the backend WS server) |
| 7 | Generation audit script: N runs over sample friction points → pass-rate report (mid-review evidence) | W3 | ✅ script done (mock run). Real run needs the API key |
| 8 | Contextual awareness: prompt already sends filled/empty status only; remaining work is renderer passing `initialValues` and a test that typed data survives the swap | W3 | Todo |
| 9 | Latency: response cache keyed by (formId, fieldId, promptVersion) + token streaming, target < 2 s | W4 | 🟡 cache done (hit ≈ 1 ms). Streaming todo |
| 10 | Review and merge teammate PRs into `main` | ongoing | Ongoing |
| 11 | Real-model audit with GPT-4o once the key is approved; tune the prompt on the top violations | W3 | Todo (blocked: key) |
| 12 | Wire the trigger: when the telemetry score ≥ 70, the backend calls `/api/generate` (with Member-03) | W3 | Todo |
| 13 | Open the PR `Member-01` → `main` | W2 | Todo |

## Session log

### 2026-11-15: AST validator (task 2)
- Added `ai/` package: `designSystem.js` (ds-0.1 single source of truth), `validator/astValidator.js`, `validator/compile.js`, `examples/PanWizard.jsx`, 20 tests (`npm test` in `ai/`, all passing).
- Validator collects all violations in one pass with line numbers (to support the LLM repair loop later).
- Compiler outputs a strict-mode function body; banned globals are shadowed as `new Function` params (defence in depth).
- Contracts bumped to v0.2: §6 rules clarified to match the implementation. No message shapes changed.

### 2026-11-15: Prompt builder (task 3) + team records
- `ai/agent/prompt.js`: `buildPrompt(request)` → `{ system, user, promptVersion, designSystemVersion }`. The system prompt is generated from `designSystem.js` and includes `PanWizard.jsx` as a few-shot example. The user prompt describes the stuck field, same-group fields and the friction signals in plain words.
- Privacy: typed values never enter the prompt, only filled/empty status. Values reach the component at runtime via the `values` prop.
- `buildRepairPrompt(violations)` and `extractCode(reply)` are ready for the agent's repair loop. Prompt output is deterministic, so it can be used as a cache key in W4.
- 9 new tests (29 total, all passing).
- New `records/` folder: one plain-language record per branch (main, Member-01..04) plus a team summary in `records/README.md`.

### 2026-11-15: Code-Gen Agent, mock LLM, cache, backend route, audit (tasks 4, 5, 6, 7, 9a)
- Merged `main` into `Member-01`. Conflicts resolved: the project README keeps the real folder layout, the frontend guide moved to `docs/frontend.md`, and the env/ignore files are unioned.
- `ai/agent/codeGenAgent.js`: LangChain pipeline, prompt → model → extract → validate/compile → one repair retry. Returns a contracts §4 result and never throws (`ok` / `rejected` / `error`; timeout per call).
- `ai/agent/llm.js`: `createChatModel(env)` picks ChatOpenAI (GPT-4o) or `MockWizardChatModel` (a LangChain `SimpleChatModel`, no key). It uses the mock automatically when there's no key.
- `ai/agent/templates.js`: deterministic wizard for text/number/select/date/checkbox fields. Schema text is embedded with JSON.stringify, so it can't inject code.
- `ai/agent/cache.js`: LRU + TTL cache keyed by prompt hash. Safe across users because prompts hold no typed values.
- `server/routes/generateRoute.js`: `POST /api/generate` with a 30 s cooldown per session + field. Returns `{ result, ui }`. Smoke-tested on a live server: 200 ok, 429 cooldown, 400 bad request, cache hit 1 ms.
- `ai/audit/runAudit.js`: mock run of 21 generations, 100% valid on first try (pipeline check only).
- Contracts v0.3 (§8 generate endpoint). Tests: 44 passing.

## Open issues / integration notes
- **Contract drift:** `main` (Member-02 frontend + Member-03 backend) uses a simple REST payload (`mouseSpeed, pauseTime, rageClicks, fieldName, userInput` → `score, triggerAI`) instead of the WebSocket `telemetry.batch` / `cognitive_load.update` messages in contracts §1–2. Decide: adopt theirs as v0 and update the contracts, or ask them to move to the contract before the mid review.
- ~~Layout drift~~: README layout updated to the real folders (Nov 15).
- ~~Branch divergence~~: resolved Nov 15 (merged `main` into `Member-01`).
- **LLM provider/key:** still pending mentor approval (`.env.example` says openai / gpt-4o).
