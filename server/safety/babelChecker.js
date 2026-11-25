const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Blocklists for AST security inspection
const BLOCKED_CALLS = new Set([
  "eval",
  "Function",
  "fetch",
  "setTimeout",
  "setInterval"
]);

const BLOCKED_GLOBALS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "cookie"
]);

const BLOCKED_PROPERTIES = new Set([
  "cookie",
  "innerHTML",
  "outerHTML",
  "dangerouslySetInnerHTML"
]);

/**
 * Parses raw code into an Abstract Syntax Tree (AST) and scans for security threats.
 * Catches syntax errors, malicious scripts, unauthorized DOM access, and credential theft.
 */
function validateCodeSafety(codeString) {
  if (typeof codeString !== "string" || codeString.trim().length === 0) {
    return {
      isSafe: false,
      errors: ["Code payload must be a non-empty string."]
    };
  }

  let ast;
  try {
    // Parse code into AST with JSX support
    ast = parser.parse(codeString, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });
  } catch (syntaxError) {
    return {
      isSafe: false,
      errors: [`Syntax Error in generated code: ${syntaxError.message}`]
    };
  }

  const securityViolations = [];

  // Traverse AST to detect dangerous patterns
  traverse(ast, {
    // 1. Detect dangerous function calls like eval() or fetch()
    CallExpression(path) {
      const callee = path.node.callee;

      if (callee.type === "Identifier" && BLOCKED_CALLS.has(callee.name)) {
        securityViolations.push(`Blocked function call: "${callee.name}()"`);
      }

      // Detect window.eval or document.write calls
      if (callee.type === "MemberExpression") {
        const propertyName = callee.property.name || callee.property.value;
        if (BLOCKED_CALLS.has(propertyName) || propertyName === "write") {
          securityViolations.push(`Blocked method invocation: ".${propertyName}()"`);
        }
      }
    },

    // 2. Detect unauthorized global object access like window or localStorage
    Identifier(path) {
      const name = path.node.name;
      // Ensure we only check standalone global references, not object property keys
      if (BLOCKED_GLOBALS.has(name) && path.isReferencedIdentifier()) {
        const parent = path.parent;
        // Avoid false positives on component props like window={...}
        if (parent.type !== "JSXAttribute") {
          securityViolations.push(`Unauthorized global variable access: "${name}"`);
        }
      }
    },

    // 3. Detect sensitive property access like document.cookie or innerHTML
    MemberExpression(path) {
      const propertyName = path.node.property.name || path.node.property.value;
      if (BLOCKED_PROPERTIES.has(propertyName)) {
        securityViolations.push(`Prohibited property access: ".${propertyName}"`);
      }
    },

    // 4. Block raw <script> or <iframe> tags in JSX
    JSXElement(path) {
      const elementName = path.node.openingElement.name.name;
      if (elementName === "script" || elementName === "iframe" || elementName === "object") {
        securityViolations.push(`Prohibited HTML/JSX element: "<${elementName}>"`);
      }
    }
  });

  return {
    isSafe: securityViolations.length === 0,
    errors: securityViolations,
    code: securityViolations.length === 0 ? codeString.trim() : null
  };
}

module.exports = {
  validateCodeSafety
};
