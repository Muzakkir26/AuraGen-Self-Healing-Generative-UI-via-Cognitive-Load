"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validate, compileComponent, RUNTIME_PARAMS, designSystem } = require("..");

const EXAMPLE = fs.readFileSync(path.join(__dirname, "..", "examples", "PanWizard.jsx"), "utf8");

// Wraps a component body in a valid shell so each test only shows the line under test.
const wrap = (body, extraTop = "") =>
  `${extraTop}\nexport default function Gen({ values, onChange, onSubmit }) {\n${body}\n}`;

function rules(src) {
  return validate(src).violations.map((v) => v.rule);
}

test("reference example passes", () => {
  const r = validate(EXAMPLE);
  assert.deepEqual(r.violations, []);
  assert.equal(r.passed, true);
  assert.equal(r.componentName, "PanWizard");
});

test("minimal valid component passes", () => {
  const r = validate(wrap(`return <Card className="p-4"><HelpText>Hi</HelpText></Card>;`));
  assert.equal(r.passed, true, JSON.stringify(r.violations));
});

test("empty, oversized and unparsable input is rejected", () => {
  assert.deepEqual(rules(""), ["empty"]);
  assert.deepEqual(rules(wrap(`return <p>${"x".repeat(designSystem.MAX_SOURCE_BYTES)}</p>;`)), ["size"]);
  assert.deepEqual(rules("export default function X( { return <p>; }"), ["parse"]);
});

test("shape rules: exactly one default-exported PascalCase function", () => {
  assert.ok(rules("const A = 1;").includes("shape"));
  assert.ok(rules("export default () => <p/>;").includes("shape"));
  assert.ok(rules("export default function lower() { return <p/>; }").includes("shape"));
  assert.ok(rules(wrap("return <p/>;", "export const leak = 1;")).includes("shape"));
  assert.ok(rules(wrap("return <p/>;", "console.log(1);")).includes("shape"));
  assert.ok(rules("export default async function X() { return <p/>; }").includes("shape"));
});

test("props must be the contract props, destructured", () => {
  assert.ok(rules("export default function X(props) { return <p/>; }").includes("props"));
  assert.ok(rules("export default function X({ secret }) { return <p/>; }").includes("props"));
});

test("imports, require and dynamic import are rejected", () => {
  assert.ok(rules(wrap("return <p/>;", 'import fs from "fs";')).includes("import"));
  assert.ok(rules(wrap('require("fs"); return <p/>;')).includes("banned-identifier"));
  assert.ok(rules(wrap('import("x"); return <p/>;')).includes("import"));
});

test("every banned global is rejected", () => {
  for (const name of designSystem.BANNED_IDENTIFIERS) {
    const r = rules(wrap(`const x = ${name}; return <p/>;`));
    assert.ok(r.includes("banned-identifier"), `${name} should be banned, got ${r}`);
  }
});

test("banned names used as plain object keys are fine", () => {
  const r = validate(wrap(`const o = { location: "Pune" }; return <p>{o.location}</p>;`));
  assert.equal(r.passed, true, JSON.stringify(r.violations));
});

test("prototype-chain escapes are rejected", () => {
  assert.ok(rules(wrap(`const f = onChange.constructor; return <p/>;`)).includes("banned-property"));
  assert.ok(rules(wrap(`const f = ""["constructor"]; return <p/>;`)).includes("banned-property"));
  assert.ok(rules(wrap(`const k = "constr" + "uctor"; const f = onChange[k]; return <p/>;`)).includes("computed-access"));
  assert.ok(rules(wrap(`const k = "x"; values[k](); return <p/>;`)).includes("computed-access"));
  assert.ok(rules(wrap(`const o = values.a; const k = "x"; const z = o[k]; return <p/>;`)).includes("computed-access"));
});

test("member access on unknown globals is rejected", () => {
  assert.ok(rules(wrap(`const n = Math.max(1, 2); return <p/>;`)).includes("member-access"));
  assert.ok(rules(wrap(`React.useEffect(() => {}); return <p/>;`)).includes("member-access"));
});

test("allowed computed reads: values[id] and const literal arrays", () => {
  const src = wrap(`const id = "field-pan"; const v = values[id]; const s = STEPS[0 + 1]; return <p>{v}{s}</p>;`, `const STEPS = ["a", "b"];`);
  const r = validate(src);
  assert.equal(r.passed, true, JSON.stringify(r.violations));
});

test("only useState and useMemo hooks", () => {
  assert.ok(rules(wrap(`useEffect(() => {}); return <p/>;`)).includes("hook"));
  assert.ok(rules(wrap(`const r = useRef(); return <p/>;`)).includes("hook"));
  assert.equal(validate(wrap(`const [a, setA] = useState(0); const b = useMemo(() => a + 1, [a]); return <p>{b}</p>;`)).passed, true);
});

test("loops and dangerous syntax are rejected", () => {
  assert.ok(rules(wrap(`while (true) {} return <p/>;`)).includes("loop"));
  assert.ok(rules(wrap(`for (let i = 0; i < 9; i++) {} return <p/>;`)).includes("loop"));
  assert.ok(rules(wrap(`const d = new Date(); return <p/>;`)).includes("syntax"));
  assert.ok(rules(wrap(`debugger; return <p/>;`)).includes("syntax"));
});

test("JSX: only approved components and HTML elements", () => {
  assert.ok(rules(wrap(`return <script>alert(1)</script>;`)).includes("jsx-element"));
  assert.ok(rules(wrap(`return <iframe />;`)).includes("jsx-element"));
  assert.ok(rules(wrap(`return <Modal />;`)).includes("jsx-element"));
  assert.ok(rules(wrap(`return <UI.Card />;`)).includes("jsx-element"));
});

test("JSX attributes: no dangerous attrs, spreads or raw-element handlers", () => {
  assert.ok(rules(wrap(`return <div dangerouslySetInnerHTML={{ __html: "x" }} />;`)).includes("jsx-attribute"));
  assert.ok(rules(wrap(`return <div ref={null} />;`)).includes("jsx-attribute"));
  assert.ok(rules(wrap(`return <div style={{}} />;`)).includes("jsx-attribute"));
  assert.ok(rules(wrap(`return <Card {...values} />;`)).includes("jsx-attribute"));
  assert.ok(rules(wrap(`return <div onClick={onSubmit} />;`)).includes("event-handler"));
  assert.ok(rules(wrap(`return <Button onClick="alert(1)">x</Button>;`)).includes("event-handler"));
});

test("className must be a literal string", () => {
  assert.ok(rules(wrap("const c = 'p-2'; return <div className={c} />;")).includes("class-name"));
  assert.ok(rules(wrap("return <div className={`p-${values.x}`} />;")).includes("class-name"));
  assert.equal(validate(wrap(`return <div className={"p-2"} />;`)).passed, true);
});

test("all violations are reported in one pass, with line numbers", () => {
  const r = validate(wrap(`useEffect(); const w = window; return <iframe />;`));
  const got = new Set(r.violations.map((v) => v.rule));
  for (const rule of ["hook", "banned-identifier", "jsx-element"]) assert.ok(got.has(rule), rule);
  assert.ok(r.violations.every((v) => typeof v.line === "number"));
});

test("compile refuses invalid code", () => {
  const out = compileComponent(wrap("return <script />;"));
  assert.equal(out.ok, false);
  assert.equal(out.compiled, null);
});

test("compiled example runs in a sandboxed factory and renders a tree", () => {
  const out = compileComponent(EXAMPLE);
  assert.equal(out.ok, true);
  assert.ok(!/\bexport\b|\bimport\b/.test(out.compiled));

  // Minimal fake React runtime: createElement builds plain objects, hooks are trivial.
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: "Fragment" };
  const scope = { React, useState: (v) => [v, () => {}], useMemo: (fn) => fn() };
  for (const name of designSystem.COMPONENT_NAMES) scope[name] = name;

  const factory = new Function(...RUNTIME_PARAMS, out.compiled);
  const Component = factory(...RUNTIME_PARAMS.map((n) => scope[n])); // shadowed globals stay undefined
  assert.equal(typeof Component, "function");
  assert.equal(Component.name, "PanWizard");

  const tree = Component({ values: { "field-pan": "ABCDE1234F" }, onChange() {}, onSubmit() {} });
  assert.equal(tree.type, "Wizard");
});

test("shadowed globals are undefined inside compiled code", () => {
  const src = wrap(`return <p>{typeof onSubmit}</p>;`);
  const out = compileComponent(src);
  // Build a factory body that probes a shadowed name directly (bypassing the validator on purpose).
  const probe = new Function(...RUNTIME_PARAMS, `${out.compiled.replace(/return Gen;\s*$/, "")}\nreturn typeof window + "," + typeof fetch;`);
  assert.equal(probe(), "undefined,undefined");
});
