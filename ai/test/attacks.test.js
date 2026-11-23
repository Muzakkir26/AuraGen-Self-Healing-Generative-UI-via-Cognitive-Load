"use strict";

// Sandbox-escape attempts against the validator + compiler + runtime.
// Each escape tries to reach Function (and through it the real global object) from generated code.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validate, compileComponent, designSystem } = require("..");
const { loadGeneratedComponent } = require("../runtime/loadComponent");

const wrap = (body, extraTop = "") =>
  `${extraTop}\nexport default function Gen({ values, onChange, onSubmit }) {\n${body}\n}`;

const rules = (src) => validate(src).violations.map((v) => v.rule);

// Minimal runtime: createElement builds plain objects so a test can read what was rendered.
const scope = {
  React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: "Fragment" },
  useState: (v) => [typeof v === "function" ? v() : v, () => {}],
  useMemo: (fn) => fn(),
};
for (const name of designSystem.COMPONENT_NAMES) scope[name] = name;

/** Compile, load and call the component. Returns the first child of the rendered <p>. */
function run(src, values = {}) {
  const out = compileComponent(src);
  assert.equal(out.ok, true, JSON.stringify(out.validation.violations));
  const Component = loadGeneratedComponent(out.compiled, scope);
  return Component({ values, onChange() {}, onSubmit() {} }).children[0];
}

test("destructuring cannot pull constructor (or other banned keys) out of a value", () => {
  const samples = [
    `const { constructor: F } = onSubmit; return <p/>;`,
    `const { constructor: { constructor: F } } = onSubmit; return <p/>;`,
    `const { constructor } = onSubmit; return <p/>;`,
    `const { "constructor": F } = onSubmit; return <p/>;`,
    `const { ["constructor"]: F } = onSubmit; return <p/>;`,
    `const { __proto__: P } = values; return <p/>;`,
    `const pick = ({ constructor: F }) => F; return <p/>;`,
    `const [{ constructor: F }] = [onSubmit]; return <p/>;`,
  ];
  for (const s of samples) assert.ok(rules(wrap(s)).includes("banned-property"), s);
});

test("destructuring with a runtime key is rejected", () => {
  assert.ok(rules(wrap(`const k = "a"; const { [k]: v } = values; return <p/>;`)).includes("computed-access"));
});

test("object literals cannot set banned keys such as __proto__", () => {
  assert.ok(rules(wrap(`const o = { __proto__: onSubmit }; return <p/>;`)).includes("banned-property"));
  assert.ok(rules(wrap(`const o = { constructor() { return 1; } }; return <p/>;`)).includes("banned-property"));
});

test("classes, getters and setters are rejected", () => {
  assert.ok(rules(wrap(`class A {} return <p/>;`)).includes("syntax"));
  assert.ok(rules(wrap(`const A = class {}; return <p/>;`)).includes("syntax"));
  assert.ok(rules(wrap(`const o = { get x() { return 1; } }; return <p/>;`)).includes("syntax"));
  assert.ok(rules(wrap(`const o = { set x(v) {} }; return <p/>;`)).includes("syntax"));
});

test("writing to properties is rejected, including through destructuring", () => {
  const samples = [
    `values.x = 1; return <p/>;`,
    `values["x"] += 1; return <p/>;`,
    `values.count++; return <p/>;`,
    `delete values.x; return <p/>;`,
    `const o = {}; ({ a: o.b } = values); return <p/>;`,
    `const o = {}; [o.b] = [1]; return <p/>;`,
    `const o = {}; [...o.rest] = [1]; return <p/>;`,
  ];
  for (const s of samples) assert.ok(rules(wrap(s)).includes("mutation"), s);
  // Plain local variables can still change.
  assert.equal(validate(wrap(`let n = 0; n = n + 1; return <p>{n}</p>;`)).passed, true);
});

test("globals outside the allow-list are rejected even when only held in a variable", () => {
  for (const name of ["Object", "Array", "Math", "JSON", "Symbol", "Promise", "Date", "Error", "React", "Intl", "WeakMap"]) {
    const r = rules(wrap(`const g = ${name}; return <p/>;`));
    assert.ok(r.includes("unknown-global"), `${name}: ${r}`);
  }
  // Props are not in scope at the top level, so they count as unknown there.
  assert.ok(rules(wrap("return <p/>;", "const leak = onSubmit;")).includes("unknown-global"));
});

test("allowed globals, components and hooks can be referenced", () => {
  const src = wrap(
    `const n = Number(values["field-income"]); const s = String(n); const ok = Boolean(s) && !(n !== n) && n !== Infinity && n !== undefined;
     const C = Card; const h = useState; return <p>{ok ? "yes" : "no"}</p>;`,
  );
  assert.equal(validate(src).passed, true, JSON.stringify(validate(src).violations));
});

test("arguments is rejected", () => {
  assert.ok(rules(wrap(`const f = function () { return arguments; }; return <p/>;`)).includes("banned-identifier"));
});

test("the compiler's reserved names cannot be declared or used", () => {
  assert.ok(rules(wrap(`const __auragenOwn = (o, k) => o[k]; return <p/>;`)).includes("reserved"));
  assert.ok(rules(wrap(`const f = __auragenHas; return <p/>;`)).includes("reserved"));
});

test("optional call of a runtime-key read is rejected like a normal call", () => {
  assert.ok(rules(wrap(`const k = "x"; values[k]?.(); return <p/>;`)).includes("computed-access"));
});

test("runtime keys read own properties only: inherited members come back undefined", () => {
  const src = wrap(`const k = "constr" + "uctor"; return <p>{typeof values[k]}</p>;`);
  assert.equal(validate(src).passed, true); // allowed by the validator: the runtime guard handles it
  assert.equal(run(src, { a: 1 }), "undefined");

  const viaLiteral = wrap(`const B = {}; const k = "__pro" + "to__"; return <p>{typeof B[k]}</p>;`);
  assert.equal(run(viaLiteral), "undefined");
});

test("a key whose toString() changes between calls cannot slip past the own-property check", () => {
  const src = wrap(
    `const [n] = useState(() => ({ c: 0 })); const k = { toString: () => (n.c++ % 2 === 0 ? "a" : "constructor") };
     return <p>{typeof values[k]}</p>;`,
  );
  // n.c++ is a write to a property, so the validator already refuses this.
  assert.ok(rules(src).includes("mutation"));

  const counterInClosure = wrap(
    `let c = 0; const k = { toString: () => { c = c + 1; return c === 1 ? "a" : "constructor"; } };
     return <p>{typeof values[k]}</p>;`,
  );
  assert.equal(validate(counterInClosure).passed, true);
  assert.equal(run(counterInClosure, { a: "x" }), "string"); // read once as "a", never as "constructor"
});

test("normal runtime-key reads still work: values, arrays, lengths and numeric indexes", () => {
  const src = wrap(
    `const id = "field-pan"; const i = 1; const parts = values[id].split(""); return <p>{values[id] + "|" + STEPS[i] + "|" + parts[0] + "|" + STEPS.length}</p>;`,
    `const STEPS = ["one", "two"];`,
  );
  assert.equal(run(src, { "field-pan": "ABCDE1234F" }), "ABCDE1234F|two|A|2");
});

test("known sandbox escapes no longer reach the real global object", () => {
  const escapes = [
    `const { constructor: { constructor: F } } = onSubmit; return <p>{F("return typeof process")()}</p>;`,
    `const k = "constr" + "uctor"; const O = values[k]; const d = O.getOwnPropertyDescriptor(O.getPrototypeOf(onSubmit), k); return <p>{d.value("return typeof process")()}</p>;`,
    `const k = "constr" + "uctor"; const B = {}; const O = B[k]; const d = O.getOwnPropertyDescriptor(O.getPrototypeOf(onSubmit), k); return <p>{d.value("return typeof process")()}</p>;`,
    `const O = Object; const d = O.getOwnPropertyDescriptor(O.getPrototypeOf(onSubmit), "constructor"); return <p>{d.value("return typeof process")()}</p>;`,
  ];
  for (const s of escapes) {
    const out = compileComponent(wrap(s));
    if (!out.ok) continue; // stopped by the validator
    const Component = loadGeneratedComponent(out.compiled, scope);
    // Stopped by the runtime guard: the chain hits undefined and throws (the renderer then shows the fallback).
    assert.throws(() => Component({ values: {}, onChange() {}, onSubmit() {} }), TypeError, s);
  }
});
