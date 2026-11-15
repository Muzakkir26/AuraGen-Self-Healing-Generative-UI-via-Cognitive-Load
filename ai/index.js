"use strict";

const designSystem = require("./designSystem");
const { validate } = require("./validator/astValidator");
const { compileComponent, RUNTIME_PARAMS, SHADOWED_GLOBALS } = require("./validator/compile");

module.exports = { designSystem, validate, compileComponent, RUNTIME_PARAMS, SHADOWED_GLOBALS };
