# /ai: AuraGen AI layer (Member-01)

Everything between "the backend decided to generate a UI" and "the browser receives safe, compiled code".

| Part | File | Status |
|---|---|---|
| Design system spec (ds-0.1) | `designSystem.js` | Done |
| AST safety validator (Babel) | `validator/astValidator.js` | Done |
| Compiler (JSX → runnable function body) | `validator/compile.js` | Done |
| Reference component / few-shot example | `examples/PanWizard.jsx` | Done |
| Prompt builder (system + user prompt, few-shot, privacy masking) | `agent/prompt.js` | Done |
| Repair prompt + code extractor | `agent/prompt.js` | Done |
| LangChain Code-Gen Agent (LLM call → validate → repair retry → §4 result) | `agent/codeGenAgent.js` | Done |
| Chat model factory: OpenAI (GPT-4o) or mock, from env | `agent/llm.js` | Done |
| Mock LLM + template wizard generator (no API key needed) | `agent/llm.js`, `agent/templates.js` | Done |
| Generation cache (LRU + TTL, shared safely across users) | `agent/cache.js` | Done |
| Backend route `POST /api/generate` | `../server/routes/generateRoute.js` | Done |
| Trigger `POST /api/heal-ui` (score ≥ 70 → generate) | `../server/routes/healUiRoute.js` | Done |
| Generation audit (pass rate, latency, violations) | `audit/runAudit.js` | Done |
| Renderer runtime: `compiled` → component, keep typed values | `runtime/loadComponent.js` | Done |
| Token streaming to the frontend | | Planned (W4) |

## Run

```bash
cd ai
npm install
npm test
```

## Generate a component

```js
const { createAgentFromEnv, toUiMessage } = require("../ai");
const agent = createAgentFromEnv();          // LLM_PROVIDER=openai|mock; mock when no key
const result = await agent.generate(request); // contracts §3 in, §4 out; never throws
ws.send(JSON.stringify(toUiMessage(request, result))); // §5 ui.generated / ui.fallback
```

Or over HTTP: `POST /api/generate` (contracts §8), already mounted in `server/index.js`.

## Audit

```bash
npm run audit                      # mock: tests the pipeline
LLM_PROVIDER=openai OPENAI_API_KEY=... npm run audit -- --runs 5   # real model numbers
```

Reports go to `reports/audit-<provider>-<date>.{json,md}`. Mock reports say so at the top. Never present them as model quality.

## Lower-level use (validator only)

```js
const { compileComponent } = require("../ai");

const out = compileComponent(llmSource);
if (out.ok) {
  ws.send(JSON.stringify({ type: "ui.generated", compiled: out.compiled /* ... */ }));
} else {
  // out.validation.violations -> [{ rule, message, line }]
  ws.send(JSON.stringify({ type: "ui.fallback", reason: "rejected" /* ... */ }));
}
```

## Use (renderer, Member-02)

`runtime/loadComponent.js` has no Node or Babel dependencies, so the frontend can import it or copy it.
It builds `compiled` with the approved components in scope and every dangerous global shadowed as `undefined`
(even if the scope passes one in), and it merges values so the user's typing survives the swap:

```js
import { loadGeneratedComponent, startingValues, applyChange } from "<ai/runtime/loadComponent.js>";

const scope = { React, useState, useMemo, Wizard, WizardStep, TextField, /* ...all approved components */ };
let Generated;
try {
  Generated = loadGeneratedComponent(msg.compiled, scope);   // throws RuntimeLoadError → show the static wizard
} catch { /* fallback */ }

const [values, setValues] = useState(() => startingValues(msg, formValues)); // page values win, server fills gaps
// <ErrorBoundary fallback={<StaticWizard/>}>
//   <Generated values={values} onChange={(id, v) => setValues((p) => applyChange(p, id, v))} onSubmit={...}/>
// </ErrorBoundary>
```

`test/runtime.test.js` renders the real compiled output with React 18 for every field type and checks that
the saved value shows in the input after the swap and that edits flow back to the form values.

## What the validator checks

Rules come from `docs/contracts.md` §6. All violations are collected in one pass (with line numbers), so the
agent can hand the whole list back to the LLM for a single repair attempt.

| Rule id | Rejects |
|---|---|
| `empty`, `size`, `parse` | Empty source, over 8 KB, syntax errors |
| `shape` | Anything other than top-level `const`s plus one default-exported PascalCase function |
| `props` | Props other than `{ values, onChange, onSubmit }` |
| `import` | `import` statements, dynamic `import()` |
| `banned-identifier` | `window`, `document`, `fetch`, `eval`, `Function`, timers, `process`, `require`, etc. |
| `banned-property` | `.constructor`, `.prototype`, `.__proto__` and similar prototype-chain escapes |
| `computed-access` | `x[runtimeKey]` except on `values` or a local const array/object literal; calling such a read |
| `member-access` | `a.b` where `a` is not a prop or local (e.g. `Math.max`, `React.useEffect`) |
| `hook` | Any hook except `useState`, `useMemo` |
| `loop`, `syntax` | Loops, `new`, `this`, `debugger`, async/generators, tagged templates |
| `jsx-element` | Tags outside the approved components and `div span p h2 h3 ul li label` |
| `jsx-attribute` | `dangerouslySetInnerHTML`, `ref`, `style`, `href`, `src`, spreads |
| `event-handler` | `on*` on raw HTML elements, or a handler that isn't a function / prop reference |
| `class-name` | `className` that isn't a literal string |

**Defence in depth:** static analysis alone cannot make JavaScript fully safe, so the compiler also shadows every
banned global as a `new Function` parameter. Code that slips past the validator still can't reach `window` or `fetch` by name.
