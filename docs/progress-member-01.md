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
| 4 | LangChain Code-Gen Agent: LLM call → extract code → validate → one repair retry → result per contracts §4 | W1–W2 | ⏭ Next |
| 5 | Mock LLM mode (no API key) returning `examples/PanWizard.jsx`, so the team can integrate before the key is approved | W2 | Todo |
| 6 | Integration: wire `compileComponent` into the backend trigger, push `ui.generated` / `ui.fallback` | W2 | Todo |
| 7 | Generation audit script: N runs over sample friction points → pass-rate report (mid-review evidence) | W3 | Todo |
| 8 | Contextual awareness: prompt already sends filled/empty status only; remaining work is renderer passing `initialValues` and a test that typed data survives the swap | W3 | Todo |
| 9 | Latency: response cache keyed by (formId, fieldId, promptVersion) + token streaming, target < 2 s | W4 | Todo |
| 10 | Review and merge teammate PRs into `main` | ongoing | Ongoing |

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

## Open issues / integration notes
- **Contract drift:** `main` (Member-02 frontend + Member-03 backend) uses a simple REST payload (`mouseSpeed, pauseTime, rageClicks, fieldName, userInput` → `score, triggerAI`) instead of the WebSocket `telemetry.batch` / `cognitive_load.update` messages in contracts §1–2. Decide: adopt theirs as v0 and update the contracts, or ask them to move to the contract before the mid review.
- **Layout drift:** `main` has the Next.js app and `server/` at the repo root, not `/frontend` and `/backend` as the README says. `ai/` is self-contained, so it merges cleanly either way. Update the README layout section.
- **Branch divergence:** `Member-01` has not merged `main` since Nov 10. Merge `main` into `Member-01` before opening the PR (expect a README / `.env.example` conflict).
- **LLM provider/key:** still pending mentor approval (`.env.example` says openai / gpt-4o).
