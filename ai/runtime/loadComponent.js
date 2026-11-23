"use strict";

/**
 * Reference runtime for the Dynamic Renderer: `ui.generated` message → React component + starting values.
 *
 * No Node or Babel dependencies, so the frontend can import it as-is or copy it.
 *
 *   const Generated = loadGeneratedComponent(msg.compiled, { React, useState, useMemo, ...approvedComponents });
 *   const [values, setValues] = useState(() => startingValues(msg, currentFormValues));
 *   <Generated values={values} onChange={(id, v) => setValues(applyChange(values, id, v))} onSubmit={...} />
 */

const ds = require("../designSystem");
const { RUNTIME_PARAMS, SHADOWED_GLOBALS } = require("./params");

const REQUIRED_SCOPE = ["React", ...ds.ALLOWED_HOOKS, ...ds.COMPONENT_NAMES];
const SHADOWED = new Set(SHADOWED_GLOBALS);

class RuntimeLoadError extends Error {
  constructor(message) {
    super(message);
    this.name = "RuntimeLoadError";
  }
}

/**
 * Builds the component from a compiled function body.
 * Throws RuntimeLoadError when the scope is incomplete or the code does not return a function,
 * so the caller can show the static fallback wizard instead.
 * Every shadowed global is passed as undefined, even if the scope happens to contain it.
 */
function loadGeneratedComponent(compiled, scope) {
  if (typeof compiled !== "string" || compiled.trim() === "") {
    throw new RuntimeLoadError("compiled must be a non-empty string.");
  }
  if (!scope || typeof scope !== "object") throw new RuntimeLoadError("scope must be an object.");

  const missing = REQUIRED_SCOPE.filter((name) => scope[name] === undefined);
  if (missing.length) throw new RuntimeLoadError(`scope is missing: ${missing.join(", ")}`);

  let Component;
  try {
    const factory = new Function(...RUNTIME_PARAMS, compiled);
    Component = factory(...RUNTIME_PARAMS.map((name) => (SHADOWED.has(name) ? undefined : scope[name])));
  } catch (err) {
    throw new RuntimeLoadError(`compiled code failed to load: ${err.message}`);
  }
  if (typeof Component !== "function") throw new RuntimeLoadError("compiled code did not return a component.");
  return Component;
}

const isEmpty = (v) => v === undefined || v === null || v === "";

/**
 * Values the generated component starts with, so nothing the user typed is lost in the swap.
 * The browser's current values win (they are newer than what the server saw); the server's
 * `initialValues` fill only fields that are empty on the page.
 */
function startingValues(uiMessage, currentValues) {
  const fromServer = (uiMessage && uiMessage.initialValues) || {};
  const current = currentValues || {};
  const out = {};
  for (const key of new Set([...Object.keys(fromServer), ...Object.keys(current)])) {
    out[key] = isEmpty(current[key]) ? fromServer[key] : current[key];
  }
  return out;
}

/** Immutable update for the `onChange(fieldId, value)` prop. */
function applyChange(values, fieldId, value) {
  return { ...(values || {}), [fieldId]: value };
}

module.exports = { loadGeneratedComponent, startingValues, applyChange, RuntimeLoadError, REQUIRED_SCOPE };
