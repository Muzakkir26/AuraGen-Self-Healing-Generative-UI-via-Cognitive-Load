"use strict";

/**
 * AST safety validator for LLM-generated React components (contracts §6).
 *
 * The model's output is untrusted. This module parses it with Babel and walks the
 * syntax tree, collecting every rule violation instead of stopping at the first one,
 * so the Code-Gen Agent can send the full list back to the LLM for a repair attempt.
 *
 * validate(source) -> { passed: boolean, violations: Violation[], componentName: string|null }
 * Violation = { rule: string, message: string, line: number|null }
 */

const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const ds = require("../designSystem");

const COMPONENTS = new Set(ds.COMPONENT_NAMES);
const HTML = new Set(ds.ALLOWED_HTML_ELEMENTS);
const HOOKS = new Set(ds.ALLOWED_HOOKS);
const BANNED_IDS = new Set(ds.BANNED_IDENTIFIERS);
const BANNED_PROPS = new Set(ds.BANNED_PROPERTIES);
const BANNED_ATTRS = new Set(ds.BANNED_ATTRIBUTES);
const FREE_NAMES = new Set([...ds.ALLOWED_GLOBALS, ...ds.COMPONENT_NAMES, ...ds.ALLOWED_HOOKS]);

// Computed (runtime-key) reads are allowed only on the `values` prop, e.g. values[field.id],
// and on local consts initialised with an array/object literal, e.g. STEPS[step].
const COMPUTED_ACCESS_ROOTS = new Set(["values"]);

function allowsComputedAccess(scope, obj) {
  if (obj.type !== "Identifier") return false;
  if (COMPUTED_ACCESS_ROOTS.has(obj.name)) return true;
  const binding = scope.getBinding(obj.name);
  if (!binding || binding.kind !== "const" || !binding.path.isVariableDeclarator()) return false;
  const init = binding.path.node.init;
  return !!init && (init.type === "ArrayExpression" || init.type === "ObjectExpression");
}

function lineOf(node) {
  return node && node.loc ? node.loc.start.line : null;
}

function rootIdentifier(node) {
  let cur = node;
  while (cur && (cur.type === "MemberExpression" || cur.type === "OptionalMemberExpression")) {
    cur = cur.object;
  }
  return cur;
}

function propertyName(member) {
  const p = member.property;
  if (!member.computed && p.type === "Identifier") return p.name;
  if (p.type === "StringLiteral") return p.value;
  return null;
}

// Static name of an object/pattern key: { a: 1 }, { "a": 1 }, { ["a"]: 1 }. null for a runtime key.
function keyName(node) {
  const k = node.key;
  if (!node.computed && k.type === "Identifier") return k.name;
  if (k.type === "StringLiteral") return k.value;
  return null;
}

// True when a member expression is being written to: a.b = 1, a.b++, delete a.b, or a
// destructuring target such as ({ x: a.b } = obj) and [a.b] = arr.
function isWriteTarget(p) {
  const node = p.node;
  const parent = p.parent;
  switch (parent.type) {
    case "AssignmentExpression": return parent.left === node;
    case "UpdateExpression": return true;
    case "UnaryExpression": return parent.operator === "delete";
    case "ArrayPattern":
    case "RestElement": return true;
    case "AssignmentPattern": return parent.left === node;
    case "ObjectProperty": return parent.value === node && p.parentPath.parent.type === "ObjectPattern";
    default: return false;
  }
}

function validate(source) {
  const violations = [];
  const add = (rule, message, node) => violations.push({ rule, message, line: lineOf(node) });

  if (typeof source !== "string" || source.trim() === "") {
    add("empty", "Source is empty or not a string.", null);
    return { passed: false, violations, componentName: null };
  }

  const bytes = Buffer.byteLength(source, "utf8");
  if (bytes > ds.MAX_SOURCE_BYTES) {
    add("size", `Source is ${bytes} bytes; the limit is ${ds.MAX_SOURCE_BYTES}.`, null);
    return { passed: false, violations, componentName: null };
  }

  let ast;
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  } catch (err) {
    violations.push({ rule: "parse", message: `Parse error: ${err.message}`, line: err.loc ? err.loc.line : null });
    return { passed: false, violations, componentName: null };
  }

  // ---- Top-level shape: one default-exported function component, plus optional const declarations.
  let componentName = null;
  let defaultExports = 0;
  for (const stmt of ast.program.body) {
    if (stmt.type === "ExportDefaultDeclaration") {
      defaultExports += 1;
      const decl = stmt.declaration;
      if (decl.type !== "FunctionDeclaration" || !decl.id) {
        add("shape", "The default export must be a named function declaration.", stmt);
        continue;
      }
      componentName = decl.id.name;
      if (!/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
        add("shape", `Component name "${componentName}" must be PascalCase.`, decl);
      }
      if (decl.async || decl.generator) add("shape", "The component must not be async or a generator.", decl);
      checkPropsSignature(decl, add);
    } else if (stmt.type === "VariableDeclaration" && stmt.kind === "const") {
      // Allowed: top-level constants such as a list of steps.
    } else if (stmt.type === "ImportDeclaration") {
      add("import", "import statements are not allowed; approved components are injected into scope.", stmt);
    } else {
      add("shape", `Top-level ${stmt.type} is not allowed. Only const declarations and one default-exported function.`, stmt);
    }
  }
  if (defaultExports !== 1) {
    add("shape", `Expected exactly one default export, found ${defaultExports}.`, null);
  }

  // ---- Deep walk.
  traverse(ast, {
    // Forbidden syntax
    ImportExpression(p) { add("import", "Dynamic import() is not allowed.", p.node); },
    Import(p) { add("import", "Dynamic import() is not allowed.", p.node); },
    ExportNamedDeclaration(p) { add("shape", "Named exports are not allowed.", p.node); },
    ExportAllDeclaration(p) { add("shape", "export * is not allowed.", p.node); },
    ThisExpression(p) { add("syntax", "`this` is not allowed.", p.node); },
    NewExpression(p) { add("syntax", "`new` is not allowed.", p.node); },
    DebuggerStatement(p) { add("syntax", "`debugger` is not allowed.", p.node); },
    WhileStatement(p) { add("loop", "while loops are not allowed; use array .map().", p.node); },
    DoWhileStatement(p) { add("loop", "do/while loops are not allowed; use array .map().", p.node); },
    ForStatement(p) { add("loop", "for loops are not allowed; use array .map().", p.node); },
    ForInStatement(p) { add("loop", "for/in loops are not allowed; use array .map().", p.node); },
    ForOfStatement(p) { add("loop", "for/of loops are not allowed; use array .map().", p.node); },
    TaggedTemplateExpression(p) { add("syntax", "Tagged templates are not allowed.", p.node); },
    AwaitExpression(p) { add("syntax", "await is not allowed.", p.node); },
    "ClassDeclaration|ClassExpression"(p) { add("syntax", "Classes are not allowed.", p.node); },
    "FunctionExpression|ArrowFunctionExpression|FunctionDeclaration"(p) {
      if (p.node.async || p.node.generator) add("syntax", "Async and generator functions are not allowed.", p.node);
    },

    // Object keys, including destructuring patterns: { constructor: F } = fn is the same escape as fn.constructor.
    ObjectProperty(p) {
      const name = keyName(p.node);
      if (name !== null && BANNED_PROPS.has(name)) {
        add("banned-property", `The key "${name}" is not allowed.`, p.node);
      } else if (name === null && p.parent.type === "ObjectPattern") {
        add("computed-access", "Destructuring with a computed key is not allowed.", p.node);
      }
    },
    ObjectMethod(p) {
      if (p.node.kind === "get" || p.node.kind === "set") add("syntax", "Getters and setters are not allowed.", p.node);
      const name = keyName(p.node);
      if (name !== null && BANNED_PROPS.has(name)) add("banned-property", `The key "${name}" is not allowed.`, p.node);
    },

    Identifier(p) {
      const name = p.node.name;
      if (name.startsWith(ds.RESERVED_PREFIX)) {
        add("reserved", `Names starting with "${ds.RESERVED_PREFIX}" are reserved.`, p.node);
        return;
      }
      // Free names (not a prop or local variable) must be on the allow-list.
      if (!BANNED_IDS.has(name) && p.isReferencedIdentifier() && !p.scope.getBinding(name) && !FREE_NAMES.has(name)) {
        add("unknown-global", `"${name}" is not defined here; only props, local variables, approved components and ${ds.ALLOWED_GLOBALS.join(", ")} may be used.`, p.node);
        return;
      }
      // Banned globals, wherever they appear as a real identifier (not as an object key or a.b property).
      if (!BANNED_IDS.has(name)) return;
      const parent = p.parent;
      const isPropertyKey =
        ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && parent.property === p.node && !parent.computed) ||
        (parent.type === "ObjectProperty" && parent.key === p.node && !parent.computed);
      if (!isPropertyKey) add("banned-identifier", `"${name}" is not allowed.`, p.node);
    },

    // Property access rules
    "MemberExpression|OptionalMemberExpression"(p) {
      const node = p.node;
      if (isWriteTarget(p)) {
        add("mutation", "Writing to a property is not allowed; call onChange(fieldId, value) or a useState setter.", node);
      }
      const name = propertyName(node);
      if (name && BANNED_PROPS.has(name)) {
        add("banned-property", `Access to ".${name}" is not allowed.`, node);
      }

      // Only check the root once, from the outermost member expression of a chain.
      const isInner = (p.parent.type === "MemberExpression" || p.parent.type === "OptionalMemberExpression") && p.parent.object === node;

      if (node.computed && node.property.type !== "StringLiteral" && node.property.type !== "NumericLiteral") {
        const obj = node.object;
        if (!allowsComputedAccess(p.scope, obj)) {
          add("computed-access", "Computed access with a runtime key is only allowed on `values` or a local const array/object literal.", node);
        } else if ((p.parent.type === "CallExpression" || p.parent.type === "OptionalCallExpression") && p.parent.callee === node) {
          add("computed-access", "Calling a value read with a computed key is not allowed.", node);
        }
      }

      if (isInner) return;
      const root = rootIdentifier(node);
      if (root.type === "Identifier") {
        if (!p.scope.getBinding(root.name)) {
          add("member-access", `Member access on "${root.name}" is not allowed; it is not a prop or a local variable.`, node);
        }
      } else if (!["CallExpression", "OptionalCallExpression", "ArrayExpression", "StringLiteral", "TemplateLiteral", "RegExpLiteral"].includes(root.type)) {
        add("member-access", `Member access on a ${root.type} is not allowed.`, node);
      }
    },

    // Hooks: only the approved ones, and only as bare calls.
    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type === "Identifier" && /^use[A-Z]/.test(callee.name) && !HOOKS.has(callee.name)) {
        add("hook", `Hook "${callee.name}" is not allowed; only ${ds.ALLOWED_HOOKS.join(", ")}.`, p.node);
      }
    },

    // JSX element names
    JSXOpeningElement(p) {
      const nameNode = p.node.name;
      if (nameNode.type !== "JSXIdentifier") {
        add("jsx-element", "Namespaced and member-expression JSX tags are not allowed.", p.node);
        return;
      }
      const tag = nameNode.name;
      const isComponent = /^[A-Z]/.test(tag);
      if (isComponent && !COMPONENTS.has(tag)) {
        add("jsx-element", `<${tag}> is not in the approved component library.`, p.node);
      } else if (!isComponent && !HTML.has(tag)) {
        add("jsx-element", `<${tag}> is not an allowed HTML element.`, p.node);
      }

      for (const attr of p.node.attributes) {
        if (attr.type === "JSXSpreadAttribute") {
          add("jsx-attribute", "Spread attributes ({...x}) are not allowed.", attr);
          continue;
        }
        if (attr.name.type !== "JSXIdentifier") {
          add("jsx-attribute", "Namespaced attributes are not allowed.", attr);
          continue;
        }
        const an = attr.name.name;
        if (BANNED_ATTRS.has(an)) {
          add("jsx-attribute", `The "${an}" attribute is not allowed.`, attr);
          continue;
        }
        if (/^on[A-Z]/.test(an)) {
          if (!isComponent) {
            add("event-handler", `Event handlers on raw <${tag}> elements are not allowed; use an approved component.`, attr);
            continue;
          }
          const v = attr.value;
          const expr = v && v.type === "JSXExpressionContainer" ? v.expression : null;
          if (!expr || !["Identifier", "ArrowFunctionExpression", "FunctionExpression"].includes(expr.type)) {
            add("event-handler", `${an} must be a function or a prop reference.`, attr);
          }
        }
        if (an === "className") {
          const v = attr.value;
          const ok =
            (v && v.type === "StringLiteral") ||
            (v && v.type === "JSXExpressionContainer" && v.expression.type === "StringLiteral");
          if (!ok) add("class-name", "className must be a literal string of Tailwind classes.", attr);
        }
      }
    },
  });

  // De-duplicate identical findings (the same node can be visited through aliases).
  const seen = new Set();
  const unique = violations.filter((v) => {
    const key = `${v.rule}|${v.line}|${v.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { passed: unique.length === 0, violations: unique, componentName };
}

function checkPropsSignature(fn, add) {
  if (fn.params.length > 1) {
    add("props", "The component must take a single props object.", fn);
    return;
  }
  const param = fn.params[0];
  if (!param) return; // No props is legal, if unusual.
  if (param.type !== "ObjectPattern") {
    add("props", "Props must be destructured, e.g. function X({ values, onChange, onSubmit }).", param);
    return;
  }
  for (const prop of param.properties) {
    const key = prop.type === "ObjectProperty" && prop.key.type === "Identifier" ? prop.key.name : null;
    if (!key || !ds.COMPONENT_PROPS.includes(key)) {
      add("props", `Unexpected prop; only ${ds.COMPONENT_PROPS.join(", ")} are passed in.`, prop);
    }
  }
}

module.exports = { validate };
