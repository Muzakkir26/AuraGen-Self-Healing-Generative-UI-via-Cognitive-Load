"use strict";

/**
 * Design system ds-0.1: the single source of truth for what generated code may use.
 * Mirrors docs/contracts.md sections 6 and 7. The AST validator enforces it and
 * the prompt builder feeds the same data to the LLM, so the two can never drift.
 */

const DESIGN_SYSTEM_VERSION = "ds-0.1";

// Approved components and their props (contracts §7). A trailing "?" marks an optional prop.
const COMPONENTS = {
  Wizard: ["onSubmit", "children"],
  WizardStep: ["title", "description?", "children"],
  TextField: ["id", "label", "value", "onChange", "placeholder?", "help?", "error?"],
  NumberField: ["id", "label", "value", "onChange", "min?", "max?", "help?"],
  SelectField: ["id", "label", "value", "onChange", "options"],
  DateField: ["id", "label", "value", "onChange"],
  Checkbox: ["id", "label", "checked", "onChange"],
  Button: ["variant", "onClick", "children"],
  HelpText: ["children"],
  ProgressBar: ["current", "total"],
  Card: ["className?", "children"],
  Stack: ["className?", "children"],
};

const COMPONENT_NAMES = Object.keys(COMPONENTS);

// Raw HTML elements generated code may render.
const ALLOWED_HTML_ELEMENTS = ["div", "span", "p", "h2", "h3", "ul", "li", "label"];

// React APIs generated code may call.
const ALLOWED_HOOKS = ["useState", "useMemo"];

// Props every generated component receives.
const COMPONENT_PROPS = ["values", "onChange", "onSubmit"];

// Identifiers that must never appear in generated code.
const BANNED_IDENTIFIERS = [
  "window", "document", "globalThis", "self", "top", "parent", "frames",
  "localStorage", "sessionStorage", "indexedDB", "navigator", "location",
  "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "Worker",
  "eval", "Function", "setTimeout", "setInterval", "setImmediate",
  "requestAnimationFrame", "queueMicrotask", "process", "require", "module",
  "exports", "global", "Reflect", "Proxy", "importScripts",
];

// Property names that open prototype-chain escapes (e.g. x.constructor.constructor("...")).
const BANNED_PROPERTIES = [
  "constructor", "prototype", "__proto__", "__defineGetter__", "__defineSetter__",
  "__lookupGetter__", "__lookupSetter__", "caller", "callee", "arguments",
];

// JSX attributes that are never allowed.
const BANNED_ATTRIBUTES = ["dangerouslySetInnerHTML", "ref", "style", "srcDoc", "href", "src", "action", "formAction"];

const MAX_SOURCE_BYTES = 8 * 1024;

module.exports = {
  DESIGN_SYSTEM_VERSION,
  COMPONENTS,
  COMPONENT_NAMES,
  ALLOWED_HTML_ELEMENTS,
  ALLOWED_HOOKS,
  COMPONENT_PROPS,
  BANNED_IDENTIFIERS,
  BANNED_PROPERTIES,
  BANNED_ATTRIBUTES,
  MAX_SOURCE_BYTES,
};
