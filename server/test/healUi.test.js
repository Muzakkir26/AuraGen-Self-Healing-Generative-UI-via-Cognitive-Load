// Tests for the end-to-end trigger (POST /api/heal-ui) and the shared generate route.
// Run with: npm run test:server  (uses the mock LLM, no API key needed)

process.env.LLM_PROVIDER = "mock";
process.env.OPENAI_API_KEY = "";

var test = require("node:test");
var assert = require("node:assert/strict");
var express = require("express");

var cors = require("../middleware/cors");
var healUiRoute = require("../routes/healUiRoute");
var generateRoute = require("../routes/generateRoute");
var agentService = require("../ai/agentService");
var financialForm = require("../forms/financialForm");
var ai = require("../../ai");

var server;
var base;

test.before(async function () {
  var app = express();
  app.use(express.json());
  app.use(cors);
  app.use("/api", healUiRoute);
  app.use("/api", generateRoute);
  await new Promise(function (resolve) {
    server = app.listen(0, resolve);
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

function post(path, body, headers) {
  return fetch(base + path, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
    body: JSON.stringify(body),
  });
}

// The exact payload the frontend hook sends today (src/hooks/useCognitiveTelemetry.ts).
var STRUGGLING = { mouseSpeed: 120, pauseTime: 5, rageClicks: 4, fieldName: "annual_income", userInput: "50000" };
var CALM = { mouseSpeed: 20, pauseTime: 1, rageClicks: 0, fieldName: "annual_income", userInput: "" };

test("high score triggers generation and returns a mountable ui.generated message", async function () {
  var res = await post("/api/heal-ui", Object.assign({ sessionId: "s_high" }, STRUGGLING));
  assert.equal(res.status, 200);
  var body = await res.json();
  assert.equal(body.score, 85);
  assert.equal(body.triggerAI, true);
  assert.equal(body.stuckField, "annual_income");
  assert.equal(body.ui.type, "ui.generated");
  assert.equal(body.ui.targetFieldId, "annual_income");
  assert.equal(typeof body.ui.compiled, "string");
  assert.ok(body.ui.compiled.length > 0);
  assert.equal(body.generation.status, "ok");
  assert.deepEqual(body.generation.violations, []);
});

test("the value the user typed is handed to the renderer, not lost", async function () {
  var body = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_keep" }, STRUGGLING))).json();
  assert.deepEqual(body.ui.initialValues, { annual_income: "50000" });
  assert.equal(body.savedValue, "50000");
});

test("typed values never reach the LLM prompt", async function () {
  var request = financialForm.toGenerationRequest(Object.assign({}, STRUGGLING, { userInput: "SECRET-98765" }), "s_priv");
  var prompt = ai.prompt.buildPrompt(request);
  assert.ok(!prompt.user.includes("SECRET-98765"));
  assert.ok(!prompt.system.includes("SECRET-98765"));
  assert.match(prompt.user, /currently: filled/);
});

test("low score does not call the agent", async function () {
  var calls = 0;
  agentService.setAgent({ generate: function () { calls += 1; return Promise.resolve(null); } });
  var body = await (await post("/api/heal-ui", CALM)).json();
  assert.equal(body.triggerAI, false);
  assert.equal(body.ui, null);
  assert.equal(calls, 0);
});

test("second trigger for the same session + field inside the cooldown gets a fallback", async function () {
  var first = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_cool" }, STRUGGLING))).json();
  var second = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_cool" }, STRUGGLING))).json();
  assert.equal(first.ui.type, "ui.generated");
  assert.equal(second.ui.type, "ui.fallback");
  assert.equal(second.ui.reason, "cooldown");
});

test("unknown field falls back instead of erroring", async function () {
  var body = await (await post("/api/heal-ui", Object.assign({}, STRUGGLING, { fieldName: "not_a_field" }))).json();
  assert.equal(body.triggerAI, true);
  assert.equal(body.ui.type, "ui.fallback");
  assert.equal(body.ui.reason, "unknown-field");
});

test("a failed generation falls back and does not start the cooldown", async function () {
  agentService.setAgent({
    generate: function () {
      return Promise.resolve({ status: "error", componentId: null, componentName: null, compiled: null, validation: null, meta: { cacheHit: false, latencyMs: 5 } });
    },
  });
  var first = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_err" }, STRUGGLING))).json();
  assert.equal(first.ui.type, "ui.fallback");
  assert.equal(first.ui.reason, "error");
  agentService.setAgent(null);
  var retry = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_err" }, STRUGGLING))).json();
  assert.equal(retry.ui.type, "ui.generated");
});

test("invalid telemetry is rejected with 400", async function () {
  var res = await post("/api/heal-ui", { mouseSpeed: "fast", pauseTime: 5, rageClicks: 4, fieldName: "tax_id" });
  assert.equal(res.status, 400);
  var body = await res.json();
  assert.equal(body.success, false);
});

test("zod schema rejects negative values, fractional rage clicks and an empty field name", async function () {
  var bad = [
    Object.assign({}, STRUGGLING, { mouseSpeed: -5 }),
    Object.assign({}, STRUGGLING, { pauseTime: -1 }),
    Object.assign({}, STRUGGLING, { rageClicks: 2.5 }),
    Object.assign({}, STRUGGLING, { fieldName: "" }),
  ];
  for (var payload of bad) {
    var res = await post("/api/heal-ui", payload);
    assert.equal(res.status, 400, JSON.stringify(payload));
    var body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /^(mouseSpeed|pauseTime|rageClicks|fieldName): /);
  }
});

test("missing userInput defaults to an empty savedValue", async function () {
  var payload = { mouseSpeed: 20, pauseTime: 1, rageClicks: 0, fieldName: "annual_income" };
  var body = await (await post("/api/heal-ui", payload)).json();
  assert.equal(body.savedValue, "");
  assert.equal(body.triggerAI, false);
});

test("sessionId survives validation, so the cooldown is per session", async function () {
  var a = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_one" }, STRUGGLING))).json();
  var b = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_two" }, STRUGGLING))).json();
  assert.equal(a.ui.type, "ui.generated");
  assert.equal(b.ui.type, "ui.generated");
  var again = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_one" }, STRUGGLING))).json();
  assert.equal(again.ui.reason, "cooldown");
});

test("/api/heal-ui and /api/generate share one cooldown", async function () {
  var request = financialForm.toGenerationRequest(STRUGGLING, "s_shared");
  var gen = await post("/api/generate", request);
  assert.equal(gen.status, 200);
  var heal = await (await post("/api/heal-ui", Object.assign({ sessionId: "s_shared" }, STRUGGLING))).json();
  assert.equal(heal.ui.reason, "cooldown");
});

test("every field in the financial form produces a valid wizard", async function () {
  for (var field of financialForm.FINANCIAL_FORM.fields) {
    var payload = Object.assign({}, STRUGGLING, { fieldName: field.id, sessionId: "s_all_" + field.id });
    var body = await (await post("/api/heal-ui", payload)).json();
    assert.equal(body.ui.type, "ui.generated", field.id + " should generate");
  }
});

test("CORS allows the Next.js dev origin and answers preflight", async function () {
  var res = await fetch(base + "/api/heal-ui", { method: "OPTIONS", headers: { Origin: "http://localhost:3000" } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:3000");
  var other = await fetch(base + "/api/heal-ui", { method: "OPTIONS", headers: { Origin: "http://evil.example" } });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
});
