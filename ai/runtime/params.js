"use strict";

/**
 * Parameter list for running compiled components.
 *
 * Kept apart from validator/compile.js so the browser can use it without pulling in Babel.
 * Depends only on designSystem.js, which is plain data.
 */

const ds = require("../designSystem");

// "eval" and "arguments" cannot be parameter names in strict mode; the validator rejects them by name.
const NOT_PARAMS = new Set(["eval", "arguments"]);
const SHADOWED_GLOBALS = ds.BANNED_IDENTIFIERS.filter((n) => !NOT_PARAMS.has(n));

const RUNTIME_PARAMS = ["React", ...ds.ALLOWED_HOOKS, ...ds.COMPONENT_NAMES, ...SHADOWED_GLOBALS];

module.exports = { RUNTIME_PARAMS, SHADOWED_GLOBALS };
