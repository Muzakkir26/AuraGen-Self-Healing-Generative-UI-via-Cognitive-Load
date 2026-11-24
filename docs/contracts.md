# AuraGen Interface Contracts — v0.8 (draft)

Owner: Member-01 (Team Lead). These are the shared message formats between the frontend, backend, AI layer and tests. **Do not change a contract without telling the members who depend on it.** Every change bumps the version at the top of this file.

All timestamps are milliseconds since epoch. All IDs are strings.

**Changelog**
- v0.8 (2026-11-24): §9 states how `userInput` becomes `ui.initialValues`: checkbox text (`"true"` / `"false"`) is turned into a boolean, and a field the browser masks before sending (`tax_id`) is never seeded. `savedValue` is unchanged. No shapes changed.
- v0.7 (2026-11-23): §6 closes sandbox escapes: banned keys in destructuring and object literals, free names limited to an allow-list, no property writes, no classes or getters/setters, `arguments` banned. `compiled` now starts with an own-key helper for runtime-key reads; the renderer contract is unchanged. Prompt version `p-0.2`.
- v0.6 (2026-11-21): §5 states how the renderer seeds values: page values win, `initialValues` fill empty fields. Reference loader in `ai/runtime/loadComponent.js`. No shapes changed.
- v0.5 (2026-11-19): §9 validates telemetry with the shared zod schemas in `server/schemas/` (same rules as `/api/telemetry`): numbers must be non-negative, `rageClicks` an integer, `fieldName` non-empty. Invalid bodies get 400 with `error` = `"<field>: <reason>"`. No shapes changed.
- v0.4 (2026-11-16): new §9 `POST /api/heal-ui`, the one-call trigger that the frontend already uses: REST telemetry in, score + `ui` message out. Generation starts at `LOAD_HIGH_THRESHOLD` (70). No existing shapes changed.
- v0.3 (2026-11-15): new §8 `POST /api/generate` (HTTP form of §3 → §4 + §5). §4 `meta` gains `provider`, `attempts` and `error`. No existing shapes changed.
- v0.2 (2026-11-15): §6 clarified to match the implemented AST validator (`ai/validator/astValidator.js`): event-handler, computed-access and loop rules, plus extra banned identifiers and attributes. §5 adds how the renderer must build `compiled`. No message shapes changed.
- v0.1 (2026-11-10): first draft.

---

## 1. Telemetry (frontend → backend, WebSocket)

The `useTelemetry` hook batches raw events and sends one message about every **250 ms**.

```json
{
  "type": "telemetry.batch",
  "sessionId": "s_8f2c",
  "formId": "financial-form-v1",
  "sentAt": 1762770000000,
  "events": [
    { "kind": "pointer_move", "t": 1762769999800, "x": 412, "y": 233 },
    { "kind": "click", "t": 1762769999900, "x": 415, "y": 230, "targetId": "field-pan", "isError": false },
    { "kind": "focus", "t": 1762769999950, "fieldId": "field-pan" },
    { "kind": "input", "t": 1762769999990, "fieldId": "field-pan", "length": 4 },
    { "kind": "validation_error", "t": 1762770000000, "fieldId": "field-pan", "code": "pattern" }
  ]
}
```

| `kind` | Required fields |
|---|---|
| `pointer_move` | `t, x, y` (send at most every 50 ms) |
| `click` | `t, x, y, targetId`, plus optional `isError` (the click landed on a non-interactive or disabled element) |
| `focus` / `blur` | `t, fieldId` |
| `input` | `t, fieldId, length` (**never send the value itself**: privacy) |
| `validation_error` | `t, fieldId, code` |

## 2. Cognitive Load Score (backend → frontend, WebSocket)

```json
{
  "type": "cognitive_load.update",
  "sessionId": "s_8f2c",
  "score": 74,
  "level": "high",
  "frictionFieldId": "field-pan",
  "signals": {
    "cursorVelocityVariance": 0.81,
    "hesitationMs": 4200,
    "rageClicks": 2,
    "errorRate": 0.4
  }
}
```

**Signal definitions (v0, to be tuned with test data):**

- **Rage click:** 3 or more clicks within 600 ms, all inside a 30 px radius.
- **Hesitation:** the pointer is idle for more than 2 s while a field is focused and still empty or invalid.
- **Cursor velocity variance:** the normalized variance of pointer speed over a sliding 5 s window. Erratic movement scores high.
- **Error rate:** validation errors divided by inputs on the current field.

**Score (0–100):** a weighted sum of the four signals, each normalized to 0–1.
Starting weights: rage clicks 0.35, hesitation 0.25, errors 0.25, velocity variance 0.15.

| Score | Level |
|---|---|
| under 40 | `low` |
| 40–69 | `medium` |
| 70 or above | `high` |

**Trigger rule:** generation fires when the level stays `high` for **3 s or longer**. After that it is rate-limited to at most one generation per field every 30 s.

## 3. Generation request (backend → AI layer, internal function call)

```json
{
  "sessionId": "s_8f2c",
  "frictionPoint": { "fieldId": "field-pan", "label": "PAN Number", "signals": { "rageClicks": 2, "hesitationMs": 4200 } },
  "formSchema": {
    "formId": "financial-form-v1",
    "fields": [
      { "id": "field-pan", "label": "PAN Number", "type": "text", "required": true, "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$", "help": "10-character tax ID" }
    ]
  },
  "formState": {
    "values": { "field-name": "<value typed by user>" },
    "errors": { "field-pan": "pattern" }
  },
  "designSystemVersion": "ds-0.1"
}
```

`formState.values` is sent so that the generated UI can keep data the user already typed (Week 3). Sensitive fields are masked before they reach the LLM.

## 4. Generation result (AI layer → backend)

```json
{
  "status": "ok",
  "componentId": "gen_3a91",
  "componentName": "PanWizard",
  "source": "export default function PanWizard({ values, onChange, onSubmit }) { ... }",
  "compiled": "/* Babel output, CommonJS-free function body */",
  "validation": { "passed": true, "violations": [] },
  "meta": { "model": "TBD", "latencyMs": 1430, "cacheHit": false, "promptVersion": "p-0.1" }
}
```

`status` is one of `ok`, `rejected` (the validator failed; `violations` lists the reasons) or `error` (timeout or LLM failure).

## 5. UI push (backend → frontend, WebSocket)

```json
{ "type": "ui.generated", "sessionId": "s_8f2c", "componentId": "gen_3a91", "targetFieldId": "field-pan", "compiled": "...", "initialValues": { "field-name": "<value typed by user>" } }
```

```json
{ "type": "ui.fallback", "sessionId": "s_8f2c", "targetFieldId": "field-pan", "reason": "rejected" }
```

When the frontend receives `ui.fallback`, it shows the **pre-built** static wizard for that field.

**Keeping typed data (contextual awareness).** The generated component starts with
`startingValues(msg, pageValues)`: a field keeps the value currently on the page, and only an empty field is
filled from `initialValues`. Its `onChange(fieldId, value)` writes back into the same form values, so nothing
is lost when the UI is swapped in or out. If `loadGeneratedComponent` throws, treat it like `ui.fallback`.

## 6. Generated-component rules (enforced by the AST validator)

Every generated component must:

- Be a single default-exported function component that takes `{ values, onChange, onSubmit }` as props.
- Use **only** these components (injected into scope by the renderer):
  `Wizard, WizardStep, TextField, NumberField, SelectField, DateField, Checkbox, Button, HelpText, ProgressBar, Card, Stack`
- Use **only** these React APIs: `useState`, `useMemo`.
- Use Tailwind utility classes in `className` strings only (literal strings, no template expressions).

Allowed extras: top-level `const` declarations (e.g. a `STEPS` array), and plain functions/arrow functions inside the component.

The validator **rejects** any code that contains:

- `import` or `require`, or any dynamic `import()`
- The identifiers `window`, `document`, `globalThis`, `self`, `top`, `parent`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator`, `location`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Worker`, `eval`, `Function`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `queueMicrotask`, `process`, `module`, `exports`, `global`, `Reflect`, `Proxy` (the full list lives in `ai/designSystem.js`)
- The properties `constructor`, `prototype`, `__proto__` and related prototype-chain escapes, including as object keys or destructuring keys (`const { constructor: F } = onSubmit`)
- Any free name except the approved components and hooks and `undefined`, `NaN`, `Infinity`, `String`, `Number`, `Boolean` (so `const O = Object` is rejected), plus `arguments` and names starting with `__auragen`
- Writes to properties (`values.x = 1`, `x.n++`, `delete x.y`, a property as a destructuring target). Field values change only through `onChange`
- The attributes `dangerouslySetInnerHTML`, `ref`, `style`, `href`, `src`, and spread attributes `{...x}`
- `on*` handlers on raw HTML elements. On approved components, a handler must be a function or a prop reference (e.g. `onClick={() => setStep(1)}`), never a string
- Raw HTML elements other than `div, span, p, h2, h3, ul, li, label`
- Member access on anything that isn't a prop or a local variable (so no `Math.max`, `React.useEffect`)
- Reads with a runtime key (`x[k]`) except on `values` or a local const array/object literal, calls on such reads, and destructuring with a runtime key
- Loops (`for`, `while`, `do`), `new`, `this`, `debugger`, `async`/generators, tagged templates, classes, getters/setters
- Source over 8 KB, or a parse error

**Renderer contract:** `compiled` is a function body. The renderer must build it with `new Function(...RUNTIME_PARAMS, compiled)` using the parameter list exported by `ai/validator/compile.js`, passing `undefined` for every shadowed global.

The compiler rewrites every runtime-key read `x[k]` to an own-property read (inherited members such as `constructor` come back `undefined`). The helper is defined at the top of `compiled`, so the renderer passes nothing extra.

## 7. Approved component props (design system ds-0.1)

| Component | Props |
|---|---|
| `Wizard` | `onSubmit`, `children` |
| `WizardStep` | `title`, `description?`, `children` |
| `TextField` | `id`, `label`, `value`, `onChange`, `placeholder?`, `help?`, `error?` |
| `NumberField` | `id`, `label`, `value`, `onChange`, `min?`, `max?`, `help?` |
| `SelectField` | `id`, `label`, `value`, `onChange`, `options` |
| `DateField` | `id`, `label`, `value`, `onChange` |
| `Checkbox` | `id`, `label`, `checked`, `onChange` |
| `Button` | `variant` (`primary`/`secondary`), `onClick`, `children` |
| `HelpText` | `children` |
| `ProgressBar` | `current`, `total` |
| `Card` / `Stack` | `className?`, `children` |

Member-02 builds these in `/frontend`. Member-01 feeds the same list to the LLM prompt. Member-03 and Member-04 validate and test against it.

## 8. Generate endpoint (frontend or backend → AI layer, HTTP)

`POST /api/generate` on the Express server. The body is the §3 generation request. The reply is:

```json
{
  "success": true,
  "result": { "status": "ok", "componentId": "gen_3a91", "componentName": "PanNumberWizard", "source": "...", "compiled": "...",
              "validation": { "passed": true, "violations": [] },
              "meta": { "model": "gpt-4o", "provider": "openai", "latencyMs": 1430, "cacheHit": false, "promptVersion": "p-0.1", "attempts": 1 } },
  "ui": { "type": "ui.generated", "sessionId": "s_8f2c", "componentId": "gen_3a91", "targetFieldId": "field-pan", "compiled": "...", "initialValues": {} }
}
```

| HTTP | When | `ui` |
|---|---|---|
| 200 | `result.status` is `ok` (`success: true`) or `rejected` / `error` (`success: false`) | `ui.generated` or `ui.fallback` (§5) |
| 400 | Missing `sessionId` / `frictionPoint.fieldId`, or the field is not in `formSchema.fields` | none |
| 429 | Same session + field generated less than `GENERATION_COOLDOWN_MS` ago | `ui.fallback` with `reason: "cooldown"` |

The frontend can render `ui` directly: on `ui.generated` load `compiled` (§6 renderer contract), on `ui.fallback` show the static wizard.
`meta.attempts` is 2 when the first answer was rejected and repaired. `meta.error` starts with `timeout`, `llm-failure` or `bad-request`.

## 9. Heal-UI trigger (frontend → backend, HTTP)

`POST /api/heal-ui` on the Express server. This is the end-to-end trigger: the backend scores the telemetry (`server/telemetryService.js`) and, when the score is at or above `LOAD_HIGH_THRESHOLD` (default 70), builds a §3 request from the server-side form schema (`server/forms/financialForm.js`) and runs the Code-Gen Agent in the same call.

Body (the REST telemetry the frontend sends today; `sessionId` is optional, default `"anonymous"`):

```json
{ "sessionId": "s_8f2c", "mouseSpeed": 120, "pauseTime": 5, "rageClicks": 4, "fieldName": "annual_income", "userInput": "<value typed by user>" }
```

Reply (the `/api/telemetry` fields plus `ui` and `generation`):

```json
{
  "success": true, "score": 100, "triggerAI": true, "stuckField": "annual_income", "savedValue": "<value typed by user>",
  "ui": { "type": "ui.generated", "sessionId": "s_8f2c", "componentId": "gen_3a91", "targetFieldId": "annual_income", "compiled": "...", "initialValues": { "annual_income": "<value typed by user>" } },
  "generation": { "status": "ok", "componentName": "AnnualIncomeWizard", "violations": [], "meta": { "latencyMs": 12, "cacheHit": false, "attempts": 1 } }
}
```

| Case | HTTP | `ui` |
|---|---|---|
| Score below the threshold | 200 | `null` (no generation) |
| Score at/above the threshold, generation ok | 200 | `ui.generated` |
| Generation rejected or failed | 200 | `ui.fallback`, `reason` = `rejected` / `error` (cooldown not started, so the next trigger retries) |
| Same session + field generated less than `GENERATION_COOLDOWN_MS` ago (shared with §8) | 200 | `ui.fallback`, `reason: "cooldown"` |
| `fieldName` is not in the form schema | 200 | `ui.fallback`, `reason: "unknown-field"` |
| Invalid telemetry (fails `server/schemas/requestSchema.js`: negative numbers, fractional `rageClicks`, empty `fieldName`, wrong types) | 400 | none; `error` = `"<field>: <reason>"` |

`userInput` only reaches the browser again through `ui.initialValues`. The LLM prompt only says whether the field is filled or empty.

How `userInput` becomes `ui.initialValues` (`seedValue` in `server/forms/financialForm.js`):

| Field | `userInput` | `initialValues[field]` |
|---|---|---|
| text / number | `""` | not set |
| text / number | any other text | the text, unchanged |
| checkbox | `"true"`, `"on"`, `"1"`, `"yes"` (any case, trimmed) | `true` |
| checkbox | anything else, including `"false"` | `false` |
| marked `maskedInTelemetry` (`tax_id`) | anything | not set: the browser sends a mask (`XX-XXX1234`), not the real value, so the renderer takes it from the page (§5) |

`savedValue` always echoes `userInput` as sent.

Cross-origin calls from the Next.js dev server are allowed for the origins in `CORS_ORIGIN` (default `http://localhost:3000`).
