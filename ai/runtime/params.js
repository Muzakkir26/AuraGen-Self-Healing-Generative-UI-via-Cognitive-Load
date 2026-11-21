"use strict";

/**
 * Parameter list for running compiled components.
 *
 * Kept apart from validator/compile.js so the browser can use it without pulling in Babel.
 * Depends only on designSystem.js, which is plain data.
 */

const ds = require("../designSystem");

// "eval" cannot be a parameter name in strict mode, and the validator already rejects it by name.
const SHADOWED_GLOBALS = ds.BANNED_IDENTIFIERS.filter((n) => n !== "eval");

const RUNTIME_PARAMS = ["React", ...ds.ALLOWED_HOOKS, ...ds.COMPONENT_NAMES, ...SHADOWED_GLOBALS];

module.exports = { RUNTIME_PARAMS, SHADOWED_GLOBALS };
