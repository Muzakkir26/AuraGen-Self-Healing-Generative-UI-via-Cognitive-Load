"use strict";

/**
 * Prompt builder for the Code-Gen Agent.
 *
 * Turns a generation request (contracts §3) into a system + user prompt that teaches the
 * LLM our design system and asks for one safe, pre-styled React component.
 *
 * Privacy: what the user typed is NEVER put in the prompt. The LLM only learns whether each
 * field is filled or empty (ticked or not ticked, for a checkbox). The real values reach the
 * generated component at runtime through the `values` prop, so typed data is preserved without
 * ever leaving our server.
 */

const fs = require("node:fs");
const path = require("node:path");
const ds = require("../designSystem");

const PROMPT_VERSION = "p-0.3";
const MAX_TEXT = 200; // Cap on any schema string we copy into the prompt.

const FEW_SHOT_EXAMPLE = fs.readFileSync(path.join(__dirname, "..", "examples", "PanWizard.jsx"), "utf8").trim();

// Schema text comes from our own form definition, but we still sanitise it so a label can't
// close the code fence or smuggle instructions in through very long text.
function clean(text) {
  if (text === undefined || text === null) return "";
  return String(text).replace(/`/g, "'").replace(/[\r\n]+/g, " ").trim().slice(0, MAX_TEXT);
}

function componentTable() {
  return Object.entries(ds.COMPONENTS)
    .map(([name, props]) => `- ${name}: ${props.join(", ")}`)
    .join("\n");
}

function buildSystemPrompt() {
  return `You are AuraGen's UI generator. A user is struggling with one field of a complex form.
Write ONE small React component that walks them through it as a friendly step-by-step wizard.

OUTPUT FORMAT
- Reply with a single \`\`\`jsx code block and nothing else.
- The code must be: optional top-level \`const\` declarations, then exactly one
  \`export default function <PascalCaseName>({ values, onChange, onSubmit })\`.

PROPS YOU RECEIVE
- values: object of current form values keyed by field id. Read with values["field-id"].
- onChange(fieldId, newValue): call it to update a field. Always use this; never keep a field's value only in local state.
- onSubmit(): call it when the user finishes.

COMPONENTS (already in scope, do not import them; optional props end with ?)
${componentTable()}

ALSO ALLOWED
- Raw elements: ${ds.ALLOWED_HTML_ELEMENTS.join(", ")} (no event handlers on these).
- Hooks: ${ds.ALLOWED_HOOKS.join(", ")} (called directly, not as React.useState).
- className must be a plain string literal of Tailwind classes, e.g. className="p-4 gap-3".
- Event handlers go only on the components above, as a function: onClick={() => setStep(1)}.
- Index with a variable only on values or on your own top-level const array/object (e.g. STEPS[step]).

FORBIDDEN (the code is rejected automatically if it contains any of these)
- import, require, export other than the single default export.
- These names: ${ds.BANNED_IDENTIFIERS.join(", ")}.
- Accessing ${ds.BANNED_PROPERTIES.slice(0, 3).join(", ")} (also as object or destructuring keys), or any global object such as Math, JSON, Object, Date, React. The only globals you may use are ${ds.ALLOWED_GLOBALS.join(", ")}.
- Writing to properties (values.x = 1, delete values.x). Change values only with onChange or a useState setter.
- The attributes ${ds.BANNED_ATTRIBUTES.join(", ")}, and spread attributes {...x}.
- Loops (for, while), new, this, async/await, classes, getters/setters, other hooks, other HTML tags, other components.
- More than ${ds.MAX_SOURCE_BYTES} bytes of code.

STYLE
- 2 to 4 short steps. Plain, calm language. Explain the format with an example.
- Show a ProgressBar. Give Back and Next/Done Buttons.
- Use the field id from the request in TextField/NumberField/etc. and in onChange.

EXAMPLE OF A CORRECT ANSWER
\`\`\`jsx
${FEW_SHOT_EXAMPLE}
\`\`\``;
}

function describeSignals(signals = {}) {
  const parts = [];
  if (signals.rageClicks) parts.push(`clicked repeatedly in frustration ${signals.rageClicks} time(s)`);
  if (signals.hesitationMs) parts.push(`hesitated for about ${Math.round(signals.hesitationMs / 1000)} s`);
  if (signals.errorRate) parts.push(`hit validation errors on ${Math.round(signals.errorRate * 100)}% of attempts`);
  if (signals.cursorVelocityVariance) parts.push(`moved the cursor erratically (variance ${Number(signals.cursorVelocityVariance).toFixed(2)})`);
  return parts.length ? parts.join("; ") : "showed signs of confusion";
}

// A checkbox value can arrive as a boolean or as text ("true" / "false" from the form), and the
// text "false" is non-empty, so checkboxes get their own status instead of filled/empty.
const TICKED = ["true", "on", "1", "yes"];

function fieldStatus(field, v) {
  if (field.type === "checkbox") {
    const ticked = v === true || (typeof v === "string" && TICKED.includes(v.trim().toLowerCase()));
    return ticked ? "ticked" : "not ticked";
  }
  return v !== undefined && v !== null && String(v) !== "" ? "filled" : "empty";
}

function describeField(field, formState) {
  const values = (formState && formState.values) || {};
  const errors = (formState && formState.errors) || {};
  const lines = [
    `- id: ${clean(field.id)}`,
    `  label: ${clean(field.label)}`,
    `  type: ${clean(field.type || "text")}${field.required ? " (required)" : ""}`,
  ];
  if (field.pattern) lines.push(`  pattern: ${clean(field.pattern)}`);
  if (field.options) lines.push(`  options: ${clean(JSON.stringify(field.options))}`);
  if (field.help) lines.push(`  help: ${clean(field.help)}`);
  lines.push(`  currently: ${fieldStatus(field, values[field.id])}${errors[field.id] ? `, error "${clean(errors[field.id])}"` : ""}`);
  return lines.join("\n");
}

/**
 * Checks a generation request (contracts §3) and returns the friction field.
 * Throws a clear error for anything the backend should never send.
 */
function checkRequest(request) {
  if (!request || typeof request !== "object") throw new TypeError("Generation request must be an object.");
  const fp = request.frictionPoint;
  if (!fp || typeof fp.fieldId !== "string" || !fp.fieldId) throw new TypeError("frictionPoint.fieldId is required.");
  const fields = request.formSchema && Array.isArray(request.formSchema.fields) ? request.formSchema.fields : null;
  if (!fields || fields.length === 0) throw new TypeError("formSchema.fields must be a non-empty array.");
  const target = fields.find((f) => f && f.id === fp.fieldId);
  if (!target) throw new RangeError(`Friction field "${fp.fieldId}" is not in formSchema.fields.`);
  if (request.designSystemVersion && request.designSystemVersion !== ds.DESIGN_SYSTEM_VERSION) {
    throw new RangeError(`Design system ${request.designSystemVersion} is not supported; expected ${ds.DESIGN_SYSTEM_VERSION}.`);
  }
  return { target, fields };
}

function buildUserPrompt(request) {
  const { target, fields } = checkRequest(request);
  const related = fields.filter((f) => f.id !== target.id && f.group && f.group === target.group);

  let text = `The user is stuck on this field. In the last few seconds they ${describeSignals(request.frictionPoint.signals)}.

STUCK FIELD
${describeField(target, request.formState)}`;

  if (related.length) {
    text += `\n\nRELATED FIELDS IN THE SAME SECTION (you may include them as extra steps)\n${related.map((f) => describeField(f, request.formState)).join("\n")}`;
  }

  text += `\n\nWrite the wizard component for "${clean(target.label)}" now.`;
  return text;
}

/** Builds the full prompt. Same request in, same prompt out, so it can be used as a cache key later. */
function buildPrompt(request) {
  return {
    promptVersion: PROMPT_VERSION,
    designSystemVersion: ds.DESIGN_SYSTEM_VERSION,
    system: buildSystemPrompt(),
    user: buildUserPrompt(request),
  };
}

/** Follow-up message for one repair attempt after the validator rejects the first answer. */
function buildRepairPrompt(violations) {
  const list = (violations || []).map((v) => `- ${v.line ? `line ${v.line}: ` : ""}${v.message}`).join("\n");
  return `Your component was rejected by the safety validator:\n${list}\n\nFix every problem and reply with the complete corrected component in a single \`\`\`jsx code block.`;
}

/**
 * Pulls the component source out of an LLM reply.
 * Prefers a fenced jsx/js/tsx block; falls back to the whole reply if it already looks like code.
 * Returns null when there is no code at all.
 */
function extractCode(reply) {
  if (typeof reply !== "string") return null;
  // Match every fence pair whatever its language tag, so a ```bash block can't be mistaken for code.
  const fences = [...reply.matchAll(/```[ \t]*([\w+-]*)[ \t]*\r?\n([\s\S]*?)```/g)];
  const codeLike = fences.filter((m) => !m[1] || /^(jsx|javascript|js|tsx|react)$/i.test(m[1]));
  const chosen = codeLike.find((m) => /export\s+default/.test(m[2])) || codeLike[0];
  if (chosen) return chosen[2].trim();
  if (/export\s+default\s+function/.test(reply)) return reply.trim();
  return null;
}

module.exports = { PROMPT_VERSION, buildPrompt, buildSystemPrompt, buildUserPrompt, buildRepairPrompt, extractCode, checkRequest };
