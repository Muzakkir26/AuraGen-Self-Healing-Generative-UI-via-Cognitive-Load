# Branch record: `Member-01` (Team Lead: AI/LLM layer, validation, integration)

**In one line:** builds the "brain and safety guard". It writes the instructions the LLM follows and checks every piece of code the LLM produces before it can reach a user's browser.

## What was built, in plain words

| Piece | What it does | Why it matters | File |
|---|---|---|---|
| Interface contracts | Agreed message formats between frontend, backend, AI and tests | Everyone builds to the same shapes | `docs/contracts.md` (v0.3) |
| Project README + env template | Explains the project, roles, setup | Onboarding and review | `README.md`, `.env.example` |
| Design system list | One list of the approved components, tags, hooks and banned words | The prompt and the validator share it, so they can't disagree | `ai/designSystem.js` |
| **AST safety validator** | Reads LLM code as a syntax tree and rejects anything dangerous: imports, `window`, `fetch`, `eval`, unknown components, hidden-global tricks, loops, unsafe attributes. Lists all problems with line numbers | The official Week 2 deliverable: AI output is untrusted | `ai/validator/astValidator.js` |
| **Compiler** | Turns validated JSX into a plain function the browser can run, with dangerous globals hidden as a second safety net | What the renderer will load | `ai/validator/compile.js` |
| Reference component | A correct example wizard (PAN number) | Used by the tests and shown to the LLM as an example | `ai/examples/PanWizard.jsx` |
| **Prompt builder** | Turns "user is stuck on field X" into exact instructions for the LLM: the component list, the rules, a correct example, the field details and how the user is struggling | The official Week 1 deliverable (the LLM learns our UI kit) | `ai/agent/prompt.js` |
| Repair prompt + code extractor | Pulls code out of the LLM reply. If the validator rejects it, builds a "fix these problems" message | Raises the success rate without a human | `ai/agent/prompt.js` |
| **Code-Gen Agent (LangChain)** | The full pipeline: asks the LLM, checks the answer, and if it's unsafe sends the problems back for one fix. Always returns a clear result (ok / rejected / error), never crashes the server | The heart of the project: AI writes UI code safely | `ai/agent/codeGenAgent.js` |
| Model switch + **mock LLM** | Uses GPT-4o when an API key is set, otherwise a built-in "fake LLM" that writes correct wizards for any field type | The whole team can demo and test **now**, before the key is approved | `ai/agent/llm.js`, `ai/agent/templates.js` |
| **Cache** | Remembers generated components. A second user stuck on the same field gets one in ~1 ms instead of waiting for the LLM | The Week 4 speed goal (< 2 s) | `ai/agent/cache.js` |
| **Backend endpoint** | `POST /api/generate` on the real server: send the stuck field, get back the compiled component (or a "show the fallback" message). Max one generation per field every 30 s | Connects the AI layer to the rest of the app | `server/routes/generateRoute.js` |
| **Generation audit** | Runs 7 sample fields (text, number, date, dropdown, checkbox) many times and reports how often the result is valid, how fast, and which rules failed | Week 3 proof: "the LLM consistently outputs valid components" | `ai/audit/runAudit.js` |
| Tests | 44 automated tests, all passing, plus a live smoke test of the endpoint | Proof for the review | `ai/test/*.test.js` |

**Privacy design:** the LLM never sees what the user typed, only whether each field is "filled" or "empty". The real values reach the generated component at runtime, so typed data is kept without being sent to the LLM.

## Timeline

| Date | Work |
|---|---|
| Nov 9 | Created the repository (initial commit) |
| Nov 10 | README, interface contracts v0.1, `.env.example`; replaced sample personal data with placeholders |
| Nov 15 | AST safety validator + compiler + 20 tests; contracts v0.2; progress log |
| Nov 15 | Prompt builder + repair prompt + code extractor (9 more tests); team records folder |
| Nov 15 | Merged `main` into the branch (README conflict resolved, frontend guide kept as `docs/frontend.md`). Code-Gen Agent, mock LLM, cache, `/api/generate` endpoint, generation audit (44 tests); contracts v0.3 |

## Status vs plan
- Week 1 Code-Gen prompting (LangChain pipeline): ✅ done.
- Week 2 Babel safety layer: ✅ done.
- Week 3 generation audit: ✅ tool done. A real GPT-4o run is waiting for the API key.
- Week 4 latency: 🟡 cache done. Token streaming not yet.
- Not merged into `main` yet. The PR is ready to open.

## Concerns
- Only 3 commit days so far. Commit every day from now on to meet the mid-review rule.
- LLM provider and API key still waiting for mentor approval.

## Next
1. Open the PR `Member-01` → `main`.
2. Connect the trigger with Member-03: when the score reaches 70, the backend calls `/api/generate`.
3. Help Member-02 build the renderer that shows the `ui.generated` component (instructions in `ai/README.md`).
4. Once the key is approved: run the real GPT-4o audit and improve the prompt using the most common failures.

Detailed task queue: [`docs/progress-member-01.md`](../docs/progress-member-01.md).
