# Branch record: `Member-01` (Team Lead: AI/LLM layer, validation, integration)

**In one line:** builds the "brain and safety guard". It writes the instructions the LLM follows and checks every piece of code the LLM produces before it can reach a user's browser.

## What was built, in plain words

| Piece | What it does | Why it matters | File |
|---|---|---|---|
| Interface contracts | Agreed message formats between frontend, backend, AI and tests | Everyone builds to the same shapes | `docs/contracts.md` (v0.2) |
| Project README + env template | Explains the project, roles, setup | Onboarding and review | `README.md`, `.env.example` |
| Design system list | One list of the approved components, tags, hooks and banned words | The prompt and the validator share it, so they can't disagree | `ai/designSystem.js` |
| **AST safety validator** | Reads LLM code as a syntax tree and rejects anything dangerous: imports, `window`, `fetch`, `eval`, unknown components, hidden-global tricks, loops, unsafe attributes. Lists all problems with line numbers | The official Week 2 deliverable: AI output is untrusted | `ai/validator/astValidator.js` |
| **Compiler** | Turns validated JSX into a plain function the browser can run, with dangerous globals hidden as a second safety net | What the renderer will load | `ai/validator/compile.js` |
| Reference component | A correct example wizard (PAN number) | Used by the tests and shown to the LLM as an example | `ai/examples/PanWizard.jsx` |
| **Prompt builder** | Turns "user is stuck on field X" into exact instructions for the LLM: the component list, the rules, a correct example, the field details and how the user is struggling | The official Week 1 deliverable (the LLM learns our UI kit) | `ai/agent/prompt.js` |
| Repair prompt + code extractor | Pulls code out of the LLM reply. If the validator rejects it, builds a "fix these problems" message | Raises the success rate without a human | `ai/agent/prompt.js` |
| Tests | 29 automated tests, all passing | Proof for the review | `ai/test/*.test.js` |

**Privacy design:** the LLM never sees what the user typed, only whether each field is "filled" or "empty". The real values reach the generated component at runtime, so typed data is kept without being sent to the LLM.

## Timeline

| Date | Work |
|---|---|
| Nov 9 | Created the repository (initial commit) |
| Nov 10 | README, interface contracts v0.1, `.env.example`; replaced sample personal data with placeholders |
| Nov 15 | AST safety validator + compiler + 20 tests; contracts v0.2; progress log |
| Nov 15 | Prompt builder + repair prompt + code extractor (9 more tests); team records folder |

## Status vs plan
- Week 1 prompting: ✅ prompt builder done. The LangChain/LLM call itself ⏳.
- Week 2 Babel safety layer: ✅ done.
- Not merged into `main` yet.

## Concerns
- Only 3 commit days so far. Commit every day from now on to meet the mid-review rule.
- LLM provider and API key still waiting for mentor approval.

## Next
1. Code-Gen Agent: LangChain call → extract → validate → one repair retry → result (contracts §4).
2. Mock LLM mode (no key needed) so the team can build the end-to-end demo now.
3. Wire into the backend: `triggerAI` → generate → push the component to the browser.

Detailed task queue: [`docs/progress-member-01.md`](../docs/progress-member-01.md).
