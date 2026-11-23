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
 *
 * Third line of defence: every read with a runtime key, such as values[field.id] or STEPS[step],
 * is compiled to a call to a small helper that returns only the object's own properties.
 * Inherited members such as "constructor" come back as undefined, so a key built at runtime
 * ("constr" + "uctor") cannot reach Object or Function. The helper is defined inside the
 * compiled body, so the renderer needs no extra parameter.
 */

const babel = require("@babel/core");
const { validate } = require("./astValidator");
const ds = require("../designSystem");
const { RUNTIME_PARAMS, SHADOWED_GLOBALS } = require("../runtime/params");

const OWN = `${ds.RESERVED_PREFIX}Own`;
const HAS = `${ds.RESERVED_PREFIX}Has`;

// The key is converted to a string once, so a key object whose toString() changes between
// calls cannot pass the own-property check with one name and then be read with another.
const OWN_HELPER = [
  `const ${HAS} = {}.hasOwnProperty;`,
  `const ${OWN} = (o, k) => {`,
  "  const key = typeof k === \"number\" ? k : `${k}`;",
  `  return o !== null && o !== undefined && ${HAS}.call(o, key) ? o[key] : undefined;`,
  "};",
  "",
].join("\n");

const isLiteralKey = (n) => n.type === "StringLiteral" || n.type === "NumericLiteral";

// obj[runtimeKey] -> __auragenOwn(obj, runtimeKey). Writes never get here: the validator rejects them.
function guardComputedReads({ types: t }) {
  const visit = (path) => {
    const { node } = path;
    if (!node.computed || isLiteralKey(node.property)) return;
    path.replaceWith(t.callExpression(t.identifier(OWN), [node.object, node.property]));
  };
  return { visitor: { MemberExpression: { exit: visit }, OptionalMemberExpression: { exit: visit } } };
}

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
    plugins: [guardComputedReads, exportToReturn],
    comments: false,
    compact: false,
  });

  return {
    ok: true,
    compiled: `"use strict";\n${OWN_HELPER}${result.code}`,
    componentName: validation.componentName,
    validation,
  };
}

module.exports = { compileComponent, RUNTIME_PARAMS, SHADOWED_GLOBALS };
