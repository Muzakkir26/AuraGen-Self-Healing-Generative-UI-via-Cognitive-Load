"use strict";

/**
 * Compiles a validated component into a plain function body the browser can run
 * without a bundler.
 *
 * The output is meant for the Dynamic Renderer (Member-02), which builds it with:
 *
 *   const factory = new Function(...RUNTIME_PARAMS, compiled);
 *   const Component = factory(...RUNTIME_PARAMS.map(name => scope[name]));
 *
 * where scope supplies React, the hooks and the approved components, and leaves
 * every SHADOWED_GLOBALS name undefined. Shadowing is a second line of defence:
 * even if the validator missed a global, the compiled code cannot reach it by name.
 */

const babel = require("@babel/core");
const ds = require("../designSystem");
const { validate } = require("./astValidator");

const SHADOWED_GLOBALS = ds.BANNED_IDENTIFIERS.filter((n) => n !== "eval"); // "eval" cannot be a parameter name in strict mode.

const RUNTIME_PARAMS = ["React", ...ds.ALLOWED_HOOKS, ...ds.COMPONENT_NAMES, ...SHADOWED_GLOBALS];

// Turns `export default function X() {}` into `function X() {}` ... `return X;`
function exportToReturn({ types: t }) {
  return {
    visitor: {
      Program: {
        exit(path) {
          let name = null;
          for (const stmt of path.get("body")) {
            if (stmt.isExportDefaultDeclaration()) {
              const decl = stmt.node.declaration;
              name = decl.id.name;
              stmt.replaceWith(decl);
            }
          }
          if (name) path.pushContainer("body", t.returnStatement(t.identifier(name)));
        },
      },
    },
  };
}

/**
 * Validate, then compile. Never compiles code that failed validation.
 * Returns { ok, compiled, componentName, validation }.
 */
function compileComponent(source) {
  const validation = validate(source);
  if (!validation.passed) {
    return { ok: false, compiled: null, componentName: null, validation };
  }

  const result = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    sourceType: "module",
    parserOpts: { allowReturnOutsideFunction: true },
    presets: [[require.resolve("@babel/preset-react"), { runtime: "classic", pragma: "React.createElement", pragmaFrag: "React.Fragment" }]],
    plugins: [exportToReturn],
    comments: false,
    compact: false,
  });

  return {
    ok: true,
    compiled: `"use strict";\n${result.code}`,
    componentName: validation.componentName,
    validation,
  };
}

module.exports = { compileComponent, RUNTIME_PARAMS, SHADOWED_GLOBALS };
