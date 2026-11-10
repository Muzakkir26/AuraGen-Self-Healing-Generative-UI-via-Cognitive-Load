# AuraGen Interface Contracts — v0.1 (draft)

Owner: Member-01 (Team Lead). These are the shared message formats between the frontend, backend, AI layer and tests. **Do not change a contract without telling the members who depend on it.** Every change bumps the version at the top of this file.

All timestamps are milliseconds since epoch. All IDs are strings.

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
    "values": { "field-name": "Asha Rao" },
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
  "meta": { "model": "TBD (mentor approval)", "latencyMs": 1430, "cacheHit": false, "promptVersion": "p-0.1" }
}
```

`status` is one of `ok`, `rejected` (the validator failed; `violations` lists the reasons) or `error` (timeout or LLM failure).

## 5. UI push (backend → frontend, WebSocket)

```json
{ "type": "ui.generated", "sessionId": "s_8f2c", "componentId": "gen_3a91", "targetFieldId": "field-pan", "compiled": "...", "initialValues": { "field-name": "Asha Rao" } }
```

```json
{ "type": "ui.fallback", "sessionId": "s_8f2c", "targetFieldId": "field-pan", "reason": "rejected" }
```

When the frontend receives `ui.fallback`, it shows the **pre-built** static wizard for that field.

## 6. Generated-component rules (enforced by the AST validator)

Every generated component must:

- Be a single default-exported function component that takes `{ values, onChange, onSubmit }` as props.
- Use **only** these components (injected into scope by the renderer):
  `Wizard, WizardStep, TextField, NumberField, SelectField, DateField, Checkbox, Button, HelpText, ProgressBar, Card, Stack`
- Use **only** these React APIs: `useState`, `useMemo`.
- Use Tailwind utility classes in `className` strings only (literal strings, no template expressions).

The validator **rejects** any code that contains:

- `import` or `require`, or any dynamic `import()`
- The identifiers `window`, `document`, `globalThis`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket`, `eval`, `Function`, `setTimeout`, `setInterval`, `process`
- `dangerouslySetInnerHTML`, `ref`, or `on*` handlers other than ones that call `onChange` or `onSubmit`
- Raw HTML elements other than `div, span, p, h2, h3, ul, li, label`
- Member access on anything that isn't a prop or a local variable
- Source over 8 KB, or a parse error

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
