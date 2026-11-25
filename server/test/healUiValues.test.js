// What the user typed must come back through POST /api/heal-ui and show up inside the generated
// wizard, for every field of the financial form. Each test posts real telemetry over HTTP, loads
// `ui.compiled` with ai/runtime, renders it, clicks "Next" and reads the input's value.
// Run with: npm run test:server  (mock LLM, no API key needed)

process.env.LLM_PROVIDER = "mock";
process.env.OPENAI_API_KEY = "";

var test = require("node:test");
var assert = require("node:assert/strict");
var path = require("node:path");
var express = require("express");

var healUiRoute = require("../routes/healUiRoute");
var agentService = require("../ai/agentService");
var financialForm = require("../forms/financialForm");
var ai = require("../../ai");
var runtime = require("../../ai/runtime/loadComponent");

// React and the test renderer come from the ai package (its devDependencies), so both share one copy of React.
var AI_DIR = path.join(__dirname, "..", "..", "ai");
function fromAi(name) {
  return require(require.resolve(name, { paths: [AI_DIR] }));
}
var React = fromAi("react");
var TestRenderer = fromAi("react-test-renderer");
var act = TestRenderer.act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

var server;
var base;

test.before(async function () {
  var app = express();
  app.use(express.json());
  app.use("/api", healUiRoute);
  await new Promise(function (resolve) {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = "http://127.0.0.1:" + server.address().port;
});

test.after(function () {
  server.close();
});

test.beforeEach(function () {
  agentService.cooldown.clear();
  agentService.setAgent(null);
});

var sessions = 0;
async function heal(fieldName, userInput) {
  var res = await fetch(base + "/api/heal-ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "s_values_" + ++sessions, mouseSpeed: 120, pauseTime: 5, rageClicks: 4, fieldName: fieldName, userInput: userInput,
    }),
  });
  assert.equal(res.status, 200);
  var body = await res.json();
  assert.equal(body.ui.type, "ui.generated", fieldName + " should generate");
  return body;
}

// Stand-ins for the approved components: plain elements that keep their props visible.
function makeScope() {
  var scope = { React: React, useState: React.useState, useMemo: React.useMemo };
  ai.designSystem.COMPONENT_NAMES.forEach(function (name) {
    scope[name] = function Stub(props) {
      return React.createElement("div", Object.assign({ "data-c": name }, props), props.children);
    };
  });
  return scope;
}

// Mounts the wizard the way the frontend does, moves to the input step and returns the input's props.
function renderInput(ui, fieldId, pageValues) {
  var Generated = runtime.loadGeneratedComponent(ui.compiled, makeScope());
  var seen = {};
  function Host() {
    var state = React.useState(function () { return runtime.startingValues(ui, pageValues || {}); });
    seen.values = state[0];
    return React.createElement(Generated, {
      values: state[0],
      onChange: function (id, v) { state[1](function (prev) { return runtime.applyChange(prev, id, v); }); },
      onSubmit: function () {},
    });
  }
  var renderer;
  act(function () { renderer = TestRenderer.create(React.createElement(Host)); });
  var next = renderer.root.findAll(function (n) { return n.props["data-c"] === "Button" && n.props.children === "Next"; })[0];
  assert.ok(next, "Next button not found");
  act(function () { next.props.onClick(); });
  var input = renderer.root.findAll(function (n) { return n.props["data-c"] && n.props.id === fieldId; })[0];
  assert.ok(input, "no input for " + fieldId);
  return { props: input.props, seen: seen, renderer: renderer };
}

// A value a user could type into each field of the form (tax_id is covered on its own below).
var SAMPLES = {
  business_legal_name: { input: "Example Holdings LLC", shown: "Example Holdings LLC" },
  jurisdiction: { input: "Delaware, USA", shown: "Delaware, USA" },
  annual_income: { input: "50000", shown: "50000" },
  monthly_debt: { input: "1250", shown: "1250" },
  collateral_valuation: { input: "250000", shown: "250000" },
  covenant_compliance: { input: "true", shown: true },
};

test("every text and number field: the typed value round-trips over HTTP into the wizard", async function () {
  for (var field of financialForm.FINANCIAL_FORM.fields) {
    var sample = SAMPLES[field.id];
    if (!sample || field.type === "checkbox") continue;
    var body = await heal(field.id, sample.input);
    assert.equal(body.savedValue, sample.input, field.id);
    assert.deepEqual(body.ui.initialValues, { [field.id]: sample.input }, field.id);
    var input = renderInput(body.ui, field.id);
    assert.equal(input.props.value, sample.shown, field.id);
  }
});

test("every field of the form is covered by these tests", function () {
  var covered = Object.keys(SAMPLES).concat(["tax_id"]).sort();
  var all = financialForm.FINANCIAL_FORM.fields.map(function (f) { return f.id; }).sort();
  assert.deepEqual(covered, all);
});

test("checkbox: \"true\" from the form arrives as a ticked box", async function () {
  var body = await heal("covenant_compliance", "true");
  assert.deepEqual(body.ui.initialValues, { covenant_compliance: true });
  assert.equal(renderInput(body.ui, "covenant_compliance").props.checked, true);
});

test("checkbox: \"false\" from the form is NOT shown as ticked", async function () {
  // The form sends checked ? "true" : "false". The string "false" is truthy, so seeding it as-is
  // would show a compliance box the user never ticked as ticked.
  var body = await heal("covenant_compliance", "false");
  assert.deepEqual(body.ui.initialValues, { covenant_compliance: false });
  assert.equal(body.savedValue, "false");
  assert.equal(renderInput(body.ui, "covenant_compliance").props.checked, false);
});

test("checkbox: other spellings of ticked and unticked", async function () {
  var cases = { "on": true, "1": true, "TRUE": true, " yes ": true, "0": false, "off": false, "no": false, "maybe": false };
  for (var raw of Object.keys(cases)) {
    var request = financialForm.toGenerationRequest({ fieldName: "covenant_compliance", userInput: raw, rageClicks: 4, pauseTime: 5 }, "s");
    assert.equal(request.formState.values.covenant_compliance, cases[raw], JSON.stringify(raw));
  }
});

test("tax_id: the masked value the browser sends is not seeded into the wizard", async function () {
  // useCognitiveTelemetry masks tax_id as XX-XXX1234 before sending. That mask is not what the
  // user typed, so it must not appear in the input or be submitted as their tax ID.
  var body = await heal("tax_id", "XX-XXX6789");
  assert.equal(body.savedValue, "XX-XXX6789");
  assert.deepEqual(body.ui.initialValues, {});
  assert.equal(renderInput(body.ui, "tax_id").props.value, "");
});

test("tax_id: the real value from the page still fills the wizard", async function () {
  var body = await heal("tax_id", "XX-XXX6789");
  var input = renderInput(body.ui, "tax_id", { tax_id: "12-3456789" });
  assert.equal(input.props.value, "12-3456789");
});

test("the page's newer value wins over the value the server saw", async function () {
  var body = await heal("annual_income", "500");
  var input = renderInput(body.ui, "annual_income", { annual_income: "5000" });
  assert.equal(input.props.value, "5000");
});

test("an empty field is not seeded at all", async function () {
  var body = await heal("jurisdiction", "");
  assert.deepEqual(body.ui.initialValues, {});
  assert.equal(renderInput(body.ui, "jurisdiction").props.value, "");
});

test("an edit inside the wizard flows back to the form values", async function () {
  var body = await heal("annual_income", "50000");
  var input = renderInput(body.ui, "annual_income", { business_legal_name: "Example Holdings LLC" });
  act(function () { input.props.onChange("60000"); });
  assert.deepEqual(input.seen.values, { annual_income: "60000", business_legal_name: "Example Holdings LLC" });
});
