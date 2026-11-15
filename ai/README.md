# /ai: AuraGen AI layer (Member-01)

Everything between "the backend decided to generate a UI" and "the browser receives safe, compiled code".

| Part | File | Status |
|---|---|---|
| Design system spec (ds-0.1) | `designSystem.js` | Done |
| AST safety validator (Babel) | `validator/astValidator.js` | Done |
| Compiler (JSX → runnable function body) | `validator/compile.js` | Done |
| Reference component / few-shot example | `examples/PanWizard.jsx` | Done |
| Prompt builder + LangChain Code-Gen Agent | `agent/` | Next |
| Repair loop (send violations back to the LLM) | `agent/` | Planned |
| Cache + token streaming (Week 4 latency goal) | | Planned |

## Run

```bash
cd ai
npm install
npm test
```

## Use (backend, Member-03)

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

`compiled` is a plain function body. Build it with the exported parameter list so the
approved components are in scope and every dangerous global is shadowed as `undefined`:

```js
import { RUNTIME_PARAMS } from "<shared copy of ai/validator/compile.js params>";

const scope = { React, useState, useMemo, Wizard, WizardStep, TextField, /* ...all approved components */ };
const factory = new Function(...RUNTIME_PARAMS, compiled);
const Generated = factory(...RUNTIME_PARAMS.map((name) => scope[name]));
// <Suspense><ErrorBoundary fallback={<StaticWizard/>}><Generated values={...} onChange={...} onSubmit={...}/></ErrorBoundary></Suspense>
```

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
