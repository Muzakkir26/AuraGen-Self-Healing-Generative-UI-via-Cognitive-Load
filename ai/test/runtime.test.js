"use strict";

// Contextual awareness: the generated UI must start with what the user already typed,
// and edits made inside it must flow back to the form values.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
const {
  compileComponent, createCodeGenAgent, toUiMessage, MockWizardChatModel, designSystem: ds,
} = require("..");
const { loadGeneratedComponent, startingValues, applyChange, RuntimeLoadError } = require("../runtime/loadComponent");
const { RUNTIME_PARAMS } = require("../runtime/params");
const compileModule = require("../validator/compile");
const { scenarios, FIELDS } = require("../audit/scenarios");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PAN = fs.readFileSync(path.join(__dirname, "..", "examples", "PanWizard.jsx"), "utf8");

// Minimal stand-ins for the approved components: plain elements that keep their props visible.
function makeScope() {
  const scope = { React, useState: React.useState, useMemo: React.useMemo };
  for (const name of ds.COMPONENT_NAMES) {
    scope[name] = function Stub(props) {
      return React.createElement("div", { "data-c": name, ...props }, props.children);
    };
  }
  return scope;
}

// Mirrors what the frontend does: keep values in state, feed them to the generated component.
function Host({ Generated, initial, onValues }) {
  const [values, setValues] = React.useState(initial);
  onValues(values);
  return React.createElement(Generated, {
    values,
    onChange: (id, v) => setValues((prev) => applyChange(prev, id, v)),
    onSubmit: () => {},
  });
}

function mount(Generated, initial) {
  const seen = { values: null };
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Host, { Generated, initial, onValues: (v) => { seen.values = v; } }));
  });
  return { renderer, seen };
}

const byComponent = (renderer, name) => renderer.root.findAll((n) => n.props["data-c"] === name);
const clickButton = (renderer, label) => {
  const btn = byComponent(renderer, "Button").find((b) => b.props.children === label);
  assert.ok(btn, `button "${label}" not found`);
  act(() => btn.props.onClick());
};

test("runtime params are the same list the compiler uses", () => {
  assert.deepEqual(compileModule.RUNTIME_PARAMS, RUNTIME_PARAMS);
});

test("a typed PAN survives the swap and edits flow back to the form", () => {
  const out = compileComponent(PAN);
  assert.ok(out.ok);
  const Generated = loadGeneratedComponent(out.compiled, makeScope());
  const { renderer, seen } = mount(Generated, { "field-pan": "ABCDE12", "field-name": "kept" });

  clickButton(renderer, "Next");
  const [field] = byComponent(renderer, "TextField");
  assert.equal(field.props.value, "ABCDE12");

  act(() => field.props.onChange("abcde1234f"));
  assert.equal(byComponent(renderer, "TextField")[0].props.value, "ABCDE1234F");
  assert.deepEqual(seen.values, { "field-pan": "ABCDE1234F", "field-name": "kept" });
});

test("mock agent → ui.generated → runtime: every field type shows the saved value", async () => {
  const agent = createCodeGenAgent({ model: new MockWizardChatModel() });
  const sample = { text: "typed-before-swap", number: "42", date: "2026-01-31", checkbox: true };

  for (const s of scenarios()) {
    const req = JSON.parse(JSON.stringify(s.request));
    const field = FIELDS.find((f) => f.id === req.frictionPoint.fieldId);
    const saved = field.type === "select" ? field.options[1] : sample[field.type];
    req.formState.values = { ...req.formState.values, [field.id]: saved };

    const msg = toUiMessage(req, await agent.generate(req));
    assert.equal(msg.type, "ui.generated", s.name);

    const Generated = loadGeneratedComponent(msg.compiled, makeScope());
    const { renderer, seen } = mount(Generated, startingValues(msg, {}));
    clickButton(renderer, "Next");
    const input = renderer.root.findAll((n) => n.props["data-c"] && n.props.id === field.id)[0];
    assert.ok(input, `${s.name}: no input for ${field.id}`);
    assert.equal(field.type === "checkbox" ? input.props.checked : input.props.value, saved, s.name);
    if (field.id !== "field-name") assert.equal(seen.values["field-name"], "<typed name>", `${s.name}: other fields kept`);
  }
});

test("startingValues: page values win, server values fill the gaps", () => {
  const msg = { initialValues: { a: "server", b: "server", c: "server" } };
  assert.deepEqual(startingValues(msg, { a: "page", b: "", d: "page" }), { a: "page", b: "server", c: "server", d: "page" });
  assert.deepEqual(startingValues({}, null), {});
  assert.deepEqual(startingValues(null, { a: 1 }), { a: 1 });
});

test("applyChange does not mutate the previous values", () => {
  const before = { a: "1" };
  const after = applyChange(before, "b", "2");
  assert.deepEqual(before, { a: "1" });
  assert.deepEqual(after, { a: "1", b: "2" });
});

test("banned globals are undefined inside compiled code even if the scope supplies them", () => {
  const scope = { ...makeScope(), window: { secret: 1 }, fetch: () => "leak", document: {} };
  const probe = loadGeneratedComponent('"use strict"; return function P() { return [typeof window, typeof fetch, typeof document].join(","); };', scope);
  assert.equal(probe(), "undefined,undefined,undefined");
});

test("load errors are explicit so the renderer can fall back", () => {
  const scope = makeScope();
  assert.throws(() => loadGeneratedComponent("", scope), RuntimeLoadError);
  assert.throws(() => loadGeneratedComponent('"use strict"; return 1;', scope), /did not return a component/);
  assert.throws(() => loadGeneratedComponent('"use strict"; return (', scope), /failed to load/);
  const { Wizard, ...noWizard } = scope;
  assert.throws(() => loadGeneratedComponent(compileComponent(PAN).compiled, noWizard), /missing: Wizard/);
});
